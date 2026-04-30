import uuid

from django.conf import settings
from django.db import models
from django.db.models import Max, Sum
from django.utils import timezone

from apps.clientes.models import Cliente, ContatoCliente, EnderecoCliente


class OrdemServico(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ABERTA = "aberta", "Aberta"
        ORCAMENTO_ENVIADO = "orcamento_enviado", "Orcamento enviado"
        APROVADA = "aprovada", "Aprovada"
        AGENDADA = "agendada", "Agendada"
        EM_EXECUCAO = "em_execucao", "Em execucao"
        CONCLUIDA = "concluida", "Concluida"
        FATURADA = "faturada", "Faturada"
        CANCELADA = "cancelada", "Cancelada"

    class TipoServico(models.TextChoices):
        HVAC = "hvac", "HVAC"
        REFRIGERACAO = "refrigeracao", "Refrigeracao"
        ELETRICA = "eletrica", "Eletrica"
        CIVIL = "civil", "Civil"
        MANUTENCAO = "manutencao", "Manutencao"
        INSTALACAO = "instalacao", "Instalacao"
        OUTRO = "outro", "Outro"

    class Prioridade(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Media"
        ALTA = "alta", "Alta"
        URGENTE = "urgente", "Urgente"

    class OrigemLead(models.TextChoices):
        INDICACAO = "indicacao", "Indicacao"
        SITE = "site", "Site"
        WHATSAPP = "whatsapp", "WhatsApp"
        TELEFONE = "telefone", "Telefone"
        EMAIL = "email", "Email"
        OUTRO = "outro", "Outro"

    class TipoRelatorio(models.TextChoices):
        SIMPLES = "simples", "Simples"
        TECNICO = "tecnico", "Tecnico"
        FOTOGRAFICO = "fotografico", "Fotografico"

    class StatusPagamento(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        PARCIAL = "parcial", "Parcial"
        PAGO = "pago", "Pago"
        VENCIDO = "vencido", "Vencido"
        CANCELADO = "cancelado", "Cancelado"

    class FormaCobranca(models.TextChoices):
        BOLETO = "boleto", "Boleto"
        PIX = "pix", "Pix"
        CARTAO = "cartao", "Cartao"
        TRANSFERENCIA = "transferencia", "Transferencia"
        DINHEIRO = "dinheiro", "Dinheiro"

    numero = models.CharField(max_length=20, unique=True, blank=True, null=True)
    token_relatorio = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ABERTA)
    tipo_servico = models.CharField(
        max_length=30,
        choices=TipoServico.choices,
        default=TipoServico.OUTRO,
    )
    prioridade = models.CharField(
        max_length=20,
        choices=Prioridade.choices,
        default=Prioridade.MEDIA,
    )
    origem_lead = models.CharField(
        max_length=30,
        choices=OrigemLead.choices,
        blank=True,
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name="ordens_servico",
    )
    contato_responsavel = models.ForeignKey(
        ContatoCliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordens_responsavel",
    )
    endereco_servico = models.ForeignKey(
        EnderecoCliente,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ordens_servico",
    )
    tem_pedido_compra = models.BooleanField(default=False)
    numero_pc = models.CharField(max_length=80, blank=True)
    valor_autorizado_pc = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    validade_pc = models.DateField(null=True, blank=True)
    pdf_pc = models.FileField(upload_to="ordens/pedidos_compra/", blank=True, null=True)
    descricao_servico = models.TextField(blank=True)
    valor_total_orcado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    condicao_pagamento = models.CharField(max_length=255, blank=True)
    validade_orcamento = models.DateField(null=True, blank=True)
    data_aprovacao = models.DateTimeField(null=True, blank=True)
    aprovado_por = models.CharField(max_length=150, blank=True)
    pdf_orcamento = models.FileField(upload_to="ordens/orcamentos/", blank=True, null=True)
    tecnico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordens_responsavel",
    )
    data_agendada = models.DateField(null=True, blank=True)
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_conclusao = models.TimeField(null=True, blank=True)
    equipamento_marca = models.CharField(max_length=120, blank=True)
    equipamento_modelo = models.CharField(max_length=120, blank=True)
    equipamento_serie = models.CharField(max_length=120, blank=True)
    observacoes_tecnicas = models.TextField(blank=True)
    tipo_relatorio = models.CharField(
        max_length=30,
        choices=TipoRelatorio.choices,
        blank=True,
    )
    pdf_relatorio = models.FileField(upload_to="ordens/relatorios/", blank=True, null=True)
    valor_final_faturado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    numero_nf = models.CharField(max_length=80, blank=True)
    pdf_nf = models.FileField(upload_to="ordens/notas_fiscais/", blank=True, null=True)
    data_emissao_nf = models.DateField(null=True, blank=True)
    data_vencimento = models.DateField(null=True, blank=True)
    forma_cobranca = models.CharField(
        max_length=30,
        choices=FormaCobranca.choices,
        blank=True,
    )
    status_pagamento = models.CharField(
        max_length=30,
        choices=StatusPagamento.choices,
        default=StatusPagamento.PENDENTE,
    )
    data_recebimento = models.DateField(null=True, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordens_criadas",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordens_atualizadas",
    )
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Ordem de servico"
        verbose_name_plural = "Ordens de servico"

    def __str__(self):
        return self.numero or f"OS #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = self._gerar_numero()
        super().save(*args, **kwargs)
        total = self.calcular_valor_total_orcado()
        if self.valor_total_orcado != total:
            self.valor_total_orcado = total
            super().save(update_fields=["valor_total_orcado", "atualizado_em"])

    @classmethod
    def _gerar_numero(cls):
        ano = timezone.localdate().year
        prefixo = f"OS-{ano}-"
        ultimo = (
            cls.objects.filter(numero__startswith=prefixo)
            .aggregate(maior=Max("numero"))
            .get("maior")
        )
        sequencial = int(ultimo.split("-")[-1]) + 1 if ultimo else 1
        return f"{prefixo}{sequencial:04d}"

    def calcular_valor_total_orcado(self):
        if not self.pk:
            return self.valor_total_orcado
        total = self.itens.aggregate(total=Sum("valor_total")).get("total")
        return total or 0


class ItemOrcamento(models.Model):
    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="itens")
    descricao = models.TextField()
    quantidade = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "Item do orcamento"
        verbose_name_plural = "Itens do orcamento"

    def save(self, *args, **kwargs):
        self.valor_total = self.quantidade * self.valor_unitario
        super().save(*args, **kwargs)
        self.os.valor_total_orcado = self.os.calcular_valor_total_orcado()
        self.os.save(update_fields=["valor_total_orcado", "atualizado_em"])

    def __str__(self):
        return self.descricao[:80]


