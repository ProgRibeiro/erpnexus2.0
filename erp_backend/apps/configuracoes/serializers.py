from rest_framework import serializers

from .models import ConfiguracaoEmpresa, ConfiguracaoNotificacao


class ConfiguracaoEmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoEmpresa
        fields = "__all__"


class ConfiguracaoNotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoNotificacao
        fields = "__all__"
