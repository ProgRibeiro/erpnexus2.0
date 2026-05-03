from rest_framework.permissions import BasePermission
from django.core.signing import BadSignature, Signer

signer = Signer(salt="portal-cliente")


class IsPortalUser(BasePermission):
    """
    Permissão para usuários autenticados no portal do cliente.
    Valida o token do portal presente no header X-Portal-Token ou query parameter 'token'.
    """

    message = "Token invalido ou ausente. Acesso negado."

    def has_permission(self, request, view):
        token = request.headers.get("X-Portal-Token") or request.query_params.get("token")
        if not token:
            return False

        try:
            user_id = signer.unsign(token)
            # Se conseguiu desserializar, o token é válido
            return True
        except BadSignature:
            return False


class IsPortalOwner(BasePermission):
    """
    Permissão para garantir que o usuário do portal só acessa seus próprios dados.
    Verifica se o cliente_id do objeto pertence ao cliente do usuário autenticado.
    """

    message = "Voce nao tem permissao para acessar este recurso."

    def has_object_permission(self, request, view, obj):
        # Extrai o usuário portal do request
        token = request.headers.get("X-Portal-Token") or request.query_params.get("token")
        if not token:
            return False

        try:
            user_id = signer.unsign(token)
            from .models import UsuarioPortal
            usuario = UsuarioPortal.objects.filter(id=user_id, ativo=True).first()
            if not usuario:
                return False
            # Verifica se o cliente do objeto é igual ao cliente do usuário
            return obj.cliente_id == usuario.cliente_id
        except BadSignature:
            return False


class IsPortalAuthenticatedOrReadOnly(BasePermission):
    """
    Permite acesso total aos usuários autenticados no portal.
    Nega acesso a usuários não autenticados.
    """

    message = "Autenticacao necessaria. Forneça um token valido."

    def has_permission(self, request, view):
        token = request.headers.get("X-Portal-Token") or request.query_params.get("token")
        if not token:
            return False

        try:
            user_id = signer.unsign(token)
            from .models import UsuarioPortal
            usuario = UsuarioPortal.objects.filter(id=user_id, ativo=True).first()
            return usuario is not None
        except BadSignature:
            return False
