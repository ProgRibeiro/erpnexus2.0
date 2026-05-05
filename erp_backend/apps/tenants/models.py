from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class Client(TenantMixin):
    """Representa uma empresa cliente do SaaS (ERP ou Facilities)"""
    TIPO_PRODUTO = [
        ('erp', 'ERP Nexus (Prestador)'),
        ('facilities', 'Facilities Platform (Contratante)'),
        ('ambos', 'ERP + Facilities'),
    ]
    PLANO = [
        ('basico', 'Básico'),
        ('profissional', 'Profissional'),
        ('enterprise', 'Enterprise'),
    ]
    STATUS = [
        ('trial', 'Trial'),
        ('ativo', 'Ativo'),
        ('suspenso', 'Suspenso'),
        ('cancelado', 'Cancelado'),
    ]

    nome = models.CharField(max_length=200)
    razao_social = models.CharField(max_length=300, blank=True)
    cnpj = models.CharField(max_length=18, blank=True)
    tipo_produto = models.CharField(max_length=20, choices=TIPO_PRODUTO, default='erp')
    plano = models.CharField(max_length=20, choices=PLANO, default='basico')
    status = models.CharField(max_length=20, choices=STATUS, default='trial')
    email_admin = models.EmailField(blank=True)
    telefone = models.CharField(max_length=20, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    # Para aparecer no diretório público (prestadores ERP)
    # Facilities pode consultar este diretório para encontrar prestadores
    visivel_no_diretorio = models.BooleanField(default=False)
    especialidades = models.JSONField(default=list, blank=True)  # ["hvac","eletrica","civil"]
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)
    descricao_servicos = models.TextField(blank=True)

    auto_create_schema = True  # django-tenants cria o schema automaticamente

    def __str__(self):
        return f"{self.nome} ({self.schema_name})"

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'


class Domain(DomainMixin):
    """Mapeia domínio/subdomínio para o tenant"""
    pass
