from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models

from apps.clientes.models import Cliente, ContatoCliente


class Pipeline(models.Model):
    nome = models.CharField(max_length=120)
    descricao = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pipelines_criados",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Pipeline"
        verbose_name_plural = "Pipelines"

    def __str__(self):
        return self.nome


class ColunaPipeline(models.Model):
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="colunas")
    nome = models.CharField(max_length=120)
    ordem = models.PositiveIntegerField(default=0)
    cor = models.CharField(
        max_length=7,
        default="#1677ff",
        validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Use uma cor hexadecimal valida.")],
    )
    eh_ganho = models.BooleanField(default=False)
    eh_perdido = models.BooleanField(default=False)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "Coluna do pipeline"
        verbose_name_plural = "Colunas do pipeline"

    def __str__(self):
        return f"{self.pipeline} - {self.nome}"


class TagCRM(models.Model):
    nome = models.CharField(max_length=60, unique=True)
    cor = models.CharField(
        max_length=7,
        default="#1677ff",
        validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Use uma cor hexadecimal valida.")],
    )

    class Meta:
        ordering = ["nome"]
        verbose_name = "Tag CRM"
        verbose_name_plural = "Tags CRM"

    def __str__(self):
        return self.nome


class Oportunidade(models.Model):
    class Prioridade(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Media"
        ALTA = "alta", "Alta"
        URGENTE = "urgente", "Urgente"

    titulo = models.CharField(max_length=255)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="oportunidades",
    )
    contato = models.ForeignKey(
        ContatoCliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="oportunidades",
    )
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="oportunidades",
    )
    coluna = models.ForeignKey(
        ColunaPipeline,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="oportunidades",
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="oportunidades_responsavel",
    )
    valor_estimado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    probabilidade = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    data_fechamento_prevista = models.DateField(null=True, blank=True)
    descricao = models.TextField(blank=True)
    origem = models.CharField(max_length=120, blank=True)
    prioridade = models.CharField(
        max_length=20,
        choices=Prioridade.choices,
        default=Prioridade.MEDIA,
    )
    tags = models.ManyToManyField(TagCRM, blank=True, related_name="oportunidades")
    ordem_no_kanban = models.PositiveIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["ordem_no_kanban", "-criado_em"]
        verbose_name = "Oportunidade"
        verbose_name_plural = "Oportunidades"

    def __str__(self):
        return self.titulo


class AtividadeCRM(models.Model):
    class Tipo(models.TextChoices):
        LIGACAO = "ligacao", "Ligacao"
        EMAIL = "email", "Email"
        WHATSAPP = "whatsapp", "WhatsApp"
        REUNIAO = "reuniao", "Reuniao"
        VISITA = "visita", "Visita"
        TAREFA = "tarefa", "Tarefa"
        NOTA = "nota", "Nota"

    oportunidade = models.ForeignKey(
        Oportunidade,
        on_delete=models.CASCADE,
        related_name="atividades",
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    titulo = models.CharField(max_length=180)
    descricao = models.TextField(blank=True)
    data_atividade = models.DateTimeField(null=True, blank=True)
    data_vencimento = models.DateTimeField(null=True, blank=True)
    concluida = models.BooleanField(default=False)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="atividades_crm",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["concluida", "data_vencimento", "-criado_em"]
        verbose_name = "Atividade CRM"
        verbose_name_plural = "Atividades CRM"

    def __str__(self):
        return self.titulo


class EmailCRM(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ENVIADO = "enviado", "Enviado"
        ERRO = "erro", "Erro"

    oportunidade = models.ForeignKey(Oportunidade, on_delete=models.CASCADE, related_name="emails")
    assunto = models.CharField(max_length=255)
    corpo = models.TextField()
    destinatario_nome = models.CharField(max_length=150, blank=True)
    destinatario_email = models.EmailField()
    enviado_em = models.DateTimeField(null=True, blank=True)
    enviado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails_crm_enviados",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)

    class Meta:
        ordering = ["-enviado_em", "-id"]
        verbose_name = "Email CRM"
        verbose_name_plural = "Emails CRM"

    def __str__(self):
        return self.assunto


class AnexoCRM(models.Model):
    oportunidade = models.ForeignKey(Oportunidade, on_delete=models.CASCADE, related_name="anexos")
    arquivo = models.FileField(upload_to="crm/anexos/")
    nome_original = models.CharField(max_length=255)
    tamanho = models.PositiveIntegerField(default=0)
    enviado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anexos_crm_enviados",
    )
    enviado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-enviado_em"]
        verbose_name = "Anexo CRM"
        verbose_name_plural = "Anexos CRM"

    def __str__(self):
        return self.nome_original
