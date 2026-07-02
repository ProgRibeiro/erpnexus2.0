from django.contrib import admin

from .models import CenarioTesteFiscal


@admin.register(CenarioTesteFiscal)
class CenarioTesteFiscalAdmin(admin.ModelAdmin):
    list_display = ("nome", "ativo", "criado_em")
    list_filter = ("ativo",)
    search_fields = ("nome", "descricao")
