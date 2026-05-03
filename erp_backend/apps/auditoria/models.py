from django.conf import settings
from django.db import models

from .fields import EncryptedJSONField


class LogAuditoria(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="logs_auditoria",
    )
    acao = models.CharField(max_length=20)  # "create", "update", "delete", "view"
    modelo = models.CharField(max_length=60)
    objeto_id = models.CharField(max_length=40, blank=True)
    descricao = models.TextField(blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    dados_antes = EncryptedJSONField(null=True, blank=True)
    dados_depois = EncryptedJSONField(null=True, blank=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Log de Auditoria"
        verbose_name_plural = "Logs de Auditoria"

    def __str__(self):
        return f"{self.acao} | {self.modelo} #{self.objeto_id} por {self.usuario}"
