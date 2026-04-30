from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaProdutoViewSet,
    MovimentacaoEstoqueViewSet,
    ProdutoViewSet,
    relatorio_estoque,
)

router = DefaultRouter()
router.register("produtos", ProdutoViewSet, basename="estoque-produtos")
router.register("categorias", CategoriaProdutoViewSet, basename="estoque-categorias")
router.register("movimentacoes", MovimentacaoEstoqueViewSet, basename="estoque-movimentacoes")

urlpatterns = [
    path("relatorio/", relatorio_estoque, name="estoque-relatorio"),
]

urlpatterns += router.urls
