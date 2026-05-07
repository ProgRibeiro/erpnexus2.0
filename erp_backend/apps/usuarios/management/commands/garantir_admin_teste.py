from django.core.management.base import BaseCommand
from django.db import connection
from django_tenants.utils import schema_context

from apps.tenants.models import Client
from apps.usuarios.models import Usuario


ADMIN_EMAIL = "admin@admin.com"
ADMIN_PASSWORD = "admin123"


class Command(BaseCommand):
    help = "Garante o admin padrão do ambiente local de teste em todos os tenants."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema",
            action="append",
            dest="schemas",
            help="Schema tenant específico. Pode ser usado mais de uma vez.",
        )

    def handle(self, *args, **options):
        schemas = options.get("schemas") or list(Client.objects.exclude(schema_name="public").values_list("schema_name", flat=True))

        if not schemas:
            self.stdout.write(self.style.WARNING("Nenhum tenant encontrado para validar."))
            return

        for schema in schemas:
            with schema_context(schema):
                if "usuarios_usuario" not in connection.introspection.table_names():
                    self.stdout.write(self.style.WARNING(f"{schema}: tabela usuarios_usuario não existe."))
                    continue

                usuario, criado = Usuario.objects.get_or_create(
                    email=ADMIN_EMAIL,
                    defaults={
                        "username": "admin",
                        "first_name": "Admin",
                        "last_name": "Teste",
                        "role": Usuario.Role.ADMIN,
                        "status": Usuario.Status.ATIVO,
                        "is_staff": True,
                        "is_superuser": True,
                        "is_active": True,
                        "modulo": Usuario.Modulo.AMBOS,
                    },
                )

                usuario.username = "admin"
                usuario.first_name = usuario.first_name or "Admin"
                usuario.last_name = usuario.last_name or "Teste"
                usuario.role = Usuario.Role.ADMIN
                usuario.status = Usuario.Status.ATIVO
                usuario.is_staff = True
                usuario.is_superuser = True
                usuario.is_active = True
                usuario.modulo = Usuario.Modulo.AMBOS
                usuario.set_password(ADMIN_PASSWORD)
                usuario.save()

                acao = "criado" if criado else "atualizado"
                self.stdout.write(self.style.SUCCESS(f"{schema}: admin de teste {acao} ({ADMIN_EMAIL} / {ADMIN_PASSWORD})"))
