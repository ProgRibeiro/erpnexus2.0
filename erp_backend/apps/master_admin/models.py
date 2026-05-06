from django.db import models
from django.utils import timezone


class PlanoCatalogo(models.Model):
    """Catálogo de planos disponíveis para cada sistema."""

    SISTEMA = [
        ("erp", "ERP Nexus"),
        ("facilities", "Facilities SaaS"),
        ("ambos", "ERP + Facilities"),
    ]

    nome = models.CharField(max_length=100)  # "ERP Básico", "Facilities Enterprise"
    sistema = models.CharField(max_length=20, choices=SISTEMA, default="erp")
    descricao = models.TextField(blank=True)
    valor_mensal = models.DecimalField(max_digits=10, decimal_places=2)
    limite_usuarios = models.IntegerField(default=5)
    limite_registros = models.IntegerField(default=1000, help_text="OS, chamados, etc.")
    recursos = models.JSONField(default=list, blank=True, help_text='["financeiro","crm","estoque"]')
    destaque = models.BooleanField(default=False, help_text="Mostrar como recomendado")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Plano"
        verbose_name_plural = "Planos"
        ordering = ["sistema", "valor_mensal"]

    def __str__(self):
        return f"{self.get_sistema_display()} — {self.nome}"


class ClienteSaaS(models.Model):
    """Empresa cliente que comprou ERP ou Facilities."""

    STATUS = [
        ("trial", "Trial"),
        ("ativo", "Ativo"),
        ("suspenso", "Suspenso"),
        ("cancelado", "Cancelado"),
    ]

    # Identificação
    nome_empresa = models.CharField(max_length=200)
    razao_social = models.CharField(max_length=300, blank=True)
    cnpj = models.CharField(max_length=18, blank=True)
    nome_responsavel = models.CharField(max_length=150)
    email_responsavel = models.EmailField()
    telefone = models.CharField(max_length=20, blank=True)

    # Acesso ao sistema
    login_admin = models.EmailField(unique=True, help_text="Email de acesso ao ERP/Facilities")
    senha_provisoria = models.CharField(max_length=100, blank=True)
    schema_name = models.CharField(max_length=63, blank=True, help_text="Schema django-tenants (preencher ao criar tenant)")

    # Status
    status = models.CharField(max_length=20, choices=STATUS, default="trial")
    observacoes = models.TextField(blank=True)

    # Timestamps
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cliente SaaS"
        verbose_name_plural = "Clientes SaaS"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.nome_empresa} ({self.get_status_display()})"

    @property
    def assinatura_ativa(self):
        return self.assinaturas.filter(status="ativo").first()

    @property
    def esta_bloqueado(self):
        return self.status in ("suspenso", "cancelado")


class AssinaturaSaaS(models.Model):
    """Vínculo entre um cliente e um plano de um sistema."""

    STATUS = [
        ("ativo", "Ativo"),
        ("trial", "Trial"),
        ("vencido", "Vencido"),
        ("cancelado", "Cancelado"),
        ("suspenso", "Suspenso"),
    ]

    cliente = models.ForeignKey(ClienteSaaS, on_delete=models.CASCADE, related_name="assinaturas")
    plano = models.ForeignKey(PlanoCatalogo, on_delete=models.PROTECT, related_name="assinaturas")
    status = models.CharField(max_length=20, choices=STATUS, default="trial")

    # Datas
    data_inicio = models.DateField()
    data_fim = models.DateField(null=True, blank=True, help_text="Null = sem prazo de vencimento")
    data_proximo_vencimento = models.DateField(null=True, blank=True)

    # Valores (podem diferir do plano padrão por desconto negociado)
    valor_negociado = models.DecimalField(max_digits=10, decimal_places=2)
    desconto_percentual = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    motivo_desconto = models.CharField(max_length=255, blank=True)

    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.cliente} → {self.plano} ({self.get_status_display()})"

    @property
    def valor_com_desconto(self):
        if self.desconto_percentual:
            return self.valor_negociado * (1 - self.desconto_percentual / 100)
        return self.valor_negociado


class PagamentoMensalidade(models.Model):
    """Registro de cada mensalidade cobrada/paga."""

    STATUS = [
        ("pendente", "Pendente"),
        ("pago", "Pago"),
        ("vencido", "Vencido"),
        ("cancelado", "Cancelado"),
    ]

    FORMA_PAGAMENTO = [
        ("pix", "PIX"),
        ("boleto", "Boleto"),
        ("cartao", "Cartão"),
        ("transferencia", "Transferência"),
        ("dinheiro", "Dinheiro"),
    ]

    assinatura = models.ForeignKey(AssinaturaSaaS, on_delete=models.CASCADE, related_name="pagamentos")
    referencia = models.CharField(max_length=7, help_text="YYYY-MM (ex: 2025-03)")
    valor_cobrado = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS, default="pendente")

    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)
    forma_pagamento = models.CharField(max_length=20, choices=FORMA_PAGAMENTO, blank=True)

    comprovante = models.FileField(upload_to="master/comprovantes/", null=True, blank=True)
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pagamento"
        verbose_name_plural = "Pagamentos"
        ordering = ["-data_vencimento"]
        unique_together = [("assinatura", "referencia")]

    def __str__(self):
        return f"{self.assinatura.cliente} / {self.referencia} — {self.get_status_display()}"

    def marcar_pago(self, forma="pix", data=None):
        self.status = "pago"
        self.data_pagamento = data or timezone.localdate()
        self.forma_pagamento = forma
        self.save(update_fields=["status", "data_pagamento", "forma_pagamento"])


class LogAcessoMaster(models.Model):
    """Auditoria de acessos ao painel master."""

    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    acao = models.CharField(max_length=200)
    detalhes = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de Acesso Master"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.acao} — {self.timestamp:%d/%m/%Y %H:%M}"
