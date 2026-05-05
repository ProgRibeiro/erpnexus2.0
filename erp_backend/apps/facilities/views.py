import datetime

from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Ativo, PlanoManutencao, ChecklistItem,
    ChamadoFacilities, ContratoTerceirizado,
    ProjetoObra, FaseObra, DiarioObra, BoletimMedicao,
)
from .serializers import (
    AtivoSerializer, AtivoDetalheSerializer,
    PlanoManutencaoSerializer, ChecklistItemSerializer,
    ChamadoFacilitiesSerializer, ContratoTerceirizadoSerializer,
    ProjetoObraSerializer, ProjetoObraDetalheSerializer,
    FaseObraSerializer, DiarioObraSerializer, BoletimMedicaoSerializer,
)


class AtivoViewSet(viewsets.ModelViewSet):
    queryset = Ativo.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ["categoria", "status"]
    search_fields = ["tag", "nome", "fabricante", "modelo", "numero_serie"]
    ordering_fields = ["tag", "nome", "criado_em"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AtivoDetalheSerializer
        return AtivoSerializer

    @action(detail=True, methods=["get"])
    def historico_chamados(self, request, pk=None):
        ativo = self.get_object()
        chamados = ativo.chamados.all()
        serializer = ChamadoFacilitiesSerializer(chamados, many=True)
        return Response(serializer.data)


class PlanoManutencaoViewSet(viewsets.ModelViewSet):
    queryset = PlanoManutencao.objects.select_related("ativo").prefetch_related("checklist")
    serializer_class = PlanoManutencaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["ativo", "tipo", "periodicidade", "ativo_plano"]
    ordering_fields = ["proxima_execucao", "criado_em"]

    @action(detail=True, methods=["post"])
    def registrar_execucao(self, request, pk=None):
        plano = self.get_object()
        plano.ultima_execucao = datetime.date.today()
        periodicidade_dias = {
            "diaria": 1, "semanal": 7, "quinzenal": 15, "mensal": 30,
            "trimestral": 90, "semestral": 180, "anual": 365,
        }
        dias = periodicidade_dias.get(plano.periodicidade, 30)
        plano.proxima_execucao = datetime.date.today() + datetime.timedelta(days=dias)
        plano.save()
        return Response(PlanoManutencaoSerializer(plano).data)


class ChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = ChecklistItem.objects.all()
    serializer_class = ChecklistItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["plano"]


class ChamadoFacilitiesViewSet(viewsets.ModelViewSet):
    queryset = ChamadoFacilities.objects.select_related("ativo", "tecnico_responsavel").all()
    serializer_class = ChamadoFacilitiesSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "prioridade", "ativo", "tecnico_responsavel"]
    search_fields = ["numero", "titulo", "solicitante_nome", "local"]
    ordering_fields = ["aberto_em", "prioridade"]

    @action(detail=True, methods=["post"])
    def resolver(self, request, pk=None):
        chamado = self.get_object()
        chamado.status = "resolvido"
        chamado.resolvido_em = timezone.now()
        chamado.save()
        return Response(ChamadoFacilitiesSerializer(chamado).data)

    @action(detail=True, methods=["post"])
    def fechar(self, request, pk=None):
        chamado = self.get_object()
        chamado.status = "fechado"
        if not chamado.resolvido_em:
            chamado.resolvido_em = timezone.now()
        chamado.save()
        return Response(ChamadoFacilitiesSerializer(chamado).data)

    @action(detail=True, methods=["post"])
    def assumir(self, request, pk=None):
        chamado = self.get_object()
        chamado.status = "em_atendimento"
        chamado.tecnico_responsavel = request.user
        chamado.save()
        return Response(ChamadoFacilitiesSerializer(chamado).data)


class ContratoTerceirizadoViewSet(viewsets.ModelViewSet):
    queryset = ContratoTerceirizado.objects.all()
    serializer_class = ContratoTerceirizadoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "periodicidade_servico"]
    search_fields = ["fornecedor_nome", "fornecedor_cnpj", "tipo_servico"]
    ordering_fields = ["data_fim", "criado_em"]


class ProjetoObraViewSet(viewsets.ModelViewSet):
    queryset = ProjetoObra.objects.select_related("responsavel").prefetch_related("fases")
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "tipo", "responsavel"]
    search_fields = ["codigo", "nome"]
    ordering_fields = ["criado_em", "data_fim_prevista"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProjetoObraDetalheSerializer
        return ProjetoObraSerializer

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        projeto = self.get_object()
        fases = projeto.fases.all()
        diarios = projeto.diarios.all()
        boletins = projeto.boletins.all()
        return Response({
            "projeto": ProjetoObraSerializer(projeto).data,
            "total_fases": fases.count(),
            "fases_concluidas": fases.filter(status="concluida").count(),
            "total_diarios": diarios.count(),
            "total_boletins": boletins.count(),
            "boletins_aprovados": boletins.filter(status="aprovado").count(),
            "orcamento_previsto": str(projeto.orcamento_previsto),
            "orcamento_realizado": str(projeto.orcamento_realizado),
            "percentual_concluido": str(projeto.percentual_concluido),
        })


class FaseObraViewSet(viewsets.ModelViewSet):
    queryset = FaseObra.objects.select_related("projeto")
    serializer_class = FaseObraSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["projeto", "status"]


class DiarioObraViewSet(viewsets.ModelViewSet):
    queryset = DiarioObra.objects.select_related("projeto", "registrado_por")
    serializer_class = DiarioObraSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["projeto", "clima"]
    ordering_fields = ["data", "criado_em"]

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)


class BoletimMedicaoViewSet(viewsets.ModelViewSet):
    queryset = BoletimMedicao.objects.select_related("projeto")
    serializer_class = BoletimMedicaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["projeto", "status"]
    ordering_fields = ["mes_referencia", "criado_em"]

    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        bm = self.get_object()
        bm.status = "aprovado"
        bm.aprovado_em = timezone.now()
        bm.save()
        return Response(BoletimMedicaoSerializer(bm).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_facilities(request):
    hoje = datetime.date.today()
    em_30_dias = hoje + datetime.timedelta(days=30)
    em_7_dias = hoje + datetime.timedelta(days=7)

    total_ativos = Ativo.objects.count()
    ativos_operacionais = Ativo.objects.filter(status="operacional").count()
    chamados_abertos = ChamadoFacilities.objects.filter(status__in=["aberto", "em_atendimento", "aguardando"]).count()
    chamados_criticos = ChamadoFacilities.objects.filter(status__in=["aberto", "em_atendimento"], prioridade="critica").count()
    planos_vencidos = PlanoManutencao.objects.filter(ativo_plano=True, proxima_execucao__lt=hoje).count()
    planos_vencendo = PlanoManutencao.objects.filter(ativo_plano=True, proxima_execucao__gte=hoje, proxima_execucao__lte=em_7_dias).count()
    contratos_vencendo = ContratoTerceirizado.objects.filter(status="ativo", data_fim__gte=hoje, data_fim__lte=em_30_dias).count()
    projetos_ativos = ProjetoObra.objects.filter(status="em_andamento").count()

    return Response({
        "total_ativos": total_ativos,
        "ativos_operacionais": ativos_operacionais,
        "chamados_abertos": chamados_abertos,
        "chamados_criticos": chamados_criticos,
        "planos_vencidos": planos_vencidos,
        "planos_vencendo": planos_vencendo,
        "contratos_vencendo": contratos_vencendo,
        "projetos_ativos": projetos_ativos,
    })
