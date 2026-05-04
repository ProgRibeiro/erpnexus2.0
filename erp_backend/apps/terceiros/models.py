from django.conf import settings
from django.db import models


class Terceirizado(models.Model):
    class TipoPessoa(models.TextChoices):
        FISICA = "fisica", "Pessoa fisica"
        JURIDICA = "juridica", "Pessoa juridica"

    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        INATIVO = "inativo", "Inativo"
        BLOQUEADO = "bloqueado", "Bloqueado"

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="perfil_terceirizado",
    )
    nome = models.CharField(max_length=180)
    nome_fantasia = models.CharField(max_length=180, blank=True)
    razao_social = models.CharField(max_length=180, blank=True)
    tipo_pessoa = models.CharField(max_length=20, choices=TipoPessoa.choices, default=TipoPessoa.JURIDICA)
    documento = models.CharField(max_length=20, blank=True, db_index=True)
    inscricao_estadual = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    whatsapp = models.CharField(max_length=30, blank=True)
    especialidades = models.CharField(max_length=255, blank=True)
    estado_base = models.CharField(max_length=2, blank=True, db_index=True)
    cidade_base = models.CharField(max_length=120, blank=True)
    atende_estados = models.CharField(max_length=255, blank=True)
    chave_pix = models.CharField(max_length=180, blank=True)
    tipo_chave_pix = models.CharField(max_length=40, blank=True)
    banco = models.CharField(max_length=120, blank=True)
    agencia = models.CharField(max_length=30, blank=True)
    conta = models.CharField(max_length=40, blank=True)
    tipo_conta = models.CharField(max_length=40, blank=True)
    markup_padrao = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    observacoes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ATIVO, db_index=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Terceirizado"
        verbose_name_plural = "Terceirizados"

    def __str__(self):
        return self.nome_fantasia or self.nome
