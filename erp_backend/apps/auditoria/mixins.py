from .models import LogAuditoria


class AuditMixin:
    """
    Mixin para ViewSets DRF que registra criação e atualização de objetos
    no log de auditoria. Inclua este mixin antes de GenericViewSet/ModelViewSet.
    """

    def perform_create(self, serializer):
        obj = serializer.save()
        LogAuditoria.objects.create(
            usuario=self.request.user if self.request.user.is_authenticated else None,
            acao="create",
            modelo=obj.__class__.__name__,
            objeto_id=str(obj.pk),
            ip=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT", "")[:500],
            dados_depois={
                k: str(v)
                for k, v in obj.__dict__.items()
                if not k.startswith("_")
            },
        )

    def perform_update(self, serializer):
        dados_antes = {
            k: str(v)
            for k, v in serializer.instance.__dict__.items()
            if not k.startswith("_")
        }
        obj = serializer.save()
        LogAuditoria.objects.create(
            usuario=self.request.user if self.request.user.is_authenticated else None,
            acao="update",
            modelo=obj.__class__.__name__,
            objeto_id=str(obj.pk),
            ip=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT", "")[:500],
            dados_antes=dados_antes,
            dados_depois={
                k: str(v)
                for k, v in obj.__dict__.items()
                if not k.startswith("_")
            },
        )

    def perform_destroy(self, instance):
        LogAuditoria.objects.create(
            usuario=self.request.user if self.request.user.is_authenticated else None,
            acao="delete",
            modelo=instance.__class__.__name__,
            objeto_id=str(instance.pk),
            ip=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT", "")[:500],
        )
        instance.delete()
