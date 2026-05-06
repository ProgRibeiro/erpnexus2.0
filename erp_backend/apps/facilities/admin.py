from django.contrib import admin
from .models import (
    Ativo, PlanoManutencao, ChecklistItem,
    ChamadoFacilities, ContratoTerceirizado,
    ProjetoObra, FaseObra, DiarioObra, BoletimMedicao,
    Licitacao, PropostaLicitacao, OutboxMessage,
)

admin.site.register(Ativo)
admin.site.register(PlanoManutencao)
admin.site.register(ChecklistItem)
admin.site.register(ChamadoFacilities)
admin.site.register(ContratoTerceirizado)
admin.site.register(ProjetoObra)
admin.site.register(FaseObra)
admin.site.register(DiarioObra)
admin.site.register(BoletimMedicao)
admin.site.register(Licitacao)
admin.site.register(PropostaLicitacao)


@admin.register(OutboxMessage)
class OutboxMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "event_type", "aggregate_type", "aggregate_id", "status", "tentativas", "criado_em"]
    list_filter = ["status", "event_type"]
    search_fields = ["aggregate_id", "event_type"]
    readonly_fields = ["criado_em", "processado_em"]

