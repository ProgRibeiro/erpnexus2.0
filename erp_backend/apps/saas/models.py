from django.conf import settings
from django.db import models


class PlanoSaaS(models.Model):
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    valor_mensal = models.DecimalField(max_digits=10, decimal_places=2)
    limite_usuarios = models.IntegerField(default=10)
    limite_unidades = models.IntegerField(default=50)
    limite_chamados_mes = models.IntegerField(default=200)
    recursos_inclusos = models.JSONField(default=list)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Plano SaaS"
        verbose_name_plural = "Planos SaaS"

    def __str__(self):
        return self.nome


class Tenant(models.Model):
    TIPO = [('contratante', 'Contratante'), ('prestador', 'Prestador'), ('ambos', 'Ambos')]
    STATUS = [('trial', 'Trial'), ('ativo', 'Ativo'), ('suspenso', 'Suspenso'), ('cancelado', 'Cancelado')]
    PLANO = [('basico', 'Básico'), ('profissional', 'Profissional'), ('enterprise', 'Enterprise')]

    nome = models.CharField(max_length=200)
    razao_social = models.CharField(max_length=300, blank=True)
    cnpj = models.CharField(max_length=18, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO, default='contratante')
    plano = models.CharField(max_length=20, choices=PLANO, default='basico')
    plano_saas = models.ForeignKey(PlanoSaaS, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS, default='trial')
    data_inicio_contrato = models.DateField(null=True, blank=True)
    data_fim_contrato = models.DateField(null=True, blank=True)
    valor_mensalidade = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    limite_usuarios = models.IntegerField(default=10)
    limite_unidades = models.IntegerField(default=50)
    limite_chamados_mes = models.IntegerField(default=200)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self):
        return self.nome


class Empresa(models.Model):
    TIPO = [('matriz', 'Matriz'), ('regional', 'Regional'), ('unidade', 'Unidade')]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='empresas')
    nome = models.CharField(max_length=200)
    razao_social = models.CharField(max_length=300, blank=True)
    cnpj = models.CharField(max_length=18, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO, default='unidade')
    empresa_pai = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='filiais')
    nivel_hierarquia = models.IntegerField(default=3)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    def __str__(self):
        return self.nome


class Unidade(models.Model):
    TIPO = [
        ('loja_shopping', 'Loja Shopping'), ('escritorio', 'Escritório'),
        ('fabrica', 'Fábrica'), ('centro_distribuicao', 'Centro Distribuição'), ('outlet', 'Outlet'),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='unidades')
    codigo_interno = models.CharField(max_length=20)
    nome = models.CharField(max_length=200)
    tipo = models.CharField(max_length=30, choices=TIPO, default='escritorio')
    area_m2 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    horario_funcionamento = models.CharField(max_length=200, blank=True)
    responsavel_local = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    logradouro = models.CharField(max_length=300, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)
    cep = models.CharField(max_length=9, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    centro_custo = models.CharField(max_length=50, blank=True)
    ativo = models.BooleanField(default=True)
    foto_principal = models.ImageField(upload_to='unidades/', null=True, blank=True)

    class Meta:
        verbose_name = "Unidade"
        verbose_name_plural = "Unidades"

    def __str__(self):
        return f"{self.codigo_interno} - {self.nome}"


class ContratoSaaS(models.Model):
    STATUS = [('ativo', 'Ativo'), ('encerrado', 'Encerrado'), ('suspenso', 'Suspenso')]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='contratos')
    numero = models.CharField(max_length=50, unique=True)
    inicio = models.DateField()
    fim = models.DateField()
    valor_mensal = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS, default='ativo')
    pdf_contrato = models.FileField(upload_to='contratos_saas/', null=True, blank=True)

    class Meta:
        verbose_name = "Contrato SaaS"
        verbose_name_plural = "Contratos SaaS"

    def __str__(self):
        return self.numero


class CentroCusto(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='centros_custo')
    codigo = models.CharField(max_length=30)
    descricao = models.CharField(max_length=300)
    centro_pai = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='filhos')
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Centro de Custo"
        verbose_name_plural = "Centros de Custo"

    def __str__(self):
        return f"{self.codigo} - {self.descricao}"


class CategoriaBudget(models.Model):
    nome = models.CharField(max_length=100)
    cor_hex = models.CharField(max_length=7, default='#3B82F6')
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Categoria de Budget"
        verbose_name_plural = "Categorias de Budget"

    def __str__(self):
        return self.nome


