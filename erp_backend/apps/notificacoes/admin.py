from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe

from .models import LogNotificacao, ConfiguracaoNotificacao


@admin.register(LogNotificacao)
class LogNotificacaoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "tipo_display",
        "destinatario",
        "status_display",
        "canal",
        "criado_em",
        "enviado_em",
    )
    list_filter = ("status", "tipo", "canal", "criado_em")
    search_fields = ("destinatario", "conteudo", "numero_os")
    readonly_fields = (
        "criado_em",
        "conteudo_preview",
        "erro",
        "tentativas",
        "dados_adicionais_preview",
    )
    fieldsets = (
        (
            "Informações Básicas",
            {
                "fields": (
                    "tipo",
                    "destinatario",
                    "canal",
                    "usuario",
                    "ordem_servico_id",
                )
            },
        ),
        ("Conteúdo", {"fields": ("conteudo_preview",)}),
        ("Status", {"fields": ("status", "enviado_em", "tentativas", "proxima_tentativa", "erro")}),
        ("Dados Adicionais", {"fields": ("dados_adicionais_preview",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("criado_em",), "classes": ("collapse",)}),
    )
    ordering = ["-criado_em"]

    def tipo_display(self, obj):
        """Exibe o tipo de notificação com cor."""
        cores = {
            "os_atribuida": "#007bff",
            "os_aprovada": "#28a745",
            "os_agendada_amanha": "#ff9800",
            "os_finalizada": "#28a745",
            "pagamento_atrasado": "#dc3545",
            "estoque_baixo": "#ff9800",
            "relatorio_finalizado": "#17a2b8",
        }
        cor = cores.get(obj.tipo, "#6c757d")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            cor,
            obj.get_tipo_display(),
        )

    tipo_display.short_description = "Tipo"

    def status_display(self, obj):
        """Exibe o status com ícone e cor."""
        cores = {"enviado": "#28a745", "pendente": "#ffc107", "erro": "#dc3545"}
        icones = {"enviado": "✓", "pendente": "⏳", "erro": "✗"}
        cor = cores.get(obj.status, "#6c757d")
        icone = icones.get(obj.status, "")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">{} {}</span>',
            cor,
            icone,
            obj.get_status_display(),
        )

    status_display.short_description = "Status"

    def conteudo_preview(self, obj):
        """Exibe preview do conteúdo."""
        return obj.conteudo[:500] + "..." if len(obj.conteudo) > 500 else obj.conteudo

    conteudo_preview.short_description = "Conteúdo"

    def dados_adicionais_preview(self, obj):
        """Exibe dados adicionais em formato legível."""
        import json

        if not obj.dados_adicionais:
            return "Nenhum dado adicional"
        return format_html("<pre>{}</pre>", json.dumps(obj.dados_adicionais, indent=2, ensure_ascii=False))

    dados_adicionais_preview.short_description = "Dados Adicionais"


@admin.register(ConfiguracaoNotificacao)
class ConfiguracaoNotificacaoAdmin(admin.ModelAdmin):
    list_display = ("usuario_display", "email_ativo", "whatsapp_ativo")
    list_filter = ("enviar_email", "enviar_whatsapp")
    search_fields = ("usuario__email", "numero_whatsapp")
    fieldsets = (
        (
            "Usuário",
            {"fields": ("usuario",)},
        ),
        (
            "Frequências de Notificação",
            {
                "fields": (
                    "os_atribuida",
                    "os_aprovada",
                    "lembranca_agendamento",
                    "os_finalizada",
                    "pagamento_atrasado",
                    "estoque_baixo",
                    "relatorio_pronto",
                ),
            },
        ),
        (
            "Canais",
            {
                "fields": (
                    "enviar_email",
                    "enviar_whatsapp",
                    "numero_whatsapp",
                ),
            },
        ),
    )

    def usuario_display(self, obj):
        """Exibe o usuário."""
        return obj.usuario or "Global"

    usuario_display.short_description = "Usuário"

    def email_ativo(self, obj):
        """Exibe status do email."""
        if obj.enviar_email:
            return format_html('<span style="color: green; font-weight: bold;">✓ Ativo</span>')
        return format_html('<span style="color: red;">✗ Inativo</span>')

    email_ativo.short_description = "Email"

    def whatsapp_ativo(self, obj):
        """Exibe status do WhatsApp."""
        if obj.enviar_whatsapp and obj.numero_whatsapp:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Ativo ({}) </span>',
                obj.numero_whatsapp,
            )
        return format_html('<span style="color: red;">✗ Inativo</span>')

    whatsapp_ativo.short_description = "WhatsApp"
