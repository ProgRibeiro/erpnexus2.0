from rest_framework import serializers

from .models import ApuracaoSimplesNacional, ConfiguracaoFiscal, FaturamentoMensalSimples, TabelaImpostoLucroPresumido


class ConfiguracaoFiscalSerializer(serializers.ModelSerializer):
    empresa_nome = serializers.CharField(source="empresa.nome", read_only=True)

    class Meta:
        model = ConfiguracaoFiscal
        fields = "__all__"
        read_only_fields = ["empresa", "empresa_nome", "razao_social", "municipio", "codigo_municipio_ibge", "uf", "atualizado_em"]


class FaturamentoMensalSimplesSerializer(serializers.ModelSerializer):
    empresa_nome = serializers.CharField(source="empresa.nome", read_only=True)

    class Meta:
        model = FaturamentoMensalSimples
        fields = "__all__"
        read_only_fields = ["empresa", "empresa_nome", "criado_em", "atualizado_em"]


class ApuracaoSimplesNacionalSerializer(serializers.ModelSerializer):
    empresa_nome = serializers.CharField(source="empresa.nome", read_only=True)
    alerta_label = serializers.CharField(source="get_alerta_display", read_only=True)

    class Meta:
        model = ApuracaoSimplesNacional
        fields = "__all__"
        read_only_fields = ["empresa", "empresa_nome", "alerta_label", "criado_em", "atualizado_em"]


class RegistrarFaturamentoSimplesSerializer(serializers.Serializer):
    competencia = serializers.DateField()
    receita_bruta = serializers.DecimalField(max_digits=14, decimal_places=2)
    origem = serializers.ChoiceField(
        choices=FaturamentoMensalSimples.Origem.choices,
        required=False,
        default=FaturamentoMensalSimples.Origem.MANUAL,
    )
    observacoes = serializers.CharField(required=False, allow_blank=True, default="")


class CalcularSimplesSerializer(serializers.Serializer):
    competencia = serializers.DateField(required=False)


class PrevisaoSimplesSerializer(serializers.Serializer):
    meses = serializers.IntegerField(min_value=1, max_value=24, required=False, default=6)
    crescimento_mensal = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, default=0)


class TabelaImpostoLucroPresumidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TabelaImpostoLucroPresumido
        fields = "__all__"


class ConsultaCNPJSerializer(serializers.Serializer):
    cnpj = serializers.CharField()


class CalcularImpostosSerializer(serializers.Serializer):
    valor_servicos = serializers.DecimalField(max_digits=12, decimal_places=2)
    valor_materiais = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    tipo_servico = serializers.CharField(required=False, allow_blank=True)
    descricao_servico = serializers.CharField(required=False, allow_blank=True)
    municipio_execucao = serializers.CharField(required=False, allow_blank=True)
    uf_execucao = serializers.CharField(required=False, allow_blank=True)


class ConciliarPGDASSerializer(serializers.Serializer):
    ano = serializers.IntegerField(min_value=2020, max_value=2100)
    mes = serializers.IntegerField(min_value=1, max_value=12)
    receita_declarada = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)


class EmitirDocumentoMockSerializer(serializers.Serializer):
    operacao_fiscal_id = serializers.IntegerField()
    tipo_documento = serializers.CharField(required=False, allow_blank=True, default="NFS-e")
    numero = serializers.CharField(required=False, allow_blank=True)
    serie = serializers.CharField(required=False, allow_blank=True)
    dados = serializers.JSONField(required=False, default=dict)
