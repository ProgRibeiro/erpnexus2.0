import datetime
import json
import logging
import uuid as uuid_module
from decimal import Decimal, InvalidOperation

from django.db import transaction, IntegrityError
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clientes.models import Cliente, HistoricoCliente
from apps.ordens.models import OrdemServico, ItemOrcamento
from apps.saas.middleware import registrar_log
from apps.saas.models import BudgetAnual, BudgetMensal, CategoriaBudget, PrestadorContratado

from .models import (
    Ativo, PlanoManutencao, ChecklistItem,
    ChamadoFacilities, ContratoTerceirizado,
    ProjetoObra, FaseObra, DiarioObra, BoletimMedicao,
    Licitacao, PropostaLicitacao, OutboxMessage,
)
from .serializers import (
    AtivoSerializer, AtivoDetalheSerializer,
    PlanoManutencaoSerializer, ChecklistItemSerializer,
    ChamadoFacilitiesSerializer, ContratoTerceirizadoSerializer,
    ProjetoObraSerializer, ProjetoObraDetalheSerializer,
    FaseObraSerializer, DiarioObraSerializer, BoletimMedicaoSerializer,
    LicitacaoSerializer, PropostaLicitacaoSerializer,
)

logger = logging.getLogger(__name__)


TIPO_SERVICO_PARA_OS = {
    "hvac": OrdemServico.TipoServico.HVAC,
    "refrigeracao": OrdemServico.TipoServico.REFRIGERACAO,
    "elétrica": OrdemServico.TipoServico.ELETRICA,
    "eletrica": OrdemServico.TipoServico.ELETRICA,
    "civil": OrdemServico.TipoServico.CIVIL,
    "manutencao": OrdemServico.TipoServico.MANUTENCAO,
    "manutenção": OrdemServico.TipoServico.MANUTENCAO,
    "instalacao": OrdemServico.TipoServico.INSTALACAO,
    "instalação": OrdemServico.TipoServico.INSTALACAO,
    "outro": OrdemServico.TipoServico.OUTRO,
}


def _resolver_nome_usuario(usuario):
    return (
        getattr(usuario, "nome_completo", "")
        or getattr(usuario, "first_name", "")
        or getattr(usuario, "username", "")
        or getattr(usuario, "email", "")
        or "Sistema"
    )


def _resolver_tenant_usuario(usuario):
    return getattr(usuario, "tenant", None)


def _decimal_from_payload(value, default="0"):
    try:
        return Decimal(str(value if value not in [None, ""] else default))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def _normalizar_itens_orcamento(raw_itens):
    if isinstance(raw_itens, str):
        try:
            raw_itens = json.loads(raw_itens)
        except json.JSONDecodeError:
            raw_itens = []

    if not isinstance(raw_itens, list):
        return [], Decimal("0")

    itens = []
    total = Decimal("0")
    for indice, item in enumerate(raw_itens):
        if not isinstance(item, dict):
            continue

        descricao = str(item.get("descricao") or "").strip()
        quantidade = _decimal_from_payload(item.get("quantidade", item.get("qtd", 1)), "1")
        valor_unitario = _decimal_from_payload(item.get("valor_unitario", item.get("valor_unit", 0)), "0")
        valor_total = quantidade * valor_unitario

        item_normalizado = {
            "descricao": descricao,
            "quantidade": float(quantidade),
            "unidade": item.get("unidade") or item.get("unidade_referencia") or "un",
            "valor_unitario": float(valor_unitario),
            "valor_total": float(valor_total),
            "ordem": item.get("ordem") if item.get("ordem") is not None else indice,
        }
        itens.append(item_normalizado)
        total += valor_total

    return itens, total


