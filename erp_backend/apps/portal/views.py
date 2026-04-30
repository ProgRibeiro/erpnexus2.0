from django.core.signing import BadSignature, Signer
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.ordens.models import OrdemServico

from .models import UsuarioPortal
from .serializers import PortalLoginSerializer, PortalOrdemSerializer

signer = Signer(salt="portal-cliente")


def _usuario_portal(request):
    token = request.headers.get("X-Portal-Token") or request.query_params.get("token")
    if not token:
        return None
    try:
        user_id = signer.unsign(token)
    except BadSignature:
        return None
    return UsuarioPortal.objects.filter(id=user_id, ativo=True).select_related("cliente").first()


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    serializer = PortalLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    usuario = UsuarioPortal.objects.filter(email=serializer.validated_data["email"], ativo=True).first()
    if not usuario or not usuario.check_password(serializer.validated_data["senha"]):
        return Response({"detail": "Credenciais invalidas."}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"token": signer.sign(usuario.id), "cliente": usuario.cliente_id, "email": usuario.email})


@api_view(["GET"])
@permission_classes([AllowAny])
def minhas_os(request):
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)
    ordens = OrdemServico.objects.filter(cliente=usuario.cliente).select_related("cliente", "tecnico_responsavel")
    return Response(PortalOrdemSerializer(ordens, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def meus_orcamentos(request):
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)
    ordens = OrdemServico.objects.filter(
        cliente=usuario.cliente,
        status__in=[OrdemServico.Status.ORCAMENTO_ENVIADO, OrdemServico.Status.ABERTA],
    )
    return Response(PortalOrdemSerializer(ordens, many=True).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def aprovar_orcamento(request, id):
    usuario = _usuario_portal(request)
    ordem = OrdemServico.objects.filter(id=id, cliente=usuario.cliente if usuario else None).first()
    if not usuario or not ordem:
        return Response({"detail": "Nao autorizado."}, status=status.HTTP_401_UNAUTHORIZED)
    ordem.status = OrdemServico.Status.APROVADA
    ordem.aprovado_por = usuario.email
    ordem.save(update_fields=["status", "aprovado_por", "atualizado_em"])
    return Response(PortalOrdemSerializer(ordem).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def recusar_orcamento(request, id):
    usuario = _usuario_portal(request)
    ordem = OrdemServico.objects.filter(id=id, cliente=usuario.cliente if usuario else None).first()
    if not usuario or not ordem:
        return Response({"detail": "Nao autorizado."}, status=status.HTTP_401_UNAUTHORIZED)
    ordem.status = OrdemServico.Status.CANCELADA
    ordem.save(update_fields=["status", "atualizado_em"])
    return Response(PortalOrdemSerializer(ordem).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def minhas_notas(request):
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)
    ordens = OrdemServico.objects.filter(cliente=usuario.cliente).exclude(numero_nf="")
    return Response(PortalOrdemSerializer(ordens, many=True).data)
