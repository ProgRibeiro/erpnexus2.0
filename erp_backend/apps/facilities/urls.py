from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AtivoViewSet, PlanoManutencaoViewSet, ChecklistItemViewSet,
    ChamadoFacilitiesViewSet, ContratoTerceirizadoViewSet,
    DocumentoFacilitiesViewSet, ExecucaoManutencaoViewSet,
    ProjetoObraViewSet, FaseObraViewSet, DiarioObraViewSet,
    BoletimMedicaoViewSet, dashboard_facilities,
    LicitacaoViewSet, PropostaLicitacaoViewSet,
)

router = DefaultRouter()
router.register("ativos", AtivoViewSet, basename="facilities-ativos")
router.register("planos", PlanoManutencaoViewSet, basename="facilities-planos")
router.register("checklist", ChecklistItemViewSet, basename="facilities-checklist")
router.register("documentos", DocumentoFacilitiesViewSet, basename="facilities-documentos")
router.register("execucoes", ExecucaoManutencaoViewSet, basename="facilities-execucoes")
router.register("chamados", ChamadoFacilitiesViewSet, basename="facilities-chamados")
router.register("contratos", ContratoTerceirizadoViewSet, basename="facilities-contratos")
router.register("projetos", ProjetoObraViewSet, basename="facilities-projetos")
router.register("fases", FaseObraViewSet, basename="facilities-fases")
router.register("diarios", DiarioObraViewSet, basename="facilities-diarios")
router.register("boletins", BoletimMedicaoViewSet, basename="facilities-boletins")
router.register("licitacoes", LicitacaoViewSet, basename="facilities-licitacoes")
router.register("propostas-licitacao", PropostaLicitacaoViewSet, basename="facilities-propostas-licitacao")

urlpatterns = [
    path("dashboard/", dashboard_facilities, name="facilities-dashboard"),
] + router.urls
