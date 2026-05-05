from django.conf import settings
from django.db import models


class Ativo(models.Model):
    CATEGORIA_CHOICES = [
        ("hvac", "HVAC"),
        ("eletrica", "Elétrica"),
        ("hidraulica", "Hidráulica"),
        ("civil", "Civil"),
        ("ti", "TI"),
        ("seguranca", "Segurança"),
        ("outro", "Outro"),
    ]
    STATUS_CHOICES = [
        ("operacional", "Operacional"),
        ("em_manutencao", "Em Manutenção"),
        ("inativo", "Inativo"),
        ("sucateado", "Sucateado"),
    ]

    tag = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    localizacao_predio = models.CharField(max_length=100, blank=True)
    localizacao_andar = models.CharField(max_length=50, blank=True)
    localizacao_sala = models.CharField(max_length=100, blank=True)
    foto = models.ImageField(upload_to="facilities/ativos/", null=True, blank=True)
    manual_url = models.URLField(blank=True)
    data_instalacao = models.DateField(null=True, blank=True)
    vida_util_anos = models.PositiveIntegerField(null=True, blank=True)
    fabricante = models.CharField(max_length=100, blank=True)
    modelo = models.CharField(max_length=100, blank=True)
    numero_serie = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="operacional")
    custo_aquisicao = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tag"]
        verbose_name = "Ativo"
        verbose_name_plural = "Ativos"

    def __str__(self):
        return f"{self.tag} - {self.nome}"


class PlanoManutencao(models.Model):
    TIPO_CHOICES = [
        ("preventiva", "Preventiva"),
        ("preditiva", "Preditiva"),
        ("corretiva", "Corretiva"),
        ("emergencia", "Emergência"),
    ]
    PERIODICIDADE_CHOICES = [
        ("diaria", "Diária"),
        ("semanal", "Semanal"),
        ("quinzenal", "Quinzenal"),
        ("mensal", "Mensal"),
        ("trimestral", "Trimestral"),
        ("semestral", "Semestral"),
        ("anual", "Anual"),
    ]

    ativo = models.ForeignKey(Ativo, on_delete=models.CASCADE, related_name="planos")
    nome = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    periodicidade = models.CharField(max_length=20, choices=PERIODICIDADE_CHOICES)
    descricao = models.TextField(blank=True)
    proxima_execucao = models.DateField(null=True, blank=True)
    ultima_execucao = models.DateField(null=True, blank=True)
    ativo_plano = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["proxima_execucao"]
        verbose_name = "Plano de Manutenção"
        verbose_name_plural = "Planos de Manutenção"

    def __str__(self):
        return f"{self.nome} - {self.ativo.tag}"


class ChecklistItem(models.Model):
    plano = models.ForeignKey(PlanoManutencao, on_delete=models.CASCADE, related_name="checklist")
    ordem = models.PositiveIntegerField(default=0)
    descricao = models.CharField(max_length=300)
    obrigatorio = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem"]

    def __str__(self):
        return self.descricao


class ChamadoFacilities(models.Model):
    PRIORIDADE_CHOICES = [
        ("baixa", "Baixa"),
        ("media", "Média"),
        ("alta", "Alta"),
        ("critica", "Crítica"),
    ]
    STATUS_CHOICES = [
        ("aberto", "Aberto"),
        ("em_atendimento", "Em Atendimento"),
        ("aguardando", "Aguardando"),
        ("resolvido", "Resolvido"),
        ("fechado", "Fechado"),
    ]

    numero = models.CharField(max_length=20, unique=True)
    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    ativo = models.ForeignKey(Ativo, null=True, blank=True, on_delete=models.SET_NULL, related_name="chamados")
    prioridade = models.CharField(max_length=10, choices=PRIORIDADE_CHOICES, default="media")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="aberto")
    solicitante_nome = models.CharField(max_length=100)
    solicitante_email = models.CharField(max_length=100, blank=True)
    solicitante_ramal = models.CharField(max_length=20, blank=True)
    local = models.CharField(max_length=200, blank=True)
    tecnico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chamados_facilities",
    )
    sla_horas = models.PositiveIntegerField(default=8)
    aberto_em = models.DateTimeField(auto_now_add=True)
    resolvido_em = models.DateTimeField(null=True, blank=True)
    avaliacao = models.PositiveIntegerField(null=True, blank=True)
    comentario_avaliacao = models.TextField(blank=True)
    foto_antes = models.ImageField(upload_to="facilities/chamados/", null=True, blank=True)
    foto_depois = models.ImageField(upload_to="facilities/chamados/", null=True, blank=True)

    class Meta:
        ordering = ["-aberto_em"]
        verbose_name = "Chamado Facilities"
        verbose_name_plural = "Chamados Facilities"

    def __str__(self):
        return f"{self.numero} - {self.titulo}"

    def save(self, *args, **kwargs):
        if not self.numero:
            import datetime
            ano = datetime.date.today().year
            ultimo = ChamadoFacilities.objects.filter(numero__startswith=f"FAC-{ano}").count()
            self.numero = f"FAC-{ano}-{str(ultimo + 1).zfill(4)}"
        super().save(*args, **kwargs)


