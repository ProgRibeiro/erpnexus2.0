from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import CategoriaProduto, MovimentacaoEstoque, Produto, Servico
from .serializers import (
    CategoriaProdutoSerializer,
    MovimentacaoEstoqueSerializer,
    ProdutoDetalheSerializer,
    ProdutoSerializer,
    ServicoSerializer,
)
from .excel_import import ExcelImporter


class CategoriaProdutoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaProduto.objects.all()
    serializer_class = CategoriaProdutoSerializer
    search_fields = ["nome", "descricao"]
    ordering_fields = ["nome"]


class ProdutoViewSet(viewsets.ModelViewSet):
    filterset_fields = ["ativo", "categoria", "unidade_medida"]
    search_fields = ["codigo", "nome", "descricao", "localizacao"]
    ordering_fields = ["nome", "codigo", "preco_custo", "preco_venda", "estoque_minimo", "criado_em"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProdutoDetalheSerializer
        return ProdutoSerializer

    def get_queryset(self):
        queryset = Produto.objects.select_related("categoria").prefetch_related("movimentacoes")
        abaixo_minimo = self.request.query_params.get("abaixo_minimo")
        if abaixo_minimo and abaixo_minimo.lower() in ["true", "1", "sim"]:
            produtos = [produto.id for produto in queryset if produto.estoque_atual < produto.estoque_minimo]
            queryset = queryset.filter(id__in=produtos)
        return queryset


class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    serializer_class = MovimentacaoEstoqueSerializer
    filterset_fields = ["produto", "tipo", "motivo", "os"]
    search_fields = ["produto__nome", "produto__codigo", "fornecedor", "numero_nota", "observacoes"]
    ordering_fields = ["data_movimentacao", "quantidade", "valor_unitario"]

    def get_queryset(self):
        return MovimentacaoEstoque.objects.select_related("produto", "os", "realizado_por")

    def perform_create(self, serializer):
        serializer.save(realizado_por=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def relatorio_estoque(request):
    produto_id = request.query_params.get("produto")
    produtos = Produto.objects.select_related("categoria").prefetch_related("movimentacoes")
    if produto_id:
        produtos = produtos.filter(id=produto_id)

    dados = []
    for produto in produtos:
        movimentacoes = produto.movimentacoes.all()
        entradas = sum(m.quantidade for m in movimentacoes if m.tipo == MovimentacaoEstoque.Tipo.ENTRADA)
        saidas = sum(
            m.quantidade
            for m in movimentacoes
            if m.tipo in [MovimentacaoEstoque.Tipo.SAIDA, MovimentacaoEstoque.Tipo.TRANSFERENCIA]
        )
        ajustes = sum(m.quantidade for m in movimentacoes if m.tipo == MovimentacaoEstoque.Tipo.AJUSTE)
        dados.append(
            {
                "produto": produto.id,
                "codigo": produto.codigo,
                "nome": produto.nome,
                "categoria": produto.categoria.nome if produto.categoria else None,
                "estoque_atual": produto.estoque_atual,
                "estoque_minimo": produto.estoque_minimo,
                "entradas": entradas,
                "saidas": saidas,
                "ajustes": ajustes,
                "abaixo_minimo": produto.estoque_atual < produto.estoque_minimo,
            }
        )
    return Response(dados)


class ServicoViewSet(viewsets.ModelViewSet):
    queryset = Servico.objects.all()
    serializer_class = ServicoSerializer
    filterset_fields = ["ativo", "categoria", "tributacao"]
    search_fields = ["codigo", "nome", "descricao"]
    ordering_fields = ["nome", "preco_padrao", "categoria", "criado_em"]
    ordering = ["categoria", "nome"]


class ImportExcelViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    @action(detail=False, methods=["post"])
    def importar_clientes(self, request):
        arquivo = request.FILES.get("arquivo")
        if not arquivo:
            return Response({"erro": "Arquivo não fornecido"}, status=400)

        resultado = ExcelImporter.importar_clientes(arquivo)
        return Response(resultado)

    @action(detail=False, methods=["post"])
    def importar_servicos(self, request):
        arquivo = request.FILES.get("arquivo")
        if not arquivo:
            return Response({"erro": "Arquivo não fornecido"}, status=400)

        resultado = ExcelImporter.importar_servicos(arquivo)
        return Response(resultado)

    @action(detail=False, methods=["post"])
    def importar_produtos(self, request):
        arquivo = request.FILES.get("arquivo")
        if not arquivo:
            return Response({"erro": "Arquivo não fornecido"}, status=400)

        resultado = ExcelImporter.importar_produtos(arquivo)
        return Response(resultado)
