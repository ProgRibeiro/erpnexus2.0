from rest_framework import serializers
from .models import Lancamento, CategoriaFinanceira, ContaBancaria, TransferenciaEntreConta, AnexoLancamento


class ContaBancariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaBancaria
        fields = ['id', 'nome', 'banco', 'agencia', 'conta', 'tipo', 'saldo_inicial', 'ativo', 'criado_em']
        read_only_fields = ['criado_em']


class CategoriaFinanceiraSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaFinanceira
        fields = ['id', 'nome', 'tipo', 'cor', 'icone', 'pai']


class LancamentoListSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    conta_nome = serializers.CharField(source='conta_bancaria.nome', read_only=True)
    dias_vencido = serializers.SerializerMethodField()

    class Meta:
        model = Lancamento
        fields = [
            'id', 'tipo', 'descricao', 'valor', 'status', 'data_vencimento',
            'data_pagamento', 'categoria_nome', 'conta_nome', 'dias_vencido',
            'criado_em'
        ]
        read_only_fields = ['criado_em']

    def get_dias_vencido(self, obj):
        from django.utils import timezone
        if obj.status == Lancamento.Status.PAGO or obj.status == Lancamento.Status.CANCELADO:
            return 0
        dias = (timezone.localdate() - obj.data_vencimento).days
        return max(0, dias)


class LancamentoSerializer(serializers.ModelSerializer):
    categoria_dados = CategoriaFinanceiraSerializer(source='categoria', read_only=True)
    conta_dados = ContaBancariaSerializer(source='conta_bancaria', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = Lancamento
        fields = [
            'id', 'tipo', 'descricao', 'valor', 'data_competencia', 'data_vencimento',
            'data_pagamento', 'status', 'conta_bancaria', 'conta_dados', 'categoria',
            'categoria_dados', 'os', 'movimentacao_estoque', 'venda', 'fornecedor_cliente',
            'numero_documento', 'observacoes', 'recorrente', 'frequencia_recorrencia',
            'criado_por', 'criado_por_nome', 'criado_em'
        ]
        read_only_fields = ['criado_em', 'movimentacao_estoque', 'venda', 'criado_por_nome']


class AnexoLancamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoLancamento
        fields = ['id', 'lancamento', 'arquivo', 'nome_original']
        read_only_fields = ['lancamento']


class TransferenciaEntreContaSerializer(serializers.ModelSerializer):
    conta_origem_nome = serializers.CharField(source='conta_origem.nome', read_only=True)
    conta_destino_nome = serializers.CharField(source='conta_destino.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = TransferenciaEntreConta
        fields = [
            'id', 'conta_origem', 'conta_origem_nome', 'conta_destino', 'conta_destino_nome',
            'valor', 'data', 'descricao', 'criado_por', 'criado_por_nome', 'criado_em'
        ]
        read_only_fields = ['criado_em', 'criado_por_nome']


TransferenciaEntreContaSerializer = TransferenciaEntreContaSerializer
