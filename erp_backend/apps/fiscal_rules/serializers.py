from rest_framework import serializers

from .models import OperacaoFiscal, TabelaTributaria


class TabelaTributariaSerializer(serializers.ModelSerializer):
    vigente_ate_texto = serializers.CharField(read_only=True)

    class Meta:
        model = TabelaTributaria
        fields = "__all__"


class OperacaoFiscalSerializer(serializers.ModelSerializer):
    tabelas_aplicadas = TabelaTributariaSerializer(many=True, read_only=True)

    class Meta:
        model = OperacaoFiscal
        fields = "__all__"
