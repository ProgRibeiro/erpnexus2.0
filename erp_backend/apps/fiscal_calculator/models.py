from django.db import models


class CenarioTesteFiscal(models.Model):
    """Casos congelados de regressão fiscal para validar mudanças no motor."""

    nome = models.CharField(max_length=160)
    descricao = models.TextField(blank=True)
    entrada = models.JSONField()
    resultado_esperado = models.JSONField()
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Cenário de teste fiscal"
        verbose_name_plural = "Cenários de teste fiscal"

    def __str__(self):
        return self.nome
