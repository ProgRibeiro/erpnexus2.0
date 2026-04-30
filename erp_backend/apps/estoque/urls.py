from rest_framework.routers import DefaultRouter

from .views import ProdutoViewSet

router = DefaultRouter()
router.register("", ProdutoViewSet, basename="estoque")

urlpatterns = router.urls
