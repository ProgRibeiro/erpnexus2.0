from django.urls import path

from .views import empresa, notificacoes, configuracao_os, configuracao_financeira

urlpatterns = [
    path("empresa/", empresa, name="configuracoes-empresa"),
    path("notificacoes/", notificacoes, name="configuracoes-notificacoes"),
    path("os/", configuracao_os, name="configuracoes-os"),
    path("financeira/", configuracao_financeira, name="configuracoes-financeira"),
]
