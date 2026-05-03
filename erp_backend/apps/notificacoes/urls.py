"""
URLs para API de notificações.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LogNotificacaoViewSet, ConfiguracaoNotificacaoViewSet

router = DefaultRouter()
router.register(r"logs", LogNotificacaoViewSet, basename="log-notificacao")
router.register(r"configuracoes", ConfiguracaoNotificacaoViewSet, basename="configuracao-notificacao")

app_name = "notificacoes"

urlpatterns = [
    path("", include(router.urls)),
]
