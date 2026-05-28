from django.core.management.base import BaseCommand

from apps.tenants.models import Client, Domain


class Command(BaseCommand):
    help = "Configura domínios locais para o ERP abrir direto no tenant de demonstração."

    def handle(self, *args, **options):
        public, _ = Client.objects.get_or_create(
            schema_name="public",
            defaults={
                "nome": "ERP Nexus Platform",
                "tipo_produto": "ambos",
                "plano": "enterprise",
                "status": "ativo",
            },
        )
        demo, _ = Client.objects.get_or_create(
            schema_name="demo_erp",
            defaults={
                "nome": "ERP Nexus Demo",
                "tipo_produto": "ambos",
                "plano": "enterprise",
                "status": "ativo",
            },
        )
        facilities = Client.objects.filter(schema_name="demo_facilities").first()

        dominios = [
            ("localhost", demo, True),
            ("127.0.0.1", demo, False),
            ("demo.localhost", demo, True),
            ("public.localhost", public, True),
        ]
        if facilities is not None:
            dominios.append(("facilities.localhost", facilities, True))

        for domain, tenant, is_primary in dominios:
            Domain.objects.update_or_create(
                domain=domain,
                defaults={"tenant": tenant, "is_primary": is_primary},
            )
            self.stdout.write(self.style.SUCCESS(f"{domain} -> {tenant.schema_name}"))

        self.stdout.write(self.style.SUCCESS("Ambiente local configurado. Login padrão: admin@admin.com / admin123"))
