from django.contrib import admin

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

for model in [
    ProdutoLoja,
    VariacaoProduto,
    ImagemProduto,
    Vendedor,
    Caixa,
    MovimentoCaixa,
    FormaPagamento,
    Venda,
    ItemVenda,
    PagamentoVenda,
    PedidoCompra,
    ItemPedidoCompra,
    Fornecedor,
    EntregaPedido,
]:
    admin.site.register(model)
