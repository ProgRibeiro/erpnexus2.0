from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.DashboardContratanteView.as_view(), name='contratante-dashboard'),
    path('unidades/', views.UnidadesContratanteView.as_view(), name='contratante-unidades'),
    path('chamados/', views.ChamadosContratanteView.as_view(), name='contratante-chamados'),
    path('chamados/<int:pk>/aprovar-orcamento/', views.AprovarOrcamentoView.as_view(), name='contratante-aprovar-orcamento'),
    path('chamados/<int:pk>/recusar-orcamento/', views.RecusarOrcamentoView.as_view(), name='contratante-recusar-orcamento'),
    path('budget/', views.BudgetContratanteView.as_view(), name='contratante-budget'),
    path('aprovacoes-pendentes/', views.AprovacoesPendentesView.as_view(), name='contratante-aprovacoes-pendentes'),
    path('aprovacoes/<int:pk>/aprovar/', views.AprovarSolicitacaoView.as_view(), name='contratante-aprovar'),
    path('aprovacoes/<int:pk>/reprovar/', views.ReprovarSolicitacaoView.as_view(), name='contratante-reprovar'),
    path('relatorios/sla/', views.RelatorioSLAView.as_view(), name='contratante-relatorio-sla'),
    path('relatorios/custo-unidade/', views.RelatorioCustoUnidadeView.as_view(), name='contratante-relatorio-custo'),
    path('relatorios/auditoria/', views.RelatorioAuditoriaView.as_view(), name='contratante-relatorio-auditoria'),
    path('bi/visao-geral/', views.BIVisaoGeralView.as_view(), name='contratante-bi-visao-geral'),
    path('bi/evolucao/', views.BIEvolucaoView.as_view(), name='contratante-bi-evolucao'),
    path('bi/heatmap-unidades/', views.BIHeatmapUnidadesView.as_view(), name='contratante-bi-heatmap'),
    path('bi/curva-abc-prestadores/', views.BICurvaABCPrestadoresView.as_view(), name='contratante-bi-curva-abc'),
    path('bi/comparativo-regionais/', views.BIComparativoRegionaisView.as_view(), name='contratante-bi-comparativo'),
]
