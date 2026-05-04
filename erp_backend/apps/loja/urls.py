from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CaixaViewSet,
    EntregaPedidoViewSet,
    FormaPagamentoViewSet,
    FornecedorViewSet,
    PedidoCompraViewSet,
    ProdutoLojaViewSet,
    VendaViewSet,
    VendedorViewSet,
    curva_abc,
    dashboard,
    produtos_mais_vendidos,
    vendas_por_vendedor,
)

router = DefaultRouter()
router.register("produtos", ProdutoLojaViewSet, basename="loja-produtos")
router.register("vendedores", VendedorViewSet, basename="loja-vendedores")
router.register("formas-pagamento", FormaPagamentoViewSet, basename="loja-formas-pagamento")
router.register("caixas", CaixaViewSet, basename="loja-caixas")
router.register("vendas", VendaViewSet, basename="loja-vendas")
router.register("fornecedores", FornecedorViewSet, basename="loja-fornecedores")
router.register("pedidos-compra", PedidoCompraViewSet, basename="loja-pedidos-compra")
router.register("entregas", EntregaPedidoViewSet, basename="loja-entregas")

urlpatterns = [
    path("dashboard/", dashboard, name="loja-dashboard"),
    path("relatorios/curva-abc/", curva_abc, name="loja-curva-abc"),
    path("relatorios/vendas-por-vendedor/", vendas_por_vendedor, name="loja-vendas-vendedor"),
    path("relatorios/produtos-mais-vendidos/", produtos_mais_vendidos, name="loja-produtos-mais-vendidos"),
]

urlpatterns += router.urls
