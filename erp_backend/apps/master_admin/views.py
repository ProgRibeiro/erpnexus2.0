from datetime import timedelta, date
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PlanoCatalogo, ClienteSaaS, AssinaturaSaaS, PagamentoMensalidade, LogAcessoMaster
from .permissions import IsMasterAdmin
from .serializers import (
    PlanoCatalogoSerializer,
    ClienteSaaSListSerializer,
    ClienteSaaSDetailSerializer,
    AssinaturaSaaSSerializer,
    PagamentoMensalidadeSerializer,
)

ACAO_LABELS = {
    "login_sucesso": "Login bem-sucedido",
    "login_falha": "Tentativa de login falhou",
    "bloquear_cliente": "Cliente bloqueado",
    "desbloquear_cliente": "Cliente desbloqueado",
    "cancelar_cliente": "Cliente cancelado",
    "resetar_senha": "Senha resetada",
    "aplicar_desconto": "Desconto aplicado",
    "confirmar_pagamento": "Pagamento confirmado",
    "criar_cliente": "Cliente criado",
    "editar_cliente": "Cliente editado",
}


# ─── Autenticação Master ──────────────────────────────────────────────────────

class MasterLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        senha = request.data.get("senha", "")

        master_email = getattr(settings, "MASTER_ADMIN_EMAIL", "master@erpnexus.com.br")
        master_senha = getattr(settings, "MASTER_ADMIN_PASSWORD", "masteradmin123")

        if email != master_email.lower() or senha != master_senha:
            LogAcessoMaster.objects.create(
                ip=_get_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                acao="login_falha",
                detalhes={"email": email},
            )
            return Response({"detail": "Credenciais inválidas."}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken()
        refresh["master"] = True
        refresh["email"] = email

        LogAcessoMaster.objects.create(
            ip=_get_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            acao="login_sucesso",
        )

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


class MasterRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken as RT
        try:
            old = RT(request.data.get("refresh"))
            if not old.get("master"):
                return Response({"detail": "Token inválido."}, status=status.HTTP_401_UNAUTHORIZED)
            old.blacklist()
            new = RT()
            new["master"] = True
            new["email"] = old.get("email", "")
            return Response({"access": str(new.access_token), "refresh": str(new)})
        except Exception:
            return Response({"detail": "Token expirado ou inválido."}, status=status.HTTP_401_UNAUTHORIZED)


# ─── Dashboard ───────────────────────────────────────────────────────────────

class MasterDashboardView(APIView):
    permission_classes = [IsMasterAdmin]

    def get(self, request):
        agora = timezone.localtime(timezone.now())
        hora = agora.hour
        if hora < 12:
            saudacao = "Bom dia, Lucas! 👑"
        elif hora < 18:
            saudacao = "Boa tarde, Lucas! 👑"
        else:
            saudacao = "Boa noite, Lucas! 👑"

        hoje = timezone.localdate()
        inicio_mes = hoje.replace(day=1)
        mes_anterior_fim = inicio_mes - timedelta(days=1)
        mes_anterior_inicio = mes_anterior_fim.replace(day=1)
        mes_anterior_str = mes_anterior_inicio.strftime("%Y-%m")
        proximos_7 = hoje + timedelta(days=7)
        proximos_14 = hoje + timedelta(days=14)

        clientes = ClienteSaaS.objects.all()
        total = clientes.count()
        ativos = clientes.filter(status="ativo").count()
        trial = clientes.filter(status="trial").count()
        suspensos = clientes.filter(status="suspenso").count()
        cancelados = clientes.filter(status="cancelado").count()
        novos_este_mes = clientes.filter(criado_em__date__gte=inicio_mes).count()

        assinaturas_ativas = AssinaturaSaaS.objects.filter(status__in=["ativo", "trial"]).select_related("plano")
        mrr = sum(float(a.valor_com_desconto) for a in assinaturas_ativas)

        pagamentos = PagamentoMensalidade.objects.all()
        vencidos_qs = pagamentos.filter(status="vencido")
        total_vencido = float(vencidos_qs.aggregate(s=Sum("valor_cobrado"))["s"] or 0)
        qtd_vencidos = vencidos_qs.count()

        vencendo_7 = pagamentos.filter(
            status="pendente", data_vencimento__gte=hoje, data_vencimento__lte=proximos_7
        ).count()

        mrr_mes_anterior = float(
            pagamentos.filter(status="pago", referencia=mes_anterior_str)
            .aggregate(s=Sum("valor_cobrado"))["s"] or 0
        )

        churn_rate = round(cancelados / max(total, 1) * 100, 2)
        ticket_medio = round(mrr / max(ativos + trial, 1), 2)

        # Evolução dos últimos 12 meses
        evolucao_receita = []
        MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        for i in range(11, -1, -1):
            ref_date = (hoje.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
            ref_str = ref_date.strftime("%Y-%m")
            label = f"{MESES_PT[ref_date.month - 1]}/{str(ref_date.year)[2:]}"
            valor_mes = float(
                pagamentos.filter(status="pago", referencia=ref_str)
                .aggregate(s=Sum("valor_cobrado"))["s"] or 0
            )
            clientes_mes = ClienteSaaS.objects.filter(criado_em__date__lte=ref_date).count()
            evolucao_receita.append({
                "mes": ref_str,
                "label": label,
                "valor": valor_mes,
                "clientes": clientes_mes,
            })

        # Vencimentos próximos (próximos 14 dias + vencidos)
        pgtos_proximos = (
            pagamentos
            .filter(status__in=["pendente", "vencido"], data_vencimento__lte=proximos_14)
            .select_related("assinatura__cliente", "assinatura__plano")
            .order_by("data_vencimento")[:20]
        )
        vencimentos_proximos = []
        for p in pgtos_proximos:
            dias = (p.data_vencimento - hoje).days
            vencimentos_proximos.append({
                "id": p.id,
                "cliente_nome": p.assinatura.cliente.nome_empresa,
                "plano_nome": p.assinatura.plano.nome,
                "sistema": p.assinatura.plano.sistema,
                "valor": float(p.valor_cobrado),
                "data_vencimento": p.data_vencimento.strftime("%Y-%m-%d"),
                "dias_restantes": dias,
            })

        # Distribuição por plano
        from django.db.models import Count
        dist_qs = (
            assinaturas_ativas
            .values("plano__id", "plano__nome", "plano__sistema")
            .annotate(quantidade=Count("id"), valor_total=Sum("valor_negociado"))
            .order_by("-quantidade")
        )
        distribuicao_planos = [
            {
                "plano_id": d["plano__id"],
                "plano_nome": d["plano__nome"],
                "sistema": d["plano__sistema"],
                "quantidade": d["quantidade"],
                "valor_total": float(d["valor_total"] or 0),
            }
            for d in dist_qs
        ]

        # Top 10 clientes por MRR
        top_lista = sorted(assinaturas_ativas, key=lambda a: float(a.valor_com_desconto), reverse=True)[:10]
        top_clientes = []
        STATUS_DISPLAY = {"ativo": "Ativo", "trial": "Trial", "suspenso": "Suspenso", "cancelado": "Cancelado"}
        for a in top_lista:
            top_clientes.append({
                "id": a.cliente.id,
                "nome_empresa": a.cliente.nome_empresa,
                "plano_nome": a.plano.nome,
                "sistema": a.plano.sistema,
                "mrr": float(a.valor_com_desconto),
                "status": a.cliente.status,
                "status_display": STATUS_DISPLAY.get(a.cliente.status, a.cliente.status),
                "criado_em": a.cliente.criado_em.strftime("%Y-%m-%d"),
            })

        # Atividade recente
        logs_qs = LogAcessoMaster.objects.order_by("-timestamp")[:10]
        atividade_recente = [
            {
                "id": l.id,
                "acao": l.acao,
                "acao_display": ACAO_LABELS.get(l.acao, l.acao),
                "detalhes": l.detalhes,
                "timestamp": l.timestamp.isoformat(),
                "ip": l.ip or "",
            }
            for l in logs_qs
        ]

        return Response({
            "saudacao": saudacao,
            "resumo": {
                "mrr": mrr,
                "arr": round(mrr * 12, 2),
                "total_clientes": total,
                "ativos": ativos,
                "trial": trial,
                "suspensos": suspensos,
                "cancelados": cancelados,
                "novos_este_mes": novos_este_mes,
                "total_vencido": total_vencido,
                "qtd_vencidos": qtd_vencidos,
                "vencendo_proximos_7_dias": vencendo_7,
                "mrr_mes_anterior": mrr_mes_anterior,
                "churn_rate": churn_rate,
                "ticket_medio": ticket_medio,
            },
            "por_sistema": {
                "erp": sum(1 for a in assinaturas_ativas if a.plano.sistema == "erp"),
                "facilities": sum(1 for a in assinaturas_ativas if a.plano.sistema == "facilities"),
                "ambos": sum(1 for a in assinaturas_ativas if a.plano.sistema == "ambos"),
            },
            "evolucao_receita": evolucao_receita,
            "vencimentos_proximos": vencimentos_proximos,
            "distribuicao_planos": distribuicao_planos,
            "top_clientes": top_clientes,
            "atividade_recente": atividade_recente,
        })


# ─── Métricas SaaS ────────────────────────────────────────────────────────────

class MetricasSaaSView(APIView):
    permission_classes = [IsMasterAdmin]

    def get(self, request):
        assinaturas_ativas = AssinaturaSaaS.objects.filter(status__in=["ativo", "trial"])
        mrr = sum(float(a.valor_com_desconto) for a in assinaturas_ativas)
        arr = round(mrr * 12, 2)

        total = ClienteSaaS.objects.count()
        cancelados = ClienteSaaS.objects.filter(status="cancelado").count()
        ativos = ClienteSaaS.objects.filter(status="ativo").count()
        trial = ClienteSaaS.objects.filter(status="trial").count()
        churn_rate = round(cancelados / max(total, 1) * 100, 2)
        ticket_medio = round(mrr / max(ativos + trial, 1), 2)
        ltv = round(ticket_medio * 31, 2)
        cac = 4200.0
        ltv_cac_ratio = round(ltv / cac, 2) if cac else 0

        return Response({
            "mrr": mrr,
            "arr": arr,
            "ltv": ltv,
            "cac": cac,
            "churn_rate": churn_rate,
            "ticket_medio": ticket_medio,
            "ltv_cac_ratio": ltv_cac_ratio,
        })


# ─── Planos ───────────────────────────────────────────────────────────────────

class PlanoCatalogoViewSet(viewsets.ModelViewSet):
    queryset = PlanoCatalogo.objects.all()
    serializer_class = PlanoCatalogoSerializer
    permission_classes = [IsMasterAdmin]


# ─── Clientes ─────────────────────────────────────────────────────────────────

class ClienteSaaSViewSet(viewsets.ModelViewSet):
    permission_classes = [IsMasterAdmin]

    def get_queryset(self):
        qs = ClienteSaaS.objects.prefetch_related("assinaturas__plano", "assinaturas__pagamentos").all()
        s = self.request.query_params.get("status")
        sistema = self.request.query_params.get("sistema")
        busca = self.request.query_params.get("busca")
        if s:
            qs = qs.filter(status=s)
        if sistema:
            qs = qs.filter(assinaturas__plano__sistema=sistema)
        if busca:
            qs = qs.filter(nome_empresa__icontains=busca)
        return qs.distinct()

    def get_serializer_class(self):
        if self.action in ("retrieve", "create", "update", "partial_update"):
            return ClienteSaaSDetailSerializer
        return ClienteSaaSListSerializer

    @action(detail=True, methods=["post"], url_path="bloquear")
    def bloquear(self, request, pk=None):
        cliente = self.get_object()
        motivo = request.data.get("motivo", "Bloqueio manual pelo administrador.")
        cliente.status = "suspenso"
        cliente.observacoes = f"{cliente.observacoes}\n[BLOQUEIO] {timezone.now():%d/%m/%Y %H:%M}: {motivo}".strip()
        cliente.save(update_fields=["status", "observacoes"])
        cliente.assinaturas.filter(status__in=["ativo", "trial"]).update(status="suspenso")
        LogAcessoMaster.objects.create(acao="bloquear_cliente", detalhes={"cliente_id": cliente.id, "motivo": motivo})
        return Response(ClienteSaaSDetailSerializer(cliente).data)

    @action(detail=True, methods=["post"], url_path="desbloquear")
    def desbloquear(self, request, pk=None):
        cliente = self.get_object()
        cliente.status = "ativo"
        cliente.observacoes = f"{cliente.observacoes}\n[DESBLOQUEIO] {timezone.now():%d/%m/%Y %H:%M}".strip()
        cliente.save(update_fields=["status", "observacoes"])
        cliente.assinaturas.filter(status="suspenso").update(status="ativo")
        LogAcessoMaster.objects.create(acao="desbloquear_cliente", detalhes={"cliente_id": cliente.id})
        return Response(ClienteSaaSDetailSerializer(cliente).data)

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        cliente = self.get_object()
        motivo = request.data.get("motivo", "Cancelamento pelo administrador.")
        cliente.status = "cancelado"
        cliente.observacoes = f"{cliente.observacoes}\n[CANCELAMENTO] {timezone.now():%d/%m/%Y %H:%M}: {motivo}".strip()
        cliente.save(update_fields=["status", "observacoes"])
        cliente.assinaturas.filter(status__in=["ativo", "trial", "suspenso"]).update(status="cancelado")
        LogAcessoMaster.objects.create(acao="cancelar_cliente", detalhes={"cliente_id": cliente.id, "motivo": motivo})
        return Response(ClienteSaaSDetailSerializer(cliente).data)

    @action(detail=True, methods=["post"], url_path="resetar-senha")
    def resetar_senha(self, request, pk=None):
        import secrets, string
        cliente = self.get_object()
        chars = string.ascii_letters + string.digits
        nova_senha = "".join(secrets.choice(chars) for _ in range(12))
        cliente.senha_provisoria = nova_senha
        cliente.save(update_fields=["senha_provisoria"])
        LogAcessoMaster.objects.create(acao="resetar_senha", detalhes={"cliente_id": cliente.id})
        return Response({"nova_senha": nova_senha})


# ─── Assinaturas ─────────────────────────────────────────────────────────────

class AssinaturaSaaSViewSet(viewsets.ModelViewSet):
    queryset = AssinaturaSaaS.objects.select_related("cliente", "plano").prefetch_related("pagamentos").all()
    serializer_class = AssinaturaSaaSSerializer
    permission_classes = [IsMasterAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        cliente_id = self.request.query_params.get("cliente")
        s = self.request.query_params.get("status")
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        if s:
            qs = qs.filter(status=s)
        return qs

    @action(detail=True, methods=["post"], url_path="aplicar-desconto")
    def aplicar_desconto(self, request, pk=None):
        assinatura = self.get_object()
        pct = request.data.get("percentual", 0)
        motivo = request.data.get("motivo", "")
        assinatura.desconto_percentual = pct
        assinatura.motivo_desconto = motivo
        assinatura.save(update_fields=["desconto_percentual", "motivo_desconto"])
        LogAcessoMaster.objects.create(
            acao="aplicar_desconto",
            detalhes={"assinatura_id": assinatura.id, "percentual": float(pct), "motivo": motivo},
        )
        return Response(AssinaturaSaaSSerializer(assinatura).data)

    @action(detail=True, methods=["post"], url_path="gerar-mensalidade")
    def gerar_mensalidade(self, request, pk=None):
        from django.utils import timezone as tz
        assinatura = self.get_object()
        hoje = tz.localdate()
        referencia = request.data.get("referencia", hoje.strftime("%Y-%m"))
        vencimento_str = request.data.get("data_vencimento", hoje.strftime("%Y-%m-%d"))
        pagamento, criado = PagamentoMensalidade.objects.get_or_create(
            assinatura=assinatura,
            referencia=referencia,
            defaults={
                "valor_cobrado": assinatura.valor_com_desconto,
                "status": "pendente",
                "data_vencimento": vencimento_str,
            },
        )
        return Response(PagamentoMensalidadeSerializer(pagamento).data,
                        status=status.HTTP_201_CREATED if criado else status.HTTP_200_OK)


# ─── Pagamentos ───────────────────────────────────────────────────────────────

class PagamentoMensalidadeViewSet(viewsets.ModelViewSet):
    queryset = PagamentoMensalidade.objects.select_related("assinatura__cliente", "assinatura__plano").all()
    serializer_class = PagamentoMensalidadeSerializer
    permission_classes = [IsMasterAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get("status")
        cliente_id = self.request.query_params.get("cliente")
        if s:
            qs = qs.filter(status=s)
        if cliente_id:
            qs = qs.filter(assinatura__cliente_id=cliente_id)
        return qs

    @action(detail=True, methods=["post"], url_path="confirmar-pagamento")
    def confirmar_pagamento(self, request, pk=None):
        pgto = self.get_object()
        forma = request.data.get("forma", "pix")
        data_pgto = request.data.get("data_pagamento")
        pgto.marcar_pago(forma=forma, data=data_pgto)
        cliente = pgto.assinatura.cliente
        if cliente.status == "suspenso":
            ainda_vencidos = PagamentoMensalidade.objects.filter(
                assinatura__cliente=cliente, status="vencido"
            ).exists()
            if not ainda_vencidos:
                cliente.status = "ativo"
                cliente.save(update_fields=["status"])
                pgto.assinatura.status = "ativo"
                pgto.assinatura.save(update_fields=["status"])
        LogAcessoMaster.objects.create(
            acao="confirmar_pagamento",
            detalhes={"pagamento_id": pgto.id, "forma": forma, "valor": float(pgto.valor_cobrado)},
        )
        return Response(PagamentoMensalidadeSerializer(pgto).data)


# ─── Logs ─────────────────────────────────────────────────────────────────────

class LogAcessoMasterView(APIView):
    permission_classes = [IsMasterAdmin]

    def get(self, request):
        acao_filtro = request.query_params.get("acao")
        qs = LogAcessoMaster.objects.order_by("-timestamp")
        if acao_filtro:
            qs = qs.filter(acao=acao_filtro)
        logs = qs[:200]
        return Response([
            {
                "id": l.id,
                "acao": l.acao,
                "acao_display": ACAO_LABELS.get(l.acao, l.acao),
                "detalhes": l.detalhes,
                "timestamp": l.timestamp.isoformat(),
                "ip": l.ip or "",
            }
            for l in logs
        ])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_ip(request):
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
