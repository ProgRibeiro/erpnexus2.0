from rest_framework import serializers
from apps.ordens.models import OrdemServico
from .models import (
    Ativo, PlanoManutencao, ChecklistItem,
    ChamadoFacilities, ContratoTerceirizado, DocumentoFacilities,
    ExecucaoManutencao,
    ProjetoObra, FaseObra, DiarioObra, BoletimMedicao,
    Licitacao, PropostaLicitacao, ComunicacaoPlataforma,
)


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ["id", "plano", "ordem", "descricao", "obrigatorio"]
        read_only_fields = ["id"]


class DocumentoFacilitiesSerializer(serializers.ModelSerializer):
    dias_para_vencer = serializers.SerializerMethodField()
    vencido = serializers.SerializerMethodField()

    class Meta:
        model = DocumentoFacilities
        fields = [
            "id", "ativo", "chamado", "plano", "titulo", "tipo", "arquivo", "url",
            "data_emissao", "data_validade", "dias_para_vencer", "vencido",
            "observacoes", "criado_em",
        ]
        read_only_fields = ["id", "criado_em", "dias_para_vencer", "vencido"]

    def get_dias_para_vencer(self, obj):
        if not obj.data_validade:
            return None
        from django.utils import timezone
        return (obj.data_validade - timezone.localdate()).days

    def get_vencido(self, obj):
        if not obj.data_validade:
            return False
        from django.utils import timezone
        return obj.data_validade < timezone.localdate()


class ExecucaoManutencaoSerializer(serializers.ModelSerializer):
    plano_nome = serializers.CharField(source="plano.nome", read_only=True)
    ativo_tag = serializers.CharField(source="plano.ativo.tag", read_only=True)
    ativo_nome = serializers.CharField(source="plano.ativo.nome", read_only=True)
    executado_por_nome = serializers.CharField(source="executado_por.get_full_name", read_only=True, allow_null=True)

    class Meta:
        model = ExecucaoManutencao
        fields = [
            "id", "plano", "plano_nome", "ativo_tag", "ativo_nome", "chamado",
            "executado_por", "executado_por_nome", "executado_em",
            "checklist_respostas", "observacoes", "foto_antes", "foto_depois",
            "assinatura_digital", "latitude", "longitude", "relatorio_pmoc",
        ]
        read_only_fields = ["id", "executado_por", "executado_por_nome", "executado_em"]


class PlanoManutencaoSerializer(serializers.ModelSerializer):
    checklist = ChecklistItemSerializer(many=True, read_only=True)
    execucoes = ExecucaoManutencaoSerializer(many=True, read_only=True)
    ativo_tag = serializers.CharField(source="ativo.tag", read_only=True)
    ativo_nome = serializers.CharField(source="ativo.nome", read_only=True)

    class Meta:
        model = PlanoManutencao
        fields = [
            "id", "ativo", "ativo_tag", "ativo_nome", "nome", "tipo", "periodicidade",
            "descricao", "norma_referencia", "gerar_relatorio_pmoc",
            "notificar_dias_antes", "proxima_execucao", "ultima_execucao",
            "ativo_plano", "checklist", "execucoes", "criado_em",
        ]
        read_only_fields = ["id", "criado_em"]


class AtivoSerializer(serializers.ModelSerializer):
    planos_count = serializers.SerializerMethodField()
    chamados_count = serializers.SerializerMethodField()
    documentos_count = serializers.SerializerMethodField()

    class Meta:
        model = Ativo
        fields = [
            "id", "tag", "nome", "descricao", "categoria", "localizacao_predio",
            "localizacao_andar", "localizacao_sala", "unidade_nome", "area_m2",
            "latitude", "longitude", "foto", "manual_url", "garantia_fim",
            "data_instalacao", "vida_util_anos", "fabricante", "modelo",
            "numero_serie", "status", "custo_aquisicao", "planos_count",
            "chamados_count", "documentos_count", "criado_em", "atualizado_em",
        ]
        read_only_fields = ["id", "criado_em", "atualizado_em"]

    def get_planos_count(self, obj):
        return obj.planos.filter(ativo_plano=True).count()

    def get_chamados_count(self, obj):
        return obj.chamados.count()

    def get_documentos_count(self, obj):
        return obj.documentos.count()


