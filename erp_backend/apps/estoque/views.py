from rest_framework import viewsets

from .models import Produto
from .serializers import ProdutoSerializer


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    filterset_fields = ["ativo"]
    search_fields = ["nome", "sku"]
    ordering_fields = ["nome", "quantidade", "preco_venda", "criado_em"]
