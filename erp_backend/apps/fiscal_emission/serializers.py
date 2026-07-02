from rest_framework import serializers

from .models import ConfiguracaoEmissorFiscal, DocumentoFiscalEmitido


class ConfiguracaoEmissorFiscalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoEmissorFiscal
        fields = "__all__"


class DocumentoFiscalEmitidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoFiscalEmitido
        fields = "__all__"
