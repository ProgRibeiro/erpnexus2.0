from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ContratoPreventiva,
    EscopoContrato,
    EscopoTecnico,
    EscopoUnidade,
    FaturaContrato,
    ItemChecklistContrato,
    OSContratoPreventiva,
    UnidadeContrato,
)
from .serializers import (
    ContratoPreventivaListSerializer,
    ContratoPreventivaSerializer,
    EscopoTecnicoSerializer,
    EscopoUnidadeSerializer,
    FaturaContratoSerializer,
    ItemChecklistPadraoSerializer,
    OSContratoPreventivaSerializer,
    UnidadeContratoSerializer,
)
from .services import GeradorChecklistContrato, GeradorCronograma, GeradorEscopoPreventiva, GeradorFatura, GeradorPDFContrato


class EscopoTecnicoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EscopoTecnico.objects.filter(ativo=True).prefetch_related("checklist_padrao")
    serializer_class = EscopoTecnicoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["codigo", "ativo"]
    search_fields = ["nome", "codigo", "norma_tecnica"]
    ordering_fields = ["ordem", "nome"]

    @action(detail=True, methods=["get"], url_path="checklist-padrao")
    def checklist_padrao(self, request, pk=None):
        escopo = self.get_object()
        itens = escopo.checklist_padrao.filter(ativo=True)
        return Response(ItemChecklistPadraoSerializer(itens, many=True).data)

    @action(detail=False, methods=["post"], url_path="gerar-escopo")
    def gerar_escopo(self, request):
        escopos = request.data.get("escopos") or request.data.get("codigos") or []
        if not isinstance(escopos, list):
            return Response({"erro": "Envie escopos como lista de ids ou códigos."}, status=400)
        dados = GeradorEscopoPreventiva().gerar(escopos)
        return Response(dados)


