from django.urls import path

from .views import (
    aprovar_orcamento,
    login,
    meus_orcamentos,
    minhas_notas,
    minhas_os,
    recusar_orcamento,
)

urlpatterns = [
    path("auth/login/", login, name="portal-login"),
    path("minhas-os/", minhas_os, name="portal-minhas-os"),
    path("meus-orcamentos/", meus_orcamentos, name="portal-meus-orcamentos"),
    path("orcamentos/<int:id>/aprovar/", aprovar_orcamento, name="portal-aprovar-orcamento"),
    path("orcamentos/<int:id>/recusar/", recusar_orcamento, name="portal-recusar-orcamento"),
    path("minhas-notas/", minhas_notas, name="portal-minhas-notas"),
]
