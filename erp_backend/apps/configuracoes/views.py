from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import (
    ConfiguracaoEmpresa,
    ConfiguracaoNotificacao,
    ConfiguracaoOS,
    ConfiguracaoFinanceira,
    LogoClienteReferencia,
)
from .serializers import (
    ConfiguracaoEmpresaSerializer,
    ConfiguracaoNotificacaoSerializer,
    ConfiguracaoOSSerializer,
    ConfiguracaoFinanceiraSerializer,
    LogoClienteReferenciaSerializer,
)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def empresa(request):
    config = ConfiguracaoEmpresa.objects.order_by("id").first()
    if not config:
        config = ConfiguracaoEmpresa.objects.create(
            nome="ERP Nexus",
            razao_social="ERP Nexus",
        )
    if request.method == "PATCH":
        serializer = ConfiguracaoEmpresaSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(ConfiguracaoEmpresaSerializer(config).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def notificacoes(request):
    if request.method == "PATCH":
        itens = request.data if isinstance(request.data, list) else request.data.get("itens", [])
        retorno = []
        for item in itens:
            obj, _ = ConfiguracaoNotificacao.objects.get_or_create(tipo=item.get("tipo"))
            serializer = ConfiguracaoNotificacaoSerializer(obj, data=item, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            retorno.append(serializer.data)
        return Response(retorno)
    configs = ConfiguracaoNotificacao.objects.all()
    return Response(ConfiguracaoNotificacaoSerializer(configs, many=True).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser])
def configuracao_os(request):
    """Gerencia configurações de Ordens de Serviço"""
    config, _ = ConfiguracaoOS.objects.get_or_create()
    if request.method == "PATCH":
        serializer = ConfiguracaoOSSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(ConfiguracaoOSSerializer(config).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser])
def configuracao_financeira(request):
    """Gerencia configurações financeiras"""
    config, _ = ConfiguracaoFinanceira.objects.get_or_create()
    if request.method == "PATCH":
        serializer = ConfiguracaoFinanceiraSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(ConfiguracaoFinanceiraSerializer(config).data)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def logos_clientes(request):
    """Lista e cria logos de clientes de referência."""
    if request.method == "POST":
        serializer = LogoClienteReferenciaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    qs = LogoClienteReferencia.objects.all()
    return Response(LogoClienteReferenciaSerializer(qs, many=True, context={"request": request}).data)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def logo_cliente_detalhe(request, pk):
    """Edita ou remove um logo de cliente de referência."""
    try:
        obj = LogoClienteReferencia.objects.get(pk=pk)
    except LogoClienteReferencia.DoesNotExist:
        return Response({"detail": "Não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        if obj.logo:
            try:
                obj.logo.delete(save=False)
            except Exception:
                pass
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = LogoClienteReferenciaSerializer(obj, data=request.data, partial=True, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
