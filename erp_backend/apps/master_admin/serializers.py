from decimal import Decimal
from rest_framework import serializers
from .models import PlanoCatalogo, ClienteSaaS, AssinaturaSaaS, PagamentoMensalidade


class PlanoCatalogoSerializer(serializers.ModelSerializer):
    sistema_display = serializers.CharField(source="get_sistema_display", read_only=True)

    class Meta:
        model = PlanoCatalogo
        fields = "__all__"


class PagamentoMensalidadeSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    forma_display = serializers.CharField(source="get_forma_pagamento_display", read_only=True)

    class Meta:
        model = PagamentoMensalidade
        fields = "__all__"
        read_only_fields = ["criado_em"]


class AssinaturaSaaSSerializer(serializers.ModelSerializer):
    plano_nome = serializers.CharField(source="plano.nome", read_only=True)
    plano_sistema = serializers.CharField(source="plano.sistema", read_only=True)
    plano_sistema_display = serializers.CharField(source="plano.get_sistema_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    valor_com_desconto = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    pagamentos = PagamentoMensalidadeSerializer(many=True, read_only=True)
    total_pago = serializers.SerializerMethodField()
    total_pendente = serializers.SerializerMethodField()

    class Meta:
        model = AssinaturaSaaS
        fields = "__all__"
        read_only_fields = ["criado_em"]

    def get_total_pago(self, obj):
        return sum(p.valor_cobrado for p in obj.pagamentos.filter(status="pago"))

    def get_total_pendente(self, obj):
        return sum(p.valor_cobrado for p in obj.pagamentos.filter(status__in=["pendente", "vencido"]))


class ClienteSaaSListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assinatura_ativa = serializers.SerializerMethodField()
    total_mensalidades_vencidas = serializers.SerializerMethodField()

    class Meta:
        model = ClienteSaaS
        fields = [
            "id", "nome_empresa", "razao_social", "cnpj", "nome_responsavel",
            "email_responsavel", "telefone", "login_admin", "status", "status_display",
            "criado_em", "assinatura_ativa", "total_mensalidades_vencidas",
        ]

    def get_assinatura_ativa(self, obj):
        a = obj.assinaturas.filter(status__in=["ativo", "trial"]).select_related("plano").first()
        if not a:
            return None
        return {
            "id": a.id,
            "plano": a.plano.nome,
            "sistema": a.plano.sistema,
            "sistema_display": a.plano.get_sistema_display(),
            "valor": str(a.valor_com_desconto),
            "proximo_vencimento": a.data_proximo_vencimento,
        }

    def get_total_mensalidades_vencidas(self, obj):
        return PagamentoMensalidade.objects.filter(
            assinatura__cliente=obj, status="vencido"
        ).count()


class ClienteSaaSDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assinaturas = AssinaturaSaaSSerializer(many=True, read_only=True)

    class Meta:
        model = ClienteSaaS
        fields = "__all__"
        read_only_fields = ["criado_em", "atualizado_em"]
