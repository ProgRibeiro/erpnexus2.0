from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone


class RegimeTributario(models.TextChoices):
    SIMPLES_NACIONAL = "SN", "Simples Nacional"
    LUCRO_PRESUMIDO = "LP", "Lucro Presumido"
    LUCRO_REAL = "LR", "Lucro Real"
    MEI = "MEI", "MEI"


class CodigoTributo(models.TextChoices):
    ICMS = "ICMS", "ICMS"
    ISS = "ISS", "ISS"
    PIS = "PIS", "PIS"
    COFINS = "COFINS", "COFINS"
    CBS = "CBS", "CBS"
    IBS = "IBS", "IBS"
    IS = "IS", "Imposto Seletivo"


class AmbienteFiscal(models.TextChoices):
    HOMOLOGACAO = "homologacao", "Homologação"
    PRODUCAO = "producao", "Produção"


class TabelaTributaria(models.Model):
    """
    Tabela versionada de alíquotas/regras.

    Regra do motor: nunca editar uma regra antiga para "corrigir" histórico.
    Encerre a vigência e crie uma nova versão.
    """

    codigo_tributo = models.CharField(max_length=10, choices=CodigoTributo.choices)
    cclasstrib = models.CharField(max_length=6, blank=True)
    ncm_ou_servico = models.CharField(max_length=20, default="GERAL")
    uf_municipio = models.CharField(max_length=10, blank=True)
    regime_tributario = models.CharField(max_length=5, choices=RegimeTributario.choices, blank=True)
    aliquota = models.DecimalField(max_digits=9, decimal_places=4)
    reducao_base = models.DecimalField(max_digits=9, decimal_places=4, default=0)
    vigencia_inicio = models.DateField()
    vigencia_fim = models.DateField(null=True, blank=True)
    fonte_normativa = models.CharField(max_length=255)
    observacoes = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["codigo_tributo", "-vigencia_inicio", "ncm_ou_servico", "uf_municipio"]
        indexes = [
            models.Index(fields=["codigo_tributo", "vigencia_inicio", "vigencia_fim"]),
            models.Index(fields=["ncm_ou_servico", "uf_municipio", "regime_tributario"]),
        ]
        verbose_name = "Tabela tributária versionada"
        verbose_name_plural = "Tabelas tributárias versionadas"

    def __str__(self):
        escopo = " / ".join(filter(Boolean, [self.ncm_ou_servico, self.uf_municipio, self.regime_tributario]))
        return f"{self.codigo_tributo} {self.aliquota}% ({escopo or 'GERAL'})"

    @property
    def vigente_ate_texto(self):
        return self.vigencia_fim.isoformat() if self.vigencia_fim else "vigente"


class OperacaoFiscal(models.Model):
    """
    Snapshot imutável do cálculo fiscal aplicado a uma operação.

    Usa GenericForeignKey para não acoplar o motor a um app de documento fiscal
    específico. Pode apontar para OS, lançamento, venda ou futuro Documento Fiscal.
    """

    documento_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="operacoes_fiscais",
    )
    documento_object_id = models.PositiveBigIntegerField(null=True, blank=True)
    documento = GenericForeignKey("documento_content_type", "documento_object_id")
    referencia = models.CharField(max_length=120, blank=True)
    ambiente = models.CharField(max_length=20, choices=AmbienteFiscal.choices, default=AmbienteFiscal.HOMOLOGACAO)
    data_emissao = models.DateField(default=timezone.localdate)
    regime_emitente = models.CharField(max_length=5, choices=RegimeTributario.choices)
    regime_destinatario = models.CharField(max_length=5, choices=RegimeTributario.choices, blank=True)
    valor_base = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tributos_calculados = models.JSONField()
    tabelas_aplicadas = models.ManyToManyField(TabelaTributaria, blank=True, related_name="operacoes")
    versao_motor = models.CharField(max_length=40, default="reforma-tributaria-2026.1")
    calculado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-calculado_em"]
        verbose_name = "Operação fiscal calculada"
        verbose_name_plural = "Operações fiscais calculadas"

    def __str__(self):
        return self.referencia or f"Operação fiscal #{self.pk}"
