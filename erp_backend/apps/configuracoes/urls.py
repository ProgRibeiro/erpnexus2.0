from django.urls import path

from .views import empresa, notificacoes

urlpatterns = [
    path("empresa/", empresa, name="configuracoes-empresa"),
    path("notificacoes/", notificacoes, name="configuracoes-notificacoes"),
]