class ContratoTerceirizado(models.Model):
    PERIODICIDADE_CHOICES = [
        ("diaria", "Diária"),
        ("semanal", "Semanal"),
        ("quinzenal", "Quinzenal"),
        ("mensal", "Mensal"),
        ("trimestral", "Trimestral"),
    ]
    STATUS_CHOICES = [
        ("ativo", "Ativo"),
        ("vencendo", "Vencendo"),
        ("vencido", "Vencido"),
        ("rescindido", "Rescindido"),
    ]

    fornecedor_nome = models.CharField(max_length=200)
    fornecedor_cnpj = models.CharField(max_length=18, blank=True)
    tipo_servico = models.CharField(max_length=100)
    valor_mensal = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    data_inicio = models.DateField()
    data_fim = models.DateField()
    periodicidade_servico = models.CharField(max_length=20, choices=PERIODICIDADE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ativo")
    observacoes = models.TextField(blank=True)
    avaliacao_fornecedor = models.PositiveIntegerField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["data_fim"]
        verbose_name = "Contrato Terceirizado"
        verbose_name_plural = "Contratos Terceirizados"

    def __str__(self):
        return f"{self.fornecedor_nome} - {self.tipo_servico}"


class ProjetoObra(models.Model):
    TIPO_CHOICES = [
        ("construcao", "Construção"),
        ("reforma", "Reforma"),
        ("instalacao", "Instalação"),
        ("ampliacao", "Ampliação"),
        ("outro", "Outro"),
    ]
    STATUS_CHOICES = [
        ("planejamento", "Planejamento"),
        ("em_andamento", "Em Andamento"),
        ("pausado", "Pausado"),
        ("concluido", "Concluído"),
        ("cancelado", "Cancelado"),
    ]

    codigo = models.CharField(max_length=30, unique=True)
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planejamento")
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="projetos_obra",
    )
    orcamento_previsto = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    orcamento_realizado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    data_inicio_prevista = models.DateField(null=True, blank=True)
    data_fim_prevista = models.DateField(null=True, blank=True)
    data_inicio_real = models.DateField(null=True, blank=True)
    data_fim_real = models.DateField(null=True, blank=True)
    percentual_concluido = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Projeto/Obra"
        verbose_name_plural = "Projetos/Obras"

    def __str__(self):
        return f"{self.codigo} - {self.nome}"


class FaseObra(models.Model):
    STATUS_CHOICES = [
        ("pendente", "Pendente"),
        ("em_andamento", "Em Andamento"),
        ("concluida", "Concluída"),
    ]

    projeto = models.ForeignKey(ProjetoObra, on_delete=models.CASCADE, related_name="fases")
    nome = models.CharField(max_length=200)
    ordem = models.PositiveIntegerField(default=0)
    data_inicio = models.DateField(null=True, blank=True)
    data_fim = models.DateField(null=True, blank=True)
    percentual_concluido = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pendente")

    class Meta:
        ordering = ["ordem"]

    def __str__(self):
        return f"{self.projeto.codigo} - {self.nome}"


class DiarioObra(models.Model):
    CLIMA_CHOICES = [
        ("sol", "Sol"),
        ("nublado", "Nublado"),
        ("chuva", "Chuva"),
        ("vento", "Vento"),
    ]

    projeto = models.ForeignKey(ProjetoObra, on_delete=models.CASCADE, related_name="diarios")
    data = models.DateField()
    clima = models.CharField(max_length=10, choices=CLIMA_CHOICES, blank=True)
    equipe_presente = models.PositiveIntegerField(default=0)
    atividades_realizadas = models.TextField()
    ocorrencias = models.TextField(blank=True)
    observacoes = models.TextField(blank=True)
    foto = models.ImageField(upload_to="facilities/diario/", null=True, blank=True)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="diarios_obra",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-data"]

    def __str__(self):
        return f"{self.projeto.codigo} - {self.data}"


class BoletimMedicao(models.Model):
    STATUS_CHOICES = [
        ("rascunho", "Rascunho"),
        ("enviado", "Enviado"),
        ("aprovado", "Aprovado"),
        ("reprovado", "Reprovado"),
    ]

    projeto = models.ForeignKey(ProjetoObra, on_delete=models.CASCADE, related_name="boletins")
    numero = models.CharField(max_length=20)
    mes_referencia = models.DateField()
    percentual_executado = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    valor_medido = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="rascunho")
    observacoes = models.TextField(blank=True)
    aprovado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-mes_referencia"]

    def __str__(self):
        return f"BM {self.numero} - {self.projeto.codigo}"


class Licitacao(models.Model):
    class Modo(models.TextChoices):
        ABERTA = "aberta", "Aberta (qualquer prestador)"
        CONVIDADA = "convidada", "Convidada"

    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        PUBLICADA = "publicada", "Publicada"
        EM_ANALISE = "em_analise", "Em Análise"
        CONCLUIDA = "concluida", "Concluída"
        CANCELADA = "cancelada", "Cancelada"

    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    tipo_servico = models.CharField(max_length=100)
    ativo = models.ForeignKey(Ativo, null=True, blank=True, on_delete=models.SET_NULL, related_name="licitacoes")
    modo = models.CharField(max_length=20, choices=Modo.choices, default=Modo.ABERTA)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RASCUNHO)
    prazo_propostas = models.DateTimeField(null=True, blank=True)
    valor_maximo = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Licitação"
        verbose_name_plural = "Licitações"

    def __str__(self):
        return self.titulo


class PropostaLicitacao(models.Model):
    class Status(models.TextChoices):
        ENVIADA = "enviada", "Enviada"
        ACEITA = "aceita", "Aceita"
        RECUSADA = "recusada", "Recusada"

    licitacao = models.ForeignKey(Licitacao, on_delete=models.CASCADE, related_name="propostas")
    prestador_nome = models.CharField(max_length=200)
    prestador_email = models.EmailField()
    valor = models.DecimalField(max_digits=14, decimal_places=2)
    prazo_execucao_dias = models.PositiveIntegerField()
    observacoes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ENVIADA)
    enviado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["enviado_em"]
        verbose_name = "Proposta de Licitação"
        verbose_name_plural = "Propostas de Licitação"

    def __str__(self):
        return f"{self.licitacao.titulo} - {self.prestador_nome}"
