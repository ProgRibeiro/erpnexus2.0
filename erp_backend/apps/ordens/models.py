from django.conf import settings
from django.db import models

from apps.clientes.models import Cliente


class OrdemServico(models.Model):
    class Status(models.TextChoices):
        ABERTA = "aberta", "Aberta"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        AGUARDANDO = "aguardando", "Aguardando"
        CONCLUIDA = "concluida", "Concluida"
        CANCELADA = "cancelada", "Cancelada"

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name="ordens_servico",
    )
    tecnico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordens_responsavel",
    )
    titulo = models.CharField(max_length=255)
    descricao = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABERTA)
    data_agendada = models.DateTimeField(null=True, blank=True)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    anexo = models.FileField(upload_to="ordens/", blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.id} - {self.titulo}"
