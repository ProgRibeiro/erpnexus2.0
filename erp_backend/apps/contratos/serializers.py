from rest_framework import serializers

from .models import (
    ContratoPreventiva,
    EscopoContrato,
    EscopoTecnico,
    EscopoUnidade,
    ExecucaoChecklist,
    FaturaContrato,
    ItemChecklistContrato,
    ItemChecklistPadrao,
    OSContratoPreventiva,
    UnidadeContrato,
)


class EscopoTecnicoSerializer(serializers.ModelSerializer):
    checklist_count = serializers.IntegerField(source="checklist_padrao.count", read_only=True)

    class Meta:
        model = EscopoTecnico
        fields = ["id", "nome", "codigo", "icone", "cor", "descricao", "norma_tecnica", "ativo", "ordem", "checklist_count"]


class ItemChecklistPadraoSerializer(serializers.ModelSerializer):
    escopo_nome = serializers.CharField(source="escopo.nome", read_only=True)
    escopo_codigo = serializers.CharField(source="escopo.codigo", read_only=True)

    class Meta:
        model = ItemChecklistPadrao
        fields = [
            "id", "escopo", "escopo_nome", "escopo_codigo", "descricao", "categoria",
            "obrigatorio", "requer_foto", "requer_medicao", "unidade_medicao",
            "ordem", "referencia_norma", "ativo",
        ]


class EscopoContratoSerializer(serializers.ModelSerializer):
    escopo_dados = EscopoTecnicoSerializer(source="escopo", read_only=True)

    class Meta:
        model = EscopoContrato
        fields = ["id", "contrato", "escopo", "escopo_dados", "ativo"]
        read_only_fields = ["id"]


class ItemChecklistContratoSerializer(serializers.ModelSerializer):
    descricao = serializers.CharField(read_only=True)
    item_padrao_dados = ItemChecklistPadraoSerializer(source="item_padrao", read_only=True)

    class Meta:
        model = ItemChecklistContrato
        fields = [
            "id", "escopo_unidade", "item_padrao", "item_padrao_dados", "descricao",
            "descricao_customizada", "obrigatorio", "requer_foto", "requer_medicao",
            "unidade_medicao", "ordem",
        ]
        read_only_fields = ["id"]


class EscopoUnidadeSerializer(serializers.ModelSerializer):
    escopo_dados = EscopoTecnicoSerializer(source="escopo", read_only=True)
    checklist = ItemChecklistContratoSerializer(many=True, read_only=True)

    class Meta:
        model = EscopoUnidade
        fields = [
            "id", "unidade_contrato", "escopo", "escopo_dados", "periodicidade",
            "equipamentos_quantidade", "equipamentos_descricao", "valor_alocado",
            "ativo", "checklist",
        ]
        read_only_fields = ["id"]


class UnidadeContratoSerializer(serializers.ModelSerializer):
    escopos = EscopoUnidadeSerializer(many=True, read_only=True)

    class Meta:
        model = UnidadeContrato
        fields = [
            "id", "contrato", "nome_unidade", "codigo_interno", "endereco_completo",
            "cep", "cidade", "estado", "responsavel_local", "telefone_local",
            "email_local", "area_atendimento_m2", "valor_mensal", "ativo",
            "observacoes", "escopos",
        ]
        read_only_fields = ["id"]


class OSContratoPreventivaSerializer(serializers.ModelSerializer):
    unidade_nome = serializers.CharField(source="unidade_contrato.nome_unidade", read_only=True)
    escopo_nome = serializers.CharField(source="escopo_unidade.escopo.nome", read_only=True)
    escopo_cor = serializers.CharField(source="escopo_unidade.escopo.cor", read_only=True)
    ordem_servico_numero = serializers.CharField(source="ordem_servico.numero", read_only=True, allow_null=True)
    tecnico_nome = serializers.CharField(source="tecnico_responsavel.get_full_name", read_only=True, allow_null=True)

    class Meta:
        model = OSContratoPreventiva
        fields = [
            "id", "contrato", "unidade_contrato", "unidade_nome", "escopo_unidade",
            "escopo_nome", "escopo_cor", "ordem_servico", "ordem_servico_numero",
            "numero_visita", "data_prevista", "data_executada", "status",
            "tecnico_responsavel", "tecnico_nome", "checklist_completo",
        ]


class ExecucaoChecklistSerializer(serializers.ModelSerializer):
    item_descricao = serializers.CharField(source="item_checklist.descricao", read_only=True)

    class Meta:
        model = ExecucaoChecklist
        fields = [
            "id", "os_contrato", "item_checklist", "item_descricao", "status",
            "valor_medicao", "observacao", "foto", "executado_em", "executado_por",
        ]
        read_only_fields = ["id", "executado_em", "executado_por"]


class FaturaContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaturaContrato
        fields = [
            "id", "contrato", "mes_referencia", "ano_referencia", "competencia",
            "vencimento", "valor_base", "valor_extras", "valor_glosa", "valor_total",
            "status", "numero_nf", "pdf_nf", "pdf_boletim_medicao", "pago_em",
            "observacoes",
        ]
        read_only_fields = ["id"]


class ContratoPreventivaListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    unidades_count = serializers.IntegerField(source="unidades.count", read_only=True)
    os_count = serializers.IntegerField(source="os_contrato.count", read_only=True)

    class Meta:
        model = ContratoPreventiva
        fields = [
            "id", "numero", "cliente", "cliente_nome", "titulo", "vigencia_meses",
            "data_inicio", "data_fim", "tipo_faturamento", "status",
            "valor_total_mensal", "valor_total_contrato", "unidades_count",
            "os_count", "criado_em", "atualizado_em",
        ]
        read_only_fields = ["id", "numero", "valor_total_mensal", "valor_total_contrato", "criado_em", "atualizado_em"]


class ContratoPreventivaSerializer(ContratoPreventivaListSerializer):
    escopos_contrato = EscopoContratoSerializer(many=True, read_only=True)
    unidades = UnidadeContratoSerializer(many=True, read_only=True)
    os_contrato = OSContratoPreventivaSerializer(many=True, read_only=True)
    faturas = FaturaContratoSerializer(many=True, read_only=True)
    responsavel_tecnico_nome = serializers.CharField(source="responsavel_tecnico.get_full_name", read_only=True, allow_null=True)

    class Meta(ContratoPreventivaListSerializer.Meta):
        fields = ContratoPreventivaListSerializer.Meta.fields + [
            "objeto_contrato", "dia_vencimento_fatura", "forma_pagamento",
            "multa_atraso_percentual", "juros_dia_percentual", "multa_rescisao_antecipada",
            "prazo_aviso_rescisao_dias", "reajuste_anual", "indice_reajuste",
            "valor_reajuste_fixo", "renovacao_automatica", "requer_art", "numero_art",
            "pdf_art", "responsavel_tecnico", "responsavel_tecnico_nome",
            "responsavel_tecnico_crea", "observacoes", "pdf_contrato", "pdf_proposta",
            "pdf_cronograma", "assinado_em", "assinado_por_cliente", "criado_por",
            "escopos_contrato", "unidades", "os_contrato", "faturas",
        ]
        read_only_fields = ContratoPreventivaListSerializer.Meta.read_only_fields + ["criado_por"]
