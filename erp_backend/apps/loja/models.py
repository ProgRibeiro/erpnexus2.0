from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Max, Sum
from django.utils import timezone


class ProdutoLoja(models.Model):
    class OrigemProduto(models.TextChoices):
        NACIONAL = "nacional", "Nacional"
        IMPORTADO = "importado", "Importado"
        ESTRANGEIRA_IMPORTACAO_DIRETA = "estrangeira_direta", "Estrangeira - importacao direta"
        ESTRANGEIRA_MERCADO_INTERNO = "estrangeira_interna", "Estrangeira - mercado interno"

    produto = models.OneToOneField("estoque.Produto", on_delete=models.CASCADE, related_name="loja")
    vendido_loja = models.BooleanField(default=True)
    destaque = models.BooleanField(default=False)
    imagem_principal = models.ImageField(upload_to="loja/produtos/", blank=True, null=True)
    preco_promocional = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    promocao_ativa = models.BooleanField(default=False)
    promocao_inicio = models.DateTimeField(null=True, blank=True)
    promocao_fim = models.DateTimeField(null=True, blank=True)
    ncm = models.CharField(max_length=8, blank=True)
    cest = models.CharField(max_length=20, blank=True)
    origem_produto = models.CharField(max_length=40, choices=OrigemProduto.choices, default=OrigemProduto.NACIONAL)
    cfop_padrao = models.CharField(max_length=4, default="5102")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["produto__nome"]
        verbose_name = "Produto da loja"
        verbose_name_plural = "Produtos da loja"

    def __str__(self):
        return self.produto.nome

    @property
    def preco_vigente(self):
        agora = timezone.now()
        if (
            self.promocao_ativa
            and self.preco_promocional is not None
            and (not self.promocao_inicio or self.promocao_inicio <= agora)
            and (not self.promocao_fim or self.promocao_fim >= agora)
        ):
            return self.preco_promocional
        return self.produto.preco_venda

    @property
    def estoque_atual(self):
        return self.produto.estoque_atual


class VariacaoProduto(models.Model):
    produto = models.ForeignKey(ProdutoLoja, on_delete=models.CASCADE, related_name="variacoes")
    nome_variacao = models.CharField(max_length=80)
    valor_variacao = models.CharField(max_length=120)
    codigo_barras = models.CharField(max_length=80, unique=True, blank=True, null=True)
    sku = models.CharField(max_length=80, unique=True, blank=True, null=True)
    estoque_proprio = models.BooleanField(default=False)
    preco_diferente = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["produto", "nome_variacao", "valor_variacao"]
        verbose_name = "Variacao do produto"
        verbose_name_plural = "Variacoes dos produtos"

    def __str__(self):
        return f"{self.produto} - {self.nome_variacao}: {self.valor_variacao}"

    @property
    def preco_vigente(self):
        return self.preco_diferente if self.preco_diferente is not None else self.produto.preco_vigente


class ImagemProduto(models.Model):
    produto = models.ForeignKey(ProdutoLoja, on_delete=models.CASCADE, related_name="imagens")
    imagem = models.ImageField(upload_to="loja/produtos/galeria/")
    ordem = models.PositiveIntegerField(default=0)
    principal = models.BooleanField(default=False)

    class Meta:
        ordering = ["ordem", "id"]


class Vendedor(models.Model):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vendedor_loja")
    codigo_vendedor = models.CharField(max_length=30, unique=True)
    comissao_percentual = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    ativo = models.BooleanField(default=True)
    meta_mensal = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["codigo_vendedor"]

    def __str__(self):
        return f"{self.codigo_vendedor} - {self.usuario}"


class FormaPagamento(models.Model):
    class Tipo(models.TextChoices):
        DINHEIRO = "dinheiro", "Dinheiro"
        PIX = "pix", "Pix"
        CARTAO_CREDITO = "cartao_credito", "Cartao credito"
        CARTAO_DEBITO = "cartao_debito", "Cartao debito"
        BOLETO = "boleto", "Boleto"
        CREDIARIO = "crediario", "Crediario"
        CHEQUE = "cheque", "Cheque"

    nome = models.CharField(max_length=80, unique=True)
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    aceita_troco = models.BooleanField(default=False)
    taxa_percentual = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    prazo_recebimento_dias = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Caixa(models.Model):
    nome = models.CharField(max_length=80)
    responsavel = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="caixas_loja")
    aberto = models.BooleanField(default=False, db_index=True)
    saldo_atual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    abertura = models.DateTimeField(default=timezone.now)
    fechamento = models.DateTimeField(null=True, blank=True)
    valor_abertura = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_fechamento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    diferenca = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["-abertura"]

    def __str__(self):
        return self.nome


