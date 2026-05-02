from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.configuracoes.models import ConfiguracaoEmpresa

from .models import ConfiguracaoFiscal
from .serializers import (
    CalcularImpostosSerializer,
    ConfiguracaoFiscalSerializer,
    ConsultaCNPJSerializer,
)
from .services import CalculadoraImpostos, ConsultaCNPJ


def _get_empresa():
    empresa, _ = ConfiguracaoEmpresa.objects.get_or_create(nome="ERP Servicos")
    return empresa


def _get_configuracao_fiscal():
    empresa = _get_empresa()
    configuracao, _ = ConfiguracaoFiscal.objects.get_or_create(empresa=empresa, defaults={"cnpj": empresa.cnpj, "razao_social": empresa.razao_social})
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
    calculadora = CalculadoraImpostos()
    resultado = calculadora.calcular(
        valor_servicos=serializer.validated_data["valor_servicos"],
        valor_materiais=serializer.validated_data.get("valor_materiais", 0),
        config=config,
    )
    return Response(resultado)


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

