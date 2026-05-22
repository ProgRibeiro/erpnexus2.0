"""
Views CRUD para gerenciamento das configurações do SaaS Facilities.
Usadas pela página de Configurações do Facilities no frontend.
"""
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal, InvalidOperation
from uuid import uuid4
import logging

from .models import (
    Tenant, PlanoSaaS, Empresa, Unidade, NivelAprovacao,
    AprovadorAlcada, CentroCusto, PrestadorContratado,
    CategoriaBudget, ContratoSaaS,
)
from .serializers import (
    TenantSerializer, PlanoSaaSSerializer, EmpresaSerializer,
    UnidadeSerializer, NivelAprovacaoSerializer, AprovadorAlcadaSerializer,
    CentroCustoSerializer, PrestadorContratadoSerializer,
    CategoriaBudgetSerializer, ContratoSaaSSerializer,
)
from .models_licitacao import Licitacao, PropostaLicitacao, ItemProposta, EventoLicitacao, OutboxMessage
from .serializers_licitacao import PropostaSerializer
from apps.facilities.models import Licitacao as FacilitiesLicitacao, PropostaLicitacao as FacilitiesPropostaLicitacao, OutboxMessage as FacilitiesOutboxMessage
from apps.facilities.serializers import PropostaLicitacaoSerializer as FacilitiesPropostaLicitacaoSerializer

logger = logging.getLogger(__name__)


# ── Tenant ────────────────────────────────────────────────────────────────────

class TenantListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TenantSerializer

    def get_queryset(self):
        return Tenant.objects.filter(ativo=True).order_by("-criado_em")


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TenantSerializer
    queryset = Tenant.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Plano SaaS ────────────────────────────────────────────────────────────────

class PlanoSaaSListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlanoSaaSSerializer
    queryset = PlanoSaaS.objects.filter(ativo=True).order_by("valor_mensal")


# ── Empresa (hierarquia multi-empresa) ───────────────────────────────────────

class EmpresaListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmpresaSerializer

    def get_queryset(self):
        qs = Empresa.objects.filter(ativo=True).select_related("tenant", "empresa_pai")
        tenant_id = self.request.query_params.get("tenant")
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.order_by("nivel_hierarquia", "nome")


class EmpresaDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmpresaSerializer
    queryset = Empresa.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Unidade ───────────────────────────────────────────────────────────────────

class UnidadeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UnidadeSerializer

    def get_queryset(self):
        qs = Unidade.objects.filter(ativo=True).select_related("empresa")
        empresa_id = self.request.query_params.get("empresa")
        tipo = self.request.query_params.get("tipo")
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs.order_by("codigo_interno")


class UnidadeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UnidadeSerializer
    queryset = Unidade.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Nível de Aprovação ────────────────────────────────────────────────────────

class NivelAprovacaoListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NivelAprovacaoSerializer

    def get_queryset(self):
        qs = NivelAprovacao.objects.all().select_related("tenant")
        tenant_id = self.request.query_params.get("tenant")
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.order_by("ordem")


class NivelAprovacaoDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NivelAprovacaoSerializer
    queryset = NivelAprovacao.objects.all()


# ── Centro de Custo ───────────────────────────────────────────────────────────

class CentroCustoListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CentroCustoSerializer

    def get_queryset(self):
        qs = CentroCusto.objects.filter(ativo=True).select_related("empresa")
        empresa_id = self.request.query_params.get("empresa")
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs.order_by("codigo")


class CentroCustoDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CentroCustoSerializer
    queryset = CentroCusto.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Prestador Contratado ──────────────────────────────────────────────────────

class PrestadorContratadoListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrestadorContratadoSerializer

    def get_queryset(self):
        qs = PrestadorContratado.objects.filter(ativo=True).select_related(
            "tenant_contratante", "tenant_prestador"
        )
        tenant_id = self.request.query_params.get("tenant")
        if not tenant_id and hasattr(self.request.user, 'tenant'):
            tenant_id = self.request.user.tenant_id
            
        if tenant_id:
            qs = qs.filter(tenant_contratante_id=tenant_id)
        return qs.order_by("tenant_prestador__nome")


class PrestadorContratadoDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PrestadorContratadoSerializer
    queryset = PrestadorContratado.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Categoria Budget ──────────────────────────────────────────────────────────

class CategoriaBudgetListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CategoriaBudgetSerializer
    queryset = CategoriaBudget.objects.filter(ativo=True).order_by("nome")


class CategoriaBudgetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CategoriaBudgetSerializer
    queryset = CategoriaBudget.objects.all()


# ── Contrato SaaS ─────────────────────────────────────────────────────────────

class ContratoSaaSListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratoSaaSSerializer

    def get_queryset(self):
        return ContratoSaaS.objects.select_related("tenant").order_by("-inicio")


class ContratoSaaSDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratoSaaSSerializer
    queryset = ContratoSaaS.objects.all()


# ── Aprovador de Alçada ───────────────────────────────────────────────────────

class AprovadorAlcadaListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AprovadorAlcadaSerializer

    def get_queryset(self):
        qs = AprovadorAlcada.objects.filter(ativo=True).select_related("nivel", "usuario")
        nivel_id = self.request.query_params.get("nivel")
        if nivel_id:
            qs = qs.filter(nivel_id=nivel_id)
        return qs


class AprovadorAlcadaDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AprovadorAlcadaSerializer
    queryset = AprovadorAlcada.objects.all()

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save()


