from rest_framework import serializers

from .models import (
    AnexoLancamento,
    CategoriaFinanceira,
    ContaBancaria,
    Lancamento,
    TransferenciaEntreConta,
)


class ContaBancariaSerializer(serializers.ModelSerializer):
    saldo_atual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ContaBancaria
        fields = "__all__"


class CategoriaFinanceiraSerializer(serializers.ModelSerializer):
    pai_nome = serializers.CharField(source="pai.nome", read_only=True)

    class Meta:
        model = CategoriaFinanceira
        fields = "__all__"


class AnexoLancamentoSerializer(serializers.ModelSerializer):
    arquivo_url = serializers.SerializerMethodField()

    class Meta:
        model = AnexoLancamento
        fields = ["id", "lancamento", "arquivo", "arquivo_url", "nome_original"]
        read_only_fields = ["lancamento"]

    def get_arquivo_url(self, obj):
        if not obj.arquivo:
            return ""
        request = self.context.get("request")
        url = obj.arquivo.url
        return request.build_absolute_uri(url) if request else url


class LancamentoSerializer(serializers.ModelSerializer):
    conta_nome = serializers.CharField(source="conta_bancaria.nome", read_only=True)
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    os_numero = serializers.CharField(source="os.numero", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome_completo", read_only=True)
    anexos = AnexoLancamentoSerializer(many=True, read_only=True)

    class Meta:
        model = Lancamento
        fields = "__all__"
        read_only_fields = ["criado_por", "criado_em"]


class TransferenciaEntreContaSerializer(serializers.ModelSerializer):
    conta_origem_nome = serializers.CharField(source="conta_origem.nome", read_only=True)
    conta_destino_nome = serializers.CharField(source="conta_destino.nome", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome_completo", read_only=True)

    class Meta:
        model = TransferenciaEntreConta
        fields = "__all__"
        read_only_fields = ["criado_por", "criado_em"]
