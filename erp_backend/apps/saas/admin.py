from django.contrib import admin
from .models import (
    PlanoSaaS, Tenant, Empresa, Unidade, ContratoSaaS, CentroCusto,
    CategoriaBudget, BudgetAnual, BudgetMensal, NivelAprovacao, AprovadorAlcada,
    SolicitacaoAprovacao, PrestadorContratado, ChamadoPlataforma, ChatChamado,
    SLAChamado, LogAuditoria, NotificacaoSaaS,
)


@admin.register(PlanoSaaS)
class PlanoSaaSAdmin(admin.ModelAdmin):
    list_display = ['nome', 'valor_mensal', 'limite_usuarios', 'limite_unidades', 'ativo']
    list_filter = ['ativo']


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['nome', 'cnpj', 'tipo', 'plano', 'status', 'ativo', 'criado_em']
    list_filter = ['tipo', 'plano', 'status', 'ativo']
    search_fields = ['nome', 'cnpj']


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tenant', 'tipo', 'nivel_hierarquia', 'ativo']
    list_filter = ['tipo', 'ativo']
    search_fields = ['nome', 'cnpj']


@admin.register(Unidade)
class UnidadeAdmin(admin.ModelAdmin):
    list_display = ['codigo_interno', 'nome', 'empresa', 'tipo', 'cidade', 'estado', 'ativo']
    list_filter = ['tipo', 'estado', 'ativo']
    search_fields = ['nome', 'codigo_interno', 'cidade']


@admin.register(ContratoSaaS)
class ContratoSaaSAdmin(admin.ModelAdmin):
    list_display = ['numero', 'tenant', 'inicio', 'fim', 'valor_mensal', 'status']
    list_filter = ['status']


@admin.register(CentroCusto)
class CentroCustoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'descricao', 'empresa', 'ativo']
    list_filter = ['ativo']
    search_fields = ['codigo', 'descricao']


@admin.register(CategoriaBudget)
class CategoriaBudgetAdmin(admin.ModelAdmin):
    list_display = ['nome', 'cor_hex', 'ativo']


@admin.register(BudgetAnual)
class BudgetAnualAdmin(admin.ModelAdmin):
    list_display = ['empresa', 'ano', 'valor_total_aprovado', 'status']
    list_filter = ['status', 'ano']


@admin.register(BudgetMensal)
class BudgetMensalAdmin(admin.ModelAdmin):
    list_display = ['budget_anual', 'categoria', 'mes', 'valor_previsto', 'valor_realizado']


@admin.register(NivelAprovacao)
class NivelAprovacaoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tenant', 'valor_minimo', 'valor_maximo', 'ordem', 'requer_3_cotacoes']
    list_filter = ['requer_3_cotacoes']


@admin.register(AprovadorAlcada)
class AprovadorAlcadaAdmin(admin.ModelAdmin):
    list_display = ['nivel', 'usuario', 'empresa', 'ativo']
    list_filter = ['ativo']


@admin.register(SolicitacaoAprovacao)
class SolicitacaoAprovacaoAdmin(admin.ModelAdmin):
    list_display = ['objeto_tipo', 'objeto_id', 'valor', 'status', 'data_solicitacao']
    list_filter = ['status', 'objeto_tipo']


@admin.register(PrestadorContratado)
class PrestadorContratadoAdmin(admin.ModelAdmin):
    list_display = ['tenant_contratante', 'tenant_prestador', 'sla_atendimento_horas', 'ativo']
    list_filter = ['ativo']


@admin.register(ChamadoPlataforma)
class ChamadoPlataformaAdmin(admin.ModelAdmin):
    list_display = ['numero', 'unidade', 'tipo_servico', 'prioridade', 'status', 'abertura']
    list_filter = ['status', 'prioridade']
    search_fields = ['numero', 'tipo_servico']


@admin.register(ChatChamado)
class ChatChamadoAdmin(admin.ModelAdmin):
    list_display = ['chamado', 'usuario', 'criado_em']


@admin.register(SLAChamado)
class SLAChamadoAdmin(admin.ModelAdmin):
    list_display = ['chamado', 'prazo_conclusao', 'status', 'multa_percentual']
    list_filter = ['status']


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'usuario', 'acao', 'objeto_tipo', 'timestamp']
    list_filter = ['acao', 'objeto_tipo']
    readonly_fields = ['timestamp']


@admin.register(NotificacaoSaaS)
class NotificacaoSaaSAdmin(admin.ModelAdmin):
    list_display = ['usuario_destinatario', 'tipo', 'titulo', 'enviada', 'criado_em']
    list_filter = ['tipo', 'enviada']
