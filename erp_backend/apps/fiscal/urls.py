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
    sincronizar_cnpj_cadastrado,
    simples_apuracao,
    simples_faturamentos,
    simples_previsao,
    tabelas_tributarias,
)

urlpatterns = [
    path("consultar-cnpj/", consultar_cnpj, name="fiscal-consultar-cnpj"),
    path("sincronizar-cnpj-cadastrado/", sincronizar_cnpj_cadastrado, name="fiscal-sincronizar-cnpj-cadastrado"),
    path("calcular-impostos/", calcular_impostos, name="fiscal-calcular-impostos"),
    path("reforma/calcular/", calcular_reforma_tributaria, name="fiscal-reforma-calcular"),
    path("reforma/decisao-ibs-cbs/", decisao_ibs_cbs, name="fiscal-decisao-ibs-cbs"),
    path("regras/tabelas/", tabelas_tributarias, name="fiscal-tabelas-tributarias"),
    path("operacoes/", operacoes_fiscais, name="fiscal-operacoes"),
    path("emissao/mock/", emitir_documento_mock, name="fiscal-emissao-mock"),
    path("obrigacoes/pgdas/conciliar/", conciliar_pgdas, name="fiscal-pgdas-conciliar"),
    path("simples/faturamentos/", simples_faturamentos, name="fiscal-simples-faturamentos"),
    path("simples/apuracao/", simples_apuracao, name="fiscal-simples-apuracao"),
    path("simples/previsao/", simples_previsao, name="fiscal-simples-previsao"),
    path("configuracao/", configuracao, name="fiscal-configuracao"),
]
