from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChecklistTemplateViewSet, OrdemServicoViewSet, RelatorioPublicoPDFView, RelatorioPublicoView

router = DefaultRouter()
router.register("checklists", ChecklistTemplateViewSet, basename="checklists")
router.register("", OrdemServicoViewSet, basename="ordens")

urlpatterns = [
    path("publico/relatorio/<uuid:token>/", RelatorioPublicoView.as_view(), name="relatorio-publico"),
    path("publico/relatorio/<uuid:token>/pdf/", RelatorioPublicoPDFView.as_view(), name="relatorio-publico-pdf"),
]

urlpatterns += router.urls
