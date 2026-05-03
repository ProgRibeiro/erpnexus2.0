from django.contrib import admin
from django.utils.html import format_html
from .models import UsuarioPortal


@admin.register(UsuarioPortal)
class UsuarioPortalAdmin(admin.ModelAdmin):
    list_display = [
        "email",
        "cliente_link",
        "ativo_badge",
        "ultimo_acesso_formatado",
        "criado_em_formatado",
    ]
    list_filter = ["ativo", "criado_em", "cliente"]
    search_fields = ["email", "cliente__nome"]
    readonly_fields = ["ultimo_acesso", "criado_em", "atualizado_em"]
    fieldsets = (
        ("Informações Básicas", {
            "fields": ("email", "cliente", "ativo")
        }),
        ("Segurança", {
            "fields": ("senha",),
            "classes": ("collapse",)
        }),
        ("Auditoria", {
            "fields": ("ultimo_acesso", "criado_em", "atualizado_em"),
            "classes": ("collapse",)
        }),
    )

    def cliente_link(self, obj):
        return obj.cliente.nome if obj.cliente else "-"
    cliente_link.short_description = "Cliente"

    def ativo_badge(self, obj):
        if obj.ativo:
            color = "green"
            label = "Ativo"
        else:
            color = "red"
            label = "Inativo"
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            label
        )
    ativo_badge.short_description = "Status"

    def ultimo_acesso_formatado(self, obj):
        if obj.ultimo_acesso:
            return obj.ultimo_acesso.strftime("%d/%m/%Y %H:%M")
        return "-"
    ultimo_acesso_formatado.short_description = "Último acesso"

    def criado_em_formatado(self, obj):
        return obj.criado_em.strftime("%d/%m/%Y %H:%M")
    criado_em_formatado.short_description = "Criado em"

    def save_model(self, request, obj, form, change):
        # Se a senha foi alterada no formulário, faz hash automaticamente
        if "senha" in form.changed_data:
            obj.set_password(form.cleaned_data.get("senha"))
        super().save_model(request, obj, form, change)

