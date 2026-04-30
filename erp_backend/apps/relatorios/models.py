from django.db import models


class RelatorioGerado(models.Model):
    nome = models.CharField(max_length=255)
    arquivo = models.FileField(upload_to="relatorios/")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return self.nome
