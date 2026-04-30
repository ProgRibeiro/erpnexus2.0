from rest_framework import serializers

from .models import Oportunidade


class OportunidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Oportunidade
        fields = "__all__"
