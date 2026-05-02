from rest_framework import serializers

from .models import ConfiguracaoFiscal, TabelaImpostoLucroPresumido


class ConfiguracaoFiscalSerializer(serializers.ModelSerializer):
    empresa_nome = serializers.CharField(source="empresa.nome", read_only=True)

    class Meta:
        model = ConfiguracaoFiscal
        fields = "__all__"
        read_only_fields = ["empresa", "empresa_nome", "razao_social", "municipio", "codigo_municipio_ibge", "uf", "atualizado_em"]


class TabelaImpostoLucroPresumidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TabelaImpostoLucroPresumido
        fields = "__all__"


class ConsultaCNPJSerializer(serializers.Serializer):
    cnpj = serializers.CharField()


class CalcularImpostosSerializer(serializers.Serializer):
    valor_servicos = serializers.DecimalField(max_digits=12, decimal_places=2)
    valor_materiais = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)

