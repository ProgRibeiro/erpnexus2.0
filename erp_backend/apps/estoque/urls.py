from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaProdutoViewSet,
    MovimentacaoEstoqueViewSet,
    ProdutoViewSet,
    ServicoViewSet,
    ImportExcelViewSet,
    relatorio_estoque,
)

router = DefaultRouter()
router.register("produtos", ProdutoViewSet, basename="estoque-produtos")
router.register("categorias", CategoriaProdutoViewSet, basename="estoque-categorias")
router.register("movimentacoes", MovimentacaoEstoqueViewSet, basename="estoque-movimentacoes")
router.register("servicos", ServicoViewSet, basename="estoque-servicos")
router.register("excel-import", ImportExcelViewSet, basename="excel-import")

urlpatterns = [
    path("relatorio/", relatorio_estoque, name="estoque-relatorio"),
]

urlpatterns += router.urls
