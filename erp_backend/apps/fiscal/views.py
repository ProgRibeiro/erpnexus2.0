from django.db import models
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.configuracoes.models import get_empresa_configurada

from .models import ConfiguracaoFiscal
from .serializers import (
    CalcularImpostosSerializer,
    ConciliarPGDASSerializer,
    ConfiguracaoFiscalSerializer,
    ConsultaCNPJSerializer,
    EmitirDocumentoMockSerializer,
)
from .services import ConsultaCNPJ, MotorFiscalEspecialista
from apps.fiscal_calculator.serializers import DecisaoIbsCbsSerializer, OperacaoFiscalInputSerializer
from apps.fiscal_calculator.services import (
    CalculadoraTributariaReforma,
    OperacaoInput,
    carater_informativo_ibs_cbs,
    deve_destacar_ibs_cbs,
    normalizar_regime,
    obrigatorio_em_producao_ibs_cbs,
)
from apps.fiscal_emission.serializers import DocumentoFiscalEmitidoSerializer
from apps.fiscal_emission.services import obter_emissor
from apps.fiscal_obligations.serializers import ConciliacaoPGDASSerializer
from apps.fiscal_obligations.services import ConciliadorPGDAS
from apps.fiscal_rules.models import OperacaoFiscal, TabelaTributaria
from apps.fiscal_rules.serializers import OperacaoFiscalSerializer, TabelaTributariaSerializer


def _get_empresa():
    return get_empresa_configurada()


def _get_configuracao_fiscal():
    empresa = _get_empresa()
    configuracao, _ = ConfiguracaoFiscal.objects.get_or_create(
        empresa=empresa,
        defaults={
            "cnpj": empresa.cnpj,
            "razao_social": empresa.razao_social or empresa.nome,
            "regime_tributario": empresa.regime_tributario or ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL,
            "aliquota_iss": empresa.aliquota_issqn_padrao,
        },
    )
    campos_atualizar = []
    if empresa.regime_tributario and configuracao.regime_tributario != empresa.regime_tributario:
        configuracao.regime_tributario = empresa.regime_tributario
        campos_atualizar.append("regime_tributario")
    if empresa.cnpj and configuracao.cnpj != empresa.cnpj:
        configuracao.cnpj = empresa.cnpj
        campos_atualizar.append("cnpj")
    if empresa.razao_social and configuracao.razao_social != empresa.razao_social:
        configuracao.razao_social = empresa.razao_social
        campos_atualizar.append("razao_social")
    if campos_atualizar:
        campos_atualizar.append("atualizado_em")
        configuracao.save(update_fields=campos_atualizar)
    return configuracao


def _sugerir_regime(dados: dict) -> str:
    atividade = (dados.get("atividade_principal") or "").lower()
    if "mei" in atividade:
        return ConfiguracaoFiscal.RegimeTributario.MEI
    if "comercio" in atividade or "varejo" in atividade:
        return ConfiguracaoFiscal.RegimeTributario.LUCRO_PRESUMIDO
    return ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def consultar_cnpj(request):
    serializer = ConsultaCNPJSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    service = ConsultaCNPJ()
    try:
        dados = service.consultar(serializer.validated_data["cnpj"])
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    except ConnectionError as exc:
        return Response({"detail": str(exc)}, status=503)

    return Response({**dados, "regime_sugerido": _sugerir_regime(dados)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calcular_impostos(request):
    serializer = CalcularImpostosSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    config = _get_configuracao_fiscal()
    motor = MotorFiscalEspecialista()
    resultado = motor.calcular_operacao(
        valor_servicos=serializer.validated_data["valor_servicos"],
        valor_materiais=serializer.validated_data.get("valor_materiais", 0),
        config=config,
        contexto={
            "tipo_servico": serializer.validated_data.get("tipo_servico", ""),
            "descricao_servico": serializer.validated_data.get("descricao_servico", ""),
            "municipio_execucao": serializer.validated_data.get("municipio_execucao", ""),
            "uf_execucao": serializer.validated_data.get("uf_execucao", ""),
        },
    )
    return Response(resultado)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def calcular_reforma_tributaria(request):
    serializer = OperacaoFiscalInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    operacao = OperacaoInput(**data)
    resultado = CalculadoraTributariaReforma().calcular_tributos(operacao)
    operacao_fiscal = None

    if request.data.get("salvar_snapshot"):
        operacao_fiscal = OperacaoFiscal.objects.create(
            referencia=request.data.get("referencia", ""),
            data_emissao=operacao.data_emissao,
            regime_emitente=normalizar_regime(operacao.regime_emitente),
            regime_destinatario=normalizar_regime(operacao.regime_destinatario) if operacao.regime_destinatario else "",
            valor_base=operacao.base_total,
            tributos_calculados=resultado,
            versao_motor=resultado["versao_motor"],
        )
        regras = TabelaTributaria.objects.filter(id__in=resultado.get("tabelas_aplicadas_ids", []))
        operacao_fiscal.tabelas_aplicadas.set(regras)

    payload = {"resultado": resultado}
    if operacao_fiscal:
        payload["operacao_fiscal"] = OperacaoFiscalSerializer(operacao_fiscal).data
    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decisao_ibs_cbs(request):
    serializer = DecisaoIbsCbsSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    regime = serializer.validated_data["regime"]
    data_emissao = serializer.validated_data["data_emissao"]
    return Response({
        "regime": normalizar_regime(regime),
        "data_emissao": data_emissao,
        "destacar": deve_destacar_ibs_cbs(regime, data_emissao),
        "obrigatorio_em_producao": obrigatorio_em_producao_ibs_cbs(regime, data_emissao),
        "carater_informativo": carater_informativo_ibs_cbs(regime, data_emissao),
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tabelas_tributarias(request):
    if request.method == "POST":
        serializer = TabelaTributariaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    queryset = TabelaTributaria.objects.all()
    codigo = request.query_params.get("codigo_tributo")
    vigente_em = request.query_params.get("vigente_em")
    if codigo:
        queryset = queryset.filter(codigo_tributo=codigo)
    if vigente_em:
        queryset = queryset.filter(vigencia_inicio__lte=vigente_em).filter(
            models.Q(vigencia_fim__isnull=True) | models.Q(vigencia_fim__gte=vigente_em)
        )
    return Response(TabelaTributariaSerializer(queryset[:200], many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def operacoes_fiscais(request):
    queryset = OperacaoFiscal.objects.prefetch_related("tabelas_aplicadas")[:100]
    return Response(OperacaoFiscalSerializer(queryset, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def emitir_documento_mock(request):
    serializer = EmitirDocumentoMockSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    operacao = OperacaoFiscal.objects.get(id=serializer.validated_data["operacao_fiscal_id"])
    payload = {
        "tipo_documento": serializer.validated_data.get("tipo_documento") or "NFS-e",
        "numero": serializer.validated_data.get("numero") or "",
        "serie": serializer.validated_data.get("serie") or "",
        "dados": serializer.validated_data.get("dados") or {},
    }
    documento = obter_emissor().emitir(operacao_fiscal=operacao, payload=payload)
    return Response(DocumentoFiscalEmitidoSerializer(documento).data, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def conciliar_pgdas(request):
    serializer = ConciliarPGDASSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    conciliacao = ConciliadorPGDAS().gerar_conciliacao(**serializer.validated_data)
    return Response(ConciliacaoPGDASSerializer(conciliacao).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def configuracao(request):
    config = _get_configuracao_fiscal()
    if request.method == "PATCH":
        serializer = ConfiguracaoFiscalSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(ConfiguracaoFiscalSerializer(config).data)
