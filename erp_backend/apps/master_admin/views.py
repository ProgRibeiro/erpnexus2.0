from datetime import timedelta, date
from django.conf import settings
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

        # Gera JWT com claim master=True
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
        hoje = timezone.localdate()
        proximos_7 = hoje + timedelta(days=7)

        clientes = ClienteSaaS.objects.all()
        ativos = clientes.filter(status="ativo").count()
        trial = clientes.filter(status="trial").count()
        suspensos = clientes.filter(status="suspenso").count()
        cancelados = clientes.filter(status="cancelado").count()
        total = clientes.count()

        pagamentos = PagamentoMensalidade.objects.all()
        vencidos = pagamentos.filter(status="vencido")
        pendentes_proximos = pagamentos.filter(status="pendente", data_vencimento__lte=proximos_7)
        mrr = sum(
            a.valor_com_desconto
            for a in AssinaturaSaaS.objects.filter(status__in=["ativo", "trial"])
        )

        # Receita últimos 6 meses
        receita_mensal = []
        for i in range(5, -1, -1):
            ref_date = hoje.replace(day=1) - timedelta(days=i * 30)
            ref_str = ref_date.strftime("%Y-%m")
            total_mes = sum(
                p.valor_cobrado for p in pagamentos.filter(status="pago", referencia=ref_str)
            )
            receita_mensal.append({"mes": ref_str, "valor": float(total_mes)})

        # Últimos pagamentos
        ultimos_pgtos = pagamentos.order_by("-criado_em")[:10]

        return Response({
            "resumo": {
                "total_clientes": total,
                "ativos": ativos,
                "trial": trial,
                "suspensos": suspensos,
                "cancelados": cancelados,
                "mrr": float(mrr),
                "total_vencido": float(sum(v.valor_cobrado for v in vencidos)),
                "qtd_vencidos": vencidos.count(),
                "vencendo_proximos_7_dias": pendentes_proximos.count(),
            },
            "por_sistema": {
                "erp": AssinaturaSaaS.objects.filter(
                    status__in=["ativo", "trial"], plano__sistema="erp"
                ).count(),
                "facilities": AssinaturaSaaS.objects.filter(
                    status__in=["ativo", "trial"], plano__sistema="facilities"
                ).count(),
                "ambos": AssinaturaSaaS.objects.filter(
                    status__in=["ativo", "trial"], plano__sistema="ambos"
                ).count(),
            },
            "receita_mensal": receita_mensal,
            "ultimos_pagamentos": PagamentoMensalidadeSerializer(ultimos_pgtos, many=True).data,
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
        # Suspende assinaturas ativas
        cliente.assinaturas.filter(status__in=["ativo", "trial"]).update(status="suspenso")
        LogAcessoMaster.objects.create(acao="bloquear_cliente", detalhes={"cliente_id": cliente.id, "motivo": motivo})
        return Response(ClienteSaaSDetailSerializer(cliente).data)

    @action(detail=True, methods=["post"], url_path="desbloquear")
    def desbloquear(self, request, pk=None):
        cliente = self.get_object()
        cliente.status = "ativo"
        cliente.observacoes = f"{cliente.observacoes}\n[DESBLOQUEIO] {timezone.now():%d/%m/%Y %H:%M}".strip()
        cliente.save(update_fields=["status", "observacoes"])
        # Reativa assinaturas suspensas
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
        """Gera (ou retorna existente) a mensalidade de um mês específico."""
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
        # Se o cliente estava suspenso por inadimplência, verifica se pode reativar
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
        from .models import LogAcessoMaster as Log
        logs = Log.objects.order_by("-timestamp")[:100]
        return Response([
            {"acao": l.acao, "ip": l.ip, "timestamp": l.timestamp, "detalhes": l.detalhes}
            for l in logs
        ])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_ip(request):
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