class BudgetAnual(models.Model):
    STATUS = [
        ('rascunho', 'Rascunho'), ('aprovado', 'Aprovado'),
        ('executando', 'Executando'), ('encerrado', 'Encerrado'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    centro_custo = models.ForeignKey(CentroCusto, null=True, blank=True, on_delete=models.SET_NULL)
    ano = models.IntegerField()
    valor_total_aprovado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    aprovado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    aprovado_em = models.DateTimeField(null=True, blank=True)
    pdf_aprovacao = models.FileField(upload_to='budgets/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='rascunho')

    class Meta:
        verbose_name = "Budget Anual"
        verbose_name_plural = "Budgets Anuais"

    def __str__(self):
        return f"Budget {self.ano} - {self.empresa.nome}"

    @property
    def valor_total_realizado(self):
        return self.meses.aggregate(total=models.Sum('valor_realizado'))['total'] or 0


class BudgetMensal(models.Model):
    budget_anual = models.ForeignKey(BudgetAnual, on_delete=models.CASCADE, related_name='meses')
    categoria = models.ForeignKey(CategoriaBudget, on_delete=models.CASCADE)
    mes = models.IntegerField()
    valor_previsto = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    valor_realizado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    valor_comprometido = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Budget Mensal"
        verbose_name_plural = "Budgets Mensais"

    @property
    def saldo_disponivel(self):
        return self.valor_previsto - self.valor_realizado - self.valor_comprometido


class NivelAprovacao(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='niveis_aprovacao')
    nome = models.CharField(max_length=100)
    valor_minimo = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    valor_maximo = models.DecimalField(max_digits=14, decimal_places=2, default=999999)
    requer_3_cotacoes = models.BooleanField(default=False)
    ordem = models.IntegerField(default=1)

    class Meta:
        verbose_name = "Nível de Aprovação"
        verbose_name_plural = "Níveis de Aprovação"
        ordering = ['ordem']

    def __str__(self):
        return self.nome


class AprovadorAlcada(models.Model):
    nivel = models.ForeignKey(NivelAprovacao, on_delete=models.CASCADE, related_name='aprovadores')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    empresa = models.ForeignKey(Empresa, null=True, blank=True, on_delete=models.SET_NULL)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Aprovador por Alçada"
        verbose_name_plural = "Aprovadores por Alçada"


class SolicitacaoAprovacao(models.Model):
    STATUS = [
        ('pendente', 'Pendente'), ('aprovado', 'Aprovado'),
        ('reprovado', 'Reprovado'), ('escalado', 'Escalado'),
    ]

    objeto_tipo = models.CharField(max_length=50)
    objeto_id = models.IntegerField()
    valor = models.DecimalField(max_digits=14, decimal_places=2)
    centro_custo = models.ForeignKey(CentroCusto, null=True, blank=True, on_delete=models.SET_NULL)
    nivel_necessario = models.ForeignKey(NivelAprovacao, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS, default='pendente')
    solicitado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='solicitacoes_enviadas'
    )
    aprovado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='solicitacoes_aprovadas'
    )
    data_solicitacao = models.DateTimeField(auto_now_add=True)
    data_resposta = models.DateTimeField(null=True, blank=True)
    observacao_aprovacao = models.TextField(blank=True)
    escalado_para = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='solicitacoes_escaladas'
    )
    ip_aprovacao = models.GenericIPAddressField(null=True, blank=True)
    dispositivo_aprovacao = models.CharField(max_length=300, blank=True)

    class Meta:
        verbose_name = "Solicitação de Aprovação"
        verbose_name_plural = "Solicitações de Aprovação"


class PrestadorContratado(models.Model):
    tenant_contratante = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='prestadores_contratados')
    tenant_prestador = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='contratos_prestador')
    empresas_atendidas = models.ManyToManyField(Empresa, blank=True)
    valor_hora_padrao = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sla_atendimento_horas = models.IntegerField(default=24)
    ativo = models.BooleanField(default=True)
    contrato_pdf = models.FileField(upload_to='contratos_prestadores/', null=True, blank=True)

    class Meta:
        verbose_name = "Prestador Contratado"
        verbose_name_plural = "Prestadores Contratados"


