from rest_framework.routers import DefaultRouter

from .views import OportunidadeViewSet

router = DefaultRouter()
router.register("", OportunidadeViewSet, basename="crm")

urlpatterns = router.urls
