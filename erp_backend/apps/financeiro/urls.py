from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaFinanceiraViewSet,
    ContaBancariaViewSet,
    LancamentoViewSet,
    TransferenciaEntreContaViewSet,
    dashboard,
    fluxo_caixa,
    relatorio_dre,
)

router = DefaultRouter()
router.register("lancamentos", LancamentoViewSet, basename="financeiro-lancamentos")
router.register("contas-bancarias", ContaBancariaViewSet, basename="financeiro-contas")
router.register("categorias", CategoriaFinanceiraViewSet, basename="financeiro-categorias")
router.register("transferencias", TransferenciaEntreContaViewSet, basename="financeiro-transferencias")

urlpatterns = [
    path("dashboard/", dashboard, name="financeiro-dashboard"),
    path("fluxo-caixa/", fluxo_caixa, name="financeiro-fluxo-caixa"),
    path("relatorio-dre/", relatorio_dre, name="financeiro-relatorio-dre"),
]

urlpatterns += router.urls
