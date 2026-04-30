from rest_framework import viewsets

from .models import LancamentoFinanceiro
from .serializers import LancamentoFinanceiroSerializer


class LancamentoFinanceiroViewSet(viewsets.ModelViewSet):
    queryset = LancamentoFinanceiro.objects.select_related("cliente")
    serializer_class = LancamentoFinanceiroSerializer
    filterset_fields = ["tipo", "pago", "cliente"]
    search_fields = ["descricao", "cliente__nome"]
    ordering_fields = ["vencimento", "valor", "criado_em"]