class Venda(models.Model):
    class Canal(models.TextChoices):
        BALCAO = "balcao", "Balcao"
        ONLINE = "online", "Online"
        TELEFONE = "telefone", "Telefone"
        WHATSAPP = "whatsapp", "WhatsApp"

    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        FINALIZADA = "finalizada", "Finalizada"
        CANCELADA = "cancelada", "Cancelada"
        DEVOLVIDA = "devolvida", "Devolvida"

    numero = models.CharField(max_length=20, unique=True, blank=True)
    caixa = models.ForeignKey(Caixa, on_delete=models.PROTECT, related_name="vendas")
    vendedor = models.ForeignKey(Vendedor, on_delete=models.PROTECT, related_name="vendas")
    cliente = models.ForeignKey("clientes.Cliente", on_delete=models.SET_NULL, null=True, blank=True, related_name="vendas_loja")
    canal = models.CharField(max_length=20, choices=Canal.choices, default=Canal.BALCAO)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO, db_index=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    desconto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_frete = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    observacoes = models.TextField(blank=True)
    nfc_e_emitida = models.BooleanField(default=False)
    nfe_emitida = models.BooleanField(default=False)
    numero_nf = models.CharField(max_length=80, blank=True)
    chave_acesso_nf = models.CharField(max_length=44, blank=True)
    pdf_nf = models.FileField(upload_to="loja/notas/pdf/", blank=True, null=True)
    xml_nf = models.FileField(upload_to="loja/notas/xml/", blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    finalizada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return self.numero or f"Venda #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = self._gerar_numero()
        super().save(*args, **kwargs)

    @classmethod
    def _gerar_numero(cls):
        ano = timezone.localdate().year
        ultimo = cls.objects.filter(numero__startswith=f"VEN-{ano}-").aggregate(max_num=Max("numero")).get("max_num")
        sequencial = int(ultimo.split("-")[-1]) + 1 if ultimo else 1
        return f"VEN-{ano}-{sequencial:04d}"

    def recalcular_totais(self, salvar=True):
        subtotal = self.itens.aggregate(total=Sum("valor_total")).get("total") or Decimal("0")
        self.subtotal = subtotal
        self.valor_total = subtotal - Decimal(self.desconto_total or 0) + Decimal(self.valor_frete or 0)
        if salvar:
            self.save(update_fields=["subtotal", "valor_total"])


class ItemVenda(models.Model):
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(ProdutoLoja, on_delete=models.PROTECT, related_name="itens_venda")
    variacao = models.ForeignKey(VariacaoProduto, on_delete=models.SET_NULL, null=True, blank=True, related_name="itens_venda")
    quantidade = models.DecimalField(max_digits=12, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    desconto_item = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    comissao_vendedor = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.valor_total = (Decimal(self.quantidade or 0) * Decimal(self.valor_unitario or 0)) - Decimal(self.desconto_item or 0)
        percentual = Decimal(self.venda.vendedor.comissao_percentual or 0)
        self.comissao_vendedor = self.valor_total * percentual / Decimal("100")
        super().save(*args, **kwargs)
        self.venda.recalcular_totais()


class PagamentoVenda(models.Model):
    class Status(models.TextChoices):
        APROVADO = "aprovado", "Aprovado"
        PENDENTE = "pendente", "Pendente"
        RECUSADO = "recusado", "Recusado"

    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="pagamentos")
    forma_pagamento = models.ForeignKey(FormaPagamento, on_delete=models.PROTECT, related_name="pagamentos")
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    parcelas = models.PositiveIntegerField(default=1)
    bandeira_cartao = models.CharField(max_length=40, blank=True)
    numero_autorizacao = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APROVADO)


