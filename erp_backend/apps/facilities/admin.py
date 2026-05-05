from django.contrib import admin
from .models import (
    Ativo, PlanoManutencao, ChecklistItem,
    ChamadoFacilities, ContratoTerceirizado,
    ProjetoObra, FaseObra, DiarioObra, BoletimMedicao,
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