# ── Licitações e Propostas ───────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def enviar_proposta(request, licitacao_id):
    try:
        licitacao = FacilitiesLicitacao.objects.select_for_update().get(id=licitacao_id)

        if licitacao.status != FacilitiesLicitacao.Status.PUBLICADA:
            return Response({
                'erro': 'Licitação não está disponível para receber propostas',
                'codigo': 'LICITACAO_NAO_PUBLICADA'
            }, status=status.HTTP_400_BAD_REQUEST)

        if licitacao.prazo_propostas and licitacao.prazo_propostas < timezone.now():
            return Response({
                'erro': 'Licitação já encerrada',
                'codigo': 'LICITACAO_ENCERRADA'
            }, status=status.HTTP_400_BAD_REQUEST)

        user_tenant_id = getattr(request.user, 'tenant_id', None)
        if licitacao.modo == FacilitiesLicitacao.Modo.CONVIDADA and licitacao.prestadores_convidados.exists():
            if not user_tenant_id or not licitacao.prestadores_convidados.filter(id=user_tenant_id).exists():
                return Response({
                    'erro': 'Você não foi convidado para esta licitação',
                    'codigo': 'NAO_CONVIDADO'
                }, status=status.HTTP_403_FORBIDDEN)

        uuid_proposta = request.headers.get('X-Idempotency-Key')
        if uuid_proposta:
            existente = FacilitiesPropostaLicitacao.objects.filter(uuid=uuid_proposta).first()
            if existente:
                return Response(FacilitiesPropostaLicitacaoSerializer(existente).data, status=status.HTTP_200_OK)

        ja_enviou = FacilitiesPropostaLicitacao.objects.filter(
            licitacao=licitacao,
            prestador_email=request.user.email,
        ).exists()
        if ja_enviou:
            return Response({
                'erro': 'Você já enviou proposta para esta licitação',
                'codigo': 'PROPOSTA_DUPLICADA'
            }, status=status.HTTP_409_CONFLICT)

        try:
            valor_total = Decimal(str(request.data.get('valor_total', 0)))
        except (InvalidOperation, TypeError):
            return Response({
                'erro': 'Valor inválido',
                'codigo': 'VALOR_INVALIDO'
            }, status=status.HTTP_400_BAD_REQUEST)

        if valor_total <= 0:
            return Response({
                'erro': 'O valor da proposta deve ser maior que zero',
                'codigo': 'VALOR_INVALIDO'
            }, status=status.HTTP_400_BAD_REQUEST)

        if licitacao.valor_maximo and valor_total > licitacao.valor_maximo:
            return Response({
                'erro': f'Valor acima do máximo permitido (R$ {licitacao.valor_maximo})',
                'codigo': 'VALOR_ACIMA_MAXIMO'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            prazo_execucao = int(request.data.get('prazo_execucao', 0))
        except (TypeError, ValueError):
            prazo_execucao = 0

        if prazo_execucao <= 0:
            return Response({
                'erro': 'Prazo de execução inválido',
                'codigo': 'PRAZO_INVALIDO'
            }, status=status.HTTP_400_BAD_REQUEST)

        itens_orcamento = [
            {
                'descricao': item.get('descricao', ''),
                'quantidade': item.get('quantidade', 0),
                'unidade': item.get('unidade', ''),
                'valor_unitario': item.get('valor_unitario', 0),
                'valor_total': item.get('valor_total', 0),
                'ordem': item.get('ordem', 0),
            }
            for item in request.data.get('itens', [])
        ]

        proposta = FacilitiesPropostaLicitacao.objects.create(
            uuid=uuid_proposta or uuid4(),
            licitacao=licitacao,
            prestador_nome=(
                getattr(request.user, 'nome_completo', '')
                or getattr(request.user, 'first_name', '')
                or getattr(request.user, 'username', '')
                or request.user.email
            ),
            prestador_email=request.user.email,
            valor=valor_total,
            prazo_execucao_dias=prazo_execucao,
            condicao_pagamento=request.data.get('condicao', ''),
            validade_proposta=request.data.get('validade'),
            itens_orcamento=itens_orcamento,
            observacoes=request.data.get('observacoes', ''),
            status=FacilitiesPropostaLicitacao.Status.ENVIADA,
        )

        FacilitiesOutboxMessage.objects.create(
            aggregate_type='Proposta',
            aggregate_id=str(proposta.uuid),
            event_type='proposta.enviada',
            payload={
                'proposta_id': proposta.id,
                'licitacao_id': licitacao.id,
                'licitacao_titulo': licitacao.titulo,
                'prestador_nome': proposta.prestador_nome,
                'prestador_email': proposta.prestador_email,
                'valor': str(valor_total),
                'prazo_dias': prazo_execucao,
            },
            status='pendente'
        )

        return Response(FacilitiesPropostaLicitacaoSerializer(proposta).data, status=status.HTTP_201_CREATED)

    except FacilitiesLicitacao.DoesNotExist:
        return Response({
            'erro': 'Licitação não encontrada',
            'codigo': 'LICITACAO_NAO_ENCONTRADA'
        }, status=status.HTTP_404_NOT_FOUND)
    except ValidationError as e:
        return Response({
            'erro': str(e),
            'codigo': 'VALIDACAO_FALHOU',
            'detalhes': e.message_dict if hasattr(
                e, 'message_dict') else None
        }, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError as e:
        if 'unique' in str(e).lower():
            return Response({
                'erro': 'Você já enviou proposta para esta licitação',
                'codigo': 'PROPOSTA_DUPLICADA'
            }, status=status.HTTP_409_CONFLICT)
        raise
    except Exception as e:
        logger.exception("Erro inesperado em proposta")
        return Response({
            'erro': 'Erro ao processar proposta',
            'codigo': 'ERRO_INTERNO',
            'tracking_id': str(uuid4())
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
