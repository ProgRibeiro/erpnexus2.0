from rest_framework import serializers
from .models_licitacao import Licitacao, PropostaLicitacao, ItemProposta, EventoLicitacao, OutboxMessage

class ItemPropostaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemProposta
        fields = ['id', 'descricao', 'quantidade', 'unidade', 'valor_unitario', 'valor_total', 'ordem']

class PropostaSerializer(serializers.ModelSerializer):
    itens = ItemPropostaSerializer(many=True, read_only=True)

    class Meta:
        model = PropostaLicitacao
        fields = [
            'id', 'uuid', 'licitacao', 'tenant_prestador', 'numero_proposta',
            'status', 'valor_total', 'prazo_execucao_dias', 'condicao_pagamento',
            'validade_proposta', 'observacoes', 'diferencial_competitivo',
            'enviada_em', 'itens'
        ]

class LicitacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Licitacao
        fields = '__all__'
