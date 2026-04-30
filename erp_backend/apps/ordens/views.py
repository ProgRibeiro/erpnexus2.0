from io import BytesIO

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
from .serializers import (
    ChatOSSerializer,
    DespesaOSSerializer,
    FotoOSSerializer,
    MudarStatusOSSerializer,
    OrdemServicoSerializer,
    ReagendarOSSerializer,
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
        serializer.save(criado_por=self.request.user, atualizado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(atualizado_por=self.request.user)

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
        data_inicio = request.query_params.get("data_inicio")
        data_fim = request.query_params.get("data_fim")
        queryset = self.get_queryset().exclude(data_agendada__isnull=True)
        if data_inicio:
            queryset = queryset.filter(data_agendada__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data_agendada__lte=data_fim)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="agenda/hoje")
    def agenda_hoje(self, request):
        hoje = timezone.localdate()
        queryset = self.get_queryset().filter(data_agendada=hoje)
        if getattr(request.user, "role", None) == "tecnico":
            queryset = queryset.filter(tecnico_responsavel=request.user)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=True, methods=["patch"], url_path="reagendar")
    def reagendar(self, request, pk=None):
        ordem = self.get_object()
        serializer = ReagendarOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ordem.data_agendada = serializer.validated_data["data_agendada"]
        if "hora_inicio" in serializer.validated_data:
            ordem.hora_inicio = serializer.validated_data["hora_inicio"]
        if "tecnico_responsavel" in serializer.validated_data:
            ordem.tecnico_responsavel_id = serializer.validated_data["tecnico_responsavel"]
        ordem.atualizado_por = request.user
        ordem.save()
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
        ordem = OrdemServico.objects.select_related("cliente", "tecnico_responsavel").prefetch_related("fotos").get(
            token_relatorio=token
        )
        return Response(OrdemServicoSerializer(ordem, context={"request": request}).data)


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
