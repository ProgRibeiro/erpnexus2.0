from rest_framework import serializers

from .models import (
    AlertaEstoque,
    CategoriaProduto,
    MotorInteligenciaConhecimento,
    MovimentacaoEstoque,
    Produto,
    ReferenciaPrecoPublico,
    Servico,
)


class CategoriaProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProduto
        fields = ["id", "nome", "descricao", "ativo", "criado_em", "atualizado_em"]
        read_only_fields = ["id", "criado_em", "atualizado_em"]


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)
    os_numero = serializers.CharField(source="os.numero", read_only=True, allow_null=True)
    realizado_por_nome = serializers.CharField(source="realizado_por.nome_completo", read_only=True)
    valor_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = MovimentacaoEstoque
        fields = [
            "id",
            "produto",
            "produto_nome",
            "produto_codigo",
            "tipo",
            "quantidade",
            "valor_unitario",
            "valor_total",
            "motivo",
            "os",
            "os_numero",
            "fornecedor",
            "numero_nota",
            "observacoes",
            "realizado_por",
            "realizado_por_nome",
            "data_movimentacao",
        ]
        read_only_fields = ["id", "realizado_por", "valor_total"]

    def validate_quantidade(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantidade deve ser maior que zero")
        return value

    def validate_valor_unitario(self, value):
        if value < 0:
            raise serializers.ValidationError("Valor unitário não pode ser negativo")
        return value


class AlertaEstoqueSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)

    class Meta:
        model = AlertaEstoque
        fields = [
            "id",
            "produto",
            "produto_nome",
            "produto_codigo",
            "tipo",
            "descricao",
            "lido",
            "criado_em",
            "resolvido_em",
        ]
        read_only_fields = ["id", "produto", "tipo", "descricao", "criado_em"]


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    estoque_atual = serializers.SerializerMethodField()
    em_alerta = serializers.SerializerMethodField()
    margem_unitaria = serializers.SerializerMethodField()
    margem_percentual = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            "id",
            "codigo",
            "nome",
            "descricao",
            "categoria",
            "categoria_nome",
            "unidade_medida",
            "preco_custo",
            "preco_venda",
            "preco_venda_sugerido",
            "markup_percentual",
            "aliquota_impostos_percentual",
            "despesas_operacionais_percentual",
            "preco_manual",
            "tipo_suprimento",
            "estoque_minimo",
            "localizacao",
            "ativo",
            "estoque_atual",
            "em_alerta",
            "margem_unitaria",
            "margem_percentual",
            "total_percentual_formacao",
            "lucro_unitario_estimado",
            "criado_em",
        ]
        read_only_fields = [
            "id",
            "codigo",
            "criado_em",
            "estoque_atual",
            "em_alerta",
            "margem_unitaria",
            "margem_percentual",
            "preco_venda_sugerido",
            "total_percentual_formacao",
            "lucro_unitario_estimado",
        ]

    def get_estoque_atual(self, obj):
        return obj.estoque_atual

    def get_em_alerta(self, obj):
        return obj.em_alerta

    def get_margem_unitaria(self, obj):
        return obj.margem_unitaria

    def get_margem_percentual(self, obj):
        return obj.margem_percentual


class ProdutoDetalheSerializer(ProdutoSerializer):
    movimentacoes = MovimentacaoEstoqueSerializer(many=True, read_only=True)
    alertas = AlertaEstoqueSerializer(many=True, read_only=True)

    class Meta(ProdutoSerializer.Meta):
        fields = ProdutoSerializer.Meta.fields + ["movimentacoes", "alertas"]


class ServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servico
        fields = "__all__"
        read_only_fields = ["codigo", "criado_em"]


class MotorInteligenciaConhecimentoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    servico_nome = serializers.CharField(source="servico.nome", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome_completo", read_only=True)

    class Meta:
        model = MotorInteligenciaConhecimento
        fields = [
            "id",
            "titulo",
            "escopo",
            "tipo",
            "entrada",
            "resposta",
            "termos",
            "payload",
            "produto",
            "produto_nome",
            "servico",
            "servico_nome",
            "confianca",
            "ativo",
            "vezes_usado",
            "origem",
            "status_revisao",
            "os_origem",
            "criado_por",
            "criado_por_nome",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = ["id", "vezes_usado", "criado_por", "criado_por_nome", "criado_em", "atualizado_em"]


class ReferenciaPrecoPublicoSerializer(serializers.ModelSerializer):
    fonte_label = serializers.CharField(source="get_fonte_display", read_only=True)
    tipo_item_label = serializers.CharField(source="get_tipo_item_display", read_only=True)
    disciplina_label = serializers.CharField(source="get_disciplina_display", read_only=True)
    componente_custo_label = serializers.CharField(source="get_componente_custo_display", read_only=True)

    class Meta:
        model = ReferenciaPrecoPublico
        fields = [
            "id",
            "codigo",
            "descricao",
            "tipo_item",
            "tipo_item_label",
            "componente_custo",
            "componente_custo_label",
            "disciplina",
            "disciplina_label",
            "unidade_medida",
            "valor_minimo",
            "valor_mediano",
            "valor_maximo",
            "fonte",
            "fonte_label",
            "codigo_fonte",
            "link_fonte",
            "base_legal",
            "uf",
            "data_referencia",
            "termos",
            "observacoes",
            "confianca",
            "ativo",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = ["id", "criado_em", "atualizado_em"]
