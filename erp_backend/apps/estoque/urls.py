from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaProdutoViewSet,
    MovimentacaoEstoqueViewSet,
    ProdutoViewSet,
    ServicoViewSet,
    ImportExcelViewSet,
    AlertaEstoqueViewSet,
    MotorCatalogoViewSet,
    relatorio_estoque,
    relatorio_produtos,
    dashboard_estoque,
)

router = DefaultRouter()
router.register("produtos", ProdutoViewSet, basename="estoque-produtos")
router.register("categorias", CategoriaProdutoViewSet, basename="estoque-categorias")
router.register("movimentacoes", MovimentacaoEstoqueViewSet, basename="estoque-movimentacoes")
router.register("alertas", AlertaEstoqueViewSet, basename="estoque-alertas")
router.register("servicos", ServicoViewSet, basename="estoque-servicos")
router.register("excel-import", ImportExcelViewSet, basename="excel-import")
router.register("motor-catalogo", MotorCatalogoViewSet, basename="motor-catalogo")

urlpatterns = [
    path("relatorio/", relatorio_estoque, name="estoque-relatorio"),
    path("relatorio-produtos/", relatorio_produtos, name="estoque-relatorio-produtos"),
    path("dashboard/", dashboard_estoque, name="estoque-dashboard"),
]

urlpatterns += router.urls
