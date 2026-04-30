from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AtividadeCRMViewSet,
    OportunidadeViewSet,
    PipelineViewSet,
    TagCRMViewSet,
    kanban_pipeline,
)

router = DefaultRouter()
router.register("pipelines", PipelineViewSet, basename="crm-pipelines")
router.register("oportunidades", OportunidadeViewSet, basename="crm-oportunidades")
router.register("atividades", AtividadeCRMViewSet, basename="crm-atividades")
router.register("tags", TagCRMViewSet, basename="crm-tags")

urlpatterns = [
    path("kanban/<int:pipeline_id>/", kanban_pipeline, name="crm-kanban"),
]

urlpatterns += router.urls
