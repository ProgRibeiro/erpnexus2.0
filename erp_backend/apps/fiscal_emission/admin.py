from django.contrib import admin

from .models import ConfiguracaoEmissorFiscal, DocumentoFiscalEmitido


@admin.register(ConfiguracaoEmissorFiscal)
class ConfiguracaoEmissorFiscalAdmin(admin.ModelAdmin):
    list_display = ("nome", "provedor", "ambiente", "ativo", "atualizado_em")
    list_filter = ("provedor", "ambiente", "ativo")


@admin.register(DocumentoFiscalEmitido)
class DocumentoFiscalEmitidoAdmin(admin.ModelAdmin):
    list_display = ("tipo_documento", "status", "ambiente", "chave_acesso", "criado_em")
    list_filter = ("tipo_documento", "status", "ambiente")
    search_fields = ("chave_acesso", "numero", "protocolo")
