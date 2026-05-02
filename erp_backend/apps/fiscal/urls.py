from django.urls import path

from .views import calcular_impostos, configuracao, consultar_cnpj

urlpatterns = [
    path("consultar-cnpj/", consultar_cnpj, name="fiscal-consultar-cnpj"),
    path("calcular-impostos/", calcular_impostos, name="fiscal-calcular-impostos"),
    path("configuracao/", configuracao, name="fiscal-configuracao"),
]

