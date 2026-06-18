from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from apps.ordens.models import OrdemServico


class CategoriaProduto(models.Model):
    nome = models.CharField(max_length=120, unique=True)
    descricao = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Categoria de produto"
        verbose_name_plural = "Categorias de produtos"

    def __str__(self):
        return self.nome


class Produto(models.Model):
    class UnidadeMedida(models.TextChoices):
        UN = "un", "Unidade"
        M = "m", "Metro"
        M2 = "m2", "Metro quadrado"
        KG = "kg", "Quilograma"
        LITRO = "litro", "Litro"
        PAR = "par", "Par"
        CAIXA = "caixa", "Caixa"

    class TipoSuprimento(models.TextChoices):
        ESTOQUE = "estoque", "Alocado no estoque"
        FUTURO = "futuro", "Produto futuro / sob compra"

    codigo = models.CharField(max_length=30, unique=True, blank=True, null=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    categoria = models.ForeignKey(
        CategoriaProduto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="produtos",
    )
    unidade_medida = models.CharField(
        max_length=20,
        choices=UnidadeMedida.choices,
        default=UnidadeMedida.UN,
    )
    preco_custo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    preco_venda = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    preco_venda_sugerido = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    markup_percentual = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    aliquota_impostos_percentual = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    despesas_operacionais_percentual = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    preco_manual = models.BooleanField(default=False)
    tipo_suprimento = models.CharField(
        max_length=20,
        choices=TipoSuprimento.choices,
        default=TipoSuprimento.ESTOQUE,
    )
    estoque_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    localizacao = models.CharField(max_length=120, blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = self._gerar_codigo()
        self.preco_venda_sugerido = self.calcular_preco_venda_sugerido()
        if not self.preco_manual or not self.preco_venda:
            self.preco_venda = self.preco_venda_sugerido
        super().save(*args, **kwargs)

    @classmethod
    def _gerar_codigo(cls):
        ultimo = cls.objects.exclude(codigo__isnull=True).filter(codigo__startswith="PRD-").order_by("codigo").last()
        sequencial = int(ultimo.codigo.split("-")[-1]) + 1 if ultimo and ultimo.codigo else 1
        return f"PRD-{sequencial:06d}"

    @property
    def estoque_atual(self):
        entradas = self.movimentacoes.filter(tipo=MovimentacaoEstoque.Tipo.ENTRADA).aggregate(
            total=Sum("quantidade")
        )["total"] or 0
        ajustes = self.movimentacoes.filter(tipo=MovimentacaoEstoque.Tipo.AJUSTE).aggregate(
            total=Sum("quantidade")
        )["total"] or 0
        saidas = self.movimentacoes.filter(
            tipo__in=[MovimentacaoEstoque.Tipo.SAIDA, MovimentacaoEstoque.Tipo.TRANSFERENCIA]
        ).aggregate(total=Sum("quantidade"))["total"] or 0
        return entradas + ajustes - saidas

    @property
    def em_alerta(self):
        """Verifica se está abaixo do estoque mínimo"""
        return self.estoque_atual <= self.estoque_minimo

    @property
    def margem_unitaria(self):
        """Calcula margem unitária: preço_venda - preço_custo"""
        return self.preco_venda - self.preco_custo

    @property
    def margem_percentual(self):
        """Calcula margem percentual"""
        if self.preco_custo > 0:
            return ((self.preco_venda - self.preco_custo) / self.preco_custo) * 100
        return 0

    @property
    def total_percentual_formacao(self):
        return self.markup_percentual + self.aliquota_impostos_percentual + self.despesas_operacionais_percentual

    @property
    def lucro_unitario_estimado(self):
        return self.preco_venda - self.preco_custo

    def calcular_preco_venda_sugerido(self):
        percentual = self.total_percentual_formacao
        return self.preco_custo + (self.preco_custo * percentual / 100)


class AlertaEstoque(models.Model):
    class TipoAlerta(models.TextChoices):
        ESTOQUE_BAIXO = "estoque_baixo", "Estoque Baixo"
        SEM_ESTOQUE = "sem_estoque", "Sem Estoque"
        FORA_MINIMO = "fora_minimo", "Fora do Mínimo"

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="alertas"
    )
    tipo = models.CharField(
        max_length=50,
        choices=TipoAlerta.choices,
        default=TipoAlerta.ESTOQUE_BAIXO
    )
    descricao = models.TextField()
    lido = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    resolvido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Alerta de Estoque"
        verbose_name_plural = "Alertas de Estoque"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["lido", "-criado_em"]),
            models.Index(fields=["produto"]),
        ]

    def __str__(self):
        return f"{self.produto.nome} - {self.tipo}"


