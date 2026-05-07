from rest_framework.routers import DefaultRouter

from .views import ContratoPreventivaViewSet, EscopoTecnicoViewSet, FaturaContratoViewSet, OSContratoPreventivaViewSet

router = DefaultRouter()
router.register("escopos", EscopoTecnicoViewSet, basename="contratos-escopos")
router.register("os", OSContratoPreventivaViewSet, basename="contratos-os")
router.register("faturas", FaturaContratoViewSet, basename="contratos-faturas")
router.register("", ContratoPreventivaViewSet, basename="contratos")

urlpatterns = router.urls
