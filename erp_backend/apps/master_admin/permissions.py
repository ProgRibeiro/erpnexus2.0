from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class IsMasterAdmin(BasePermission):
    """
    Permite acesso apenas a tokens JWT que possuam a claim `master=True`.
    Esses tokens são emitidos exclusivamente pelo endpoint /api/master/auth/login/.
    """

    def has_permission(self, request, view):
        try:
            authenticator = JWTAuthentication()
            validated_token = authenticator.get_validated_token(
                authenticator.get_raw_token(authenticator.get_header(request))
            )
            return validated_token.get("master") is True
        except Exception:
            return False
