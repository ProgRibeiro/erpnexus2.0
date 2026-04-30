from rest_framework import viewsets

from .models import OrdemServico
from .serializers import OrdemServicoSerializer


class OrdemServicoViewSet(viewsets.ModelViewSet):
    queryset = OrdemServico.objects.select_related("cliente", "tecnico_responsavel")
    serializer_class = OrdemServicoSerializer
    search_fields = ["titulo", "descricao", "cliente__nome"]
    filterset_fields = ["status", "cliente", "tecnico_responsavel"]
    ordering_fields = ["criado_em", "data_agendada", "valor_total"]
