from django.urls import path

from .views import empresa, notificacoes, configuracao_os, configuracao_financeira, logos_clientes, logo_cliente_detalhe

urlpatterns = [
    path("empresa/", empresa, name="configuracoes-empresa"),
    path("notificacoes/", notificacoes, name="configuracoes-notificacoes"),
    path("os/", configuracao_os, name="configuracoes-os"),
    path("financeira/", configuracao_financeira, name="configuracoes-financeira"),
    path("logos-clientes/", logos_clientes, name="logos-clientes"),
    path("logos-clientes/<int:pk>/", logo_cliente_detalhe, name="logo-cliente-detalhe"),
]
