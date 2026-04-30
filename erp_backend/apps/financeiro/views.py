from datetime import date
from decimal import Decimal

from django.db.models import Case, DecimalField, F, Sum, Value, When
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.ordens.models import OrdemServico

from .models import CategoriaFinanceira, ContaBancaria, Lancamento, TransferenciaEntreConta
from .serializers import (
    CategoriaFinanceiraSerializer,
    ContaBancariaSerializer,
    LancamentoSerializer,
    TransferenciaEntreContaSerializer,
)


def _periodo(request):
    hoje = timezone.localdate()
    inicio = request.query_params.get("inicio") or date(hoje.year, hoje.month, 1).isoformat()
    fim = request.query_params.get("fim") or hoje.isoformat()
    return inicio, fim


class ContaBancariaViewSet(viewsets.ModelViewSet):
    serializer_class = ContaBancariaSerializer
    filterset_fields = ["ativo", "tipo"]
    search_fields = ["nome", "banco", "agencia", "conta"]
    ordering_fields = ["nome", "saldo_inicial", "criado_em"]

    def get_queryset(self):
        movimento = Sum(
            Case(
                When(lancamentos__tipo=Lancamento.Tipo.RECEITA, lancamentos__status=Lancamento.Status.PAGO, then=F("lancamentos__valor")),
                When(lancamentos__tipo=Lancamento.Tipo.DESPESA, lancamentos__status=Lancamento.Status.PAGO, then=Value(-1) * F("lancamentos__valor")),
                default=Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
        return ContaBancaria.objects.annotate(
            saldo_atual=F("saldo_inicial")
            + Coalesce(movimento, Value(Decimal("0.00")), output_field=DecimalField(max_digits=12, decimal_places=2))
        )


class CategoriaFinanceiraViewSet(viewsets.ModelViewSet):
    queryset = CategoriaFinanceira.objects.select_related("pai")
    serializer_class = CategoriaFinanceiraSerializer
    filterset_fields = ["tipo", "pai"]
    search_fields = ["nome"]
    ordering_fields = ["tipo", "nome"]

    @action(detail=False, methods=["get"], url_path="resumo")
    def resumo(self, request):
        inicio, fim = _periodo(request)
        dados = (
            CategoriaFinanceira.objects.filter(lancamentos__data_competencia__range=[inicio, fim])
            .values("id", "nome", "tipo", "cor")
            .annotate(total=Coalesce(Sum("lancamentos__valor"), Decimal("0.00")))
            .order_by("tipo", "nome")
        )
        return Response(list(dados))


class LancamentoViewSet(viewsets.ModelViewSet):
    serializer_class = LancamentoSerializer
    filterset_fields = ["tipo", "status", "conta_bancaria", "categoria", "os"]
    search_fields = ["descricao", "fornecedor_cliente", "numero_documento", "os__numero"]
    ordering_fields = ["data_vencimento", "data_competencia", "valor", "criado_em"]

    def get_queryset(self):
        queryset = Lancamento.objects.select_related(
            "conta_bancaria",
            "categoria",
            "os",
            "criado_por",
        ).prefetch_related("anexos")
        inicio = self.request.query_params.get("inicio")
        fim = self.request.query_params.get("fim")
        if inicio:
            queryset = queryset.filter(data_vencimento__gte=inicio)
        if fim:
            queryset = queryset.filter(data_vencimento__lte=fim)
        return queryset

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=True, methods=["post"], url_path="confirmar-pagamento")
    def confirmar_pagamento(self, request, pk=None):
        lancamento = self.get_object()
        lancamento.status = Lancamento.Status.PAGO
        lancamento.data_pagamento = request.data.get("data_pagamento") or timezone.localdate()
        lancamento.save(update_fields=["status", "data_pagamento"])
        return Response(self.get_serializer(lancamento).data)


class TransferenciaEntreContaViewSet(viewsets.ModelViewSet):
    serializer_class = TransferenciaEntreContaSerializer
    filterset_fields = ["conta_origem", "conta_destino"]
    search_fields = ["descricao", "conta_origem__nome", "conta_destino__nome"]
    ordering_fields = ["data", "valor", "criado_em"]

    def get_queryset(self):
        return TransferenciaEntreConta.objects.select_related(
            "conta_origem",
            "conta_destino",
            "criado_por",
        )

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    inicio, fim = _periodo(request)
    lancamentos = Lancamento.objects.filter(data_competencia__range=[inicio, fim])
    receita = lancamentos.filter(tipo=Lancamento.Tipo.RECEITA).exclude(status=Lancamento.Status.CANCELADO).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"]
    despesa = lancamentos.filter(tipo=Lancamento.Tipo.DESPESA).exclude(status=Lancamento.Status.CANCELADO).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"]
    receber = Lancamento.objects.filter(tipo=Lancamento.Tipo.RECEITA, status__in=[Lancamento.Status.PENDENTE, Lancamento.Status.ATRASADO]).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"]
    pagar = Lancamento.objects.filter(tipo=Lancamento.Tipo.DESPESA, status__in=[Lancamento.Status.PENDENTE, Lancamento.Status.ATRASADO]).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"]
    saldo_total = ContaBancaria.objects.aggregate(total=Coalesce(Sum("saldo_inicial"), Decimal("0.00")))["total"]

    por_mes = (
        Lancamento.objects.exclude(status=Lancamento.Status.CANCELADO)
        .annotate(mes=TruncMonth("data_competencia"))
        .values("mes", "tipo")
        .annotate(total=Coalesce(Sum("valor"), Decimal("0.00")))
        .order_by("mes")
    )
    despesas_categoria = (
        Lancamento.objects.filter(tipo=Lancamento.Tipo.DESPESA, data_competencia__range=[inicio, fim])
        .exclude(status=Lancamento.Status.CANCELADO)
        .values("categoria__nome", "categoria__cor")
        .annotate(total=Coalesce(Sum("valor"), Decimal("0.00")))
        .order_by("-total")
    )
    contas_receber = LancamentoSerializer(Lancamento.objects.filter(tipo=Lancamento.Tipo.RECEITA, status__in=[Lancamento.Status.PENDENTE, Lancamento.Status.ATRASADO]).order_by("data_vencimento")[:10], many=True).data
    contas_pagar = LancamentoSerializer(Lancamento.objects.filter(tipo=Lancamento.Tipo.DESPESA, status__in=[Lancamento.Status.PENDENTE, Lancamento.Status.ATRASADO]).order_by("data_vencimento")[:10], many=True).data

    return Response(
        {
            "receita": receita,
            "despesa": despesa,
            "lucro": receita - despesa,
            "contas_receber": receber,
            "contas_pagar": pagar,
            "saldo_total": saldo_total,
            "por_mes": list(por_mes),
            "despesas_categoria": list(despesas_categoria),
            "contas_receber_lista": contas_receber,
            "contas_pagar_lista": contas_pagar,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fluxo_caixa(request):
    inicio, fim = _periodo(request)
    dados = (
        Lancamento.objects.filter(data_vencimento__range=[inicio, fim])
        .exclude(status=Lancamento.Status.CANCELADO)
        .values("data_vencimento", "tipo")
        .annotate(total=Coalesce(Sum("valor"), Decimal("0.00")))
        .order_by("data_vencimento")
    )
    return Response(list(dados))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def relatorio_dre(request):
    inicio, fim = _periodo(request)
    base = Lancamento.objects.filter(data_competencia__range=[inicio, fim]).exclude(status=Lancamento.Status.CANCELADO)
    receita = base.filter(tipo=Lancamento.Tipo.RECEITA).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"]
    despesa = base.filter(tipo=Lancamento.Tipo.DESPESA).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"]
    os_periodo = OrdemServico.objects.filter(criado_em__date__range=[inicio, fim]).values("status").annotate(total=Coalesce(Sum("valor_total_orcado"), Decimal("0.00")))
    hoje = timezone.localdate()
    aging = {
        "a_vencer": Lancamento.objects.filter(tipo=Lancamento.Tipo.RECEITA, status=Lancamento.Status.PENDENTE, data_vencimento__gte=hoje).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"],
        "ate_30": Lancamento.objects.filter(tipo=Lancamento.Tipo.RECEITA, status=Lancamento.Status.ATRASADO, data_vencimento__gte=hoje.replace(day=1)).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"],
        "vencidos": Lancamento.objects.filter(tipo=Lancamento.Tipo.RECEITA, status=Lancamento.Status.ATRASADO).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))["total"],
    }
    return Response(
        {
            "receita_bruta": receita,
            "despesas": despesa,
            "resultado": receita - despesa,
            "margem": (receita - despesa) / receita * 100 if receita else Decimal("0.00"),
            "ordens_servico": list(os_periodo),
            "aging_receber": aging,
        }
    )
