from django.db import models

from apps.clientes.models import Cliente


class Oportunidade(models.Model):
    class Etapa(models.TextChoices):
        LEAD = "lead", "Lead"
        CONTATO = "contato", "Contato"
        PROPOSTA = "proposta", "Proposta"
        FECHADO = "fechado", "Fechado"
        PERDIDO = "perdido", "Perdido"

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="oportunidades",
    )
    titulo = models.CharField(max_length=255)
    etapa = models.CharField(max_length=20, choices=Etapa.choices, default=Etapa.LEAD)
    valor_estimado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    probabilidade = models.PositiveSmallIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return self.titulo
