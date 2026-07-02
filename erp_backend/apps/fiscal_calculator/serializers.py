from rest_framework import serializers

from apps.fiscal_rules.models import RegimeTributario


class OperacaoFiscalInputSerializer(serializers.Serializer):
    valor_servicos = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    valor_materiais = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    data_emissao = serializers.DateField(required=False)
    regime_emitente = serializers.ChoiceField(choices=RegimeTributario.choices)
    regime_destinatario = serializers.ChoiceField(choices=RegimeTributario.choices, required=False, allow_blank=True)
    ncm_ou_servico = serializers.CharField(required=False, allow_blank=True, default="GERAL")
    uf_origem = serializers.CharField(required=False, allow_blank=True, max_length=2)
    uf_destino = serializers.CharField(required=False, allow_blank=True, max_length=2)
    municipio_execucao = serializers.CharField(required=False, allow_blank=True)
    codigo_municipio = serializers.CharField(required=False, allow_blank=True)
    cclasstrib = serializers.CharField(required=False, allow_blank=True, max_length=6)


class DecisaoIbsCbsSerializer(serializers.Serializer):
    regime = serializers.ChoiceField(choices=RegimeTributario.choices)
    data_emissao = serializers.DateField()
