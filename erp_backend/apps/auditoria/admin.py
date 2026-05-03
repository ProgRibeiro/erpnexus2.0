from django.contrib import admin
from .models import LogAuditoria


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ["criado_em", "usuario", "acao", "modelo", "objeto_id", "ip"]
    list_filter = ["acao", "modelo"]
    search_fields = ["usuario__email", "modelo", "objeto_id"]
    readonly_fields = ["criado_em", "dados_antes", "dados_depois"]
