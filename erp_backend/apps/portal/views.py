from django.core.signing import BadSignature, Signer
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ordens.models import OrdemServico
from .models import UsuarioPortal
from .serializers import (
    PortalLoginSerializer,
    PortalOrcamentoSerializer,
    PortalOrdemDetalheSSerializer,
    PortalOrdemResumoSerializer,
    PortalNotaFiscalSerializer,
)

signer = Signer(salt="portal-cliente")


def _usuario_portal(request):
    """Extrai e valida o token do usuário do portal"""
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
    """POST /api/v1/portal/auth/login/ - Autenticação do portal do cliente"""
    serializer = PortalLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    usuario = UsuarioPortal.objects.filter(email=serializer.validated_data["email"], ativo=True).first()
    if not usuario or not usuario.check_password(serializer.validated_data["senha"]):
        return Response({"detail": "Credenciais invalidas."}, status=status.HTTP_400_BAD_REQUEST)

    # Atualiza último acesso
    usuario.ultimo_acesso = timezone.now()
    usuario.save(update_fields=["ultimo_acesso"])

    return Response({
        "token": signer.sign(usuario.id),
        "cliente_id": usuario.cliente_id,
        "cliente_nome": usuario.cliente.nome,
        "email": usuario.email
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def minhas_os(request):
    """GET /api/v1/portal/minhas-os/ - Lista todas as OS do cliente logado"""
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)

    ordens = OrdemServico.objects.filter(
        cliente=usuario.cliente
    ).select_related("cliente", "tecnico_responsavel").prefetch_related("itens", "fotos")

    serializer = PortalOrdemResumoSerializer(ordens, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def minhas_os_detalhes(request, os_id):
    """GET /api/v1/portal/minhas-os/{id}/ - Detalhes da OS específica"""
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)

    ordem = OrdemServico.objects.filter(
        id=os_id,
        cliente=usuario.cliente
    ).select_related("cliente", "tecnico_responsavel", "contato_responsavel").prefetch_related("itens", "fotos").first()

    if not ordem:
        return Response({"detail": "OS nao encontrada."}, status=status.HTTP_404_NOT_FOUND)

    serializer = PortalOrdemDetalheSSerializer(ordem)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def minhas_os_relatorio(request, os_id):
    """GET /api/v1/portal/minhas-os/{id}/relatorio/ - Download do PDF do relatório"""
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)

    ordem = OrdemServico.objects.filter(
        id=os_id,
        cliente=usuario.cliente
    ).first()

    if not ordem:
        return Response({"detail": "OS nao encontrada."}, status=status.HTTP_404_NOT_FOUND)

    if not ordem.pdf_relatorio:
        return Response(
            {"detail": "Relatorio nao disponivel para download."},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        "pdf_url": ordem.pdf_relatorio.url,
        "numero_os": ordem.numero,
        "cliente": ordem.cliente.nome,
        "data_relatorio": ordem.atualizado_em
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def meus_orcamentos(request):
    """GET /api/v1/portal/meus-orcamentos/ - Orçamentos pendentes de aprovação"""
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)

    ordens = OrdemServico.objects.filter(
        cliente=usuario.cliente,
        status__in=[OrdemServico.Status.ORCAMENTO, OrdemServico.Status.ABERTA],
    ).prefetch_related("itens")

    serializer = PortalOrcamentoSerializer(ordens, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def aprovar_orcamento(request, orcamento_id):
    """POST /api/v1/portal/orcamentos/{id}/aprovar/ - Cliente aprova o orçamento"""
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)

    ordem = OrdemServico.objects.filter(id=orcamento_id, cliente=usuario.cliente).first()
    if not ordem:
        return Response({"detail": "Orcamento nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

    ordem.status = OrdemServico.Status.APROVADA
    ordem.data_aprovacao = timezone.now()
    ordem.aprovado_por = usuario.email
    ordem.save(update_fields=["status", "data_aprovacao", "aprovado_por", "atualizado_em"])

    serializer = PortalOrcamentoSerializer(ordem)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def recusar_orcamento(request, orcamento_id):
    """POST /api/v1/portal/orcamentos/{id}/recusar/ - Cliente recusa o orçamento"""
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)

    ordem = OrdemServico.objects.filter(id=orcamento_id, cliente=usuario.cliente).first()
    if not ordem:
        return Response({"detail": "Orcamento nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

    motivo = request.data.get("motivo", "Recusado pelo cliente via portal")

    ordem.status = OrdemServico.Status.CANCELADA
    ordem.observacoes_tecnicas = f"{ordem.observacoes_tecnicas}\n\n[RECUSAÇÃO DO CLIENTE] {motivo}" if ordem.observacoes_tecnicas else f"[RECUSAÇÃO DO CLIENTE] {motivo}"
    ordem.save(update_fields=["status", "observacoes_tecnicas", "atualizado_em"])

    serializer = PortalOrcamentoSerializer(ordem)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def minhas_notas(request):
    """GET /api/v1/portal/minhas-notas/ - Histórico de notas fiscais"""
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)

    ordens = OrdemServico.objects.filter(
        cliente=usuario.cliente
    ).exclude(numero_nf="").exclude(numero_nf__isnull=True).order_by("-data_emissao_nf")

    serializer = PortalNotaFiscalSerializer(ordens, many=True)
    return Response(serializer.data)
