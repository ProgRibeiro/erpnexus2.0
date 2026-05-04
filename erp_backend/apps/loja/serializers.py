from rest_framework import serializers

from apps.estoque.serializers import ProdutoSerializer

from .models import (
    Caixa,
    EntregaPedido,
    FormaPagamento,
    Fornecedor,
    ImagemProduto,
    ItemPedidoCompra,
    ItemVenda,
    MovimentoCaixa,
    PagamentoVenda,
    PedidoCompra,
    ProdutoLoja,
    VariacaoProduto,
    Venda,
    Vendedor,
)


class ImagemProdutoSerializer(serializers.ModelSerializer):
    imagem_url = serializers.SerializerMethodField()

    class Meta:
        model = ImagemProduto
        fields = "__all__"

    def get_imagem_url(self, obj):
        if not obj.imagem:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.imagem.url) if request else obj.imagem.url


class VariacaoProdutoSerializer(serializers.ModelSerializer):
    preco_vigente = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = VariacaoProduto
        fields = "__all__"


class ProdutoLojaSerializer(serializers.ModelSerializer):
    produto_dados = ProdutoSerializer(source="produto", read_only=True)
    variacoes = VariacaoProdutoSerializer(many=True, read_only=True)
    imagens = ImagemProdutoSerializer(many=True, read_only=True)
    preco_vigente = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    estoque_atual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ProdutoLoja
        fields = "__all__"


class VendedorSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True)
    total_comissao_mes = serializers.SerializerMethodField()

    class Meta:
        model = Vendedor
        fields = "__all__"

    def get_total_comissao_mes(self, obj):
        from django.db.models import Sum
        from django.utils import timezone

        hoje = timezone.localdate()
        return obj.vendas.filter(finalizada_em__year=hoje.year, finalizada_em__month=hoje.month).aggregate(
            total=Sum("itens__comissao_vendedor")
        ).get("total") or 0


class FormaPagamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormaPagamento
        fields = "__all__"


class CaixaSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.CharField(source="responsavel.nome_completo", read_only=True)

    class Meta:
        model = Caixa
        fields = "__all__"


class MovimentoCaixaSerializer(serializers.ModelSerializer):
    forma_nome = serializers.CharField(source="forma_pagamento.nome", read_only=True)
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True)

    class Meta:
        model = MovimentoCaixa
        fields = "__all__"


class ItemVendaSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.produto.nome", read_only=True)
    variacao_texto = serializers.CharField(source="variacao.valor_variacao", read_only=True)

    class Meta:
        model = ItemVenda
        fields = "__all__"


class PagamentoVendaSerializer(serializers.ModelSerializer):
    forma_nome = serializers.CharField(source="forma_pagamento.nome", read_only=True)

    class Meta:
        model = PagamentoVenda
        fields = "__all__"


class VendaSerializer(serializers.ModelSerializer):
    itens = ItemVendaSerializer(many=True, read_only=True)
    pagamentos = PagamentoVendaSerializer(many=True, read_only=True)
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    vendedor_nome = serializers.CharField(source="vendedor.usuario.nome_completo", read_only=True)
    caixa_nome = serializers.CharField(source="caixa.nome", read_only=True)

    class Meta:
        model = Venda
        fields = "__all__"
        read_only_fields = ["numero", "subtotal", "valor_total", "criado_em", "finalizada_em"]


class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = "__all__"


class ItemPedidoCompraSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.produto.nome", read_only=True)

    class Meta:
        model = ItemPedidoCompra
        fields = "__all__"


class PedidoCompraSerializer(serializers.ModelSerializer):
    itens = ItemPedidoCompraSerializer(many=True, read_only=True)
    fornecedor_nome = serializers.CharField(source="fornecedor.nome", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome_completo", read_only=True)

    class Meta:
        model = PedidoCompra
        fields = "__all__"
        read_only_fields = ["numero", "subtotal", "valor_total", "criado_por", "criado_em"]


class EntregaPedidoSerializer(serializers.ModelSerializer):
    venda_numero = serializers.CharField(source="venda.numero", read_only=True)
    entregador_nome = serializers.CharField(source="entregador.nome_completo", read_only=True)

    class Meta:
        model = EntregaPedido
        fields = "__all__"
