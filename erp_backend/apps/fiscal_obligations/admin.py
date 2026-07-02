from django.contrib import admin

from .models import ConciliacaoPGDAS


@admin.register(ConciliacaoPGDAS)
class ConciliacaoPGDASAdmin(admin.ModelAdmin):
    list_display = ("competencia", "receita_faturada", "receita_declarada", "rbt12_estimado", "iss_retido_fonte", "divergencia")
    search_fields = ("observacoes",)
