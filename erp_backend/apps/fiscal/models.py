from datetime import date

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

    class AnexoSimples(models.TextChoices):
        ANEXO_III = "anexo_iii", "Anexo III"
        ANEXO_IV = "anexo_iv", "Anexo IV"

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
    data_abertura_simples = models.DateField(default=date(2025, 12, 18))
    anexo_simples = models.CharField(
        max_length=20,
        choices=AnexoSimples.choices,
        default=AnexoSimples.ANEXO_III,
    )
    ativo = models.BooleanField(default=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração fiscal"
        verbose_name_plural = "Configurações fiscais"

    def __str__(self):
        return f"Configuração fiscal - {self.empresa.nome}"


class FaturamentoMensalSimples(models.Model):
    class Origem(models.TextChoices):
        MANUAL = "manual", "Manual"
        NFSE = "nfse", "NFS-e"
        IMPORTACAO = "importacao", "Importação"

    empresa = models.ForeignKey(
        ConfiguracaoEmpresa,
        on_delete=models.CASCADE,
        related_name="faturamentos_simples",
    )
    competencia = models.DateField(help_text="Use sempre o primeiro dia do mês de competência.")
    receita_bruta = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    origem = models.CharField(max_length=20, choices=Origem.choices, default=Origem.MANUAL)
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-competencia"]
        unique_together = ["empresa", "competencia"]
        verbose_name = "Faturamento mensal do Simples"
        verbose_name_plural = "Faturamentos mensais do Simples"
        indexes = [
            models.Index(fields=["empresa", "competencia"]),
        ]

    def __str__(self):
        return f"{self.empresa.nome} - {self.competencia:%m/%Y}"


class ApuracaoSimplesNacional(models.Model):
    class Alerta(models.TextChoices):
        OK = "ok", "Dentro dos limites"
        PERTO_SUBLIMITE = "perto_sublimite", "Perto do sublimite"
        ACIMA_SUBLIMITE = "acima_sublimite", "Acima do sublimite"
        PERTO_TETO = "perto_teto", "Perto do teto"
        ACIMA_TETO = "acima_teto", "Acima do teto"

    empresa = models.ForeignKey(
        ConfiguracaoEmpresa,
        on_delete=models.CASCADE,
        related_name="apuracoes_simples",
    )
    competencia = models.DateField(help_text="Use sempre o primeiro dia do mês de competência.")
    anexo = models.CharField(max_length=20, default=ConfiguracaoFiscal.AnexoSimples.ANEXO_III)
    receita_mes = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    rbt12 = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    meses_atividade = models.PositiveSmallIntegerField(default=1)
    proporcionalizado = models.BooleanField(default=True)
    faixa = models.PositiveSmallIntegerField(default=1)
    aliquota_nominal = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    parcela_deduzir = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    aliquota_efetiva = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    das_estimado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    percentual_sublimite = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    percentual_teto = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    alerta = models.CharField(max_length=30, choices=Alerta.choices, default=Alerta.OK)
    memoria_calculo = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-competencia"]
        unique_together = ["empresa", "competencia"]
        verbose_name = "Apuração do Simples Nacional"
        verbose_name_plural = "Apurações do Simples Nacional"
        indexes = [
            models.Index(fields=["empresa", "competencia"]),
            models.Index(fields=["alerta"]),
        ]

    def __str__(self):
        return f"Simples {self.competencia:%m/%Y} - {self.get_alerta_display()}"


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


class VersaoRegraSimplesNacional(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ATIVA = "ativa", "Ativa"
        ARQUIVADA = "arquivada", "Arquivada"

    empresa = models.ForeignKey(
        ConfiguracaoEmpresa,
        on_delete=models.CASCADE,
        related_name="versoes_regra_simples",
    )
    nome = models.CharField(max_length=140)
    descricao = models.TextField(blank=True)
    anexo = models.CharField(
        max_length=20,
        choices=ConfiguracaoFiscal.AnexoSimples.choices,
        default=ConfiguracaoFiscal.AnexoSimples.ANEXO_III,
    )
    tabela_faixas = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de faixas com limite, aliquota e deduzir.",
    )
    sublimite = models.DecimalField(max_digits=14, decimal_places=2, default=3600000)
    teto = models.DecimalField(max_digits=14, decimal_places=2, default=4800000)
    vigente_desde = models.DateField(null=True, blank=True)
    vigente_ate = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)
    criado_por = models.CharField(max_length=120, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Versão de regra do Simples Nacional"
        verbose_name_plural = "Versões de regra do Simples Nacional"
        indexes = [
            models.Index(fields=["empresa", "status"]),
            models.Index(fields=["empresa", "anexo"]),
        ]

    def __str__(self):
        return f"{self.nome} ({self.get_status_display()})"


class SimulacaoFiscalSimples(models.Model):
    class Origem(models.TextChoices):
        API = "api", "API"
        MANUAL = "manual", "Manual"
        SISTEMA = "sistema", "Sistema"

    empresa = models.ForeignKey(
        ConfiguracaoEmpresa,
        on_delete=models.CASCADE,
        related_name="simulacoes_fiscais_simples",
    )
    competencia = models.DateField()
    regra_versao = models.ForeignKey(
        VersaoRegraSimplesNacional,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="simulacoes",
    )
    entrada = models.JSONField(default=dict, blank=True)
    resultado = models.JSONField(default=dict, blank=True)
    origem = models.CharField(max_length=20, choices=Origem.choices, default=Origem.API)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Simulação fiscal do Simples"
        verbose_name_plural = "Simulações fiscais do Simples"
        indexes = [
            models.Index(fields=["empresa", "competencia"]),
            models.Index(fields=["origem"]),
        ]

    def __str__(self):
        return f"Simulação {self.competencia:%m/%Y} - {self.empresa.nome}"
