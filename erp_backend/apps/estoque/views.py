from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from django.http import FileResponse
from django.db.models import Sum, Q

from .models import CategoriaProduto, MotorInteligenciaConhecimento, MovimentacaoEstoque, Produto, ReferenciaPrecoPublico, Servico, AlertaEstoque
from .serializers import (
    CategoriaProdutoSerializer,
    MovimentacaoEstoqueSerializer,
    ProdutoDetalheSerializer,
    ProdutoSerializer,
    ReferenciaPrecoPublicoSerializer,
    ServicoSerializer,
    AlertaEstoqueSerializer,
    MotorInteligenciaConhecimentoSerializer,
)
from .services import MemoriaMotorInteligente, MotorCatalogoInteligente


class CategoriaProdutoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaProduto.objects.all()
    serializer_class = CategoriaProdutoSerializer
    search_fields = ["nome", "descricao"]
    ordering_fields = ["nome"]
    permission_classes = [IsAuthenticated]


class ProdutoViewSet(viewsets.ModelViewSet):
    filterset_fields = ["ativo", "categoria", "unidade_medida"]
    search_fields = ["codigo", "nome", "descricao", "localizacao"]
    ordering_fields = ["nome", "codigo", "preco_custo", "preco_venda", "estoque_minimo", "criado_em"]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProdutoDetalheSerializer
        return ProdutoSerializer

    def get_queryset(self):
        queryset = Produto.objects.select_related("categoria").prefetch_related("movimentacoes", "alertas")
        abaixo_minimo = self.request.query_params.get("abaixo_minimo")
        if abaixo_minimo and abaixo_minimo.lower() in ["true", "1", "sim"]:
            produtos = [produto.id for produto in queryset if produto.em_alerta]
            queryset = queryset.filter(id__in=produtos)
        return queryset

    @action(detail=True, methods=["get"])
    def historico_movimentacoes(self, request, pk=None):
        """GET /api/v1/estoque/produtos/{id}/historico_movimentacoes/"""
        produto = self.get_object()
        movimentacoes = produto.movimentacoes.all().order_by("-data_movimentacao")
        serializer = MovimentacaoEstoqueSerializer(movimentacoes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def em_alerta(self, request):
        """GET /api/v1/estoque/produtos/em_alerta/"""
        produtos = self.get_queryset().filter(
            id__in=[p.id for p in self.get_queryset() if p.em_alerta]
        )
        serializer = self.get_serializer(produtos, many=True)
        return Response(serializer.data)


class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    serializer_class = MovimentacaoEstoqueSerializer
    filterset_fields = ["produto", "tipo", "motivo", "os"]
    search_fields = ["produto__nome", "produto__codigo", "fornecedor", "numero_nota", "observacoes"]
    ordering_fields = ["data_movimentacao", "quantidade", "valor_unitario"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MovimentacaoEstoque.objects.select_related(
            "produto", "os", "realizado_por"
        ).order_by("-data_movimentacao")

    def perform_create(self, serializer):
        serializer.save(realizado_por=self.request.user)

    def create(self, request, *args, **kwargs):
        """POST /api/v1/estoque/movimentacoes/ - registrar entrada ou saída"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AlertaEstoqueViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlertaEstoqueSerializer
    filterset_fields = ["produto", "tipo", "lido"]
    search_fields = ["produto__nome", "descricao"]
    ordering_fields = ["criado_em", "produto"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AlertaEstoque.objects.select_related("produto").order_by("-criado_em")

    @action(detail=True, methods=["post"])
    def marcar_como_lido(self, request, pk=None):
        """POST /api/v1/estoque/alertas/{id}/marcar_como_lido/"""
        alerta = self.get_object()
        alerta.lido = True
        alerta.save()
        serializer = self.get_serializer(alerta)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def marcar_todos_como_lido(self, request):
        """POST /api/v1/estoque/alertas/marcar_todos_como_lido/"""
        AlertaEstoque.objects.filter(lido=False).update(lido=True)
        return Response({"status": "Todos os alertas foram marcados como lidos"})

    @action(detail=False, methods=["get"])
    def nao_lidos(self, request):
        """GET /api/v1/estoque/alertas/nao_lidos/"""
        alertas = self.get_queryset().filter(lido=False)
        serializer = self.get_serializer(alertas, many=True)
        return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def relatorio_estoque(request):
    """GET /api/v1/estoque/relatorio/ - histórico de movimentações"""
    produto_id = request.query_params.get("produto")
    tipo = request.query_params.get("tipo")
    motivo = request.query_params.get("motivo")
    data_inicio = request.query_params.get("data_inicio")
    data_fim = request.query_params.get("data_fim")

    movimentacoes = MovimentacaoEstoque.objects.select_related(
        "produto", "os", "realizado_por"
    )

    if produto_id:
        movimentacoes = movimentacoes.filter(produto_id=produto_id)
    if tipo:
        movimentacoes = movimentacoes.filter(tipo=tipo)
    if motivo:
        movimentacoes = movimentacoes.filter(motivo=motivo)
    if data_inicio:
        movimentacoes = movimentacoes.filter(data_movimentacao__gte=data_inicio)
    if data_fim:
        movimentacoes = movimentacoes.filter(data_movimentacao__lte=data_fim)

    movimentacoes = movimentacoes.order_by("-data_movimentacao")

    serializer = MovimentacaoEstoqueSerializer(movimentacoes, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def relatorio_produtos(request):
    """GET /api/v1/estoque/relatorio-produtos/ - resumo de todos os produtos"""
    produtos = Produto.objects.select_related("categoria").prefetch_related("movimentacoes")

    dados = []
    for produto in produtos:
        movimentacoes = produto.movimentacoes.all()
        entradas = movimentacoes.filter(tipo=MovimentacaoEstoque.Tipo.ENTRADA).aggregate(
            total=Sum("quantidade")
        )["total"] or 0
        saidas = movimentacoes.filter(
            tipo__in=[MovimentacaoEstoque.Tipo.SAIDA, MovimentacaoEstoque.Tipo.TRANSFERENCIA]
        ).aggregate(total=Sum("quantidade"))["total"] or 0
        ajustes = movimentacoes.filter(tipo=MovimentacaoEstoque.Tipo.AJUSTE).aggregate(
            total=Sum("quantidade")
        )["total"] or 0

        dados.append({
            "id": str(produto.id),
            "codigo": produto.codigo,
            "nome": produto.nome,
            "categoria": produto.categoria.nome if produto.categoria else None,
            "estoque_atual": produto.estoque_atual,
            "estoque_minimo": produto.estoque_minimo,
            "em_alerta": produto.em_alerta,
            "preco_custo": str(produto.preco_custo),
            "preco_venda": str(produto.preco_venda),
            "margem_unitaria": str(produto.margem_unitaria),
            "margem_percentual": float(produto.margem_percentual),
            "valor_total_custo": str(produto.estoque_atual * produto.preco_custo),
            "entradas": int(entradas),
            "saidas": int(saidas),
            "ajustes": int(ajustes),
        })

    return Response(dados)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_estoque(request):
    """GET /api/v1/estoque/dashboard/ - métricas principais de estoque"""
    produtos_total = Produto.objects.filter(ativo=True).count()
    produtos_em_alerta = sum(1 for p in Produto.objects.all() if p.em_alerta)
    alertas_nao_lidos = AlertaEstoque.objects.filter(lido=False).count()

    movimentacoes_hoje = MovimentacaoEstoque.objects.filter(
        data_movimentacao__date=timezone.now().date()
    ).count()

    valor_total_estoque = sum(p.estoque_atual * p.preco_custo for p in Produto.objects.all())

    return Response({
        "produtos_total": produtos_total,
        "produtos_em_alerta": produtos_em_alerta,
        "alertas_nao_lidos": alertas_nao_lidos,
        "movimentacoes_hoje": movimentacoes_hoje,
        "valor_total_estoque": str(valor_total_estoque),
    })


class ServicoViewSet(viewsets.ModelViewSet):
    queryset = Servico.objects.all()
    serializer_class = ServicoSerializer
    filterset_fields = ["ativo", "categoria", "tributacao"]
    search_fields = ["codigo", "nome", "descricao"]
    ordering_fields = ["nome", "preco_padrao", "categoria", "criado_em"]
    ordering = ["categoria", "nome"]
    permission_classes = [IsAuthenticated]


class ReferenciaPrecoPublicoViewSet(viewsets.ModelViewSet):
    serializer_class = ReferenciaPrecoPublicoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["ativo", "tipo_item", "disciplina", "fonte", "uf"]
    search_fields = ["codigo", "descricao", "codigo_fonte", "observacoes"]
    ordering_fields = ["descricao", "valor_mediano", "data_referencia", "confianca"]
    ordering = ["disciplina", "descricao"]

    def get_queryset(self):
        return ReferenciaPrecoPublico.objects.all()

    @action(detail=False, methods=["get"], url_path="resumo")
    def resumo(self, request):
        referencias = self.get_queryset().filter(ativo=True)
        por_fonte = {}
        for fonte, label in ReferenciaPrecoPublico.Fonte.choices:
            por_fonte[fonte] = {
                "label": label,
                "total": referencias.filter(fonte=fonte).count(),
            }
        return Response(
            {
                "total": referencias.count(),
                "por_fonte": por_fonte,
                "metodologia": [
                    "Usa mediana como base, não o menor preço isolado.",
                    "Aplica margem por tipo de item, fator de complexidade e fator regional.",
                    "Mostra fonte e confiança para revisão humana antes de enviar ao cliente.",
                ],
            }
        )


class MotorCatalogoViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    @action(detail=False, methods=["post"])
    def analisar(self, request):
        arquivo = request.FILES.get("arquivo")
        texto = request.data.get("texto", "")
        markup = request.data.get("markup_padrao")
        despesas = request.data.get("despesas_padrao")

        if not arquivo and not texto:
            return Response(
                {"detail": "Envie uma planilha/CSV em 'arquivo' ou cole uma lista em 'texto'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resultado = MotorCatalogoInteligente().analisar(
            texto=texto,
            arquivo=arquivo,
            markup_padrao=markup,
            despesas_padrao=despesas,
        )
        return Response(resultado)

    @action(detail=False, methods=["post"])
    def criar(self, request):
        itens = request.data.get("itens", [])
        if not isinstance(itens, list) or not itens:
            return Response(
                {"detail": "Envie uma lista de itens analisados em 'itens'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resultado = MotorCatalogoInteligente().criar(itens)
        return Response(resultado, status=status.HTTP_201_CREATED if not resultado["erros"] else status.HTTP_207_MULTI_STATUS)


class MotorInteligenciaViewSet(viewsets.ModelViewSet):
    serializer_class = MotorInteligenciaConhecimentoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["ativo", "escopo", "tipo", "produto", "servico"]
    search_fields = ["titulo", "entrada", "resposta"]
    ordering_fields = ["atualizado_em", "vezes_usado", "confianca", "titulo"]
    ordering = ["-atualizado_em"]

    def get_queryset(self):
        return MotorInteligenciaConhecimento.objects.select_related("produto", "servico", "criado_por", "os_origem")

    def perform_create(self, serializer):
        if not serializer.validated_data.get("termos"):
            texto = " ".join([
                serializer.validated_data.get("titulo", ""),
                serializer.validated_data.get("entrada", ""),
                serializer.validated_data.get("resposta", ""),
            ])
            serializer.validated_data["termos"] = sorted(MemoriaMotorInteligente()._tokens(texto))
        serializer.save(criado_por=self.request.user)

    @action(detail=False, methods=["post"])
    def chat(self, request):
        mensagem = request.data.get("mensagem", "")
        contexto = request.data.get("contexto", {})
        if not mensagem:
            return Response({"detail": "Envie uma mensagem para ensinar ou consultar o motor."}, status=status.HTTP_400_BAD_REQUEST)
        resposta = MemoriaMotorInteligente().responder_chat(mensagem, usuario=request.user, contexto=contexto)
        return Response(resposta, status=status.HTTP_201_CREATED if resposta["acao"] == "aprendido" else status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def consultar(self, request):
        texto = request.data.get("texto", "")
        escopo = request.data.get("escopo")
        sugestoes = MemoriaMotorInteligente().buscar(texto, escopo=escopo, limite=10, incrementar=False)
        return Response({"sugestoes": sugestoes})

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        return Response(MemoriaMotorInteligente().painel_memoria())

    @action(detail=False, methods=["post"], url_path="aprender-os")
    def aprender_os(self, request):
        from apps.ordens.models import OrdemServico

        memoria = MemoriaMotorInteligente()
        os_id = request.data.get("os") or request.data.get("os_id")
        if os_id:
            try:
                ordem = OrdemServico.objects.prefetch_related("itens__produto", "itens__servico").get(pk=os_id)
            except OrdemServico.DoesNotExist:
                return Response({"detail": "OS não encontrada para aprendizado."}, status=status.HTTP_404_NOT_FOUND)
            aprendidos = memoria.aprender_com_ordem(ordem, usuario=request.user)
        else:
            aprendidos = memoria.aprender_com_ordens_concluidas(
                limite=request.data.get("limite", 20),
                usuario=request.user,
            )
        serializer = self.get_serializer(aprendidos, many=True)
        return Response({"total": len(aprendidos), "conhecimentos": serializer.data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        conhecimento = self.get_object()
        conhecimento.status_revisao = MotorInteligenciaConhecimento.StatusRevisao.APROVADO
        conhecimento.ativo = True
        conhecimento.save(update_fields=["status_revisao", "ativo", "atualizado_em"])
        return Response(self.get_serializer(conhecimento).data)

    @action(detail=True, methods=["post"])
    def rejeitar(self, request, pk=None):
        conhecimento = self.get_object()
        conhecimento.status_revisao = MotorInteligenciaConhecimento.StatusRevisao.REJEITADO
        conhecimento.ativo = False
        conhecimento.save(update_fields=["status_revisao", "ativo", "atualizado_em"])
        return Response(self.get_serializer(conhecimento).data)


# Imports necessários para templates Excel
from .excel_import import ExcelImporter
from .excel_templates import ExcelTemplateGenerator


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

    @action(detail=False, methods=["get"])
    def template_clientes(self, request):
        arquivo = ExcelTemplateGenerator.gerar_template_clientes()
        return FileResponse(arquivo, as_attachment=True, filename="template_clientes.xlsx")

    @action(detail=False, methods=["get"])
    def template_servicos(self, request):
        arquivo = ExcelTemplateGenerator.gerar_template_servicos()
        return FileResponse(arquivo, as_attachment=True, filename="template_servicos.xlsx")

    @action(detail=False, methods=["get"])
    def template_produtos(self, request):
        arquivo = ExcelTemplateGenerator.gerar_template_produtos()
        return FileResponse(arquivo, as_attachment=True, filename="template_produtos.xlsx")


from django.utils import timezone
