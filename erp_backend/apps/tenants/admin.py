from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Client, Domain


@admin.register(Client)
class ClientAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ['nome', 'schema_name', 'tipo_produto', 'plano', 'status', 'criado_em']
    list_filter = ['tipo_produto', 'plano', 'status']
    search_fields = ['nome', 'cnpj']


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'tenant', 'is_primary']