class MovimentacaoEstoque(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = "entrada", "Entrada"
        SAIDA = "saida", "Saida"
        AJUSTE = "ajuste", "Ajuste"
        TRANSFERENCIA = "transferencia", "Transferencia"

    class Motivo(models.TextChoices):
        COMPRA = "compra", "Compra"
        USO_OS = "uso_os", "Uso em OS"
        PERDA = "perda", "Perda"
        AJUSTE_INVENTARIO = "ajuste_inventario", "Ajuste de inventario"
        DEVOLUCAO = "devolucao", "Devolucao"
        CONSUMO_INTERNO = "consumo_interno", "Consumo Interno"
        AMOSTRA = "amostra", "Amostra"

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="movimentacoes")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    quantidade = models.DecimalField(max_digits=12, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    motivo = models.CharField(max_length=30, choices=Motivo.choices)
    os = models.ForeignKey(
        OrdemServico,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentacoes_estoque",
    )
    fornecedor = models.CharField(max_length=180, blank=True)
    numero_nota = models.CharField(max_length=80, blank=True)
    observacoes = models.TextField(blank=True)
    realizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentacoes_estoque",
    )
    data_movimentacao = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-data_movimentacao", "-id"]
        verbose_name = "Movimentacao de estoque"
        verbose_name_plural = "Movimentacoes de estoque"

    def __str__(self):
        return f"{self.produto} - {self.tipo} - {self.quantidade}"

    @property
    def valor_total(self):
        """Calcula valor total da movimentação"""
        return self.quantidade * self.valor_unitario