class AtivoDetalheSerializer(AtivoSerializer):
    planos = PlanoManutencaoSerializer(many=True, read_only=True)
    documentos = DocumentoFacilitiesSerializer(many=True, read_only=True)

    class Meta(AtivoSerializer.Meta):
        fields = AtivoSerializer.Meta.fields + ["planos", "documentos"]


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
            "sla_horas", "sla_estourado", "aberto_em", "em_rota_em",
            "inicio_execucao_em", "resolvido_em", "concluido_em", "avaliacao",
            "nps", "comentario_avaliacao", "foto_antes", "foto_depois",
            "custo_extra_valor", "custo_extra_descricao", "custo_extra_status",
            "centro_custo",
            "origem_sistema", "tenant_contratante_id", "tenant_prestador_id",
            "chamado_plataforma_id", "ordem_servico_id",
        ]
        read_only_fields = ["id", "numero", "aberto_em", "sla_estourado"]


class ComunicacaoPlataformaSerializer(serializers.ModelSerializer):
    usuario_email = serializers.EmailField(source="usuario.email", read_only=True, allow_null=True)

    class Meta:
        model = ComunicacaoPlataforma
        fields = [
            "id", "escopo", "chamado", "licitacao", "ordem_servico_id",
            "tenant_contratante_id", "tenant_prestador_id", "origem_sistema",
            "usuario", "usuario_email", "usuario_nome", "mensagem", "anexos",
            "criado_em", "lido_contratante", "lido_prestador",
        ]
        read_only_fields = [
            "id", "usuario", "usuario_email", "usuario_nome", "criado_em",
            "lido_contratante", "lido_prestador",
        ]


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


class PropostaLicitacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropostaLicitacao
        fields = [
            "id", "uuid", "licitacao", "prestador_nome", "prestador_email",
            "valor", "prazo_execucao_dias", "condicao_pagamento", "validade_proposta",
            "itens_orcamento", "arquivo_proposta", "observacoes", "status", "enviado_em",
        ]
        read_only_fields = ["id", "uuid", "enviado_em", "status"]


class LicitacaoSerializer(serializers.ModelSerializer):
    propostas = PropostaLicitacaoSerializer(many=True, read_only=True)
    propostas_count = serializers.SerializerMethodField()
    ativo_tag = serializers.CharField(source="ativo.tag", read_only=True, allow_null=True)
    ativo_nome = serializers.CharField(source="ativo.nome", read_only=True, allow_null=True)
    prestadores_convidados_nomes = serializers.SerializerMethodField()
    minha_proposta = serializers.SerializerMethodField()
    ordem_servico_numero = serializers.SerializerMethodField()
    ordem_servico_status = serializers.SerializerMethodField()
    ordem_servico_token_relatorio = serializers.SerializerMethodField()

    class Meta:
        model = Licitacao
        fields = [
            "id", "tenant_contratante", "titulo", "descricao", "tipo_servico",
            "ativo", "ativo_tag", "ativo_nome", "modo", "status",
            "prazo_propostas", "valor_maximo", "prestadores_convidados",
            "prestadores_convidados_nomes", "propostas", "propostas_count", "minha_proposta",
            "ordem_servico_id", "ordem_servico_numero", "ordem_servico_status", "ordem_servico_token_relatorio",
            "budget_mensal_id", "valor_budget_reservado", "aprovada_em",
            "criado_em", "atualizado_em",
        ]
        read_only_fields = ["id", "tenant_contratante", "criado_em", "atualizado_em"]

    def get_propostas_count(self, obj):
        return obj.propostas.count()

    def get_prestadores_convidados_nomes(self, obj):
        return [p.nome for p in obj.prestadores_convidados.all()]

    def get_minha_proposta(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
            return None

        proposta = obj.propostas.filter(prestador_email=request.user.email).order_by("-enviado_em").first()
        if proposta is None:
            return None

        return PropostaLicitacaoSerializer(proposta).data

    def _get_ordem_servico(self, obj):
        if not obj.ordem_servico_id:
            return None
        return OrdemServico.objects.filter(pk=obj.ordem_servico_id).first()

    def get_ordem_servico_numero(self, obj):
        ordem = self._get_ordem_servico(obj)
        return ordem.numero if ordem else None

    def get_ordem_servico_status(self, obj):
        ordem = self._get_ordem_servico(obj)
        return ordem.status if ordem else None

    def get_ordem_servico_token_relatorio(self, obj):
        ordem = self._get_ordem_servico(obj)
        return str(ordem.token_relatorio) if ordem else None
