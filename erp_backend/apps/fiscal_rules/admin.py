from django.contrib import admin

from .models import OperacaoFiscal, TabelaTributaria


@admin.register(TabelaTributaria)
class TabelaTributariaAdmin(admin.ModelAdmin):
    list_display = ("codigo_tributo", "ncm_ou_servico", "uf_municipio", "regime_tributario", "aliquota", "vigencia_inicio", "vigencia_fim", "ativo")
    list_filter = ("codigo_tributo", "regime_tributario", "ativo")
    search_fields = ("ncm_ou_servico", "uf_municipio", "fonte_normativa", "cclasstrib")


@admin.register(OperacaoFiscal)
class OperacaoFiscalAdmin(admin.ModelAdmin):
    list_display = ("referencia", "regime_emitente", "valor_base", "data_emissao", "calculado_em")
    list_filter = ("regime_emitente", "ambiente", "data_emissao")
    search_fields = ("referencia",)
