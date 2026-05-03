"""
Serializers para API de notificações.
"""
from rest_framework import serializers
from django.utils import timezone

from .models import LogNotificacao, ConfiguracaoNotificacao


class LogNotificacaoSerializer(serializers.ModelSerializer):
    """Serializer para LogNotificacao."""

    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    canal_display = serializers.CharField(source="get_canal_display", read_only=True)

    class Meta:
        model = LogNotificacao
        fields = (
            "id",
            "tipo",
            "tipo_display",
            "destinatario",
            "canal",
            "canal_display",
            "status",
            "status_display",
            "enviado_em",
            "criado_em",
            "tentativas",
            "ordem_servico_id",
            "conteudo",
        )
        read_only_fields = (
            "id",
            "criado_em",
            "enviado_em",
            "tentativas",
            "tipo_display",
            "status_display",
            "canal_display",
        )


class ConfiguracaoNotificacaoSerializer(serializers.ModelSerializer):
    """Serializer para ConfiguracaoNotificacao."""

    usuario_display = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracaoNotificacao
        fields = (
            "id",
            "usuario",
            "usuario_display",
            "os_atribuida",
            "os_aprovada",
            "lembranca_agendamento",
            "os_finalizada",
            "pagamento_atrasado",
            "estoque_baixo",
            "relatorio_pronto",
            "enviar_email",
            "enviar_whatsapp",
            "numero_whatsapp",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = (
            "id",
            "criado_em",
            "atualizado_em",
        )

    def get_usuario_display(self, obj):
        """Retorna o nome de exibição do usuário."""
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip() or obj.usuario.email
        return "Global"


class ResumoPendenciasSerializer(serializers.Serializer):
    """Serializer para resumo de notificações pendentes."""

    total_pendentes = serializers.IntegerField(read_only=True)
    total_erros = serializers.IntegerField(read_only=True)
    ultimas_24h = serializers.IntegerField(read_only=True)
    por_tipo = serializers.DictField(read_only=True)
    por_status = serializers.DictField(read_only=True)


class EnviarNotificacaoTestSerializer(serializers.Serializer):
    """Serializer para testar envio de notificação."""

    tipo = serializers.ChoiceField(choices=LogNotificacao.Tipo.choices)
    destinatario = serializers.EmailField()
    conteudo = serializers.CharField()
    canal = serializers.ChoiceField(
        choices=LogNotificacao.Canal.choices, default=LogNotificacao.Canal.EMAIL
    )
