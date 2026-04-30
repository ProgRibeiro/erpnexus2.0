from rest_framework import serializers

from .models import RelatorioGerado


class RelatorioGeradoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RelatorioGerado
        fields = "__all__"
