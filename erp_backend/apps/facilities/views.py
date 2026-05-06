import datetime
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
    queryset = Licitacao.objects.prefetch_related("propostas").select_related("ativo")
    serializer_class = LicitacaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "modo", "tipo_servico"]
    search_fields = ["titulo", "descricao"]
    ordering_fields = ["criado_em", "prazo_propostas"]

    @action(detail=True, methods=["post"])
    def aceitar_proposta(self, request, pk=None):
        licitacao = self.get_object()
        proposta_id = request.data.get("proposta_id")
        if not proposta_id:
            return Response({"error": "proposta_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            proposta = licitacao.propostas.get(id=proposta_id)
        except PropostaLicitacao.DoesNotExist:
            return Response({"error": "Proposta não encontrada"}, status=status.HTTP_404_NOT_FOUND)
        licitacao.propostas.exclude(id=proposta_id).update(status=PropostaLicitacao.Status.RECUSADA)
        proposta.status = PropostaLicitacao.Status.ACEITA
        proposta.save()
        licitacao.status = Licitacao.Status.CONCLUIDA
        licitacao.save()
        return Response({"ok": True, "proposta_id": proposta_id})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def propostas(self, request, pk=None):
        try:
            # 1. Busca a licitação com lock para evitar race condition
            licitacao = Licitacao.objects.select_for_update().get(pk=pk)
            logger.info("Recebida proposta para licitação %s de %s", pk, request.user)

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

            # 6. Valida e converte o valor
            try:
                valor_total = Decimal(str(request.data.get("valor", 0)))
            except (InvalidOperation, TypeError):
                return Response({
                    "erro": "Valor inválido. Informe um número decimal válido.",
                    "codigo": "VALOR_INVALIDO",
                }, status=400)

            if valor_total <= 0:
                return Response({
                    "erro": "O valor da proposta deve ser maior que zero",
                    "codigo": "VALOR_INVALIDO",
                }, status=400)

            if licitacao.valor_maximo and valor_total > licitacao.valor_maximo:
                return Response({
                    "erro": f"Valor acima do máximo permitido (R$ {licitacao.valor_maximo:,.2f})",
                    "codigo": "VALOR_ACIMA_MAXIMO",
                }, status=400)

            # 7. Valida prazo_execucao_dias
            try:
                prazo_dias = int(request.data.get("prazo_execucao_dias", 0))
                if prazo_dias <= 0:
                    raise ValueError
            except (ValueError, TypeError):
                return Response({
                    "erro": "Prazo de execução inválido. Informe um número inteiro de dias.",
                    "codigo": "PRAZO_INVALIDO",
                }, status=400)

            # 8. Cria a proposta
            proposta_uuid = idempotency_key or str(uuid_module.uuid4())
            nome_prestador = request.user.get_full_name() or request.user.email

            proposta = PropostaLicitacao.objects.create(
                uuid=proposta_uuid,
                licitacao=licitacao,
                prestador_nome=nome_prestador,
                prestador_email=email_prestador,
                valor=valor_total,
                prazo_execucao_dias=prazo_dias,
                condicao_pagamento=request.data.get("condicao_pagamento", ""),
                validade_proposta=request.data.get("validade_proposta") or None,
                itens_orcamento=request.data.get("itens_orcamento", []),
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
            logger.exception("Erro inesperado ao enviar proposta licitação %s [tracking=%s]", pk, tracking_id)
            return Response({
                "erro": "Erro interno ao processar proposta. Tente novamente.",
                "codigo": "ERRO_INTERNO",
                "tracking_id": tracking_id,
            }, status=500)
