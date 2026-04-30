from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ConfiguracaoEmpresa, ConfiguracaoNotificacao
from .serializers import ConfiguracaoEmpresaSerializer, ConfiguracaoNotificacaoSerializer


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def empresa(request):
    config, _ = ConfiguracaoEmpresa.objects.get_or_create(nome="ERP Servicos")
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
