from decimal import Decimal

from rest_framework import serializers

from apps.configuracoes.models import ConfiguracaoEmpresa
from apps.fiscal.models import ConfiguracaoFiscal
from apps.fiscal.services import CalculadoraImpostos

from .models import (
    AnexoChatOS,
    AssinaturaClienteOS,
    ChatOS,
    DespesaOS,
    FotoOS,
    ItemOrcamento,
    LogStatusOS,
    OrdemServico,
)


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)
    servico_nome = serializers.CharField(source="servico.nome", read_only=True)
    servico_codigo = serializers.CharField(source="servico.codigo", read_only=True)

    class Meta:
        model = ItemOrcamento
        fields = "__all__"
        read_only_fields = ["os", "valor_total"]


class FotoOSSerializer(serializers.ModelSerializer):
    enviado_por_nome = serializers.CharField(source="enviado_por.nome_completo", read_only=True)

    class Meta:
        model = FotoOS
        fields = "__all__"
        read_only_fields = ["os", "enviado_por", "enviado_em"]


class AnexoChatOSSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnexoChatOS
        fields = "__all__"
        read_only_fields = ["mensagem"]


class ChatOSSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True)
    anexos = AnexoChatOSSerializer(many=True, read_only=True)

    class Meta:
        model = ChatOS
        fields = "__all__"
        read_only_fields = ["os", "usuario", "criado_em"]


class DespesaOSSerializer(serializers.ModelSerializer):
    registrado_por_nome = serializers.CharField(
        source="registrado_por.nome_completo",
        read_only=True,
    )

    class Meta:
        model = DespesaOS
        fields = "__all__"
        read_only_fields = ["os", "registrado_por"]


class LogStatusOSSerializer(serializers.ModelSerializer):
    alterado_por_nome = serializers.CharField(source="alterado_por.nome_completo", read_only=True)

    class Meta:
        model = LogStatusOS
        fields = "__all__"
        read_only_fields = ["os", "alterado_por", "alterado_em"]


class AssinaturaClienteOSSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssinaturaClienteOS
        fields = "__all__"
        read_only_fields = ["os"]


class OrdemServicoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico_responsavel.username", read_only=True)
    contato_nome = serializers.CharField(source="contato_responsavel.nome", read_only=True)
    endereco_servico_texto = serializers.StringRelatedField(source="endereco_servico", read_only=True)
    itens = ItemOrcamentoSerializer(many=True, required=False)
    fotos = FotoOSSerializer(many=True, read_only=True)
    mensagens = ChatOSSerializer(many=True, read_only=True)
    despesas = DespesaOSSerializer(many=True, read_only=True)
    logs_status = LogStatusOSSerializer(many=True, read_only=True)
    assinatura_cliente = AssinaturaClienteOSSerializer(read_only=True)

    class Meta:
        model = OrdemServico
        fields = "__all__"
        read_only_fields = [
            "numero",
            "valor_total_orcado",
            "criado_por",
            "criado_em",
            "atualizado_por",
            "atualizado_em",
        ]

    def create(self, validated_data):
        itens_data = validated_data.pop("itens", [])
        request = self.context.get("request")
        usuario = validated_data.pop("criado_por", None)
        usuario = usuario or (request.user if request and request.user.is_authenticated else None)
        atualizado_por = validated_data.pop("atualizado_por", None) or usuario
        ordem = OrdemServico.objects.create(
            criado_por=usuario,
            atualizado_por=atualizado_por,
            **validated_data,
        )
        self._salvar_itens(ordem, itens_data)
        return ordem

    def update(self, instance, validated_data):
        itens_data = validated_data.pop("itens", None)
        request = self.context.get("request")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if request and request.user.is_authenticated:
            instance.atualizado_por = request.user
        instance.save()

        if itens_data is not None:
            instance.itens.all().delete()
            self._salvar_itens(instance, itens_data)

        return instance

    def _salvar_itens(self, ordem, itens_data):
        for item in itens_data:
            item.pop("id", None)
            ItemOrcamento.objects.create(os=ordem, **item)
        self._atualizar_totais_fiscais(ordem)

    def _atualizar_totais_fiscais(self, ordem):
        itens = list(ordem.itens.all())
        valor_servicos = sum(
            Decimal(item.valor_total or 0)
            for item in itens
            if item.origem_tipo == ItemOrcamento.OrigemTipo.SERVICO
        )
        valor_materiais = sum(
            Decimal(item.valor_total or 0)
            for item in itens
            if item.origem_tipo != ItemOrcamento.OrigemTipo.SERVICO
        )

        empresa, _ = ConfiguracaoEmpresa.objects.get_or_create(nome="ERP Servicos")
        fiscal_config, _ = ConfiguracaoFiscal.objects.get_or_create(
            empresa=empresa,
            defaults={
                "cnpj": empresa.cnpj,
                "razao_social": empresa.razao_social or empresa.nome,
            },
        )

        impostos = CalculadoraImpostos().calcular(
            valor_servicos=valor_servicos,
            valor_materiais=valor_materiais,
            config=fiscal_config,
        )

        ordem.valor_servicos = valor_servicos
        ordem.valor_materiais = valor_materiais
        ordem.dados_impostos = impostos
        ordem.total_com_impostos = impostos.get("total_geral", ordem.valor_total_orcado)
        ordem.save(
            update_fields=[
                "valor_servicos",
                "valor_materiais",
                "dados_impostos",
                "total_com_impostos",
                "atualizado_em",
            ]
        )


class MudarStatusOSSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrdemServico.Status.choices)
    observacao = serializers.CharField(required=False, allow_blank=True)


class ReagendarOSSerializer(serializers.Serializer):
    data_agendada = serializers.DateField()
    hora_inicio = serializers.TimeField(required=False, allow_null=True)
    tecnico_responsavel = serializers.IntegerField(required=False, allow_null=True)


class TecnicoAgendaSerializer(serializers.Serializer):
    """Serializer para técnico com suas ordens agendadas"""
    id = serializers.IntegerField()
    nome_completo = serializers.CharField()
    username = serializers.CharField()
    total_os = serializers.IntegerField()
    ordens = OrdemServicoSerializer(many=True, read_only=True)


class AgendaSerializer(serializers.Serializer):
    """Serializer para resposta de agenda agrupada por técnico"""
    data = serializers.DateField()
    tecnicos = TecnicoAgendaSerializer(many=True)


class RelatorioPublicoSerializer(serializers.ModelSerializer):
    """Serializer para relatório público - sem informações internas de preço/custo"""
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    cliente_telefone = serializers.CharField(source="cliente.telefone", read_only=True)
    cliente_celular = serializers.CharField(source="cliente.celular", read_only=True)
    cliente_email = serializers.CharField(source="cliente.email", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico_responsavel.username", read_only=True)
    contato_nome = serializers.CharField(source="contato_responsavel.nome", read_only=True)
    fotos = FotoOSSerializer(many=True, read_only=True)
    assinatura_cliente = AssinaturaClienteOSSerializer(read_only=True)

    class Meta:
        model = OrdemServico
        fields = [
            "id",
            "numero",
            "token_relatorio",
            "status",
            "tipo_servico",
            "cliente",
            "cliente_nome",
            "cliente_telefone",
            "cliente_celular",
            "cliente_email",
            "contato_nome",
            "endereco_servico",
            "descricao_servico",
            "valor_total_orcado",
            "condicao_pagamento",
            "validade_orcamento",
            "data_aprovacao",
            "tecnico_responsavel",
            "tecnico_nome",
            "data_agendada",
            "hora_inicio",
            "hora_conclusao",
            "equipamento_marca",
            "equipamento_modelo",
            "equipamento_serie",
            "observacoes_tecnicas",
            "tipo_relatorio",
            "fotos",
            "assinatura_cliente",
            "criado_em",
        ]
        read_only_fields = fields
