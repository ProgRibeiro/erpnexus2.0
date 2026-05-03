from rest_framework import serializers

from .models import (
    ConfiguracaoEmpresa,
    ConfiguracaoNotificacao,
    ConfiguracaoOS,
    ConfiguracaoFinanceira,
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
