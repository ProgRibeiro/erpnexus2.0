from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MasterLoginView,
    MasterRefreshView,
    MasterDashboardView,
    MetricasSaaSView,
    PlanoCatalogoViewSet,
    ClienteSaaSViewSet,
    AssinaturaSaaSViewSet,
    PagamentoMensalidadeViewSet,
    LogAcessoMasterView,
)

router = DefaultRouter()
router.register("planos", PlanoCatalogoViewSet, basename="master-planos")
router.register("clientes", ClienteSaaSViewSet, basename="master-clientes")
router.register("assinaturas", AssinaturaSaaSViewSet, basename="master-assinaturas")
router.register("pagamentos", PagamentoMensalidadeViewSet, basename="master-pagamentos")

urlpatterns = [
    path("auth/login/", MasterLoginView.as_view(), name="master-login"),
    path("auth/refresh/", MasterRefreshView.as_view(), name="master-refresh"),
    path("dashboard/", MasterDashboardView.as_view(), name="master-dashboard"),
    path("metricas/", MetricasSaaSView.as_view(), name="master-metricas"),
    path("logs/", LogAcessoMasterView.as_view(), name="master-logs"),
    path("", include(router.urls)),
]
