from rest_framework import serializers

from .models import ConciliacaoPGDAS


class ConciliacaoPGDASSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConciliacaoPGDAS
        fields = "__all__"
