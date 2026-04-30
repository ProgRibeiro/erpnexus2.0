from django.conf import settings
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from apps.ordens.models import OrdemServico


class CategoriaProduto(models.Model):
    nome = models.CharField(max_length=120)
    descricao = models.TextField(blank=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Categoria de produto"
        verbose_name_plural = "Categorias de produtos"

    def __str__(self):
        return self.nome


class Produto(models.Model):
    class UnidadeMedida(models.TextChoices):
        UN = "un", "Unidade"
        M = "m", "Metro"
        M2 = "m2", "Metro quadrado"
        KG = "kg", "Quilograma"
        LITRO = "litro", "Litro"
        PAR = "par", "Par"
        CAIXA = "caixa", "Caixa"

    codigo = models.CharField(max_length=30, unique=True, blank=True, null=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    categoria = models.ForeignKey(
        CategoriaProduto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="produtos",
    )
    unidade_medida = models.CharField(
        max_length=20,
        choices=UnidadeMedida.choices,
        default=UnidadeMedida.UN,
    )
    preco_custo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    preco_venda = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estoque_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    localizacao = models.CharField(max_length=120, blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"

    def __str__(self):
        return f"{self.codigo or '-'} - {self.nome}"

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = self._gerar_codigo()
        super().save(*args, **kwargs)

    @classmethod
    def _gerar_codigo(cls):
        ultimo = cls.objects.exclude(codigo__isnull=True).filter(codigo__startswith="PRD-").order_by("codigo").last()
        sequencial = int(ultimo.codigo.split("-")[-1]) + 1 if ultimo and ultimo.codigo else 1
        return f"PRD-{sequencial:06d}"

    @property
    def estoque_atual(self):
        entradas = self.movimentacoes.filter(tipo=MovimentacaoEstoque.Tipo.ENTRADA).aggregate(
            total=Sum("quantidade")
        )["total"] or 0
        ajustes = self.movimentacoes.filter(tipo=MovimentacaoEstoque.Tipo.AJUSTE).aggregate(
            total=Sum("quantidade")
        )["total"] or 0
        saidas = self.movimentacoes.filter(
            tipo__in=[MovimentacaoEstoque.Tipo.SAIDA, MovimentacaoEstoque.Tipo.TRANSFERENCIA]
        ).aggregate(total=Sum("quantidade"))["total"] or 0
        return entradas + ajustes - saidas


class MovimentacaoEstoque(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = "entrada", "Entrada"
        SAIDA = "saida", "Saida"
        AJUSTE = "ajuste", "Ajuste"
        TRANSFERENCIA = "transferencia", "Transferencia"

    class Motivo(models.TextChoices):
        COMPRA = "compra", "Compra"
        USO_OS = "uso_os", "Uso em OS"
        PERDA = "perda", "Perda"
        AJUSTE_INVENTARIO = "ajuste_inventario", "Ajuste de inventario"
        DEVOLUCAO = "devolucao", "Devolucao"

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="movimentacoes")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    quantidade = models.DecimalField(max_digits=12, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    motivo = models.CharField(max_length=30, choices=Motivo.choices)
    os = models.ForeignKey(
        OrdemServico,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentacoes_estoque",
    )
    fornecedor = models.CharField(max_length=180, blank=True)
    numero_nota = models.CharField(max_length=80, blank=True)
    observacoes = models.TextField(blank=True)
    realizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentacoes_estoque",
    )
    data_movimentacao = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-data_movimentacao", "-id"]
        verbose_name = "Movimentacao de estoque"
        verbose_name_plural = "Movimentacoes de estoque"

    def __str__(self):
        return f"{self.produto} - {self.tipo} - {self.quantidade}"
