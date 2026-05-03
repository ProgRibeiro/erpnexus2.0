from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers
from rest_framework.permissions import IsAdminUser
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import LogAuditoria


class LogAuditoriaSerializer(serializers.ModelSerializer):
    usuario_email = serializers.SerializerMethodField()

    class Meta:
        model = LogAuditoria
        fields = [
            "id",
            "usuario",
            "usuario_email",
            "acao",
            "modelo",
            "objeto_id",
            "descricao",
            "ip",
            "user_agent",
            "criado_em",
            "dados_antes",
            "dados_depois",
        ]

    def get_usuario_email(self, obj):
        return obj.usuario.email if obj.usuario else None


class LogAuditoriaViewSet(ReadOnlyModelViewSet):
    queryset = LogAuditoria.objects.select_related("usuario").all()
    serializer_class = LogAuditoriaSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["modelo", "usuario", "acao"]
    ordering_fields = ["criado_em"]
    ordering = ["-criado_em"]

    def get_queryset(self):
        qs = super().get_queryset()
        data_inicio = self.request.query_params.get("data_inicio")
        data_fim = self.request.query_params.get("data_fim")
        if data_inicio:
            qs = qs.filter(criado_em__date__gte=data_inicio)
        if data_fim:
            qs = qs.filter(criado_em__date__lte=data_fim)
        return qs
