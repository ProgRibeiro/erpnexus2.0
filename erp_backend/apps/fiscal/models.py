from django.core.validators import RegexValidator
from django.db import models

from apps.configuracoes.models import ConfiguracaoEmpresa


class ConfiguracaoFiscal(models.Model):
    class RegimeTributario(models.TextChoices):
        MEI = "mei", "MEI"
        SIMPLES_NACIONAL = "simples_nacional", "Simples Nacional"
        LUCRO_PRESUMIDO = "lucro_presumido", "Lucro Presumido"
        LUCRO_REAL = "lucro_real", "Lucro Real"

    class TipoNota(models.TextChoices):
        NFSE = "nfse", "NFS-e"
        NFE = "nfe", "NF-e"
        AMBAS = "ambas", "Ambas"

    empresa = models.OneToOneField(
        ConfiguracaoEmpresa,
        on_delete=models.CASCADE,
        related_name="configuracao_fiscal",
    )
    regime_tributario = models.CharField(
        max_length=30,
        choices=RegimeTributario.choices,
        default=RegimeTributario.SIMPLES_NACIONAL,
    )
    tipo_nota = models.CharField(
        max_length=10,
        choices=TipoNota.choices,
        default=TipoNota.NFSE,
    )
    cnpj = models.CharField(max_length=20, blank=True)
    razao_social = models.CharField(max_length=180, blank=True)
    municipio = models.CharField(max_length=120, blank=True)
    codigo_municipio_ibge = models.CharField(
        max_length=10,
        blank=True,
        validators=[RegexValidator(r"^\d*$", "Use apenas números.")],
    )
    uf = models.CharField(max_length=2, blank=True)
    aliquota_iss = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    iss_retido_fonte = models.BooleanField(default=False)
    codigo_servico_lc116 = models.CharField(max_length=20, blank=True)
    ativo = models.BooleanField(default=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração fiscal"
        verbose_name_plural = "Configurações fiscais"

    def __str__(self):
        return f"Configuração fiscal - {self.empresa.nome}"


class TabelaImpostoLucroPresumido(models.Model):
    descricao = models.CharField(max_length=180)
    pis = models.DecimalField(max_digits=5, decimal_places=2, default=0.65)
    cofins = models.DecimalField(max_digits=5, decimal_places=2, default=3.00)
    irpj_servicos = models.DecimalField(max_digits=5, decimal_places=2, default=4.80)
    csll_servicos = models.DecimalField(max_digits=5, decimal_places=2, default=2.88)
    irpj_comercio = models.DecimalField(max_digits=5, decimal_places=2, default=1.20)
    csll_comercio = models.DecimalField(max_digits=5, decimal_places=2, default=1.08)
    vigencia_inicio = models.DateField()
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-vigencia_inicio", "descricao"]
        verbose_name = "Tabela de imposto do Lucro Presumido"
        verbose_name_plural = "Tabelas de impostos do Lucro Presumido"

    def __str__(self):
        return self.descricao

