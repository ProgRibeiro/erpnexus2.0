from calendar import monthrange
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.db import models
from django.db.models import Max
from django.utils import timezone

from apps.clientes.models import Cliente
from apps.ordens.models import OrdemServico


class EscopoTecnico(models.Model):
    nome = models.CharField(max_length=120)
    codigo = models.CharField(max_length=20, unique=True)
    icone = models.CharField(max_length=80, blank=True)
    cor = models.CharField(max_length=7, default="#3B82F6")
    descricao = models.TextField(blank=True)
    norma_tecnica = models.CharField(max_length=160, blank=True)
    ativo = models.BooleanField(default=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "Escopo técnico"
        verbose_name_plural = "Escopos técnicos"

    def __str__(self):
        return f"{self.codigo} - {self.nome}"


class ItemChecklistPadrao(models.Model):
    class Categoria(models.TextChoices):
        LIMPEZA = "limpeza", "Limpeza"
        VERIFICACAO = "verificacao", "Verificação"
        MEDICAO = "medicao", "Medição"
        LUBRIFICACAO = "lubrificacao", "Lubrificação"
        TROCA = "troca", "Troca"
        AJUSTE = "ajuste", "Ajuste"
        TESTE = "teste", "Teste"
        INSPECAO = "inspecao", "Inspeção"

    escopo = models.ForeignKey(EscopoTecnico, on_delete=models.CASCADE, related_name="checklist_padrao")
    descricao = models.CharField(max_length=300)
    categoria = models.CharField(max_length=30, choices=Categoria.choices)
    obrigatorio = models.BooleanField(default=True)
    requer_foto = models.BooleanField(default=False)
    requer_medicao = models.BooleanField(default=False)
    unidade_medicao = models.CharField(max_length=20, blank=True)
    ordem = models.PositiveIntegerField(default=0)
    referencia_norma = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["escopo__ordem", "ordem", "descricao"]
        verbose_name = "Item de checklist padrão"
        verbose_name_plural = "Itens de checklist padrão"

    def __str__(self):
        return self.descricao


class ContratoPreventiva(models.Model):
    class TipoFaturamento(models.TextChoices):
        MENSAL_FIXO = "mensal_fixo", "Mensal fixo"
        POR_OS_EXECUTADA = "por_os_executada", "Por OS executada"
        MISTO = "misto", "Misto"

    class FormaPagamento(models.TextChoices):
        BOLETO = "boleto", "Boleto"
        PIX = "pix", "Pix"
        TRANSFERENCIA = "transferencia", "Transferência"
        DEBITO_AUT = "debito_aut", "Débito automático"

    class IndiceReajuste(models.TextChoices):
        IPCA = "IPCA", "IPCA"
        IGPM = "IGPM", "IGP-M"
        INPC = "INPC", "INPC"
        FIXO_PERCENTUAL = "fixo_percentual", "Fixo percentual"

    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ATIVO = "ativo", "Ativo"
        SUSPENSO = "suspenso", "Suspenso"
        ENCERRADO = "encerrado", "Encerrado"
        RESCINDIDO = "rescindido", "Rescindido"

    numero = models.CharField(max_length=20, unique=True, blank=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="contratos_preventiva")
    titulo = models.CharField(max_length=200)
    objeto_contrato = models.TextField()
    vigencia_meses = models.PositiveIntegerField(default=12)
    data_inicio = models.DateField()
    data_fim = models.DateField(blank=True, null=True)
    tipo_faturamento = models.CharField(max_length=30, choices=TipoFaturamento.choices, default=TipoFaturamento.MENSAL_FIXO)
    dia_vencimento_fatura = models.PositiveIntegerField(default=10)
    forma_pagamento = models.CharField(max_length=30, choices=FormaPagamento.choices, default=FormaPagamento.BOLETO)
    multa_atraso_percentual = models.DecimalField(max_digits=6, decimal_places=3, default=Decimal("2.000"))
    juros_dia_percentual = models.DecimalField(max_digits=6, decimal_places=3, default=Decimal("0.033"))
    multa_rescisao_antecipada = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    prazo_aviso_rescisao_dias = models.PositiveIntegerField(default=30)
    reajuste_anual = models.BooleanField(default=True)
    indice_reajuste = models.CharField(max_length=30, choices=IndiceReajuste.choices, default=IndiceReajuste.IPCA)
    valor_reajuste_fixo = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    renovacao_automatica = models.BooleanField(default=False)
    requer_art = models.BooleanField(default=False)
    numero_art = models.CharField(max_length=80, blank=True)
    pdf_art = models.FileField(upload_to="contratos/art/", blank=True, null=True)
    responsavel_tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_preventiva_responsavel",
    )
    responsavel_tecnico_crea = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)
    valor_total_mensal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    valor_total_contrato = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    observacoes = models.TextField(blank=True)
    pdf_contrato = models.FileField(upload_to="contratos/pdfs/", blank=True, null=True)
    pdf_proposta = models.FileField(upload_to="contratos/propostas/", blank=True, null=True)
    pdf_cronograma = models.FileField(upload_to="contratos/cronogramas/", blank=True, null=True)
    assinado_em = models.DateTimeField(null=True, blank=True)
    assinado_por_cliente = models.CharField(max_length=150, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_preventiva_criados",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Contrato de preventiva"
        verbose_name_plural = "Contratos de preventiva"

    def __str__(self):
        return self.numero or self.titulo

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = self._gerar_numero()
        if self.data_inicio and not self.data_fim:
            self.data_fim = self.data_inicio + relativedelta(months=self.vigencia_meses) - relativedelta(days=1)
        super().save(*args, **kwargs)

    @classmethod
    def _gerar_numero(cls):
        ano = timezone.localdate().year
        prefixo = f"CONT-{ano}-"
        ultimo = cls.objects.filter(numero__startswith=prefixo).aggregate(maior=Max("numero")).get("maior")
        sequencial = int(ultimo.split("-")[-1]) + 1 if ultimo else 1
        return f"{prefixo}{sequencial:04d}"

    def recalcular_totais(self, salvar=True):
        total_mensal = self.unidades.filter(ativo=True).aggregate(total=models.Sum("valor_mensal")).get("total") or Decimal("0")
        self.valor_total_mensal = total_mensal
        self.valor_total_contrato = total_mensal * Decimal(self.vigencia_meses or 0)
        if salvar:
            self.save(update_fields=["valor_total_mensal", "valor_total_contrato", "atualizado_em"])
        return self.valor_total_mensal, self.valor_total_contrato

    def data_vencimento_competencia(self, mes, ano):
        dia = min(max(int(self.dia_vencimento_fatura or 1), 1), 28, monthrange(ano, mes)[1])
        return timezone.datetime(ano, mes, dia).date()

    def _deve_reajustar_agora(self):
        hoje = timezone.localdate()
        return self.status == self.Status.ATIVO and self.reajuste_anual and self.data_inicio and hoje.month == self.data_inicio.month

    def _aplicar_reajuste(self):
        if self.indice_reajuste != self.IndiceReajuste.FIXO_PERCENTUAL or self.valor_reajuste_fixo <= 0:
            return False
        fator = Decimal("1") + (self.valor_reajuste_fixo / Decimal("100"))
        for unidade in self.unidades.filter(ativo=True):
            unidade.valor_mensal = unidade.valor_mensal * fator
            unidade.save(update_fields=["valor_mensal"])
        self.recalcular_totais()
        return True


class EscopoContrato(models.Model):
    contrato = models.ForeignKey(ContratoPreventiva, on_delete=models.CASCADE, related_name="escopos_contrato")
    escopo = models.ForeignKey(EscopoTecnico, on_delete=models.PROTECT, related_name="contratos")
    ativo = models.BooleanField(default=True)

    class Meta:
        unique_together = ["contrato", "escopo"]
        ordering = ["escopo__ordem"]


class UnidadeContrato(models.Model):
    contrato = models.ForeignKey(ContratoPreventiva, on_delete=models.CASCADE, related_name="unidades")
    nome_unidade = models.CharField(max_length=180)
    codigo_interno = models.CharField(max_length=60, blank=True)
    endereco_completo = models.TextField()
    cep = models.CharField(max_length=10, blank=True)
    cidade = models.CharField(max_length=120, blank=True)
    estado = models.CharField(max_length=2, blank=True)
    responsavel_local = models.CharField(max_length=150, blank=True)
    telefone_local = models.CharField(max_length=30, blank=True)
    email_local = models.EmailField(blank=True)
    area_atendimento_m2 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    valor_mensal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ativo = models.BooleanField(default=True)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ["nome_unidade"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.contrato.recalcular_totais()

    def __str__(self):
        return self.nome_unidade


class EscopoUnidade(models.Model):
    class Periodicidade(models.TextChoices):
        MENSAL = "mensal", "Mensal"
        BIMESTRAL = "bimestral", "Bimestral"
        TRIMESTRAL = "trimestral", "Trimestral"
        QUADRIMESTRAL = "quadrimestral", "Quadrimestral"
        SEMESTRAL = "semestral", "Semestral"
        ANUAL = "anual", "Anual"

    unidade_contrato = models.ForeignKey(UnidadeContrato, on_delete=models.CASCADE, related_name="escopos")
    escopo = models.ForeignKey(EscopoTecnico, on_delete=models.PROTECT, related_name="escopos_unidade")
    periodicidade = models.CharField(max_length=20, choices=Periodicidade.choices, default=Periodicidade.MENSAL)
    equipamentos_quantidade = models.PositiveIntegerField(default=1)
    equipamentos_descricao = models.TextField(blank=True)
    valor_alocado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        unique_together = ["unidade_contrato", "escopo"]
        ordering = ["unidade_contrato__nome_unidade", "escopo__ordem"]

    def __str__(self):
        return f"{self.unidade_contrato} - {self.escopo}"


class ItemChecklistContrato(models.Model):
    escopo_unidade = models.ForeignKey(EscopoUnidade, on_delete=models.CASCADE, related_name="checklist")
    item_padrao = models.ForeignKey(ItemChecklistPadrao, on_delete=models.SET_NULL, null=True, blank=True, related_name="itens_contrato")
    descricao_customizada = models.TextField(blank=True)
    obrigatorio = models.BooleanField(default=True)
    requer_foto = models.BooleanField(default=False)
    requer_medicao = models.BooleanField(default=False)
    unidade_medicao = models.CharField(max_length=20, blank=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem"]

    @property
    def descricao(self):
        return self.descricao_customizada or (self.item_padrao.descricao if self.item_padrao else "")


class OSContratoPreventiva(models.Model):
    class Status(models.TextChoices):
        PROGRAMADA = "programada", "Programada"
        EM_EXECUCAO = "em_execucao", "Em execução"
        CONCLUIDA = "concluida", "Concluída"
        ATRASADA = "atrasada", "Atrasada"
        CANCELADA = "cancelada", "Cancelada"

    contrato = models.ForeignKey(ContratoPreventiva, on_delete=models.CASCADE, related_name="os_contrato")
    unidade_contrato = models.ForeignKey(UnidadeContrato, on_delete=models.CASCADE, related_name="os_contrato")
    escopo_unidade = models.ForeignKey(EscopoUnidade, on_delete=models.CASCADE, related_name="os_contrato")
    ordem_servico = models.ForeignKey(OrdemServico, on_delete=models.SET_NULL, null=True, blank=True, related_name="contrato_preventiva")
    numero_visita = models.PositiveIntegerField(default=1)
    data_prevista = models.DateField()
    data_executada = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROGRAMADA)
    tecnico_responsavel = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="os_preventivas")
    checklist_completo = models.BooleanField(default=False)

    class Meta:
        ordering = ["data_prevista", "unidade_contrato__nome_unidade"]
        unique_together = ["contrato", "escopo_unidade", "numero_visita", "data_prevista"]


class ExecucaoChecklist(models.Model):
    class Status(models.TextChoices):
        CONFORME = "conforme", "Conforme"
        NAO_CONFORME = "nao_conforme", "Não conforme"
        NAO_APLICAVEL = "nao_aplicavel", "Não aplicável"
        CORRIGIDO_DURANTE_VISITA = "corrigido_durante_visita", "Corrigido durante a visita"
        REQUER_ORCAMENTO = "requer_orcamento", "Requer orçamento"
        REQUER_RETORNO_TECNICO = "requer_retorno_tecnico", "Requer retorno técnico"
        EQUIPAMENTO_PARADO = "equipamento_parado", "Equipamento parado"
        OPERANDO_COM_RESTRICAO = "operando_com_restricao", "Equipamento operando com restrição"

    os_contrato = models.ForeignKey(OSContratoPreventiva, on_delete=models.CASCADE, related_name="execucoes_checklist")
    item_checklist = models.ForeignKey(ItemChecklistContrato, on_delete=models.PROTECT, related_name="execucoes")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.CONFORME)
    valor_medicao = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    observacao = models.TextField(blank=True)
    foto = models.ImageField(upload_to="contratos/checklist/", null=True, blank=True)
    executado_em = models.DateTimeField(null=True, blank=True)
    executado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="checklists_preventiva_executados")

    class Meta:
        unique_together = ["os_contrato", "item_checklist"]


class FaturaContrato(models.Model):
    class Status(models.TextChoices):
        A_EMITIR = "a_emitir", "A emitir"
        EMITIDA = "emitida", "Emitida"
        PAGA = "paga", "Paga"
        VENCIDA = "vencida", "Vencida"
        CONTESTADA = "contestada", "Contestada"

    contrato = models.ForeignKey(ContratoPreventiva, on_delete=models.CASCADE, related_name="faturas")
    mes_referencia = models.PositiveIntegerField()
    ano_referencia = models.PositiveIntegerField()
    competencia = models.DateField()
    vencimento = models.DateField()
    valor_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_extras = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_glosa = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.A_EMITIR)
    numero_nf = models.CharField(max_length=80, blank=True)
    pdf_nf = models.FileField(upload_to="contratos/notas_fiscais/", blank=True, null=True)
    pdf_boletim_medicao = models.FileField(upload_to="contratos/boletins/", blank=True, null=True)
    pago_em = models.DateTimeField(null=True, blank=True)
    observacoes = models.TextField(blank=True)

    class Meta:
        unique_together = ["contrato", "mes_referencia", "ano_referencia"]
        ordering = ["-ano_referencia", "-mes_referencia"]
