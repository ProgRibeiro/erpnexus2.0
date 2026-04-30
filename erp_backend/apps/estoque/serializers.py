from rest_framework import serializers

from .models import CategoriaProduto, MovimentacaoEstoque, Produto


class CategoriaProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProduto
        fields = "__all__"


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)
    os_numero = serializers.CharField(source="os.numero", read_only=True)
    realizado_por_nome = serializers.CharField(source="realizado_por.nome_completo", read_only=True)

    class Meta:
        model = MovimentacaoEstoque
        fields = "__all__"
        read_only_fields = ["realizado_por"]


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    estoque_atual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    abaixo_minimo = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = "__all__"
        read_only_fields = ["codigo", "criado_em", "estoque_atual", "abaixo_minimo"]

    def get_abaixo_minimo(self, obj):
        return obj.estoque_atual < obj.estoque_minimo


class ProdutoDetalheSerializer(ProdutoSerializer):
    movimentacoes = MovimentacaoEstoqueSerializer(many=True, read_only=True)

    class Meta(ProdutoSerializer.Meta):
        fields = "__all__"
