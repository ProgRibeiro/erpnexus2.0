from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.financeiro.models import AnexoLancamento, Lancamento
from apps.ordens.models import FotoOS, OrdemServico
from apps.ordens.serializers import FotoOSSerializer, OrdemServicoSerializer

from .models import Terceirizado
from .serializers import TerceirizadoSerializer
from .services import criar_contas_pagar_terceiros


class TerceirizadoViewSet(viewsets.ModelViewSet):
    serializer_class = TerceirizadoSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["status", "estado_base", "cidade_base"]
    search_fields = ["nome", "nome_fantasia", "razao_social", "documento", "especialidades", "cidade_base", "estado_base"]
    ordering_fields = ["nome", "estado_base", "criado_em"]

    def get_queryset(self):
        return Terceirizado.objects.select_related("usuario").all()

    @action(detail=True, methods=["get"], url_path="ordens")
    def ordens(self, request, pk=None):
        terceiro = self.get_object()
        ordens = OrdemServico.objects.filter(itens__terceirizado=terceiro).distinct()
        return Response(OrdemServicoSerializer(ordens, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="financeiro")
    def financeiro(self, request, pk=None):
        terceiro = self.get_object()
        lancamentos = Lancamento.objects.filter(itens_terceirizados__terceirizado=terceiro).distinct()
        from apps.financeiro.serializers import LancamentoSerializer

        return Response(LancamentoSerializer(lancamentos, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="gerar-contas-pagar")
    def gerar_contas_pagar(self, request, pk=None):
        terceiro = self.get_object()
        ordem_id = request.data.get("ordem")
        ordens = OrdemServico.objects.filter(itens__terceirizado=terceiro).distinct()
        if ordem_id:
            ordens = ordens.filter(pk=ordem_id)
        lancamentos = []
        for ordem in ordens:
            lancamentos.extend(criar_contas_pagar_terceiros(ordem, usuario=request.user))
        from apps.financeiro.serializers import LancamentoSerializer

        return Response(LancamentoSerializer(lancamentos, many=True, context={"request": request}).data)


class PortalTerceiroView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _terceiro(self, request):
        return getattr(request.user, "perfil_terceirizado", None)

    def get(self, request):
        terceiro = self._terceiro(request)
        if not terceiro:
            return Response({"detail": "Usuário sem cadastro de terceirizado vinculado."}, status=status.HTTP_403_FORBIDDEN)

        ordens = OrdemServico.objects.filter(itens__terceirizado=terceiro).distinct()
        lancamentos = Lancamento.objects.filter(itens_terceirizados__terceirizado=terceiro).distinct()
        fotos = FotoOS.objects.filter(os__in=ordens)
        from apps.financeiro.serializers import LancamentoSerializer

        return Response({
            "terceiro": TerceirizadoSerializer(terceiro, context={"request": request}).data,
            "ordens": OrdemServicoSerializer(ordens, many=True, context={"request": request}).data,
            "lancamentos": LancamentoSerializer(lancamentos, many=True, context={"request": request}).data,
            "fotos": FotoOSSerializer(fotos, many=True, context={"request": request}).data,
        })

    def post(self, request):
        terceiro = self._terceiro(request)
        if not terceiro:
            return Response({"detail": "Usuário sem cadastro de terceirizado vinculado."}, status=status.HTTP_403_FORBIDDEN)
        ordem_id = request.data.get("ordem")
        ordem = OrdemServico.objects.filter(pk=ordem_id, itens__terceirizado=terceiro).distinct().first()
        if not ordem:
            return Response({"detail": "Ordem não vinculada a este terceirizado."}, status=status.HTTP_404_NOT_FOUND)

        arquivos = request.FILES.getlist("arquivos") or request.FILES.getlist("arquivo")
        fotos = [
            FotoOS.objects.create(
                os=ordem,
                tipo=request.data.get("tipo", FotoOS.Tipo.ANTES),
                arquivo=arquivo,
                legenda=request.data.get("legenda", "Enviado pelo terceirizado"),
                enviado_por=request.user,
            )
            for arquivo in arquivos
        ]
        return Response(FotoOSSerializer(fotos, many=True, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ComprovantePagamentoTerceiroView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, lancamento_id):
        lancamento = Lancamento.objects.filter(pk=lancamento_id, tipo=Lancamento.Tipo.DESPESA).first()
        if not lancamento:
            return Response({"detail": "Pagamento não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        anexos = []
        for arquivo in request.FILES.getlist("arquivos") or request.FILES.getlist("arquivo"):
            anexos.append(AnexoLancamento.objects.create(lancamento=lancamento, arquivo=arquivo, nome_original=arquivo.name))
        from apps.financeiro.serializers import AnexoLancamentoSerializer

        return Response(AnexoLancamentoSerializer(anexos, many=True, context={"request": request}).data, status=status.HTTP_201_CREATED)
