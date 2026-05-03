from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    LogoutView,
    PerfilView,
    listar_usuarios,
    gerenciar_usuario,
    resetar_senha_usuario,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("perfil/", PerfilView.as_view(), name="perfil"),
    path("", listar_usuarios, name="listar-usuarios"),
    path("<int:usuario_id>/", gerenciar_usuario, name="gerenciar-usuario"),
    path("<int:usuario_id>/resetar-senha/", resetar_senha_usuario, name="resetar-senha-usuario"),
]
