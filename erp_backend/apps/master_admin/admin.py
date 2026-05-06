from django.contrib import admin
from .models import PlanoCatalogo, ClienteSaaS, AssinaturaSaaS, PagamentoMensalidade, LogAcessoMaster

admin.site.register(PlanoCatalogo)
admin.site.register(ClienteSaaS)
admin.site.register(AssinaturaSaaS)
admin.site.register(PagamentoMensalidade)
admin.site.register(LogAcessoMaster)
