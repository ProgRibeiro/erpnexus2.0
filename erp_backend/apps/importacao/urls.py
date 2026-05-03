from django.urls import path
from . import views

urlpatterns = [
    path("clientes/exportar/", views.exportar_clientes, name="importacao-clientes-exportar"),
    path("clientes/importar/", views.importar_clientes, name="importacao-clientes-importar"),
    path("produtos/exportar/", views.exportar_produtos, name="importacao-produtos-exportar"),
    path("produtos/importar/", views.importar_produtos, name="importacao-produtos-importar"),
    path("servicos/exportar/", views.exportar_servicos, name="importacao-servicos-exportar"),
    path("servicos/importar/", views.importar_servicos, name="importacao-servicos-importar"),
    path("ordens/exportar/", views.exportar_ordens, name="importacao-ordens-exportar"),
    path("financeiro/exportar/", views.exportar_financeiro, name="importacao-financeiro-exportar"),
]
