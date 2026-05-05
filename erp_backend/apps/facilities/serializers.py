from rest_framework import serializers
from .models import (
    Ativo, PlanoManutencao, ChecklistItem,
    ChamadoFacilities, ContratoTerceirizado,
    ProjetoObra, FaseObra, DiarioObra, BoletimMedicao,
)


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ["id", "plano", "ordem", "descricao", "obrigatorio"]
        read_only_fields = ["id"]


class PlanoManutencaoSerializer(serializers.ModelSerializer):
    checklist = ChecklistItemSerializer(many=True, read_only=True)
    ativo_tag = serializers.CharField(source="ativo.tag", read_only=True)
    ativo_nome = serializers.CharField(source="ativo.nome", read_only=True)

    class Meta:
        model = PlanoManutencao
        fields = [
            "id", "ativo", "ativo_tag", "ativo_nome", "nome", "tipo", "periodicidade",
            "descricao", "proxima_execucao", "ultima_execucao", "ativo_plano",
            "checklist", "criado_em",
        ]
        read_only_fields = ["id", "criado_em"]


class AtivoSerializer(serializers.ModelSerializer):
    planos_count = serializers.SerializerMethodField()
    chamados_count = serializers.SerializerMethodField()

    class Meta:
        model = Ativo
        fields = [
            "id", "tag", "nome", "descricao", "categoria", "localizacao_predio",
            "localizacao_andar", "localizacao_sala", "foto", "manual_url",
            "data_instalacao", "vida_util_anos", "fabricante", "modelo",
            "numero_serie", "status", "custo_aquisicao", "planos_count",
            "chamados_count", "criado_em", "atualizado_em",
        ]
        read_only_fields = ["id", "criado_em", "atualizado_em"]

    def get_planos_count(self, obj):
        return obj.planos.filter(ativo_plano=True).count()

    def get_chamados_count(self, obj):
        return obj.chamados.count()


class AtivoDetalheSerializer(AtivoSerializer):
    planos = PlanoManutencaoSerializer(many=True, read_only=True)

    class Meta(AtivoSerializer.Meta):
        fields = AtivoSerializer.Meta.fields + ["planos"]


class ChamadoFacilitiesSerializer(serializers.ModelSerializer):
    ativo_tag = serializers.CharField(source="ativo.tag", read_only=True, allow_null=True)
    ativo_nome = serializers.CharField(source="ativo.nome", read_only=True, allow_null=True)
    tecnico_nome = serializers.CharField(source="tecnico_responsavel.get_full_name", read_only=True, allow_null=True)

    class Meta:
        model = ChamadoFacilities
        fields = [
            "id", "numero", "titulo", "descricao", "ativo", "ativo_tag", "ativo_nome",
            "prioridade", "status", "solicitante_nome", "solicitante_email",
            "solicitante_ramal", "local", "tecnico_responsavel", "tecnico_nome",
            "sla_horas", "aberto_em", "resolvido_em", "avaliacao",
            "comentario_avaliacao", "foto_antes", "foto_depois",
        ]
        read_only_fields = ["id", "numero", "aberto_em"]


class ContratoTerceirizadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContratoTerceirizado
        fields = [
            "id", "fornecedor_nome", "fornecedor_cnpj", "tipo_servico", "valor_mensal",
            "data_inicio", "data_fim", "periodicidade_servico", "status", "observacoes",
            "avaliacao_fornecedor", "criado_em",
        ]
        read_only_fields = ["id", "criado_em"]


class FaseObraSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaseObra
        fields = ["id", "projeto", "nome", "ordem", "data_inicio", "data_fim", "percentual_concluido", "status"]
        read_only_fields = ["id"]


class DiarioObraSerializer(serializers.ModelSerializer):
    registrado_por_nome = serializers.CharField(source="registrado_por.get_full_name", read_only=True, allow_null=True)

    class Meta:
        model = DiarioObra
        fields = [
            "id", "projeto", "data", "clima", "equipe_presente", "atividades_realizadas",
            "ocorrencias", "observacoes", "foto", "registrado_por", "registrado_por_nome", "criado_em",
        ]
        read_only_fields = ["id", "registrado_por", "criado_em"]


class BoletimMedicaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoletimMedicao
        fields = [
            "id", "projeto", "numero", "mes_referencia", "percentual_executado",
            "valor_medido", "status", "observacoes", "aprovado_em", "criado_em",
        ]
        read_only_fields = ["id", "criado_em"]


class ProjetoObraSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.CharField(source="responsavel.get_full_name", read_only=True, allow_null=True)
    fases_count = serializers.SerializerMethodField()

    class Meta:
        model = ProjetoObra
        fields = [
            "id", "codigo", "nome", "descricao", "tipo", "status", "responsavel",
            "responsavel_nome", "orcamento_previsto", "orcamento_realizado",
            "data_inicio_prevista", "data_fim_prevista", "data_inicio_real",
            "data_fim_real", "percentual_concluido", "fases_count", "criado_em", "atualizado_em",
        ]
        read_only_fields = ["id", "criado_em", "atualizado_em"]

    def get_fases_count(self, obj):
        return obj.fases.count()


class ProjetoObraDetalheSerializer(ProjetoObraSerializer):
    fases = FaseObraSerializer(many=True, read_only=True)
    diarios = DiarioObraSerializer(many=True, read_only=True)
    boletins = BoletimMedicaoSerializer(many=True, read_only=True)

    class Meta(ProjetoObraSerializer.Meta):
        fields = ProjetoObraSerializer.Meta.fields + ["fases", "diarios", "boletins"]
