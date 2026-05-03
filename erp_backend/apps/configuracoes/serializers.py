from rest_framework import serializers

from .models import (
    ConfiguracaoEmpresa,
    ConfiguracaoNotificacao,
    ConfiguracaoOS,
    ConfiguracaoFinanceira,
    LogoClienteReferencia,
)


class ConfiguracaoEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoEmpresa
        fields = "__all__"


class ConfiguracaoNotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoNotificacao
        fields = "__all__"


class ConfiguracaoOSSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoOS
        fields = "__all__"


class ConfiguracaoFinanceiraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoFinanceira
        fields = "__all__"


class LogoClienteReferenciaSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = LogoClienteReferencia
        fields = ["id", "nome", "logo", "logo_url", "ordem", "ativo", "criado_em"]
        read_only_fields = ["criado_em", "logo_url"]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo:
            url = obj.logo.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None
