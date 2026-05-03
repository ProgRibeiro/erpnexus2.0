from django.urls import path

from .views import (
    aprovar_orcamento,
    login,
    meus_orcamentos,
    minhas_notas,
    minhas_os,
    minhas_os_detalhes,
    minhas_os_relatorio,
    recusar_orcamento,
)

urlpatterns = [
    # Autenticação
    path("auth/login/", login, name="portal-login"),

    # Ordens de Serviço
    path("minhas-os/", minhas_os, name="portal-minhas-os"),
    path("minhas-os/<int:os_id>/", minhas_os_detalhes, name="portal-minhas-os-detalhes"),
    path("minhas-os/<int:os_id>/relatorio/", minhas_os_relatorio, name="portal-minhas-os-relatorio"),

    # Orçamentos
    path("meus-orcamentos/", meus_orcamentos, name="portal-meus-orcamentos"),
    path("orcamentos/<int:orcamento_id>/aprovar/", aprovar_orcamento, name="portal-aprovar-orcamento"),
    path("orcamentos/<int:orcamento_id>/recusar/", recusar_orcamento, name="portal-recusar-orcamento"),

    # Notas Fiscais
    path("minhas-notas/", minhas_notas, name="portal-minhas-notas"),
]
