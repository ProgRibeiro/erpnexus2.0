from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ComprovantePagamentoTerceiroView, PortalTerceiroView, TerceirizadoViewSet

router = DefaultRouter()
router.register("terceirizados", TerceirizadoViewSet, basename="terceirizados")

urlpatterns = [
    path("portal/", PortalTerceiroView.as_view(), name="portal-terceiro"),
    path("pagamentos/<int:lancamento_id>/comprovantes/", ComprovantePagamentoTerceiroView.as_view(), name="terceiro-comprovantes"),
]

urlpatterns += router.urls
