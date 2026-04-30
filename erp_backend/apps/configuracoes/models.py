from django.core.validators import RegexValidator
from django.db import models


class ConfiguracaoEmpresa(models.Model):
    nome = models.CharField(max_length=150)
    razao_social = models.CharField(max_length=180, blank=True)
    cnpj = models.CharField(max_length=20, blank=True)
    endereco = models.TextField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    site = models.URLField(blank=True)
    logo = models.ImageField(upload_to="configuracoes/logo/", blank=True, null=True)
    cor_principal = models.CharField(
        max_length=7,
        default="#1677ff",
        validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Use uma cor hexadecimal valida.")],
    )

    class Meta:
        verbose_name = "Configuracao da empresa"
        verbose_name_plural = "Configuracoes da empresa"

    def __str__(self):
        return self.nome


class ConfiguracaoNotificacao(models.Model):
    tipo = models.CharField(max_length=60, unique=True)
    ativo = models.BooleanField(default=True)
    email_destino = models.EmailField(blank=True)

    class Meta:
        ordering = ["tipo"]
        verbose_name = "Configuracao de notificacao"
        verbose_name_plural = "Configuracoes de notificacao"

    def __str__(self):
        return self.tipo
