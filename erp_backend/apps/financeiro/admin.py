from django.contrib import admin

from .models import (
    AnexoLancamento,
    CategoriaFinanceira,
    ContaBancaria,
    Lancamento,
    TransferenciaEntreConta,
)

admin.site.register(ContaBancaria)
admin.site.register(CategoriaFinanceira)
admin.site.register(Lancamento)
admin.site.register(AnexoLancamento)
admin.site.register(TransferenciaEntreConta)
