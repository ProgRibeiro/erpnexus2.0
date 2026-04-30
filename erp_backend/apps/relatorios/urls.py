from rest_framework.routers import DefaultRouter

from .views import RelatorioGeradoViewSet

router = DefaultRouter()
router.register("", RelatorioGeradoViewSet, basename="relatorios")

urlpatterns = router.urls
