from django.core.management.base import BaseCommand
from apps.tenants.models import Client, Domain


class Command(BaseCommand):
    help = 'Cria o tenant público (schema public) necessário para django-tenants'

    def handle(self, *args, **kwargs):
        if Client.objects.filter(schema_name='public').exists():
            self.stdout.write('Tenant público já existe.')
            return

        tenant = Client(
            schema_name='public',
            nome='ERP Nexus Platform',
            tipo_produto='ambos',
            plano='enterprise',
            status='ativo',
        )
        tenant.save(verbosity=0)

        Domain.objects.get_or_create(
            domain='localhost',
            tenant=tenant,
            defaults={'is_primary': True}
        )
        Domain.objects.get_or_create(
            domain='127.0.0.1',
            tenant=tenant,
            defaults={'is_primary': False}
        )

        self.stdout.write(self.style.SUCCESS('[OK] Tenant publico criado (localhost -> schema public)'))
