from django.urls import path

from .views import (
    calcular_impostos,
    calcular_reforma_tributaria,
    conciliar_pgdas,
    configuracao,
    consultar_cnpj,
    decisao_ibs_cbs,
    emitir_documento_mock,
    operacoes_fiscais,
    tabelas_tributarias,
)

urlpatterns = [
    path("consultar-cnpj/", consultar_cnpj, name="fiscal-consultar-cnpj"),
    path("calcular-impostos/", calcular_impostos, name="fiscal-calcular-impostos"),
    path("reforma/calcular/", calcular_reforma_tributaria, name="fiscal-reforma-calcular"),
    path("reforma/decisao-ibs-cbs/", decisao_ibs_cbs, name="fiscal-decisao-ibs-cbs"),
    path("regras/tabelas/", tabelas_tributarias, name="fiscal-tabelas-tributarias"),
    path("operacoes/", operacoes_fiscais, name="fiscal-operacoes"),
    path("emissao/mock/", emitir_documento_mock, name="fiscal-emissao-mock"),
    path("obrigacoes/pgdas/conciliar/", conciliar_pgdas, name="fiscal-pgdas-conciliar"),
    path("configuracao/", configuracao, name="fiscal-configuracao"),
]
