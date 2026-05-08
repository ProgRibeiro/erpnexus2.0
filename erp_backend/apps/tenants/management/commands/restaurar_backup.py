import os
import shutil
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Restaura um backup .dump do PostgreSQL. Exige --confirmar para evitar perda acidental."

    def add_arguments(self, parser):
        parser.add_argument("--arquivo", required=True, help="Caminho do arquivo .dump gerado pelo backup_sistema.")
        parser.add_argument(
            "--confirmar",
            action="store_true",
            help="Confirma que o banco atual pode ser sobrescrito.",
        )

    def handle(self, *args, **options):
        if not options["confirmar"]:
            raise CommandError(
                "Restauração bloqueada. Rode novamente com --confirmar apenas se "
                "tiver certeza, pois os dados atuais podem ser sobrescritos."
            )

        dump_path = Path(options["arquivo"])
        if not dump_path.exists():
            raise CommandError(f"Arquivo não encontrado: {dump_path}")

        pg_restore = self._find_postgres_tool("pg_restore.exe")
        if not pg_restore:
            raise CommandError(
                "pg_restore.exe não encontrado. Instale o PostgreSQL client ou adicione "
                r"C:\Program Files\PostgreSQL\18\bin ao PATH."
            )

        db_config = settings.DATABASES["default"]
        env = os.environ.copy()
        env["PGPASSWORD"] = str(db_config.get("PASSWORD", ""))

        command = [
            str(pg_restore),
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-acl",
            "--host",
            str(db_config.get("HOST", "localhost")),
            "--port",
            str(db_config.get("PORT", "5432")),
            "--username",
            str(db_config.get("USER", "postgres")),
            "--dbname",
            str(db_config.get("NAME")),
            str(dump_path),
        ]

        self.stdout.write(f"Restaurando backup: {dump_path}")
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            raise CommandError(result.stderr.strip() or "Falha ao executar pg_restore.")

        self.stdout.write(self.style.SUCCESS("Backup restaurado com sucesso."))

    def _find_postgres_tool(self, executable):
        found = shutil.which(executable)
        if found:
            return Path(found)

        candidates = [
            Path(r"C:\Program Files\PostgreSQL\18\bin") / executable,
            Path(r"C:\Program Files\PostgreSQL\17\bin") / executable,
            Path(r"C:\Program Files\PostgreSQL\16\bin") / executable,
            Path(r"C:\Program Files\PostgreSQL\15\bin") / executable,
            Path(r"C:\Program Files\PostgreSQL\14\bin") / executable,
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return None
