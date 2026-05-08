import os
import shutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Gera backup local do banco PostgreSQL e dos arquivos de media do ERP Nexus."

    def add_arguments(self, parser):
        parser.add_argument(
            "--saida",
            default=os.environ.get("ERP_BACKUP_DIR", r"C:\ERP_BACKUPS\ERP_NEXUS"),
            help="Pasta onde os backups serão salvos.",
        )
        parser.add_argument(
            "--retencao-dias",
            type=int,
            default=int(os.environ.get("ERP_BACKUP_RETENTION_DAYS", "30")),
            help="Quantidade de dias para manter backups antigos.",
        )
        parser.add_argument(
            "--sem-media",
            action="store_true",
            help="Gera apenas backup do banco, sem compactar a pasta media.",
        )

    def handle(self, *args, **options):
        backup_dir = Path(options["saida"])
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        db_config = settings.DATABASES["default"]
        db_name = db_config["NAME"]

        pg_dump = self._find_postgres_tool("pg_dump.exe")
        if not pg_dump:
            raise CommandError(
                "pg_dump.exe não encontrado. Instale o PostgreSQL client ou adicione "
                r"C:\Program Files\PostgreSQL\18\bin ao PATH."
            )

        dump_path = backup_dir / f"{db_name}_{timestamp}.dump"
        manifest_path = backup_dir / f"{db_name}_{timestamp}_manifest.txt"

        env = os.environ.copy()
        env["PGPASSWORD"] = str(db_config.get("PASSWORD", ""))

        command = [
            str(pg_dump),
            "--format=custom",
            "--blobs",
            "--no-owner",
            "--no-acl",
            "--host",
            str(db_config.get("HOST", "localhost")),
            "--port",
            str(db_config.get("PORT", "5432")),
            "--username",
            str(db_config.get("USER", "postgres")),
            "--file",
            str(dump_path),
            db_name,
        ]

        self.stdout.write("Gerando backup do banco PostgreSQL...")
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            raise CommandError(result.stderr.strip() or "Falha ao executar pg_dump.")

        media_zip = None
        if not options["sem_media"]:
            media_root = Path(settings.MEDIA_ROOT)
            if media_root.exists():
                media_zip_base = backup_dir / f"media_{timestamp}"
                media_zip = shutil.make_archive(str(media_zip_base), "zip", media_root)
                self.stdout.write(f"Backup de media gerado: {media_zip}")
            else:
                self.stdout.write("Pasta media não existe; backup de arquivos ignorado.")

        self._write_manifest(manifest_path, dump_path, media_zip, db_config, options)
        removed = self._remove_old_backups(backup_dir, options["retencao_dias"])

        self.stdout.write(self.style.SUCCESS(f"Backup do banco gerado: {dump_path}"))
        self.stdout.write(self.style.SUCCESS(f"Manifesto gerado: {manifest_path}"))
        if removed:
            self.stdout.write(f"Backups antigos removidos pela retenção: {removed}")

    def _write_manifest(self, manifest_path, dump_path, media_zip, db_config, options):
        lines = [
            "ERP Nexus - Manifesto de Backup",
            f"Gerado em: {datetime.now().isoformat(timespec='seconds')}",
            f"Banco: {db_config.get('NAME')}",
            f"Host: {db_config.get('HOST')}:{db_config.get('PORT')}",
            f"Usuario: {db_config.get('USER')}",
            f"Arquivo banco: {dump_path}",
            f"Arquivo media: {media_zip or 'não gerado'}",
            f"Retenção dias: {options['retencao_dias']}",
            "",
            "Restauração:",
            "python manage.py restaurar_backup --arquivo \"CAMINHO_DO_DUMP\" --confirmar",
        ]
        manifest_path.write_text("\n".join(lines), encoding="utf-8")

    def _remove_old_backups(self, backup_dir, retention_days):
        if retention_days <= 0:
            return 0

        cutoff = datetime.now() - timedelta(days=retention_days)
        removed = 0
        for path in backup_dir.iterdir():
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".dump", ".zip", ".txt"}:
                continue
            modified = datetime.fromtimestamp(path.stat().st_mtime)
            if modified < cutoff:
                path.unlink()
                removed += 1
        return removed

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
