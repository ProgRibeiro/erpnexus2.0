from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from apps.ordens.models import OrdemServico


class ContaBancaria(models.Model):
    class Tipo(models.TextChoices):
        CORRENTE = "corrente", "Corrente"
        POUPANCA = "poupanca", "Poupanca"
        CAIXA = "caixa", "Caixa"
        INVESTIMENTO = "investimento", "Investimento"

    nome = models.CharField(max_length=120)
    banco = models.CharField(max_length=120, blank=True)
    agencia = models.CharField(max_length=30, blank=True)
    conta = models.CharField(max_length=40, blank=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.CORRENTE)
    saldo_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Conta bancaria"
        verbose_name_plural = "Contas bancarias"

    def __str__(self):
        return self.nome


class CategoriaFinanceira(models.Model):
    class Tipo(models.TextChoices):
        RECEITA = "receita", "Receita"
        DESPESA = "despesa", "Despesa"

    nome = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    cor = models.CharField(
        max_length=7,
        default="#1677ff",
        validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Use uma cor hexadecimal valida.")],
    )
    icone = models.CharField(max_length=60, blank=True)
    pai = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategorias",
    )

    class Meta:
        ordering = ["tipo", "nome"]
        verbose_name = "Categoria financeira"
        verbose_name_plural = "Categorias financeiras"

    def __str__(self):
        return self.nome


class Lancamento(models.Model):
    class Tipo(models.TextChoices):
        RECEITA = "receita", "Receita"
        DESPESA = "despesa", "Despesa"

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        PAGO = "pago", "Pago"
        ATRASADO = "atrasado", "Atrasado"
        CANCELADO = "cancelado", "Cancelado"

    class FrequenciaRecorrencia(models.TextChoices):
        SEMANAL = "semanal", "Semanal"
        QUINZENAL = "quinzenal", "Quinzenal"
        MENSAL = "mensal", "Mensal"
        TRIMESTRAL = "trimestral", "Trimestral"
        ANUAL = "anual", "Anual"

    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    data_competencia = models.DateField(default=timezone.localdate)
    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    conta_bancaria = models.ForeignKey(
        ContaBancaria,
        on_delete=models.PROTECT,
        related_name="lancamentos",
    )
    categoria = models.ForeignKey(
        CategoriaFinanceira,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lancamentos",
    )
    os = models.ForeignKey(
        OrdemServico,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lancamentos_financeiros",
    )
    movimentacao_estoque = models.ForeignKey(
        "estoque.MovimentacaoEstoque",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lancamentos_financeiros",
    )
    venda = models.ForeignKey(
        "loja.Venda",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lancamentos_financeiros",
    )
    fornecedor_cliente = models.CharField(max_length=180, blank=True)
    numero_documento = models.CharField(max_length=80, blank=True)
    observacoes = models.TextField(blank=True)
    recorrente = models.BooleanField(default=False)
    frequencia_recorrencia = models.CharField(
        max_length=20,
        choices=FrequenciaRecorrencia.choices,
        blank=True,
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lancamentos_financeiros_criados",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["data_vencimento", "descricao"]
        verbose_name = "Lancamento financeiro"
        verbose_name_plural = "Lancamentos financeiros"

    def __str__(self):
        return self.descricao


class AnexoLancamento(models.Model):
    lancamento = models.ForeignKey(Lancamento, on_delete=models.CASCADE, related_name="anexos")
    arquivo = models.FileField(upload_to="financeiro/lancamentos/")
    nome_original = models.CharField(max_length=255)

    class Meta:
        ordering = ["id"]
        verbose_name = "Anexo do lancamento"
        verbose_name_plural = "Anexos dos lancamentos"

    def __str__(self):
        return self.nome_original


class TransferenciaEntreConta(models.Model):
    conta_origem = models.ForeignKey(
        ContaBancaria,
        on_delete=models.PROTECT,
        related_name="transferencias_origem",
    )
    conta_destino = models.ForeignKey(
        ContaBancaria,
        on_delete=models.PROTECT,
        related_name="transferencias_destino",
    )
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    data = models.DateField(default=timezone.localdate)
    descricao = models.CharField(max_length=255, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transferencias_financeiras_criadas",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-data", "-criado_em"]
        verbose_name = "Transferencia entre contas"
        verbose_name_plural = "Transferencias entre contas"

    def __str__(self):
        return f"{self.conta_origem} -> {self.conta_destino}"
