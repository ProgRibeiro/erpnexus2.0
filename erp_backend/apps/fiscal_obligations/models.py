from django.db import models


class ConciliacaoPGDAS(models.Model):
    competencia = models.DateField(help_text="Use o primeiro dia do mês de competência.")
    receita_faturada = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    receita_declarada = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    rbt12_estimado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iss_retido_fonte = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    divergencia = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    itens_auditoria = models.JSONField(default=list, blank=True)
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-competencia"]
        verbose_name = "Conciliação PGDAS-D"
        verbose_name_plural = "Conciliações PGDAS-D"

    def __str__(self):
        return f"PGDAS-D {self.competencia:%m/%Y}"
