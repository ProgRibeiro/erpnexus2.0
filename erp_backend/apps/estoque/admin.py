from django.contrib import admin

from .models import CategoriaProduto, MovimentacaoEstoque, Produto

admin.site.register(CategoriaProduto)
admin.site.register(Produto)
admin.site.register(MovimentacaoEstoque)
