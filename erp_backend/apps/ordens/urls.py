from rest_framework.routers import DefaultRouter

from .views import OrdemServicoViewSet

router = DefaultRouter()
router.register("", OrdemServicoViewSet, basename="ordens")

urlpatterns = router.urls
