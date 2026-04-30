from django.db import models


class Produto(models.Model):
    nome = models.CharField(max_length=255)
    sku = models.CharField(max_length=60, unique=True)
    quantidade = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    custo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    preco_venda = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome
