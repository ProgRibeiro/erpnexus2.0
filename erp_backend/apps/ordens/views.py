from io import BytesIO
from datetime import datetime, timedelta
from collections import defaultdict

from django.core.files.base import ContentFile
from django.http import FileResponse
from django.utils import timezone
from reportlab.pdfgen import canvas
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatOS, DespesaOS, FotoOS, LogStatusOS, OrdemServico
from .pdf_generator import gerar_relatorio_pdf, gerar_orcamento_pdf, salvar_relatorio_pdf, salvar_orcamento_pdf
from .services import PedidoCompraInteligente
from .serializers import (
    ChatOSSerializer,
    DespesaOSSerializer,
    FotoOSSerializer,
    MudarStatusOSSerializer,
    OrdemServicoSerializer,
    ReagendarOSSerializer,
    AgendaSerializer,
    RelatorioPublicoSerializer,
)


class OrdemServicoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdemServicoSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    search_fields = ["numero", "descricao_servico", "cliente__nome", "cliente__cnpj_cpf"]
    filterset_fields = ["status", "cliente", "tecnico_responsavel", "tipo_servico"]
    ordering_fields = ["criado_em", "data_agendada", "valor_total_orcado"]

    def get_queryset(self):
        queryset = (
            OrdemServico.objects.select_related(
                "cliente",
                "contato_responsavel",
                "endereco_servico",
                "tecnico_responsavel",
                "criado_por",
                "atualizado_por",
            )
            .prefetch_related("itens", "fotos", "mensagens__anexos", "despesas", "logs_status")
        )
        status_param = self.request.query_params.get("status")
        tecnico = self.request.query_params.get("tecnico") or self.request.query_params.get(
            "tecnico_responsavel"
        )
        tipo = self.request.query_params.get("tipo") or self.request.query_params.get("tipo_servico")
        periodo_inicio = self.request.query_params.get("periodo_inicio") or self.request.query_params.get(
            "data_inicio"
        )
        periodo_fim = self.request.query_params.get("periodo_fim") or self.request.query_params.get(
            "data_fim"
        )

        if status_param:
            queryset = queryset.filter(status=status_param)
        if tecnico:
            queryset = queryset.filter(tecnico_responsavel_id=tecnico)
        if tipo:
            queryset = queryset.filter(tipo_servico=tipo)
        if periodo_inicio:
            queryset = queryset.filter(data_agendada__gte=periodo_inicio)
        if periodo_fim:
            queryset = queryset.filter(data_agendada__lte=periodo_fim)

        return queryset

    def perform_create(self, serializer):
        ordem = serializer.save(criado_por=self.request.user, atualizado_por=self.request.user)
        if ordem.tem_pedido_compra and ordem.pdf_pc:
            PedidoCompraInteligente().registrar_aprendizado(ordem, usuario=self.request.user)

    def perform_update(self, serializer):
        ordem = serializer.save(atualizado_por=self.request.user)
        if ordem.tem_pedido_compra and ordem.pdf_pc:
            PedidoCompraInteligente().registrar_aprendizado(ordem, usuario=self.request.user)

    @action(detail=True, methods=["post"], url_path="mudar-status")
    def mudar_status(self, request, pk=None):
        ordem = self.get_object()
        serializer = MudarStatusOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        status_anterior = ordem.status
        status_novo = serializer.validated_data["status"]
        ordem.status = status_novo
        ordem.atualizado_por = request.user
        ordem.save(update_fields=["status", "atualizado_por", "atualizado_em"])
        LogStatusOS.objects.create(
            os=ordem,
            status_anterior=status_anterior,
            status_novo=status_novo,
            alterado_por=request.user,
            observacao=serializer.validated_data.get("observacao", ""),
        )
        return Response(self.get_serializer(ordem).data)

    @action(detail=True, methods=["post"], url_path="upload-fotos")
    def upload_fotos(self, request, pk=None):
        ordem = self.get_object()
        arquivos = request.FILES.getlist("arquivos") or request.FILES.getlist("arquivo")
        if not arquivos:
            return Response(
                {"detail": "Envie ao menos um arquivo em 'arquivo' ou 'arquivos'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fotos = []
        for arquivo in arquivos:
            fotos.append(
                FotoOS.objects.create(
                    os=ordem,
                    tipo=request.data.get("tipo", FotoOS.Tipo.ANTES),
                    arquivo=arquivo,
                    legenda=request.data.get("legenda", ""),
                    ordem=request.data.get("ordem") or 0,
                    enviado_por=request.user,
                )
            )
        return Response(FotoOSSerializer(fotos, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="analisar-pedido-compra")
    def analisar_pedido_compra(self, request, pk=None):
        ordem = self.get_object()
        arquivo = request.FILES.get("arquivo")
        analisador = PedidoCompraInteligente()

        try:
            if arquivo is not None:
                analise = analisador.analisar_arquivo(arquivo, ordem=ordem)
            elif ordem.pdf_pc:
                with ordem.pdf_pc.open("rb") as pdf_salvo:
                    analise = analisador.analisar_arquivo(pdf_salvo, ordem=ordem)
            else:
                return Response(
                    {"detail": "Envie um PDF do pedido de compra para análise."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as error:
            return Response(
                {"detail": f"Não foi possível analisar o PDF do pedido de compra: {error}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if arquivo is not None:
            ordem.pdf_pc = arquivo
        ordem.dados_pc_extraidos = analise
        ordem.resumo_pc = analise.get("resumo", "")
        ordem.pc_confianca = analise.get("confianca", "0")
        ordem.pc_ultima_analise_em = timezone.now()
        if not ordem.numero_pc and analise.get("numero_pc_sugerido"):
            ordem.numero_pc = analise["numero_pc_sugerido"]
        if not ordem.validade_pc and analise.get("validade_sugerida"):
            ordem.validade_pc = datetime.fromisoformat(analise["validade_sugerida"]).date()
        if ordem.tem_pedido_compra and not ordem.valor_autorizado_pc:
            ordem.valor_autorizado_pc = ordem.valor_total_orcado
        ordem.save(
            update_fields=[
                "dados_pc_extraidos",
                "resumo_pc",
                "pc_confianca",
                "pc_ultima_analise_em",
                "pdf_pc",
                "numero_pc",
                "validade_pc",
                "valor_autorizado_pc",
                "atualizado_em",
            ]
        )
        analisador.registrar_aprendizado(ordem, usuario=request.user)

        return Response(
            {
                "analise": analise,
                "ordem": self.get_serializer(ordem).data,
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="chat")
    def chat(self, request, pk=None):
        ordem = self.get_object()
        if request.method == "GET":
            mensagens = ordem.mensagens.select_related("usuario").prefetch_related("anexos")
            return Response(ChatOSSerializer(mensagens, many=True).data)

        serializer = ChatOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mensagem = ChatOS.objects.create(
            os=ordem,
            usuario=request.user,
            mensagem=serializer.validated_data["mensagem"],
        )
        return Response(ChatOSSerializer(mensagem).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="despesas")
    def despesas(self, request, pk=None):
        ordem = self.get_object()
        if request.method == "GET":
            despesas = ordem.despesas.select_related("registrado_por")
            return Response(DespesaOSSerializer(despesas, many=True).data)

        serializer = DespesaOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        despesa = DespesaOS.objects.create(
            os=ordem,
            registrado_por=request.user,
            **serializer.validated_data,
        )
        return Response(DespesaOSSerializer(despesa).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="agenda")
    def agenda(self, request):
        """
        GET /api/v1/ordens/agenda/?data_inicio=2025-04-01&data_fim=2025-04-30
        Retorna OS agrupadas por técnico dentro do período especificado
        """
        data_inicio = request.query_params.get("data_inicio")
        data_fim = request.query_params.get("data_fim")
        tecnico_id = request.query_params.get("tecnico")
        tipo_servico = request.query_params.get("tipo_servico")

        queryset = self.get_queryset().exclude(data_agendada__isnull=True).filter(
            status__in=[OrdemServico.Status.AGENDADA, OrdemServico.Status.EM_EXECUCAO]
        )

        if data_inicio:
            queryset = queryset.filter(data_agendada__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data_agendada__lte=data_fim)
        if tecnico_id:
            queryset = queryset.filter(tecnico_responsavel_id=tecnico_id)
        if tipo_servico:
            queryset = queryset.filter(tipo_servico=tipo_servico)

        # Agrupar por data e depois por técnico
        agenda_por_data = defaultdict(lambda: defaultdict(list))

        for ordem in queryset.order_by("data_agendada", "tecnico_responsavel__nome_completo", "hora_inicio"):
            data = ordem.data_agendada
            tecnico = ordem.tecnico_responsavel
            agenda_por_data[data][tecnico].append(ordem)

        resultado = []
        for data in sorted(agenda_por_data.keys()):
            tecnicos_data = []
            for tecnico, ordens in agenda_por_data[data].items():
                if tecnico:
                    tecnicos_data.append({
                        "id": tecnico.id,
                        "nome_completo": tecnico.nome_completo,
                        "username": tecnico.username,
                        "total_os": len(ordens),
                        "ordens": OrdemServicoSerializer(ordens, many=True).data,
                    })
                else:
                    # OS sem técnico atribuído
                    tecnicos_data.append({
                        "id": None,
                        "nome_completo": "Não atribuído",
                        "username": "nao_atribuido",
                        "total_os": len(ordens),
                        "ordens": OrdemServicoSerializer(ordens, many=True).data,
                    })

            resultado.append({
                "data": data,
                "tecnicos": tecnicos_data,
            })

        return Response(resultado)

    @action(detail=False, methods=["get"], url_path="agenda/hoje")
    def agenda_hoje(self, request):
        """
        GET /api/v1/ordens/agenda/hoje/
        Retorna OS agendadas para hoje, filtradas por técnico se for técnico
        """
        hoje = timezone.localdate()
        queryset = self.get_queryset().filter(data_agendada=hoje).filter(
            status__in=[OrdemServico.Status.AGENDADA, OrdemServico.Status.EM_EXECUCAO]
        )

        if getattr(request.user, "role", None) == "tecnico":
            queryset = queryset.filter(tecnico_responsavel=request.user)

        # Ordenar por hora de início
        ordens = queryset.order_by("hora_inicio")
        return Response(self.get_serializer(ordens, many=True).data)

    @action(detail=True, methods=["patch"], url_path="reagendar")
    def reagendar(self, request, pk=None):
        """
        PATCH /api/v1/ordens/{id}/reagendar/
        Altera data_agendada e/ou hora_inicio, notifica técnico
        """
        ordem = self.get_object()
        serializer = ReagendarOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Dados antigos para log
        data_anterior = ordem.data_agendada
        tecnico_anterior = ordem.tecnico_responsavel
        hora_anterior = ordem.hora_inicio

        # Atualizar dados
        ordem.data_agendada = serializer.validated_data["data_agendada"]
        if "hora_inicio" in serializer.validated_data:
            ordem.hora_inicio = serializer.validated_data["hora_inicio"]
        if "tecnico_responsavel" in serializer.validated_data:
            ordem.tecnico_responsavel_id = serializer.validated_data["tecnico_responsavel"]

        ordem.atualizado_por = request.user
        ordem.save()

        # Log de alteração
        observacao = f"Reagendada de {data_anterior} para {ordem.data_agendada}"
        if tecnico_anterior != ordem.tecnico_responsavel:
            observacao += f" | Técnico alterado"
        LogStatusOS.objects.create(
            os=ordem,
            status_anterior=ordem.status,
            status_novo=ordem.status,
            alterado_por=request.user,
            observacao=observacao,
        )

        return Response(self.get_serializer(ordem).data)

    @action(detail=True, methods=["post"], url_path="gerar-pdf-relatorio")
    def gerar_pdf_relatorio(self, request, pk=None):
        ordem = self.get_object()
        pdf_bytes = gerar_relatorio_pdf(ordem.pk)
        if pdf_bytes:
            return FileResponse(
                BytesIO(pdf_bytes),
                as_attachment=True,
                filename=f"relatorio_{ordem.numero}.pdf",
                content_type="application/pdf",
            )
        return Response(
            {"detail": "Erro ao gerar PDF de relatório"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="gerar-pdf-orcamento")
    def gerar_pdf_orcamento(self, request, pk=None):
        ordem = self.get_object()
        pdf_bytes = gerar_orcamento_pdf(ordem.pk)
        if pdf_bytes:
            filename = f"orcamento_{ordem.numero}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            ordem.pdf_orcamento.save(filename, ContentFile(pdf_bytes), save=True)
            return FileResponse(
                BytesIO(pdf_bytes),
                as_attachment=True,
                filename=f"orcamento_{ordem.numero}.pdf",
                content_type="application/pdf",
            )
        return Response(
            {"detail": "Erro ao gerar PDF de orçamento"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="salvar-relatorio-pdf")
    def salvar_relatorio_pdf_action(self, request, pk=None):
        ordem = self.get_object()
        if salvar_relatorio_pdf(ordem.pk):
            return Response({"detail": "PDF de relatório salvo com sucesso"})
        return Response(
            {"detail": "Erro ao salvar PDF de relatório"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="salvar-orcamento-pdf")
    def salvar_orcamento_pdf_action(self, request, pk=None):
        ordem = self.get_object()
        if salvar_orcamento_pdf(ordem.pk):
            return Response({"detail": "PDF de orçamento salvo com sucesso"})
        return Response(
            {"detail": "Erro ao salvar PDF de orçamento"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class RelatorioPublicoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            ordem = OrdemServico.objects.select_related(
                "cliente",
                "tecnico_responsavel",
                "contato_responsavel",
                "endereco_servico"
            ).prefetch_related("fotos", "assinatura_cliente").get(
                token_relatorio=token
            )
            return Response(RelatorioPublicoSerializer(ordem, context={"request": request}).data)
        except OrdemServico.DoesNotExist:
            return Response(
                {"detail": "Relatório não encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )


class RelatorioPublicoPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        ordem = OrdemServico.objects.select_related("cliente", "tecnico_responsavel").prefetch_related("fotos").get(token_relatorio=token)
        pdf_bytes = gerar_relatorio_pdf(ordem.pk)
        if pdf_bytes:
            return FileResponse(
                BytesIO(pdf_bytes),
                as_attachment=False,
                filename=f"relatorio_{ordem.numero}.pdf",
                content_type="application/pdf",
            )
        return Response(
            {"detail": "Erro ao gerar PDF de relatório"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