class MovimentoCaixa(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = "entrada", "Entrada"
        SAIDA = "saida", "Saida"
        SANGRIA = "sangria", "Sangria"
        SUPRIMENTO = "suprimento", "Suprimento"

    caixa = models.ForeignKey(Caixa, on_delete=models.CASCADE, related_name="movimentos")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    forma_pagamento = models.ForeignKey(FormaPagamento, on_delete=models.SET_NULL, null=True, blank=True, related_name="movimentos_caixa")
    descricao = models.CharField(max_length=255)
    venda = models.ForeignKey(Venda, on_delete=models.SET_NULL, null=True, blank=True, related_name="movimentos_caixa")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="movimentos_caixa")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]


class Fornecedor(models.Model):
    nome = models.CharField(max_length=180)
    razao_social = models.CharField(max_length=180, blank=True)
    cnpj = models.CharField(max_length=20, blank=True, db_index=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    whatsapp = models.CharField(max_length=30, blank=True)
    cep = models.CharField(max_length=10, blank=True)
    logradouro = models.CharField(max_length=180, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=120, blank=True)
    bairro = models.CharField(max_length=120, blank=True)
    cidade = models.CharField(max_length=120, blank=True)
    uf = models.CharField(max_length=2, blank=True)
    prazo_pagamento_padrao = models.PositiveIntegerField(default=0)
    observacoes = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class PedidoCompra(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ENVIADO = "enviado", "Enviado"
        APROVADO = "aprovado", "Aprovado"
        RECEBIDO = "recebido", "Recebido"
        CANCELADO = "cancelado", "Cancelado"

    numero = models.CharField(max_length=20, unique=True, blank=True)
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.PROTECT, related_name="pedidos_compra")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_frete = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    previsao_entrega = models.DateField(null=True, blank=True)
    data_recebimento = models.DateField(null=True, blank=True)
    numero_nf_fornecedor = models.CharField(max_length=80, blank=True)
    pdf_nf = models.FileField(upload_to="loja/pedidos/notas/", blank=True, null=True)
    observacoes = models.TextField(blank=True)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="pedidos_loja")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = self._gerar_numero()
        super().save(*args, **kwargs)

    @classmethod
    def _gerar_numero(cls):
        ano = timezone.localdate().year
        ultimo = cls.objects.filter(numero__startswith=f"PED-{ano}-").aggregate(max_num=Max("numero")).get("max_num")
        sequencial = int(ultimo.split("-")[-1]) + 1 if ultimo else 1
        return f"PED-{ano}-{sequencial:04d}"

    def recalcular_totais(self, salvar=True):
        subtotal = self.itens.aggregate(total=Sum("valor_total")).get("total") or Decimal("0")
        self.subtotal = subtotal
        self.valor_total = subtotal + Decimal(self.valor_frete or 0)
        if salvar:
            self.save(update_fields=["subtotal", "valor_total"])


class ItemPedidoCompra(models.Model):
    pedido = models.ForeignKey(PedidoCompra, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(ProdutoLoja, on_delete=models.PROTECT, related_name="itens_pedido_compra")
    variacao = models.ForeignKey(VariacaoProduto, on_delete=models.SET_NULL, null=True, blank=True, related_name="itens_pedido_compra")
    quantidade = models.DecimalField(max_digits=12, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.valor_total = Decimal(self.quantidade or 0) * Decimal(self.valor_unitario or 0)
        super().save(*args, **kwargs)
        self.pedido.recalcular_totais()


class EntregaPedido(models.Model):
    class Tipo(models.TextChoices):
        RETIRADA = "retirada", "Retirada"
        ENTREGA_PROPRIA = "entrega_propria", "Entrega propria"
        TRANSPORTADORA = "transportadora", "Transportadora"
        CORREIOS = "correios", "Correios"

    class Status(models.TextChoices):
        PREPARANDO = "preparando", "Preparando"
        ENVIADO = "enviado", "Enviado"
        EM_TRANSITO = "em_transito", "Em transito"
        ENTREGUE = "entregue", "Entregue"
        DEVOLVIDO = "devolvido", "Devolvido"

    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="entregas")
    tipo = models.CharField(max_length=30, choices=Tipo.choices, default=Tipo.RETIRADA)
    endereco_entrega = models.TextField(blank=True)
    transportadora = models.CharField(max_length=120, blank=True)
    codigo_rastreio = models.CharField(max_length=120, blank=True)
    valor_frete = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    previsao_entrega = models.DateField(null=True, blank=True)
    data_entrega = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PREPARANDO)
    entregador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="entregas_loja")

    class Meta:
        ordering = ["previsao_entrega", "id"]
