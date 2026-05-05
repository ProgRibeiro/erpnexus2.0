from django.core.management.base import BaseCommand
from apps.tenants.models import Client, Domain


class Command(BaseCommand):
    help = 'Provisiona uma nova empresa no sistema (cria schema PostgreSQL isolado)'

    def add_arguments(self, parser):
        parser.add_argument('--nome', required=True, help='Nome da empresa')
        parser.add_argument('--schema', required=True, help='Nome do schema PostgreSQL (sem espaços)')
        parser.add_argument('--dominio', required=True, help='Subdomínio (ex: empresa1.localhost)')
        parser.add_argument('--tipo', default='erp', choices=['erp', 'facilities', 'ambos'])
        parser.add_argument('--plano', default='basico', choices=['basico', 'profissional', 'enterprise'])
        parser.add_argument('--email', default='')
        parser.add_argument('--cnpj', default='')

    def handle(self, *args, **options):
        schema = options['schema'].lower().replace('-', '_').replace(' ', '_')

        if Client.objects.filter(schema_name=schema).exists():
            self.stdout.write(self.style.WARNING(f'Schema "{schema}" já existe.'))
            return

        tenant = Client(
            schema_name=schema,
            nome=options['nome'],
            cnpj=options['cnpj'],
            tipo_produto=options['tipo'],
            plano=options['plano'],
            email_admin=options['email'],
            status='trial',
        )
        tenant.save()  # Cria o schema automaticamente

        Domain.objects.create(
            domain=options['dominio'],
            tenant=tenant,
            is_primary=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'[OK] Tenant "{options["nome"]}" criado!\n'
            f'   Schema: {schema}\n'
            f'   Dominio: {options["dominio"]}\n'
            f'   Tipo: {options["tipo"]}\n'
            f'   Plano: {options["plano"]}\n'
            f'\n'
            f'Acesse via: http://{options["dominio"]}:8000/\n'
            f'Para criar admin: python manage.py tenant_command createsuperuser --schema={schema}'
        ))
