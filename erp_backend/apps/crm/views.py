from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.ordens.models import OrdemServico

from .models import AtividadeCRM, ColunaPipeline, EmailCRM, Oportunidade, Pipeline, TagCRM
from .serializers import (
    AtividadeCRMSerializer,
    EmailCRMSerializer,
    EnviarEmailCRMSerializer,
    MoverOportunidadeSerializer,
    OportunidadeSerializer,
    PipelineSerializer,
    TagCRMSerializer,
)


class PipelineViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineSerializer
    filterset_fields = ["ativo"]
    search_fields = ["nome", "descricao"]
    ordering_fields = ["nome", "criado_em"]

    def get_queryset(self):
        return Pipeline.objects.prefetch_related("colunas").select_related("criado_por")


class TagCRMViewSet(viewsets.ModelViewSet):
    queryset = TagCRM.objects.all()
    serializer_class = TagCRMSerializer
    search_fields = ["nome"]
    ordering_fields = ["nome"]


class OportunidadeViewSet(viewsets.ModelViewSet):
    serializer_class = OportunidadeSerializer
    filterset_fields = ["pipeline", "coluna", "cliente", "responsavel", "prioridade"]
    search_fields = ["titulo", "cliente__nome", "cliente__cnpj_cpf", "descricao"]
    ordering_fields = ["valor_estimado", "probabilidade", "criado_em", "ordem_no_kanban"]

    def get_queryset(self):
        return (
            Oportunidade.objects.select_related(
                "cliente",
                "contato",
                "pipeline",
                "coluna",
                "responsavel",
            )
            .prefetch_related("tags", "atividades", "emails", "anexos")
        )

    def perform_create(self, serializer):
        serializer.save(responsavel=serializer.validated_data.get("responsavel") or self.request.user)

    @action(detail=True, methods=["patch"], url_path="mover")
    def mover(self, request, pk=None):
        oportunidade = self.get_object()
        serializer = MoverOportunidadeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coluna = serializer.validated_data["coluna"]
        oportunidade.coluna = coluna
        oportunidade.pipeline = coluna.pipeline
        oportunidade.ordem_no_kanban = serializer.validated_data.get(
            "ordem_no_kanban",
            oportunidade.ordem_no_kanban,
        )
        oportunidade.save(update_fields=["coluna", "pipeline", "ordem_no_kanban", "atualizado_em"])
        return Response(self.get_serializer(oportunidade).data)

    @action(detail=True, methods=["post"], url_path="converter-orcamento")
    def converter_orcamento(self, request, pk=None):
        oportunidade = self.get_object()
        ordem = OrdemServico.objects.create(
            cliente=oportunidade.cliente,
            contato_responsavel=oportunidade.contato,
            tipo_servico=OrdemServico.TipoServico.OUTRO,
            prioridade=oportunidade.prioridade,
            origem_lead=oportunidade.origem,
            descricao_servico=oportunidade.descricao or oportunidade.titulo,
            valor_total_orcado=oportunidade.valor_estimado,
            criado_por=request.user,
            atualizado_por=request.user,
        )
        AtividadeCRM.objects.create(
            oportunidade=oportunidade,
            tipo=AtividadeCRM.Tipo.NOTA,
            titulo=f"Convertida em {ordem.numero}",
            descricao="Oportunidade convertida em ordem de servico/orcamento.",
            data_atividade=timezone.now(),
            concluida=True,
            usuario=request.user,
        )
        return Response(
            {"ordem_id": ordem.id, "numero": ordem.numero},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="enviar-email")
    def enviar_email(self, request, pk=None):
        oportunidade = self.get_object()
        serializer = EnviarEmailCRMSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = EmailCRM.objects.create(
            oportunidade=oportunidade,
            enviado_por=request.user,
            enviado_em=timezone.now(),
            status=EmailCRM.Status.ENVIADO,
            **serializer.validated_data,
        )
        AtividadeCRM.objects.create(
            oportunidade=oportunidade,
            tipo=AtividadeCRM.Tipo.EMAIL,
            titulo=f"Email enviado: {email.assunto}",
            descricao=email.corpo,
            data_atividade=email.enviado_em,
            concluida=True,
            usuario=request.user,
        )
        return Response(EmailCRMSerializer(email).data, status=status.HTTP_201_CREATED)


class AtividadeCRMViewSet(viewsets.ModelViewSet):
    serializer_class = AtividadeCRMSerializer
    filterset_fields = ["oportunidade", "tipo", "concluida", "usuario"]
    search_fields = ["titulo", "descricao", "oportunidade__titulo"]
    ordering_fields = ["data_atividade", "data_vencimento", "criado_em"]

    def get_queryset(self):
        return AtividadeCRM.objects.select_related("oportunidade", "usuario")

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def kanban_pipeline(request, pipeline_id):
    pipeline = Pipeline.objects.prefetch_related("colunas").get(pk=pipeline_id)
    colunas = []
    for coluna in pipeline.colunas.all():
        oportunidades = (
            Oportunidade.objects.filter(pipeline=pipeline, coluna=coluna)
            .select_related("cliente", "contato", "responsavel", "pipeline", "coluna")
            .prefetch_related("tags", "atividades")
            .order_by("ordem_no_kanban", "-criado_em")
        )
        colunas.append(
            {
                "id": coluna.id,
                "nome": coluna.nome,
                "ordem": coluna.ordem,
                "cor": coluna.cor,
                "eh_ganho": coluna.eh_ganho,
                "eh_perdido": coluna.eh_perdido,
                "oportunidades": OportunidadeSerializer(oportunidades, many=True).data,
            }
        )
    return Response(
        {
            "id": pipeline.id,
            "nome": pipeline.nome,
            "descricao": pipeline.descricao,
            "ativo": pipeline.ativo,
            "colunas": colunas,
        }
    )
