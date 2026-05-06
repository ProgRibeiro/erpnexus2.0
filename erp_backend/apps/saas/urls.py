from django.urls import path
from . import views

urlpatterns = [
    # Tenant
    path('tenants/', views.TenantListCreateView.as_view(), name='saas-tenant-list'),
    path('tenants/<int:pk>/', views.TenantDetailView.as_view(), name='saas-tenant-detail'),

    # Planos SaaS (somente leitura)
    path('planos/', views.PlanoSaaSListView.as_view(), name='saas-plano-list'),

    # Empresas (hierarquia multi-empresa)
    path('empresas/', views.EmpresaListCreateView.as_view(), name='saas-empresa-list'),
    path('empresas/<int:pk>/', views.EmpresaDetailView.as_view(), name='saas-empresa-detail'),

    # Unidades
    path('unidades/', views.UnidadeListCreateView.as_view(), name='saas-unidade-list'),
    path('unidades/<int:pk>/', views.UnidadeDetailView.as_view(), name='saas-unidade-detail'),

    # Níveis de aprovação
    path('niveis-aprovacao/', views.NivelAprovacaoListCreateView.as_view(), name='saas-nivel-list'),
    path('niveis-aprovacao/<int:pk>/', views.NivelAprovacaoDetailView.as_view(), name='saas-nivel-detail'),

    # Centro de custo
    path('centros-custo/', views.CentroCustoListCreateView.as_view(), name='saas-cc-list'),
    path('centros-custo/<int:pk>/', views.CentroCustoDetailView.as_view(), name='saas-cc-detail'),

    # Prestadores contratados
    path('prestadores-contratados/', views.PrestadorContratadoListCreateView.as_view(), name='saas-prestador-list'),
    path('prestadores-contratados/<int:pk>/', views.PrestadorContratadoDetailView.as_view(), name='saas-prestador-detail'),

    # Categorias de budget
    path('categorias-budget/', views.CategoriaBudgetListCreateView.as_view(), name='saas-categoria-list'),
    path('categorias-budget/<int:pk>/', views.CategoriaBudgetDetailView.as_view(), name='saas-categoria-detail'),

    # Contratos SaaS
    path('contratos/', views.ContratoSaaSListCreateView.as_view(), name='saas-contrato-list'),
    path('contratos/<int:pk>/', views.ContratoSaaSDetailView.as_view(), name='saas-contrato-detail'),

    # Aprovadores de alçada
    path('aprovadores-alcada/', views.AprovadorAlcadaListCreateView.as_view(), name='saas-aprovador-list'),
    path('aprovadores-alcada/<int:pk>/', views.AprovadorAlcadaDetailView.as_view(), name='saas-aprovador-detail'),
]

