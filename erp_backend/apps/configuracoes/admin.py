from django.contrib import admin

from .models import ConfiguracaoEmpresa, ConfiguracaoNotificacao

admin.site.register(ConfiguracaoEmpresa)
admin.site.register(ConfiguracaoNotificacao)
