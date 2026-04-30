from rest_framework import serializers

from .models import OrdemServico


class OrdemServicoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    tecnico_nome = serializers.CharField(source="tecnico_responsavel.username", read_only=True)

    class Meta:
        model = OrdemServico
        fields = "__all__"
