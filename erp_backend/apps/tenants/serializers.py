from rest_framework import serializers
from .models import Client


class DiretorioPrestadorSerializer(serializers.ModelSerializer):
    """Serializer público - apenas dados que Facilities pode ver"""
    class Meta:
        model = Client
        fields = ['id', 'nome', 'especialidades', 'cidade', 'estado', 'descricao_servicos']


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'
