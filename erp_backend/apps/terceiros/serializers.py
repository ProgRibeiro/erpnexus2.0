from rest_framework import serializers

from apps.financeiro.serializers import LancamentoSerializer
from apps.ordens.serializers import FotoOSSerializer, OrdemServicoSerializer

from .models import Terceirizado


class TerceirizadoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True)
    pagamentos_pendentes = serializers.SerializerMethodField()
    total_pendente = serializers.SerializerMethodField()

    class Meta:
        model = Terceirizado
        fields = "__all__"

    def get_pagamentos_pendentes(self, obj):
        from apps.financeiro.models import Lancamento

        lancamentos = Lancamento.objects.filter(
            itens_terceirizados__terceirizado=obj,
            tipo=Lancamento.Tipo.DESPESA,
            status__in=[Lancamento.Status.PENDENTE, Lancamento.Status.ATRASADO],
        ).distinct()
        return LancamentoSerializer(lancamentos, many=True, context=self.context).data

    def get_total_pendente(self, obj):
        from django.db.models import Sum
        from apps.financeiro.models import Lancamento

        total = Lancamento.objects.filter(
            itens_terceirizados__terceirizado=obj,
            tipo=Lancamento.Tipo.DESPESA,
            status__in=[Lancamento.Status.PENDENTE, Lancamento.Status.ATRASADO],
        ).distinct().aggregate(total=Sum("valor")).get("total")
        return total or 0


class PortalTerceiroResumoSerializer(serializers.Serializer):
    terceiro = TerceirizadoSerializer()
    ordens = OrdemServicoSerializer(many=True)
    lancamentos = LancamentoSerializer(many=True)
    fotos = FotoOSSerializer(many=True)