class ChamadoPlataforma(models.Model):
    PRIORIDADE = [
        ('baixa', 'Baixa'), ('media', 'Média'), ('alta', 'Alta'),
        ('critica', 'Crítica'), ('emergencia', 'Emergência'),
    ]
    STATUS_CHOICES = [
        ('aberto', 'Aberto'), ('aguardando_orcamento', 'Aguardando Orçamento'),
        ('aguardando_aprovacao', 'Aguardando Aprovação'), ('em_execucao', 'Em Execução'),
        ('concluido', 'Concluído'), ('cancelado', 'Cancelado'),
    ]

    tenant_contratante = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='chamados_abertos')
    tenant_prestador = models.ForeignKey(
        Tenant, null=True, blank=True, on_delete=models.SET_NULL, related_name='chamados_recebidos'
    )
    unidade = models.ForeignKey(Unidade, on_delete=models.CASCADE, related_name='chamados')
    numero = models.CharField(max_length=30, unique=True)
    tipo_servico = models.CharField(max_length=100)
    descricao = models.TextField()
    prioridade = models.CharField(max_length=20, choices=PRIORIDADE, default='media')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='aberto')
    sla_horas = models.IntegerField(default=24)
    abertura = models.DateTimeField(auto_now_add=True)
    aceite_prestador = models.DateTimeField(null=True, blank=True)
    inicio_execucao = models.DateTimeField(null=True, blank=True)
    conclusao = models.DateTimeField(null=True, blank=True)
    valor_orcado = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    valor_executado = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    ordem_servico_prestador_id = models.IntegerField(null=True, blank=True)
    avaliacao_prestador = models.IntegerField(null=True, blank=True)
    comentario_avaliacao = models.TextField(blank=True)
    centro_custo = models.ForeignKey(CentroCusto, null=True, blank=True, on_delete=models.SET_NULL)
    aprovacao_alcada = models.ForeignKey(SolicitacaoAprovacao, null=True, blank=True, on_delete=models.SET_NULL)
    aberto_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = "Chamado na Plataforma"
        verbose_name_plural = "Chamados na Plataforma"

    def __str__(self):
        return self.numero

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone
            ano = timezone.now().year
            ultimo = ChamadoPlataforma.objects.filter(numero__startswith=f'CHM-{ano}').count()
            self.numero = f'CHM-{ano}-{str(ultimo + 1).zfill(4)}'
        super().save(*args, **kwargs)


class ChatChamado(models.Model):
    chamado = models.ForeignKey(ChamadoPlataforma, on_delete=models.CASCADE, related_name='mensagens')
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    mensagem = models.TextField()
    anexos = models.JSONField(default=list, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Chat do Chamado"
        verbose_name_plural = "Chats dos Chamados"
        ordering = ['criado_em']


class SLAChamado(models.Model):
    STATUS = [('no_prazo', 'No Prazo'), ('alerta', 'Alerta'), ('vencido', 'Vencido')]

    chamado = models.OneToOneField(ChamadoPlataforma, on_delete=models.CASCADE, related_name='sla')
    prazo_resposta = models.DateTimeField()
    prazo_atendimento = models.DateTimeField()
    prazo_conclusao = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS, default='no_prazo')
    multa_percentual = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        verbose_name = "SLA do Chamado"
        verbose_name_plural = "SLAs dos Chamados"


class LogAuditoria(models.Model):
    ACOES = [
        ('criou', 'Criou'), ('editou', 'Editou'), ('aprovou', 'Aprovou'),
        ('reprovou', 'Reprovou'), ('deletou', 'Deletou'),
    ]

    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.SET_NULL)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    acao = models.CharField(max_length=20, choices=ACOES)
    objeto_tipo = models.CharField(max_length=100)
    objeto_id = models.IntegerField(null=True, blank=True)
    valores_antes = models.JSONField(null=True, blank=True)
    valores_depois = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de Auditoria SaaS"
        verbose_name_plural = "Logs de Auditoria SaaS"
        ordering = ['-timestamp']


class NotificacaoSaaS(models.Model):
    TIPOS = [
        ('chamado_aberto', 'Chamado Aberto'), ('sla_alerta', 'Alerta SLA'),
        ('aprovacao_pendente', 'Aprovação Pendente'), ('orcamento_aprovado', 'Orçamento Aprovado'),
        ('orcamento_recusado', 'Orçamento Recusado'), ('chamado_concluido', 'Chamado Concluído'),
    ]

    tenant = models.ForeignKey(Tenant, null=True, blank=True, on_delete=models.SET_NULL)
    usuario_destinatario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=50, choices=TIPOS)
    titulo = models.CharField(max_length=200)
    mensagem = models.TextField()
    objeto_link = models.CharField(max_length=300, blank=True)
    canais = models.JSONField(default=list)
    enviada = models.BooleanField(default=False)
    lida_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Notificação SaaS"
        verbose_name_plural = "Notificações SaaS"
        ordering = ['-criado_em']
