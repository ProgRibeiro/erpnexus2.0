from django.conf import settings
from django.db import models


class Cliente(models.Model):
    class TipoPessoa(models.TextChoices):
        FISICA = "fisica", "Pessoa fisica"
        JURIDICA = "juridica", "Pessoa juridica"

    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        INATIVO = "inativo", "Inativo"
        PROSPECT = "prospect", "Prospect"
        BLOQUEADO = "bloqueado", "Bloqueado"

    tipo_pessoa = models.CharField(
        max_length=20,
        choices=TipoPessoa.choices,
        default=TipoPessoa.JURIDICA,
    )
    nome = models.CharField(max_length=255)
    cnpj_cpf = models.CharField(max_length=20, blank=True, db_index=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    whatsapp = models.CharField(max_length=30, blank=True)
    segmento = models.CharField(max_length=120, blank=True, db_index=True)
    origem = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ATIVO,
        db_index=True,
    )
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"

    def __str__(self):
        return self.nome


class EnderecoCliente(models.Model):
    class Tipo(models.TextChoices):
        COBRANCA = "cobranca", "Cobranca"
        ENTREGA = "entrega", "Entrega"
        SERVICO = "servico", "Servico"
        OUTRO = "outro", "Outro"

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="enderecos",
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.SERVICO)
    cep = models.CharField(max_length=10, blank=True)
    logradouro = models.CharField(max_length=255)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=120, blank=True)
    bairro = models.CharField(max_length=120, blank=True)
    cidade = models.CharField(max_length=120)
    estado = models.CharField(max_length=2)
    principal = models.BooleanField(default=False)

    class Meta:
        ordering = ["-principal", "cidade", "logradouro"]
        verbose_name = "Endereco do cliente"
        verbose_name_plural = "Enderecos dos clientes"

    def __str__(self):
        return f"{self.logradouro}, {self.numero} - {self.cidade}/{self.estado}"


class ContatoCliente(models.Model):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="contatos",
    )
    nome = models.CharField(max_length=150)
    cargo = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    whatsapp = models.CharField(max_length=30, blank=True)
    principal = models.BooleanField(default=False)

    class Meta:
        ordering = ["-principal", "nome"]
        verbose_name = "Contato do cliente"
        verbose_name_plural = "Contatos dos clientes"

    def __str__(self):
        return self.nome


class HistoricoCliente(models.Model):
    class Tipo(models.TextChoices):
        LIGACAO = "ligacao", "Ligacao"
        EMAIL = "email", "Email"
        WHATSAPP = "whatsapp", "WhatsApp"
        REUNIAO = "reuniao", "Reuniao"
        OBSERVACAO = "observacao", "Observacao"

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="historicos",
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    descricao = models.TextField()
    data_contato = models.DateTimeField()
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historicos_clientes",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-data_contato", "-criado_em"]
        verbose_name = "Historico do cliente"
        verbose_name_plural = "Historicos dos clientes"

    def __str__(self):
        return f"{self.cliente} - {self.tipo}"
