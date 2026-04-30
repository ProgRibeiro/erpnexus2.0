from rest_framework import viewsets

from .models import Oportunidade
from .serializers import OportunidadeSerializer


class OportunidadeViewSet(viewsets.ModelViewSet):
    queryset = Oportunidade.objects.select_related("cliente")
    serializer_class = OportunidadeSerializer
    filterset_fields = ["etapa", "cliente"]
    search_fields = ["titulo", "cliente__nome"]
    ordering_fields = ["valor_estimado", "probabilidade", "criado_em"]
