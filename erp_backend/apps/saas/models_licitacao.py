import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from .models import Tenant, Unidade

class Licitacao(models.Model):
    STATUS_CHOICES = [
        ('rascunho', 'Rascunho'),
        ('publicada', 'Publicada'),
        ('em_analise', 'Em Análise'),
        ('encerrada', 'Encerrada'),
        ('cancelada', 'Cancelada'),
    ]

    TIPO_JULGAMENTO = [
        ('menor_preco', 'Menor Preço'),
        ('melhor_tecnica', 'Melhor Técnica'),
        ('tecnica_preco', 'Técnica e Preço'),
    ]

    numero = models.CharField(max_length=50, unique=True, editable=False)
    tenant_contratante = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='licitacoes_abertas')
    unidade = models.ForeignKey(Unidade, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    tipo_servico = models.CharField(max_length=100) # Simplificado para CharField como sugerido, ou FK se preferir
    valor_maximo = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    prazo_execucao_max_dias = models.IntegerField()
    data_abertura = models.DateTimeField(default=timezone.now)
    data_encerramento = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='rascunho')
    prestadores_convidados = models.ManyToManyField(Tenant, related_name='convites_licitacao', blank=True)
    tipo_julgamento = models.CharField(max_length=20, choices=TIPO_JULGAMENTO, default='menor_preco')
    documentos_anexos = models.JSONField(default=list, blank=True)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.numero:
            ano = timezone.now().year
            ultimo = Licitacao.objects.filter(numero__startswith=f'LIC-{ano}').count()
            self.numero = f'LIC-{ano}-{str(ultimo + 1).zfill(4)}'
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Licitação"
        verbose_name_plural = "Licitações"

class PropostaLicitacao(models.Model):
    STATUS_CHOICES = [
        ('rascunho', 'Rascunho'),
        ('enviando', 'Enviando'),
        ('recebida', 'Recebida'),
        ('em_analise', 'Em Análise'),
        ('aprovada', 'Aprovada'),
        ('recusada', 'Recusada'),
        ('cancelada', 'Cancelada'),
    ]

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    licitacao = models.ForeignKey(Licitacao, on_delete=models.CASCADE, related_name='propostas')
    tenant_prestador = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='propostas_enviadas')
    numero_proposta = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='rascunho')
    valor_total = models.DecimalField(max_digits=14, decimal_places=2)
    prazo_execucao_dias = models.IntegerField()
    condicao_pagamento = models.CharField(max_length=200)
    validade_proposta = models.DateField()
    observacoes = models.TextField(blank=True)
    diferencial_competitivo = models.TextField(blank=True)
    enviada_em = models.DateTimeField(null=True, blank=True)
    analisada_em = models.DateTimeField(null=True, blank=True)
    decidida_em = models.DateTimeField(null=True, blank=True)
    motivo_recusa = models.TextField(blank=True)
    pontuacao_tecnica = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ranking_final = models.IntegerField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    versao = models.IntegerField(default=1) # Controle otimista

    class Meta:
        unique_together = [['licitacao', 'tenant_prestador']]
        verbose_name = "Proposta de Licitação"
        verbose_name_plural = "Propostas de Licitação"

class ItemProposta(models.Model):
    proposta = models.ForeignKey(PropostaLicitacao, on_delete=models.CASCADE, related_name='itens')
    descricao = models.CharField(max_length=300)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    unidade = models.CharField(max_length=20)
    valor_unitario = models.DecimalField(max_digits=14, decimal_places=2)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2)
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem']

class EventoLicitacao(models.Model):
    licitacao = models.ForeignKey(Licitacao, on_delete=models.CASCADE, related_name='eventos')
    proposta = models.ForeignKey(PropostaLicitacao, on_delete=models.SET_NULL, null=True, blank=True)
    tipo_evento = models.CharField(max_length=100)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    ip_origem = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    detalhes = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

class OutboxMessage(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('processando', 'Processando'),
        ('processado', 'Processado'),
        ('falhou', 'Falhou'),
    ]

    aggregate_type = models.CharField(max_length=50) # Licitacao, Proposta
    aggregate_id = models.UUIDField()
    event_type = models.CharField(max_length=100) # proposta.enviada, licitacao.encerrada
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    tentativas = models.IntegerField(default=0)
    proxima_tentativa = models.DateTimeField()
    erro_ultimo = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    processado_em = models.DateTimeField(null=True, blank=True)
