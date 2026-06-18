from django.contrib import admin

from .models import CategoriaProduto, MovimentacaoEstoque, Produto, AlertaEstoque, ReferenciaPrecoPublico, Servico


class ProdutoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nome", "categoria", "estoque_minimo", "preco_venda", "ativo"]
    list_filter = ["ativo", "categoria", "unidade_medida", "criado_em"]
    search_fields = ["codigo", "nome", "descricao"]
    readonly_fields = ["codigo", "criado_em"]
    fieldsets = (
        ("Informações Básicas", {
            "fields": ("codigo", "nome", "descricao", "categoria", "ativo")
        }),
        ("Medidas e Localização", {
            "fields": ("unidade_medida", "localizacao")
        }),
        ("Preços", {
            "fields": ("preco_custo", "preco_venda")
        }),
        ("Controle de Estoque", {
            "fields": ("estoque_minimo",)
        }),
        ("Auditoria", {
            "fields": ("criado_em",)
        }),
    )


class MovimentacaoEstoqueAdmin(admin.ModelAdmin):
    list_display = ["id", "produto", "tipo", "quantidade", "motivo", "data_movimentacao", "realizado_por"]
    list_filter = ["tipo", "motivo", "data_movimentacao", "realizado_por"]
    search_fields = ["produto__nome", "produto__codigo", "fornecedor", "numero_nota"]
    readonly_fields = ["data_movimentacao"]
    fieldsets = (
        ("Produto", {
            "fields": ("produto", "quantidade", "valor_unitario", "tipo")
        }),
        ("Detalhes", {
            "fields": ("motivo", "os", "fornecedor", "numero_nota", "observacoes")
        }),
        ("Auditoria", {
            "fields": ("realizado_por", "data_movimentacao")
        }),
    )


class AlertaEstoqueAdmin(admin.ModelAdmin):
    list_display = ["id", "produto", "tipo", "lido", "criado_em", "resolvido_em"]
    list_filter = ["tipo", "lido", "criado_em"]
    search_fields = ["produto__nome", "descricao"]
    readonly_fields = ["criado_em"]


class CategoriaProdutoAdmin(admin.ModelAdmin):
    list_display = ["nome", "ativo", "criado_em"]
    list_filter = ["ativo", "criado_em"]
    search_fields = ["nome", "descricao"]
    readonly_fields = ["criado_em"]


class ServicoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nome", "categoria", "preco_padrao", "tributacao", "ativo"]
    list_filter = ["ativo", "categoria", "tributacao", "criado_em"]
    search_fields = ["codigo", "nome", "descricao"]
    readonly_fields = ["codigo", "criado_em"]


class ReferenciaPrecoPublicoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "descricao", "disciplina", "tipo_item", "valor_mediano", "fonte", "confianca", "ativo"]
    list_filter = ["ativo", "disciplina", "tipo_item", "fonte", "uf"]
    search_fields = ["codigo", "descricao", "codigo_fonte", "observacoes"]
    readonly_fields = ["criado_em", "atualizado_em"]


admin.site.register(CategoriaProduto, CategoriaProdutoAdmin)
admin.site.register(Produto, ProdutoAdmin)
admin.site.register(MovimentacaoEstoque, MovimentacaoEstoqueAdmin)
admin.site.register(AlertaEstoque, AlertaEstoqueAdmin)
admin.site.register(Servico, ServicoAdmin)
admin.site.register(ReferenciaPrecoPublico, ReferenciaPrecoPublicoAdmin)
