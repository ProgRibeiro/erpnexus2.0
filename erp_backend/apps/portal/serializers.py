from rest_framework import serializers

from apps.ordens.serializers import OrdemServicoSerializer

from .models import UsuarioPortal


class PortalLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    senha = serializers.CharField(write_only=True)


class UsuarioPortalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsuarioPortal
        fields = ["id", "cliente", "email", "ativo"]


class PortalOrdemSerializer(OrdemServicoSerializer):
    class Meta(OrdemServicoSerializer.Meta):
        fields = "__all__"