class AtivoViewSet(viewsets.ModelViewSet):
    queryset = Ativo.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ["categoria", "status"]
    search_fields = ["tag", "nome", "fabricante", "modelo", "numero_serie"]
    ordering_fields = ["tag", "nome", "criado_em"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AtivoDetalheSerializer
        return AtivoSerializer

    @action(detail=True, methods=["get"])
    def historico_chamados(self, request, pk=None):
        ativo = self.get_object()
        chamados = ativo.chamados.all()
        serializer = ChamadoFacilitiesSerializer(chamados, many=True)
        return Response(serializer.data)


class PlanoManutencaoViewSet(viewsets.ModelViewSet):
    queryset = PlanoManutencao.objects.select_related("ativo").prefetch_related("checklist")
    serializer_class = PlanoManutencaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["ativo", "tipo", "periodicidade", "ativo_plano"]
    ordering_fields = ["proxima_execucao", "criado_em"]

    @action(detail=True, methods=["post"])
    def registrar_execucao(self, request, pk=None):
        plano = self.get_object()
        plano.ultima_execucao = datetime.date.today()
        periodicidade_dias = {
            "diaria": 1, "semanal": 7, "quinzenal": 15, "mensal": 30,
            "trimestral": 90, "semestral": 180, "anual": 365,
        }
        dias = periodicidade_dias.get(plano.periodicidade, 30)
        plano.proxima_execucao = datetime.date.today() + datetime.timedelta(days=dias)
        plano.save()
        return Response(PlanoManutencaoSerializer(plano).data)


class ChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = ChecklistItem.objects.all()
    serializer_class = ChecklistItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["plano"]


class ChamadoFacilitiesViewSet(viewsets.ModelViewSet):
    queryset = ChamadoFacilities.objects.select_related("ativo", "tecnico_responsavel").all()
    serializer_class = ChamadoFacilitiesSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "prioridade", "ativo", "tecnico_responsavel"]
    search_fields = ["numero", "titulo", "solicitante_nome", "local"]
    ordering_fields = ["aberto_em", "prioridade"]

    @action(detail=True, methods=["post"])
    def resolver(self, request, pk=None):
        chamado = self.get_object()
        chamado.status = "resolvido"
        chamado.resolvido_em = timezone.now()
        chamado.save()
        return Response(ChamadoFacilitiesSerializer(chamado).data)

    @action(detail=True, methods=["post"])
    def fechar(self, request, pk=None):
        chamado = self.get_object()
        chamado.status = "fechado"
        if not chamado.resolvido_em:
            chamado.resolvido_em = timezone.now()
        chamado.save()
        return Response(ChamadoFacilitiesSerializer(chamado).data)

    @action(detail=True, methods=["post"])
    def assumir(self, request, pk=None):
        chamado = self.get_object()
        chamado.status = "em_atendimento"
        chamado.tecnico_responsavel = request.user
        chamado.save()
        return Response(ChamadoFacilitiesSerializer(chamado).data)


class ContratoTerceirizadoViewSet(viewsets.ModelViewSet):
    queryset = ContratoTerceirizado.objects.all()
    serializer_class = ContratoTerceirizadoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "periodicidade_servico"]
    search_fields = ["fornecedor_nome", "fornecedor_cnpj", "tipo_servico"]
    ordering_fields = ["data_fim", "criado_em"]


class ProjetoObraViewSet(viewsets.ModelViewSet):
    queryset = ProjetoObra.objects.select_related("responsavel").prefetch_related("fases")
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "tipo", "responsavel"]
    search_fields = ["codigo", "nome"]
    ordering_fields = ["criado_em", "data_fim_prevista"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProjetoObraDetalheSerializer
        return ProjetoObraSerializer

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        projeto = self.get_object()
        fases = projeto.fases.all()
        diarios = projeto.diarios.all()
        boletins = projeto.boletins.all()
        return Response({
            "projeto": ProjetoObraSerializer(projeto).data,
            "total_fases": fases.count(),
            "fases_concluidas": fases.filter(status="concluida").count(),
            "total_diarios": diarios.count(),
            "total_boletins": boletins.count(),
            "boletins_aprovados": boletins.filter(status="aprovado").count(),
            "orcamento_previsto": str(projeto.orcamento_previsto),
            "orcamento_realizado": str(projeto.orcamento_realizado),
            "percentual_concluido": str(projeto.percentual_concluido),
        })

class FaseObraViewSet(viewsets.ModelViewSet):
    queryset = FaseObra.objects.select_related("projeto")
    serializer_class = FaseObraSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["projeto", "status"]


class DiarioObraViewSet(viewsets.ModelViewSet):
    queryset = DiarioObra.objects.select_related("projeto", "registrado_por")
    serializer_class = DiarioObraSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["projeto", "clima"]
    ordering_fields = ["data", "criado_em"]

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)


