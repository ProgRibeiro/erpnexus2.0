from django.contrib import admin

from .models import (
    ConfiguracaoEmpresa,
    ConfiguracaoNotificacao,
    ConfiguracaoOS,
    ConfiguracaoFinanceira,
)


@admin.register(ConfiguracaoEmpresa)
class ConfiguracaoEmpresaAdmin(admin.ModelAdmin):
    list_display = ("nome", "cnpj", "email", "telefone")
    fieldsets = (
        ("Informações Básicas", {"fields": ("nome", "razao_social", "cnpj")}),
        ("Contato", {"fields": ("email", "telefone", "site")}),
        ("Endereço", {"fields": ("endereco",)}),
        ("Branding", {"fields": ("logo", "cor_principal")}),
    )


@admin.register(ConfiguracaoNotificacao)
class ConfiguracaoNotificacaoAdmin(admin.ModelAdmin):
    list_display = ("tipo", "ativo", "email_destino")
    list_filter = ("ativo", "tipo")
    search_fields = ("tipo", "email_destino")


@admin.register(ConfiguracaoOS)
class ConfiguracaoOSAdmin(admin.ModelAdmin):
    list_display = ("prefixo", "proximo_numero", "validade_padrao")
    fieldsets = (
        ("Numeração", {"fields": ("prefixo", "proximo_numero")}),
        ("Padrões", {"fields": ("validade_padrao", "incluir_logo_pdf", "incluir_assinatura_pdf")}),
        ("Textos", {"fields": ("texto_termos", "texto_condicoes")}),
    )


@admin.register(ConfiguracaoFinanceira)
class ConfiguracaoFinanceiraAdmin(admin.ModelAdmin):
    fieldsets = (
        ("ISS", {"fields": ("aliquota_iss",)}),
        ("Contas Padrão", {
            "fields": (
                "conta_padrao_receber",
                "conta_padrao_pagar",
                "banco_padrao",
                "agencia_padrao",
                "conta_corrente_padrao",
            )
        }),
        ("Prazos Padrão", {
            "fields": ("dias_padrao_pagamento", "dias_padrao_recebimento")
        }),
        ("Juros e Multas", {
            "fields": ("juros_atraso", "multa_atraso")
        }),
    )
