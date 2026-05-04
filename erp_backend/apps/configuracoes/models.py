from django.core.validators import RegexValidator
from django.db.models import Q
from django.db import models


NOMES_RESERVADOS_SISTEMA = {"ERP Nexus", "ERP Servicos", "ERP Serviços"}


def get_empresa_configurada():
    """
    Retorna a empresa contratante que usa o ERP.

    ERP Nexus e nomes genéricos são identidade do sistema/fallback, não da
    empresa responsável pelos relatórios, orçamentos e documentos fiscais.
    """
    empresas = ConfiguracaoEmpresa.objects.order_by("id")
    empresa_real = (
        empresas.exclude(nome__in=NOMES_RESERVADOS_SISTEMA)
        .filter(Q(cnpj__gt="") | Q(razao_social__gt="") | Q(logo__gt=""))
        .first()
    )
    if empresa_real:
        return empresa_real

    empresa_com_dados = empresas.filter(Q(cnpj__gt="") | Q(razao_social__gt="") | Q(logo__gt="")).first()
    if empresa_com_dados:
        return empresa_com_dados

    empresa = empresas.exclude(nome__in=NOMES_RESERVADOS_SISTEMA).first()
    if empresa:
        return empresa

    return ConfiguracaoEmpresa.objects.create(
        nome="Empresa contratante",
        razao_social="",
    )


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
    regime_tributario = models.CharField(
        max_length=30,
        blank=True,
        default="lucro_presumido",
        choices=[
            ("simples_nacional", "Simples Nacional"),
            ("lucro_presumido", "Lucro Presumido"),
            ("lucro_real", "Lucro Real"),
            ("mei", "MEI"),
        ],
        verbose_name="Regime Tributário",
        help_text="Regime tributário da empresa usado automaticamente no faturamento.",
    )
    aliquota_issqn_padrao = models.DecimalField(
        max_digits=6, decimal_places=4, default=5.0, blank=True,
        verbose_name="Alíquota ISSQN padrão (%)",
    )
    aliquota_pis_padrao = models.DecimalField(
        max_digits=6, decimal_places=4, default=0.65, blank=True,
        verbose_name="Alíquota PIS padrão (%)",
    )
    aliquota_cofins_padrao = models.DecimalField(
        max_digits=6, decimal_places=4, default=3.0, blank=True,
        verbose_name="Alíquota COFINS padrão (%)",
    )
    aliquota_irpj_padrao = models.DecimalField(
        max_digits=6, decimal_places=4, default=1.5, blank=True,
        verbose_name="Alíquota IRPJ padrão (%)",
    )
    aliquota_csll_padrao = models.DecimalField(
        max_digits=6, decimal_places=4, default=1.0, blank=True,
        verbose_name="Alíquota CSLL padrão (%)",
    )

    class Meta:
        verbose_name = "Configuracao da empresa"
        verbose_name_plural = "Configuracoes da empresa"

    def __str__(self):
        return self.nome


class LogoClienteReferencia(models.Model):
    """Logos de clientes/parceiros exibidos como referência nos orçamentos."""
    nome = models.CharField(max_length=150)
    logo = models.ImageField(upload_to="configuracoes/clientes_ref/")
    ordem = models.PositiveSmallIntegerField(default=0)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["ordem", "criado_em"]
        verbose_name = "Logo de cliente referencia"
        verbose_name_plural = "Logos de clientes referencia"

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


class ConfiguracaoOS(models.Model):
    prefixo = models.CharField(max_length=10, default="OS")
    proximo_numero = models.PositiveIntegerField(default=1000)
    validade_padrao = models.PositiveIntegerField(
        default=30, help_text="Validade em dias"
    )
    texto_termos = models.TextField(
        blank=True,
        help_text="Texto de termos padrão para novas ordens de serviço"
    )
    texto_condicoes = models.TextField(
        blank=True,
        help_text="Texto de condições de pagamento padrão"
    )
    incluir_logo_pdf = models.BooleanField(default=True)
    incluir_assinatura_pdf = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Configuracao de Ordens de Servico"
        verbose_name_plural = "Configuracoes de Ordens de Servico"

    def __str__(self):
        return f"Configuração OS (Prefixo: {self.prefixo})"

    def gerar_numero_os(self):
        """Gera o próximo número de OS e incrementa o contador"""
        numero = self.proximo_numero
        self.proximo_numero += 1
        self.save(update_fields=["proximo_numero"])
        return f"{self.prefixo}{numero:06d}"


class ConfiguracaoFinanceira(models.Model):
    aliquota_iss = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=5.00,
        help_text="Alíquota padrão do ISS em percentual"
    )
    conta_padrao_receber = models.CharField(
        max_length=100,
        blank=True,
        help_text="Conta padrão para recebimentos"
    )
    conta_padrao_pagar = models.CharField(
        max_length=100,
        blank=True,
        help_text="Conta padrão para pagamentos"
    )
    banco_padrao = models.CharField(
        max_length=100,
        blank=True,
        help_text="Banco padrão para movimentações"
    )
    agencia_padrao = models.CharField(
        max_length=10,
        blank=True
    )
    conta_corrente_padrao = models.CharField(
        max_length=20,
        blank=True
    )
    dias_padrao_pagamento = models.PositiveIntegerField(
        default=30,
        help_text="Dias padrão para vencimento de compras"
    )
    dias_padrao_recebimento = models.PositiveIntegerField(
        default=30,
        help_text="Dias padrão para vencimento de vendas"
    )
    juros_atraso = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.00,
        help_text="Juros mensais por atraso em percentual"
    )
    multa_atraso = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.00,
        help_text="Multa por atraso em percentual"
    )

    class Meta:
        verbose_name = "Configuracao Financeira"
        verbose_name_plural = "Configuracoes Financeira"

    def __str__(self):
        return "Configuração Financeira"