class BoletimMedicaoViewSet(viewsets.ModelViewSet):
    queryset = BoletimMedicao.objects.select_related("projeto")
    serializer_class = BoletimMedicaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["projeto", "status"]
    ordering_fields = ["mes_referencia", "criado_em"]

    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        bm = self.get_object()
        bm.status = "aprovado"
        bm.aprovado_em = timezone.now()
        bm.save()
        return Response(BoletimMedicaoSerializer(bm).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_facilities(request):
    hoje = datetime.date.today()
    em_30_dias = hoje + datetime.timedelta(days=30)
    em_7_dias = hoje + datetime.timedelta(days=7)

    total_ativos = Ativo.objects.count()
    ativos_operacionais = Ativo.objects.filter(status="operacional").count()
    chamados_abertos = ChamadoFacilities.objects.filter(status__in=["aberto", "em_atendimento", "aguardando"]).count()
    chamados_criticos = ChamadoFacilities.objects.filter(status__in=["aberto", "em_atendimento"], prioridade="critica").count()
    planos_vencidos = PlanoManutencao.objects.filter(ativo_plano=True, proxima_execucao__lt=hoje).count()
    planos_vencendo = PlanoManutencao.objects.filter(ativo_plano=True, proxima_execucao__gte=hoje, proxima_execucao__lte=em_7_dias).count()
    contratos_vencendo = ContratoTerceirizado.objects.filter(status="ativo", data_fim__gte=hoje, data_fim__lte=em_30_dias).count()
    projetos_ativos = ProjetoObra.objects.filter(status="em_andamento").count()

    return Response({
        "total_ativos": total_ativos,
        "ativos_operacionais": ativos_operacionais,
        "chamados_abertos": chamados_abertos,
        "chamados_criticos": chamados_criticos,
        "planos_vencidos": planos_vencidos,
        "planos_vencendo": planos_vencendo,
        "contratos_vencendo": contratos_vencendo,
        "projetos_ativos": projetos_ativos,
    })

class PropostaLicitacaoViewSet(viewsets.ModelViewSet):
    queryset = PropostaLicitacao.objects.select_related("licitacao")
    serializer_class = PropostaLicitacaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["licitacao", "status"]

    def perform_create(self, serializer):
        serializer.save()


class LicitacaoViewSet(viewsets.ModelViewSet):
    queryset = Licitacao.objects.prefetch_related("propostas", "prestadores_convidados").select_related("ativo")
    serializer_class = LicitacaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "modo", "tipo_servico"]
    search_fields = ["titulo", "descricao"]
    ordering_fields = ["criado_em", "prazo_propostas"]

    def _resolve_tenant_contratante(self):
        from apps.saas.models import Tenant

        tenant = None
        request_tenant = getattr(self.request, "tenant", None)

        if request_tenant is not None:
            client_nome = getattr(request_tenant, "nome", None)
            client_cnpj = getattr(request_tenant, "cnpj", None)
            client_id = getattr(request_tenant, "id", None)

            logger.info(
                "Tentando resolver tenant da licitação via request.tenant: nome=%s id=%s",
                client_nome,
                client_id,
            )

            if client_cnpj:
                tenant = Tenant.objects.filter(cnpj=client_cnpj).first()

            if tenant is None and client_nome:
                tenant = Tenant.objects.filter(nome=client_nome).first()

        user_tenant = getattr(self.request.user, "tenant", None)
        if tenant is None and user_tenant is not None:
            tenant = user_tenant

        logger.info("Tenant identificado para associação da licitação: %s", tenant)
        return tenant

    def create(self, request, *args, **kwargs):
        logger.info(f"INICIANDO CREATE LICITACAO: Data={request.data} | User={request.user}")
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"ERRO VALIDACAO SERIALIZER: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            logger.info(f"LICITACAO CRIADA COM SUCESSO: ID={serializer.data.get('id')}")
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.exception(f"EXCECAO AO CRIAR LICITACAO: {e}")
            return Response({"erro": str(e), "detalhes": "Verifique os logs do servidor"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        tenant = self._resolve_tenant_contratante()
        serializer.save(tenant_contratante=tenant)

    def _prestador_esta_conectado(self, licitacao, tenant_prestador):
        if licitacao.tenant_contratante_id is None or tenant_prestador is None:
            return False

        return PrestadorContratado.objects.filter(
            tenant_contratante_id=licitacao.tenant_contratante_id,
            tenant_prestador=tenant_prestador,
            ativo=True,
        ).exists()

    def _resolver_tenant_prestador(self, licitacao, usuario):
        tenant_prestador = _resolver_tenant_usuario(usuario)
        if tenant_prestador is not None:
            return tenant_prestador

        convidados = licitacao.prestadores_convidados.all()
        if convidados.count() == 1:
            return convidados.first()

        conexoes_ativas = PrestadorContratado.objects.filter(
            tenant_contratante_id=licitacao.tenant_contratante_id,
            ativo=True,
        ).select_related("tenant_prestador")
        if conexoes_ativas.count() == 1:
            return conexoes_ativas.first().tenant_prestador

        return None

    def _validar_conexao_prestador(self, licitacao, usuario):
        tenant_prestador = self._resolver_tenant_prestador(licitacao, usuario)

        if licitacao.modo == Licitacao.Modo.CONVIDADA and licitacao.prestadores_convidados.exists():
            if tenant_prestador is None:
                return None, Response(
                    {
                        "erro": "Não foi possível identificar o tenant do prestador convidado",
                        "codigo": "PRESTADOR_SEM_TENANT",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            if not licitacao.prestadores_convidados.filter(id=tenant_prestador.id).exists():
                return tenant_prestador, Response(
                    {
                        "erro": "Você não foi convidado para esta licitação",
                        "codigo": "NAO_CONVIDADO",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        conexoes_ativas = PrestadorContratado.objects.filter(
            tenant_contratante_id=licitacao.tenant_contratante_id,
            ativo=True,
        )
        if conexoes_ativas.exists() and tenant_prestador is None:
            return None, Response(
                {
                    "erro": "Não foi possível identificar o prestador conectado para esta licitação",
                    "codigo": "PRESTADOR_SEM_TENANT",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if tenant_prestador is not None and conexoes_ativas.exists() and not self._prestador_esta_conectado(licitacao, tenant_prestador):
            return tenant_prestador, Response(
                {
                    "erro": "Prestador não está conectado ao contratante desta licitação",
                    "codigo": "PRESTADOR_NAO_CONECTADO",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return tenant_prestador, None

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def aceitar_proposta(self, request, pk=None):
        licitacao = self.get_object()
        proposta_id = request.data.get("proposta_id")
        if not proposta_id:
            return Response({"error": "proposta_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            proposta = licitacao.propostas.get(id=proposta_id)
        except PropostaLicitacao.DoesNotExist:
            return Response({"error": "Proposta não encontrada"}, status=status.HTTP_404_NOT_FOUND)

        ordem = self._obter_ou_criar_ordem_servico(licitacao, proposta, request.user)
        budget_mensal = self._reservar_budget_licitacao(licitacao, proposta)

        licitacao.propostas.exclude(id=proposta_id).update(status=PropostaLicitacao.Status.RECUSADA)
        proposta.status = PropostaLicitacao.Status.ACEITA
        proposta.save()
        licitacao.status = Licitacao.Status.CONCLUIDA
        licitacao.ordem_servico_id = ordem.id
        licitacao.aprovada_em = timezone.now()
        if budget_mensal is not None:
            licitacao.budget_mensal_id = budget_mensal.id
            licitacao.valor_budget_reservado = proposta.valor
        licitacao.save()

        self._registrar_historico_cliente(licitacao, proposta, ordem, request.user)
        self._registrar_auditoria_aprovacao(request, licitacao, proposta, ordem, budget_mensal)

        return Response({
            "ok": True,
            "proposta_id": proposta_id,
            "ordem_servico_id": ordem.id,
            "ordem_servico_numero": ordem.numero,
            "ordem_servico_status": ordem.status,
            "token_relatorio": str(ordem.token_relatorio),
            "budget_mensal_id": budget_mensal.id if budget_mensal else None,
        })

    def _obter_ou_criar_cliente_contratante(self, licitacao):
        tenant = licitacao.tenant_contratante
        filtros = Q(nome=tenant.nome) if tenant and tenant.nome else Q()

        if tenant and tenant.cnpj:
            filtros |= Q(cnpj_cpf=tenant.cnpj)

        cliente = Cliente.objects.filter(filtros).first() if filtros else None
        if cliente is not None:
            return cliente

        nome = tenant.nome if tenant and tenant.nome else licitacao.titulo
        return Cliente.objects.create(
            nome=nome,
            nome_fantasia=nome,
            razao_social=getattr(tenant, "razao_social", "") or nome,
            cnpj_cpf=getattr(tenant, "cnpj", "") or "",
            email="",
            status=Cliente.Status.ATIVO,
            observacoes="Cliente criado automaticamente a partir de licitação Facilities aprovada.",
        )

    def _mapear_tipo_servico_ordem(self, tipo_servico):
        chave = str(tipo_servico or "outro").strip().lower()
        return TIPO_SERVICO_PARA_OS.get(chave, OrdemServico.TipoServico.OUTRO)

    def _obter_ou_criar_ordem_servico(self, licitacao, proposta, usuario):
        if licitacao.ordem_servico_id:
            ordem_existente = OrdemServico.objects.filter(pk=licitacao.ordem_servico_id).first()
            if ordem_existente is not None:
                return ordem_existente

        cliente = self._obter_ou_criar_cliente_contratante(licitacao)
        nome_usuario = _resolver_nome_usuario(usuario)

        ordem = OrdemServico.objects.create(
            cliente=cliente,
            status=OrdemServico.Status.APROVADA,
            origem_sistema=OrdemServico.OrigemSistema.FACILITIES,
            origem_referencia_tipo="licitacao_facilities",
            origem_referencia_id=licitacao.id,
            tenant_contratante_id=licitacao.tenant_contratante_id,
            tenant_prestador_id=proposta.tenant_prestador_id,
            tipo_servico=self._mapear_tipo_servico_ordem(licitacao.tipo_servico),
            prioridade=OrdemServico.Prioridade.ALTA if licitacao.titulo.lower().find("urgente") >= 0 else OrdemServico.Prioridade.MEDIA,
            descricao_servico=licitacao.descricao or licitacao.titulo,
            valor_total_orcado=proposta.valor,
            condicao_pagamento=proposta.condicao_pagamento,
            validade_orcamento=proposta.validade_proposta,
            data_aprovacao=timezone.now(),
            aprovado_por=nome_usuario,
            observacoes_tecnicas=(
                f"OS criada automaticamente a partir da licitação #{licitacao.id}. "
                f"Proposta aceita #{proposta.id} de {proposta.prestador_nome or proposta.prestador_email}."
            ),
            criado_por=usuario if usuario and usuario.is_authenticated else None,
            atualizado_por=usuario if usuario and usuario.is_authenticated else None,
        )

        for indice, item in enumerate(proposta.itens_orcamento or []):
            ItemOrcamento.objects.create(
                os=ordem,
                origem_tipo=ItemOrcamento.OrigemTipo.AVULSO,
                descricao=item.get("descricao") or licitacao.titulo,
                quantidade=item.get("quantidade") or 1,
                codigo_referencia="LICITACAO",
                unidade_referencia=item.get("unidade") or "serviço",
                valor_unitario=item.get("valor_unitario") or item.get("valor_total") or proposta.valor,
                ordem=item.get("ordem") if item.get("ordem") is not None else indice,
            )

        if not proposta.itens_orcamento:
            ItemOrcamento.objects.create(
                os=ordem,
                origem_tipo=ItemOrcamento.OrigemTipo.AVULSO,
                descricao=licitacao.titulo,
                quantidade=1,
                codigo_referencia="LICITACAO",
                unidade_referencia="serviço",
                valor_unitario=proposta.valor,
                ordem=0,
            )

        return ordem

    def _reservar_budget_licitacao(self, licitacao, proposta):
        tenant = licitacao.tenant_contratante
        if tenant is None:
            return None

        hoje = timezone.localdate()
        budget_anual = (
            BudgetAnual.objects.filter(
                tenant=tenant,
                ano=hoje.year,
                status__in=["aprovado", "executando"],
            )
            .order_by("id")
            .first()
        )
        if budget_anual is None:
            return None

        tipo_servico = str(licitacao.tipo_servico or "").strip().lower()
        categorias_ids = list(
            CategoriaBudget.objects.filter(nome__icontains=tipo_servico).values_list("id", flat=True)
        )

        budget_mensal_qs = BudgetMensal.objects.filter(budget_anual=budget_anual, mes=hoje.month)
        if categorias_ids:
            budget_mensal_qs = budget_mensal_qs.filter(categoria_id__in=categorias_ids)

        budget_mensal = budget_mensal_qs.order_by("id").first()
        if budget_mensal is None:
            budget_mensal = BudgetMensal.objects.filter(budget_anual=budget_anual, mes=hoje.month).order_by("id").first()
        if budget_mensal is None:
            return None

        budget_mensal.valor_comprometido = (budget_mensal.valor_comprometido or Decimal("0")) + proposta.valor
        budget_mensal.save(update_fields=["valor_comprometido"])
        return budget_mensal

    def _registrar_historico_cliente(self, licitacao, proposta, ordem, usuario):
        cliente = ordem.cliente
        HistoricoCliente.objects.create(
            cliente=cliente,
            tipo=HistoricoCliente.Tipo.OBSERVACAO,
            descricao=(
                f"Licitação Facilities aprovada e convertida em OS {ordem.numero}. "
                f"Prestador aceito: {proposta.prestador_nome or proposta.prestador_email}. "
                f"Valor aprovado: R$ {proposta.valor}."
            ),
            data_contato=timezone.now(),
            usuario=usuario if usuario and usuario.is_authenticated else None,
        )

    def _registrar_auditoria_aprovacao(self, request, licitacao, proposta, ordem, budget_mensal):
        registrar_log(
            request,
            licitacao.tenant_contratante,
            "aprovou",
            "licitacao",
            licitacao.id,
            valores_antes={"status": Licitacao.Status.EM_ANALISE},
            valores_depois={
                "status": Licitacao.Status.CONCLUIDA,
                "ordem_servico_id": ordem.id,
                "budget_mensal_id": budget_mensal.id if budget_mensal else None,
            },
        )
        registrar_log(
            request,
            licitacao.tenant_contratante,
            "criou",
            "ordem_servico",
            ordem.id,
            valores_depois={
                "numero": ordem.numero,
                "status": ordem.status,
                "cliente_id": ordem.cliente_id,
                "licitacao_id": licitacao.id,
            },
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def propostas(self, request, pk=None):
        logger.info("Recebida proposta para licitação %s", pk, extra={"data": request.data, "user": request.user.email})
        try:
            # 1. Busca a licitação com lock para evitar race condition
            licitacao = Licitacao.objects.select_for_update().get(pk=pk)

            tenant_prestador, erro_conexao = self._validar_conexao_prestador(licitacao, request.user)
            if erro_conexao is not None:
                logger.warning(
                    "Prestador sem conexão válida para licitação %s | user=%s tenant=%s",
                    pk,
                    request.user.email,
                    getattr(tenant_prestador, "id", None),
                )
                return erro_conexao

            # 2. Verifica se a licitação está publicada
            if licitacao.status != Licitacao.Status.PUBLICADA:
                logger.warning("Licitação %s não está publicada (status=%s)", pk, licitacao.status)
                return Response({
                    "erro": "Licitação não está disponível para receber propostas",
                    "codigo": "LICITACAO_NAO_PUBLICADA",
                }, status=400)

            # 3. Verifica prazo
            if licitacao.prazo_propostas and licitacao.prazo_propostas < timezone.now():
                logger.warning("Licitação %s já encerrou o prazo", pk)
                return Response({
                    "erro": "O prazo para envio de propostas já foi encerrado",
                    "codigo": "LICITACAO_ENCERRADA",
                }, status=400)

            # 4. Idempotência — evita duplo envio por retry do frontend
            idempotency_key = request.headers.get("X-Idempotency-Key", "")
            if idempotency_key:
                try:
                    existente = PropostaLicitacao.objects.get(uuid=idempotency_key)
                    logger.info("Proposta duplicada (idempotency), retornando existente %s", existente.id)
                    return Response(PropostaLicitacaoSerializer(existente).data, status=200)
                except (PropostaLicitacao.DoesNotExist, Exception):
                    pass  # Chave nova, prossegue com criação

            # 5. Verifica se este email já enviou proposta para esta licitação
            email_prestador = request.user.email
            ja_enviou = PropostaLicitacao.objects.filter(
                licitacao=licitacao,
                prestador_email=email_prestador,
            ).exists()
            if ja_enviou:
                logger.warning("Prestador %s já enviou proposta para licitação %s", email_prestador, pk)
                return Response({
                    "erro": "Você já enviou uma proposta para esta licitação",
                    "codigo": "PROPOSTA_DUPLICADA",
                }, status=409)

            itens_orcamento, total_itens = _normalizar_itens_orcamento(request.data.get("itens_orcamento", []))
            if not itens_orcamento:
                return Response({
                    "erro": "Informe ao menos um item cotado na proposta",
                    "codigo": "ITENS_OBRIGATORIOS",
                }, status=400)

            if any(not item.get("descricao") for item in itens_orcamento):
                return Response({
                    "erro": "Todos os itens da proposta precisam ter descrição",
                    "codigo": "ITENS_INVALIDOS",
                }, status=400)

            if total_itens <= 0:
                return Response({
                    "erro": "O total dos itens deve ser maior que zero",
                    "codigo": "ITENS_INVALIDOS",
                }, status=400)

            # 6. Valida e converte o valor. O total oficial vem dos itens, como em um orçamento.
            try:
                valor_total_informado = Decimal(str(request.data.get("valor", total_itens)))
            except (InvalidOperation, TypeError) as e:
                logger.error("Erro conversão valor: %s", str(e), extra={"valor": request.data.get("valor")})
                return Response({
                    "erro": "Valor inválido. Informe um número decimal válido.",
                    "codigo": "VALOR_INVALIDO",
                }, status=400)

            valor_total = total_itens
            if valor_total_informado > 0 and abs(valor_total - valor_total_informado) > Decimal("0.01"):
                logger.info(
                    "Valor informado da proposta difere do total dos itens; usando total dos itens. informado=%s itens=%s",
                    valor_total_informado,
                    valor_total,
                )

            if valor_total <= 0:
                logger.warning("Valor proposto <= 0: %s", valor_total)
                return Response({
                    "erro": "O valor da proposta deve ser maior que zero",
                    "codigo": "VALOR_INVALIDO",
                }, status=400)

            if licitacao.valor_maximo and valor_total > licitacao.valor_maximo:
                logger.warning("Valor proposto (%s) acima do máximo (%s)", valor_total, licitacao.valor_maximo)
                return Response({
                    "erro": f"Valor acima do máximo permitido (R$ {licitacao.valor_maximo:,.2f})",
                    "codigo": "VALOR_ACIMA_MAXIMO",
                }, status=400)

            # 7. Valida prazo_execucao_dias
            try:
                prazo_dias = int(request.data.get("prazo_execucao_dias", 0))
                if prazo_dias <= 0:
                    raise ValueError
            except (ValueError, TypeError) as e:
                logger.error("Erro validação prazo: %s", str(e))
                return Response({
                    "erro": "Prazo de execução inválido. Informe um número inteiro de dias.",
                    "codigo": "PRAZO_INVALIDO",
                }, status=400)

            # 8. Cria a proposta
            proposta_uuid = idempotency_key or str(uuid_module.uuid4())
            nome_prestador = (
                getattr(request.user, "nome_completo", "")
                or getattr(request.user, "first_name", "")
                or getattr(request.user, "username", "")
                or request.user.email
            )

            proposta = PropostaLicitacao.objects.create(
                uuid=proposta_uuid,
                licitacao=licitacao,
                tenant_prestador_id=getattr(tenant_prestador, "id", None),
                prestador_nome=nome_prestador,
                prestador_email=email_prestador,
                valor=valor_total,
                prazo_execucao_dias=prazo_dias,
                condicao_pagamento=request.data.get("condicao_pagamento", ""),
                validade_proposta=request.data.get("validade_proposta") or None,
                itens_orcamento=itens_orcamento,
                arquivo_proposta=request.FILES.get("arquivo_proposta"),
                observacoes=request.data.get("observacoes", ""),
                status=PropostaLicitacao.Status.ENVIADA,
            )

            # 9. Registra no Outbox para processamento assíncrono
            OutboxMessage.objects.create(
                aggregate_type="Proposta",
                aggregate_id=str(proposta.uuid),
                event_type="proposta.enviada",
                payload={
                    "proposta_id": proposta.id,
                    "licitacao_id": licitacao.id,
                    "tenant_prestador_id": getattr(tenant_prestador, "id", None),
                    "tenant_contratante_id": licitacao.tenant_contratante_id,
                    "licitacao_titulo": licitacao.titulo,
                    "prestador_nome": nome_prestador,
                    "prestador_email": email_prestador,
                    "valor": str(valor_total),
                    "prazo_dias": prazo_dias,
                },
                status="pendente",
            )

            logger.info(
                "Proposta %s enviada com sucesso para licitação %s | prestador=%s | valor=%s",
                proposta.id, pk, email_prestador, valor_total,
            )

            return Response(PropostaLicitacaoSerializer(proposta).data, status=status.HTTP_201_CREATED)

        except Licitacao.DoesNotExist:
            logger.error("Licitação %s não encontrada", pk)
            return Response({
                "erro": "Licitação não encontrada",
                "codigo": "LICITACAO_NAO_ENCONTRADA",
            }, status=404)
        except IntegrityError as e:
            logger.error("IntegrityError ao criar proposta para licitação %s: %s", pk, e)
            if "unique" in str(e).lower():
                return Response({
                    "erro": "Você já enviou uma proposta para esta licitação",
                    "codigo": "PROPOSTA_DUPLICADA",
                }, status=409)
            raise
        except Exception as e:
            tracking_id = str(uuid_module.uuid4())
            logger.error("Erro inesperado em proposta: %s", str(e), extra={"tracking_id": tracking_id})
            logger.exception("Stacktrace do erro inesperado:")
            return Response({
                "erro": "Erro ao processar proposta",
                "codigo": "ERRO_INTERNO",
                "tracking_id": tracking_id,
            }, status=500)
