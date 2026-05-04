from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import (
    Caixa,
    EntregaPedido,
    FormaPagamento,
    Fornecedor,
    ImagemProduto,
    ItemPedidoCompra,
    ItemVenda,
    MovimentoCaixa,
    PedidoCompra,
    ProdutoLoja,
    VariacaoProduto,
    Venda,
    Vendedor,
)
from .permissions import GerenteLojaPermission, LojaPermission
from .serializers import (
    CaixaSerializer,
    EntregaPedidoSerializer,
    FormaPagamentoSerializer,
    FornecedorSerializer,
    ImagemProdutoSerializer,
    ItemPedidoCompraSerializer,
    ItemVendaSerializer,
    MovimentoCaixaSerializer,
    PedidoCompraSerializer,
    ProdutoLojaSerializer,
    VariacaoProdutoSerializer,
    VendaSerializer,
    VendedorSerializer,
)
from .services import finalizar_venda, receber_pedido_compra


class ProdutoLojaViewSet(viewsets.ModelViewSet):
    serializer_class = ProdutoLojaSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [LojaPermission]

    def get_queryset(self):
        queryset = ProdutoLoja.objects.select_related("produto", "produto__categoria").prefetch_related("variacoes", "imagens")
        categoria = self.request.query_params.get("categoria")
        busca = self.request.query_params.get("busca") or self.request.query_params.get("search")
        em_estoque = self.request.query_params.get("em_estoque")
        promocao = self.request.query_params.get("promocao")
        if categoria:
            queryset = queryset.filter(produto__categoria_id=categoria)
        if busca:
            queryset = queryset.filter(produto__nome__icontains=busca)
        if promocao in ["1", "true", "True"]:
            queryset = queryset.filter(promocao_ativa=True)
        if em_estoque in ["1", "true", "True"]:
            queryset = [produto for produto in queryset if produto.estoque_atual > 0]
        return queryset

    def perform_create(self, serializer):
        produto_loja = serializer.save()
        for arquivo in self.request.FILES.getlist("imagens") or self.request.FILES.getlist("imagem"):
            imagem = ImagemProduto.objects.create(produto=produto_loja, imagem=arquivo, ordem=produto_loja.imagens.count())
            if not produto_loja.imagem_principal:
                produto_loja.imagem_principal = arquivo
                produto_loja.save(update_fields=["imagem_principal"])
            if produto_loja.imagens.count() == 1:
                imagem.principal = True
                imagem.save(update_fields=["principal"])

    @action(detail=False, methods=["get"], url_path="buscar-codigo-barras")
    def buscar_codigo_barras(self, request):
        codigo = request.query_params.get("codigo")
        variacao = VariacaoProduto.objects.select_related("produto", "produto__produto").filter(codigo_barras=codigo, ativo=True).first()
        if variacao:
            return Response({"produto": self.get_serializer(variacao.produto).data, "variacao": VariacaoProdutoSerializer(variacao).data})
        produto = ProdutoLoja.objects.filter(produto__codigo=codigo).first()
        if not produto:
            return Response({"detail": "Produto não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(self.get_serializer(produto).data)

    @action(detail=True, methods=["post"], url_path="variacoes")
    def variacoes(self, request, pk=None):
        produto = self.get_object()
        serializer = VariacaoProdutoSerializer(data={**request.data, "produto": produto.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="imagens")
    def imagens(self, request, pk=None):
        produto = self.get_object()
        imagens = []
        for arquivo in request.FILES.getlist("imagens") or request.FILES.getlist("imagem"):
            imagens.append(ImagemProduto.objects.create(produto=produto, imagem=arquivo, ordem=request.data.get("ordem") or 0))
        return Response(ImagemProdutoSerializer(imagens, many=True, context={"request": request}).data, status=status.HTTP_201_CREATED)


class VendedorViewSet(viewsets.ModelViewSet):
    serializer_class = VendedorSerializer
    permission_classes = [LojaPermission]

    def get_queryset(self):
        queryset = Vendedor.objects.select_related("usuario")
        if getattr(self.request.user, "role", "") == "vendedor_loja":
            queryset = queryset.filter(usuario=self.request.user)
        return queryset


class FormaPagamentoViewSet(viewsets.ModelViewSet):
    queryset = FormaPagamento.objects.all()
    serializer_class = FormaPagamentoSerializer
    permission_classes = [LojaPermission]


class CaixaViewSet(viewsets.ModelViewSet):
    queryset = Caixa.objects.select_related("responsavel")
    serializer_class = CaixaSerializer
    permission_classes = [LojaPermission]

    @action(detail=False, methods=["get"], url_path="abertos")
    def abertos(self, request):
        return Response(self.get_serializer(self.get_queryset().filter(aberto=True), many=True).data)

    @action(detail=False, methods=["post"], url_path="abrir", permission_classes=[GerenteLojaPermission])
    def abrir(self, request):
        valor = Decimal(str(request.data.get("valor_abertura") or request.data.get("valor_inicial") or 0))
        caixa = Caixa.objects.create(
            nome=request.data.get("nome") or "Caixa Loja",
            responsavel=request.user,
            aberto=True,
            valor_abertura=valor,
            saldo_atual=valor,
        )
        MovimentoCaixa.objects.create(caixa=caixa, tipo=MovimentoCaixa.Tipo.SUPRIMENTO, valor=valor, descricao="Abertura de caixa", usuario=request.user)
        return Response(self.get_serializer(caixa).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="fechar", permission_classes=[GerenteLojaPermission])
    def fechar(self, request, pk=None):
        caixa = self.get_object()
        valor = Decimal(str(request.data.get("valor_fechamento") or 0))
        caixa.valor_fechamento = valor
        caixa.diferenca = valor - Decimal(caixa.saldo_atual or 0)
        caixa.aberto = False
        caixa.fechamento = timezone.now()
        caixa.save(update_fields=["valor_fechamento", "diferenca", "aberto", "fechamento"])
        return Response(self.get_serializer(caixa).data)

    def _movimento(self, request, tipo):
        caixa = self.get_object()
        valor = Decimal(str(request.data.get("valor") or 0))
        MovimentoCaixa.objects.create(caixa=caixa, tipo=tipo, valor=valor, descricao=request.data.get("descricao", tipo), usuario=request.user)
        caixa.saldo_atual = Decimal(caixa.saldo_atual or 0) + (valor if tipo == MovimentoCaixa.Tipo.SUPRIMENTO else -valor)
        caixa.save(update_fields=["saldo_atual"])
        return Response(self.get_serializer(caixa).data)

    @action(detail=True, methods=["post"], url_path="sangria", permission_classes=[GerenteLojaPermission])
    def sangria(self, request, pk=None):
        return self._movimento(request, MovimentoCaixa.Tipo.SANGRIA)

    @action(detail=True, methods=["post"], url_path="suprimento", permission_classes=[GerenteLojaPermission])
    def suprimento(self, request, pk=None):
        return self._movimento(request, MovimentoCaixa.Tipo.SUPRIMENTO)


class VendaViewSet(viewsets.ModelViewSet):
    serializer_class = VendaSerializer
    permission_classes = [LojaPermission]

    def get_queryset(self):
        queryset = Venda.objects.select_related("caixa", "vendedor__usuario", "cliente").prefetch_related("itens", "pagamentos")
        if getattr(self.request.user, "role", "") == "vendedor_loja":
            queryset = queryset.filter(vendedor__usuario=self.request.user)
        return queryset

    @action(detail=True, methods=["post"], url_path="adicionar-item")
    def adicionar_item(self, request, pk=None):
        venda = self.get_object()
        produto = ProdutoLoja.objects.get(pk=request.data["produto"])
        variacao = VariacaoProduto.objects.filter(pk=request.data.get("variacao")).first() if request.data.get("variacao") else None
        item = ItemVenda.objects.create(
            venda=venda,
            produto=produto,
            variacao=variacao,
            quantidade=request.data.get("quantidade") or 1,
            valor_unitario=request.data.get("valor_unitario") or (variacao.preco_vigente if variacao else produto.preco_vigente),
            desconto_item=request.data.get("desconto_item") or 0,
        )
        return Response(ItemVendaSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"item/(?P<item_id>[^/.]+)")
    def remover_item(self, request, pk=None, item_id=None):
        venda = self.get_object()
        venda.itens.filter(pk=item_id).delete()
        venda.recalcular_totais()
        return Response(self.get_serializer(venda).data)

    @action(detail=True, methods=["post"], url_path="aplicar-desconto")
    def aplicar_desconto(self, request, pk=None):
        venda = self.get_object()
        venda.desconto_total = request.data.get("desconto_total") or request.data.get("valor") or 0
        venda.recalcular_totais()
        return Response(self.get_serializer(venda).data)

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        venda = self.get_object()
        try:
            finalizar_venda(venda, request.data.get("pagamentos", []), usuario=request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        venda.refresh_from_db()
        return Response(self.get_serializer(venda).data)


class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [LojaPermission]


class PedidoCompraViewSet(viewsets.ModelViewSet):
    serializer_class = PedidoCompraSerializer
    permission_classes = [LojaPermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return PedidoCompra.objects.select_related("fornecedor", "criado_por").prefetch_related("itens")

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=True, methods=["post"], url_path="adicionar-item")
    def adicionar_item(self, request, pk=None):
        pedido = self.get_object()
        item = ItemPedidoCompra.objects.create(
            pedido=pedido,
            produto_id=request.data["produto"],
            variacao_id=request.data.get("variacao") or None,
            quantidade=request.data.get("quantidade") or 1,
            valor_unitario=request.data.get("valor_unitario") or 0,
        )
        return Response(ItemPedidoCompraSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="receber")
    def receber(self, request, pk=None):
        pedido = receber_pedido_compra(self.get_object(), usuario=request.user)
        return Response(self.get_serializer(pedido).data)


class EntregaPedidoViewSet(viewsets.ModelViewSet):
    serializer_class = EntregaPedidoSerializer
    permission_classes = [LojaPermission]

    def get_queryset(self):
        queryset = EntregaPedido.objects.select_related("venda", "entregador")
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    @action(detail=True, methods=["post"], url_path="atualizar-status")
    def atualizar_status(self, request, pk=None):
        entrega = self.get_object()
        entrega.status = request.data["status"]
        if entrega.status == EntregaPedido.Status.ENTREGUE:
            entrega.data_entrega = timezone.localdate()
        entrega.save()
        return Response(self.get_serializer(entrega).data)

    @action(detail=False, methods=["get"], url_path="rota-otimizada")
    def rota_otimizada(self, request):
        data = request.query_params.get("data")
        queryset = self.get_queryset().filter(previsao_entrega=data) if data else self.get_queryset()
        queryset = queryset.exclude(status__in=[EntregaPedido.Status.ENTREGUE, EntregaPedido.Status.DEVOLVIDO]).order_by("endereco_entrega", "id")
        return Response(self.get_serializer(queryset, many=True).data)


@api_view(["GET"])
@permission_classes([LojaPermission])
def dashboard(request):
    hoje = timezone.localdate()
    vendas = Venda.objects.filter(status=Venda.Status.FINALIZADA, finalizada_em__date=hoje)
    total = vendas.aggregate(total=Sum("valor_total")).get("total") or 0
    quantidade = vendas.count()
    itens = ItemVenda.objects.filter(venda__in=vendas).values("produto__produto__nome").annotate(total=Sum("quantidade")).order_by("-total")[:10]
    vendedor_mes = Vendedor.objects.annotate(total_mes=Sum("vendas__valor_total")).order_by("-total_mes").first()
    return Response({
        "vendas_dia": total,
        "quantidade_vendas": quantidade,
        "ticket_medio": total / quantidade if quantidade else 0,
        "produtos_mais_vendidos": list(itens),
        "vendedor_mes": VendedorSerializer(vendedor_mes).data if vendedor_mes else None,
    })


@api_view(["GET"])
@permission_classes([LojaPermission])
def curva_abc(request):
    dados = ItemVenda.objects.values("produto__produto__nome").annotate(total=Sum("valor_total")).order_by("-total")
    return Response(list(dados))


@api_view(["GET"])
@permission_classes([LojaPermission])
def vendas_por_vendedor(request):
    dados = Vendedor.objects.values("codigo_vendedor", "usuario__first_name").annotate(total=Sum("vendas__valor_total"), vendas=Count("vendas")).order_by("-total")
    return Response(list(dados))


@api_view(["GET"])
@permission_classes([LojaPermission])
def produtos_mais_vendidos(request):
    dados = ItemVenda.objects.values("produto__produto__nome").annotate(total=Sum("quantidade"), faturamento=Sum("valor_total")).order_by("-total")[:50]
    return Response(list(dados))
