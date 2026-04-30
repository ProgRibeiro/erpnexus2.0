from rest_framework import viewsets

from .models import RelatorioGerado
from .serializers import RelatorioGeradoSerializer


class RelatorioGeradoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RelatorioGerado.objects.all()
    serializer_class = RelatorioGeradoSerializer
    search_fields = ["nome"]
    ordering_fields = ["criado_em"]
