from django.contrib import admin

from .models import Terceirizado


@admin.register(Terceirizado)
class TerceirizadoAdmin(admin.ModelAdmin):
    list_display = ["nome", "documento", "estado_base", "cidade_base", "status"]
    search_fields = ["nome", "nome_fantasia", "razao_social", "documento", "especialidades"]
    list_filter = ["status", "estado_base"]
