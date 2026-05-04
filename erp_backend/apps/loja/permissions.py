from rest_framework.permissions import BasePermission


LOJA_ROLES = {"admin", "gestor", "vendedor_loja", "gerente_loja"}
GERENTE_ROLES = {"admin", "gestor", "gerente_loja"}


class LojaPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_superuser or getattr(user, "role", "") in LOJA_ROLES


class GerenteLojaPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_superuser or getattr(user, "role", "") in GERENTE_ROLES
