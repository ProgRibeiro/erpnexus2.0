from django.db import models

from apps.clientes.models import Cliente


class LancamentoFinanceiro(models.Model):
    class Tipo(models.TextChoices):
        RECEITA = "receita", "Receita"
        DESPESA = "despesa", "Despesa"

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lancamentos_financeiros",
    )
    descricao = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    vencimento = models.DateField()
    pago = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-vencimento"]

    def __str__(self):
        return self.descricao
