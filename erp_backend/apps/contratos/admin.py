from django.contrib import admin

from .models import (
    ContratoPreventiva,
    EscopoContrato,
    EscopoTecnico,
    EscopoUnidade,
    ExecucaoChecklist,
    FaturaContrato,
    ItemChecklistContrato,
    ItemChecklistPadrao,
    OSContratoPreventiva,
    UnidadeContrato,
)


@admin.register(EscopoTecnico)
class EscopoTecnicoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nome", "norma_tecnica", "ativo", "ordem"]
    list_filter = ["ativo"]
    search_fields = ["codigo", "nome", "norma_tecnica"]


@admin.register(ItemChecklistPadrao)
class ItemChecklistPadraoAdmin(admin.ModelAdmin):
    list_display = ["escopo", "descricao", "categoria", "obrigatorio", "requer_foto", "requer_medicao", "ordem"]
    list_filter = ["escopo", "categoria", "ativo"]
    search_fields = ["descricao", "referencia_norma"]


class UnidadeContratoInline(admin.TabularInline):
    model = UnidadeContrato
    extra = 0


class EscopoContratoInline(admin.TabularInline):
    model = EscopoContrato
    extra = 0


@admin.register(ContratoPreventiva)
class ContratoPreventivaAdmin(admin.ModelAdmin):
    list_display = ["numero", "cliente", "titulo", "status", "data_inicio", "data_fim", "valor_total_mensal"]
    list_filter = ["status", "tipo_faturamento", "reajuste_anual"]
    search_fields = ["numero", "titulo", "cliente__nome"]
    inlines = [EscopoContratoInline, UnidadeContratoInline]


admin.site.register(EscopoUnidade)
admin.site.register(ItemChecklistContrato)
admin.site.register(OSContratoPreventiva)
admin.site.register(ExecucaoChecklist)
admin.site.register(FaturaContrato)