class ContratoPreventivaViewSet(viewsets.ModelViewSet):
    queryset = (
        ContratoPreventiva.objects
        .select_related("cliente", "responsavel_tecnico", "criado_por")
        .prefetch_related(
            "escopos_contrato__escopo",
            "unidades__escopos__escopo",
            "unidades__escopos__checklist__item_padrao",
            "os_contrato__unidade_contrato",
            "os_contrato__escopo_unidade__escopo",
            "faturas",
        )
    )
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "cliente", "tipo_faturamento"]
    search_fields = ["numero", "titulo", "cliente__nome"]
    ordering_fields = ["criado_em", "data_inicio", "data_fim", "valor_total_mensal"]

    def get_serializer_class(self):
        if self.action == "list":
            return ContratoPreventivaListSerializer
        return ContratoPreventivaSerializer

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=False, methods=["post"], url_path="criar-completo")
    def criar_completo(self, request):
        contrato_data = request.data.get("contrato") or {}
        unidades_data = request.data.get("unidades") or []
        gerar_pdf = bool(request.data.get("gerar_pdf"))
        ativar = bool(request.data.get("ativar"))

        if not unidades_data:
            return Response({"erro": "Informe ao menos uma unidade."}, status=400)

        with transaction.atomic():
            serializer = ContratoPreventivaSerializer(data=contrato_data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            contrato = serializer.save(criado_por=request.user if request.user.is_authenticated else None)

            for unidade_payload in unidades_data:
                escopos_payload = unidade_payload.pop("escopos", [])
                unidade_serializer = UnidadeContratoSerializer(data={**unidade_payload, "contrato": contrato.id})
                unidade_serializer.is_valid(raise_exception=True)
                unidade = unidade_serializer.save()

                for item in escopos_payload:
                    escopo_id = item.get("escopo")
                    if not escopo_id:
                        continue
                    escopo_unidade, _ = EscopoUnidade.objects.update_or_create(
                        unidade_contrato=unidade,
                        escopo_id=escopo_id,
                        defaults={
                            "periodicidade": item.get("periodicidade", "mensal"),
                            "equipamentos_quantidade": item.get("equipamentos_quantidade", 1),
                            "equipamentos_descricao": item.get("equipamentos_descricao", ""),
                            "valor_alocado": item.get("valor_alocado", 0),
                            "ativo": item.get("ativo", True),
                        },
                    )
                    EscopoContrato.objects.get_or_create(contrato=contrato, escopo_id=escopo_id, defaults={"ativo": True})
                    GeradorChecklistContrato().criar_padrao_para_escopo_unidade(
                        escopo_unidade,
                        checklist_ids=item.get("checklist_ids"),
                    )

            contrato.recalcular_totais()
            if ativar:
                contrato.status = ContratoPreventiva.Status.ATIVO
                contrato.save(update_fields=["status", "valor_total_mensal", "valor_total_contrato", "atualizado_em"])
                GeradorCronograma().gerar_para_contrato(contrato)
            if gerar_pdf:
                GeradorPDFContrato().gerar(contrato, "proposta")

        contrato = self.get_queryset().get(pk=contrato.pk)
        return Response(ContratoPreventivaSerializer(contrato, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        hoje = timezone.localdate()
        vencendo = hoje + timedelta(days=30)
        qs = self.filter_queryset(self.get_queryset())
        response.data = {
            "results": response.data.get("results", response.data) if isinstance(response.data, dict) else response.data,
            "summary": {
                "ativos": qs.filter(status=ContratoPreventiva.Status.ATIVO).count(),
                "rascunhos": qs.filter(status=ContratoPreventiva.Status.RASCUNHO).count(),
                "receita_mensal": qs.filter(status=ContratoPreventiva.Status.ATIVO).aggregate(total=Sum("valor_total_mensal")).get("total") or 0,
                "vencendo_30_dias": qs.filter(status=ContratoPreventiva.Status.ATIVO, data_fim__range=[hoje, vencendo]).count(),
            },
        }
        return response

    @action(detail=True, methods=["post"])
    def unidades(self, request, pk=None):
        contrato = self.get_object()
        serializer = UnidadeContratoSerializer(data={**request.data, "contrato": contrato.id})
        serializer.is_valid(raise_exception=True)
        unidade = serializer.save()
        return Response(UnidadeContratoSerializer(unidade).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"unidades/(?P<uid>[^/.]+)")
    def unidade_detail(self, request, pk=None, uid=None):
        contrato = self.get_object()
        unidade = contrato.unidades.get(pk=uid)
        if request.method == "DELETE":
            unidade.delete()
            contrato.recalcular_totais()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = UnidadeContratoSerializer(unidade, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        unidade = serializer.save()
        return Response(UnidadeContratoSerializer(unidade).data)

    @action(detail=True, methods=["post"], url_path="escopos-unidade")
    def escopos_unidade(self, request, pk=None):
        contrato = self.get_object()
        unidade_id = request.data.get("unidade_contrato")
        escopos = request.data.get("escopos", [])
        if not unidade_id or not isinstance(escopos, list):
            return Response({"erro": "unidade_contrato e escopos[] são obrigatórios"}, status=400)

        unidade = contrato.unidades.get(pk=unidade_id)
        criados = []
        with transaction.atomic():
            for item in escopos:
                escopo_id = item.get("escopo")
                escopo_unidade, _ = EscopoUnidade.objects.update_or_create(
                    unidade_contrato=unidade,
                    escopo_id=escopo_id,
                    defaults={
                        "periodicidade": item.get("periodicidade", "mensal"),
                        "equipamentos_quantidade": item.get("equipamentos_quantidade", 1),
                        "equipamentos_descricao": item.get("equipamentos_descricao", ""),
                        "valor_alocado": item.get("valor_alocado", 0),
                        "ativo": item.get("ativo", True),
                    },
                )
                EscopoContrato.objects.get_or_create(contrato=contrato, escopo_id=escopo_id, defaults={"ativo": True})
                GeradorChecklistContrato().criar_padrao_para_escopo_unidade(
                    escopo_unidade,
                    checklist_ids=item.get("checklist_ids"),
                )
                criados.append(escopo_unidade)

        return Response(EscopoUnidadeSerializer(criados, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="calcular-totais")
    def calcular_totais(self, request, pk=None):
        contrato = self.get_object()
        mensal, total = contrato.recalcular_totais()
        return Response({"valor_total_mensal": mensal, "valor_total_contrato": total})

    @action(detail=True, methods=["post"])
    def ativar(self, request, pk=None):
        contrato = self.get_object()
        contrato.recalcular_totais()
        contrato.status = ContratoPreventiva.Status.ATIVO
        contrato.save(update_fields=["status", "valor_total_mensal", "valor_total_contrato", "atualizado_em"])
        os_criadas = GeradorCronograma().gerar_para_contrato(contrato)
        return Response({
            "ok": True,
            "contrato": ContratoPreventivaSerializer(contrato, context={"request": request}).data,
            "os_geradas": len(os_criadas),
        })

    @action(detail=True, methods=["post"], url_path="gerar-pdf-contrato")
    def gerar_pdf_contrato(self, request, pk=None):
        contrato = self.get_object()
        arquivo = GeradorPDFContrato().gerar(contrato, "contrato")
        return Response({"pdf_contrato": arquivo.url if arquivo else None})

    @action(detail=True, methods=["post"], url_path="gerar-pdf-proposta")
    def gerar_pdf_proposta(self, request, pk=None):
        contrato = self.get_object()
        arquivo = GeradorPDFContrato().gerar(contrato, "proposta")
        return Response({"pdf_proposta": arquivo.url if arquivo else None})

    @action(detail=True, methods=["post"], url_path="gerar-pdf-cronograma")
    def gerar_pdf_cronograma(self, request, pk=None):
        contrato = self.get_object()
        if not contrato.os_contrato.exists():
            GeradorCronograma().gerar_para_contrato(contrato)
        arquivo = GeradorPDFContrato().gerar(contrato, "cronograma")
        return Response({"pdf_cronograma": arquivo.url if arquivo else None})

    @action(detail=True, methods=["get"])
    def cronograma(self, request, pk=None):
        contrato = self.get_object()
        serializer = OSContratoPreventivaSerializer(contrato.os_contrato.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def faturas(self, request, pk=None):
        contrato = self.get_object()
        return Response(FaturaContratoSerializer(contrato.faturas.all(), many=True).data)

    @action(detail=True, methods=["post"], url_path="gerar-fatura-mes")
    def gerar_fatura_mes(self, request, pk=None):
        contrato = self.get_object()
        hoje = timezone.localdate()
        mes = int(request.data.get("mes", hoje.month))
        ano = int(request.data.get("ano", hoje.year))
        fatura = GeradorFatura().gerar_fatura_mensal(contrato, mes, ano)
        return Response(FaturaContratoSerializer(fatura).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def rescindir(self, request, pk=None):
        contrato = self.get_object()
        motivo = request.data.get("motivo", "")
        contrato.status = ContratoPreventiva.Status.RESCINDIDO
        if motivo:
            contrato.observacoes = f"{contrato.observacoes}\nRescisão: {motivo}".strip()
        contrato.save(update_fields=["status", "observacoes", "atualizado_em"])
        contrato.os_contrato.filter(status=OSContratoPreventiva.Status.PROGRAMADA).update(status=OSContratoPreventiva.Status.CANCELADA)
        return Response(ContratoPreventivaSerializer(contrato, context={"request": request}).data)


class OSContratoPreventivaViewSet(viewsets.ModelViewSet):
    queryset = OSContratoPreventiva.objects.select_related("contrato", "unidade_contrato", "escopo_unidade__escopo", "ordem_servico", "tecnico_responsavel")
    serializer_class = OSContratoPreventivaSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["contrato", "status", "tecnico_responsavel", "data_prevista"]


class FaturaContratoViewSet(viewsets.ModelViewSet):
    queryset = FaturaContrato.objects.select_related("contrato", "contrato__cliente")
    serializer_class = FaturaContratoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["contrato", "status", "mes_referencia", "ano_referencia"]
