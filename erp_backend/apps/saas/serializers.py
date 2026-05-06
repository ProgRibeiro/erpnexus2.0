from rest_framework import serializers
from .models import (
    PlanoSaaS, Tenant, Empresa, Unidade, ContratoSaaS, CentroCusto,
    CategoriaBudget, BudgetAnual, BudgetMensal, NivelAprovacao, AprovadorAlcada,
    SolicitacaoAprovacao, PrestadorContratado, ChamadoPlataforma, ChatChamado,
    SLAChamado, LogAuditoria, NotificacaoSaaS,
)


class PlanoSaaSSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanoSaaS
        fields = '__all__'


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = '__all__'


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = '__all__'


class UnidadeSerializer(serializers.ModelSerializer):
    empresa_nome = serializers.CharField(source='empresa.nome', read_only=True)

    class Meta:
        model = Unidade
        fields = '__all__'


class ContratoSaaSSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContratoSaaS
        fields = '__all__'


class CentroCustoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroCusto
        fields = '__all__'


class CategoriaBudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaBudget
        fields = '__all__'


class BudgetMensalSerializer(serializers.ModelSerializer):
    saldo_disponivel = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = BudgetMensal
        fields = '__all__'


class BudgetAnualSerializer(serializers.ModelSerializer):
    meses = BudgetMensalSerializer(many=True, read_only=True)
    valor_total_realizado = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = BudgetAnual
        fields = '__all__'


class NivelAprovacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = NivelAprovacao
        fields = '__all__'


class AprovadorAlcadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AprovadorAlcada
        fields = '__all__'


class SolicitacaoAprovacaoSerializer(serializers.ModelSerializer):
    nivel_nome = serializers.CharField(source='nivel_necessario.nome', read_only=True)
    solicitado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = SolicitacaoAprovacao
        fields = '__all__'

    def get_solicitado_por_nome(self, obj):
        return getattr(obj.solicitado_por, 'get_full_name', lambda: str(obj.solicitado_por))()


class PrestadorContratadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrestadorContratado
        fields = '__all__'


class ChamadoPlataformaSerializer(serializers.ModelSerializer):
    unidade_nome = serializers.CharField(source='unidade.nome', read_only=True)
    unidade_codigo = serializers.CharField(source='unidade.codigo_interno', read_only=True)
    tenant_prestador_nome = serializers.CharField(source='tenant_prestador.nome', read_only=True)

    class Meta:
        model = ChamadoPlataforma
        fields = '__all__'


class ChatChamadoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = ChatChamado
        fields = '__all__'

    def get_usuario_nome(self, obj):
        return getattr(obj.usuario, 'get_full_name', lambda: str(obj.usuario))()


class SLAChamadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAChamado
        fields = '__all__'


class LogAuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogAuditoria
        fields = '__all__'


class NotificacaoSaaSSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificacaoSaaS
        fields = '__all__'