class FotoOS(models.Model):
    class Tipo(models.TextChoices):
        ANTES = "antes", "Antes"
        DEPOIS = "depois", "Depois"

    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="fotos")
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    arquivo = models.ImageField(upload_to="ordens/fotos/")
    legenda = models.CharField(max_length=255, blank=True)
    enviado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fotos_os_enviadas",
    )
    enviado_em = models.DateTimeField(auto_now_add=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "enviado_em"]
        verbose_name = "Foto da OS"
        verbose_name_plural = "Fotos da OS"

    def __str__(self):
        return f"{self.os} - {self.tipo}"


class ChatOS(models.Model):
    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="mensagens")
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mensagens_os",
    )
    mensagem = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["criado_em"]
        verbose_name = "Mensagem da OS"
        verbose_name_plural = "Mensagens da OS"

    def __str__(self):
        return f"{self.os} - {self.criado_em:%d/%m/%Y %H:%M}"


class AnexoChatOS(models.Model):
    mensagem = models.ForeignKey(ChatOS, on_delete=models.CASCADE, related_name="anexos")
    arquivo = models.FileField(upload_to="ordens/chat/")
    nome_original = models.CharField(max_length=255)

    class Meta:
        ordering = ["id"]
        verbose_name = "Anexo do chat da OS"
        verbose_name_plural = "Anexos do chat da OS"

    def __str__(self):
        return self.nome_original


class DespesaOS(models.Model):
    class Tipo(models.TextChoices):
        MATERIAL = "material", "Material"
        DESLOCAMENTO = "deslocamento", "Deslocamento"
        ALIMENTACAO = "alimentacao", "Alimentacao"
        TERCEIRO = "terceiro", "Terceiro"
        OUTRO = "outro", "Outro"

    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="despesas")
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    comprovante = models.FileField(upload_to="ordens/despesas/", blank=True, null=True)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="despesas_os_registradas",
    )
    data_despesa = models.DateField(default=timezone.localdate)

    class Meta:
        ordering = ["-data_despesa", "-id"]
        verbose_name = "Despesa da OS"
        verbose_name_plural = "Despesas da OS"

    def __str__(self):
        return f"{self.os} - {self.descricao}"


class LogStatusOS(models.Model):
    os = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="logs_status")
    status_anterior = models.CharField(max_length=30, blank=True)
    status_novo = models.CharField(max_length=30)
    alterado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs_status_os",
    )
    alterado_em = models.DateTimeField(auto_now_add=True)
    observacao = models.TextField(blank=True)

    class Meta:
        ordering = ["-alterado_em"]
        verbose_name = "Log de status da OS"
        verbose_name_plural = "Logs de status da OS"

    def __str__(self):
        return f"{self.os}: {self.status_anterior} -> {self.status_novo}"


class AssinaturaClienteOS(models.Model):
    os = models.OneToOneField(
        OrdemServico,
        on_delete=models.CASCADE,
        related_name="assinatura_cliente",
    )
    imagem_assinatura = models.ImageField(upload_to="ordens/assinaturas/")
    nome_signatario = models.CharField(max_length=150)
    data_assinatura = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Assinatura do cliente na OS"
        verbose_name_plural = "Assinaturas dos clientes nas OS"

    def __str__(self):
        return f"{self.os} - {self.nome_signatario}"