class Servico(models.Model):
    class UnidadeMedida(models.TextChoices):
        HORA = "hora", "Hora"
        DIA = "dia", "Dia"
        UNI = "uni", "Unitário"
        LOTE = "lote", "Lote"

    class Categoria(models.TextChoices):
        HVAC = "hvac", "HVAC"
        REFRIGERACAO = "refrigeracao", "Refrigeração"
        ELETRICA = "eletrica", "Elétrica"
        CIVIL = "civil", "Civil"
        MANUTENCAO = "manutencao", "Manutenção"
        INSTALACAO = "instalacao", "Instalação"

    class Tributacao(models.TextChoices):
        ISS = "iss", "ISS"
        ICMS = "icms", "ICMS"
        PIS_COFINS = "pis_cofins", "PIS/COFINS"

    codigo = models.CharField(max_length=30, unique=True, blank=True, null=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    categoria = models.CharField(
        max_length=50,
        choices=Categoria.choices,
        default=Categoria.HVAC,
    )
    unidade_medida = models.CharField(
        max_length=20,
        choices=UnidadeMedida.choices,
        default=UnidadeMedida.UNI,
    )
    preco_padrao = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tributacao = models.CharField(
        max_length=30,
        choices=Tributacao.choices,
        default=Tributacao.ISS,
    )
    codigo_lc116 = models.CharField(max_length=10, blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["categoria", "nome"]
        verbose_name = "Serviço"
        verbose_name_plural = "Serviços"

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = self._gerar_codigo()
        super().save(*args, **kwargs)

    @classmethod
    def _gerar_codigo(cls):
        ultimo = cls.objects.exclude(codigo__isnull=True).filter(codigo__startswith="SRV-").order_by("codigo").last()
        sequencial = int(ultimo.codigo.split("-")[-1]) + 1 if ultimo else 1
        return f"SRV-{sequencial:06d}"

    def __str__(self):
        return f"{self.codigo} - {self.nome}"


class ReferenciaPrecoPublico(models.Model):
    class TipoItem(models.TextChoices):
        PRODUTO = "produto", "Produto"
        SERVICO = "servico", "Serviço"
        INSUMO = "insumo", "Insumo"
        MAO_OBRA = "mao_obra", "Mão de obra"
        COMPOSICAO = "composicao", "Composição"

    class Fonte(models.TextChoices):
        PLANILHA_CUSTOS = "planilha_custos", "Planilha de Custos e Formação de Preços"
        COMPRAS_GOV = "compras_gov", "Compras.gov / Pesquisa de Preços"
        CATMAT_CATSER = "catmat_catser", "CATMAT/CATSER"
        PNCP = "pncp", "Portal Nacional de Contratações Públicas"
        PORTAL_TRANSPARENCIA = "portal_transparencia", "Portal da Transparência"
        SINAPI = "sinapi", "SINAPI"
        HISTORICO_ERP = "historico_erp", "Histórico ERP"
        MANUAL_TECNICO = "manual_tecnico", "Base técnica manual"

    class ComponenteCusto(models.TextChoices):
        MATERIAL = "material", "Material"
        INSUMO = "insumo", "Insumo"
        MAO_OBRA = "mao_obra", "Mão de obra"
        ENCARGOS = "encargos", "Encargos sociais/trabalhistas"
        BENEFICIOS_DESPESAS = "beneficios_despesas", "Benefícios e despesas indiretas"
        TRIBUTOS = "tributos", "Tributos"
        EQUIPAMENTO = "equipamento", "Equipamento/ferramenta"
        DESLOCAMENTO = "deslocamento", "Deslocamento/logística"
        COMPOSICAO = "composicao", "Composição técnica"

    codigo = models.CharField(max_length=50, unique=True)
    descricao = models.CharField(max_length=255)
    tipo_item = models.CharField(max_length=30, choices=TipoItem.choices)
    componente_custo = models.CharField(
        max_length=30,
        choices=ComponenteCusto.choices,
        default=ComponenteCusto.COMPOSICAO,
    )
    disciplina = models.CharField(
        max_length=50,
        choices=Servico.Categoria.choices,
        default=Servico.Categoria.MANUTENCAO,
    )
    unidade_medida = models.CharField(max_length=20, default="un")
    valor_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_mediano = models.DecimalField(max_digits=12, decimal_places=2)
    valor_maximo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fonte = models.CharField(max_length=30, choices=Fonte.choices)
    codigo_fonte = models.CharField(max_length=80, blank=True)
    link_fonte = models.URLField(blank=True)
    base_legal = models.CharField(max_length=255, blank=True)
    uf = models.CharField(max_length=2, blank=True)
    data_referencia = models.DateField(null=True, blank=True)
    termos = models.JSONField(default=list, blank=True)
    observacoes = models.TextField(blank=True)
    confianca = models.PositiveIntegerField(default=75)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["disciplina", "descricao"]
        verbose_name = "Referência pública de preço"
        verbose_name_plural = "Referências públicas de preço"
        indexes = [
            models.Index(fields=["ativo", "disciplina", "tipo_item"]),
            models.Index(fields=["componente_custo", "ativo"]),
            models.Index(fields=["fonte", "codigo_fonte"]),
            models.Index(fields=["-data_referencia"]),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.descricao}"

    def calcular_valor_sugerido(
        self,
        *,
        margem_percentual=0,
        fator_complexidade=1,
        fator_regional=1,
        deslocamento=0,
    ):
        base = Decimal(str(self.valor_mediano or 0))
        margem = Decimal(str(margem_percentual or 0)) / Decimal("100")
        complexidade = Decimal(str(fator_complexidade or 1))
        regional = Decimal(str(fator_regional or 1))
        deslocamento_decimal = Decimal(str(deslocamento or 0))
        return ((base + (base * margem)) * complexidade * regional + deslocamento_decimal).quantize(Decimal("0.01"))


class MotorInteligenciaConhecimento(models.Model):
    class Escopo(models.TextChoices):
        GERAL = "geral", "Geral"
        ORCAMENTO = "orcamento", "Orçamento"
        CATALOGO = "catalogo", "Catálogo"
        FINANCEIRO = "financeiro", "Financeiro"
        ESTOQUE = "estoque", "Estoque"

    class Tipo(models.TextChoices):
        REGRA = "regra", "Regra"
        SINONIMO = "sinonimo", "Sinônimo"
        PRECO = "preco", "Preço"
        PROCEDIMENTO = "procedimento", "Procedimento"
        RESPOSTA = "resposta", "Resposta"

    class Origem(models.TextChoices):
        CHAT = "chat", "Chat"
        OS_CONCLUIDA = "os_concluida", "OS concluída"
        CATALOGO = "catalogo", "Catálogo"
        MANUAL = "manual", "Manual"

    class StatusRevisao(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        APROVADO = "aprovado", "Aprovado"
        REJEITADO = "rejeitado", "Rejeitado"

    titulo = models.CharField(max_length=180)
    escopo = models.CharField(max_length=30, choices=Escopo.choices, default=Escopo.GERAL)
    tipo = models.CharField(max_length=30, choices=Tipo.choices, default=Tipo.REGRA)
    entrada = models.TextField(help_text="Frase, situação ou padrão que ativa este conhecimento.")
    resposta = models.TextField(help_text="Como o motor deve agir ou responder.")
    termos = models.JSONField(default=list, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    produto = models.ForeignKey(Produto, null=True, blank=True, on_delete=models.SET_NULL, related_name="conhecimentos_motor")
    servico = models.ForeignKey(Servico, null=True, blank=True, on_delete=models.SET_NULL, related_name="conhecimentos_motor")
    confianca = models.PositiveIntegerField(default=80)
    ativo = models.BooleanField(default=True)
    vezes_usado = models.PositiveIntegerField(default=0)
    origem = models.CharField(max_length=30, choices=Origem.choices, default=Origem.CHAT)
    status_revisao = models.CharField(max_length=30, choices=StatusRevisao.choices, default=StatusRevisao.APROVADO)
    os_origem = models.ForeignKey(
        OrdemServico,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="conhecimentos_motor",
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="conhecimentos_motor_criados",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-atualizado_em", "titulo"]
        verbose_name = "Conhecimento do motor"
        verbose_name_plural = "Conhecimentos do motor"
        indexes = [
            models.Index(fields=["escopo", "tipo", "ativo"]),
            models.Index(fields=["ativo", "-atualizado_em"]),
            models.Index(fields=["origem", "status_revisao"]),
        ]

    def __str__(self):
        return f"{self.titulo} ({self.escopo})"
