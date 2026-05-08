import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Audita configuração local de segurança, backup e exposição de rede do ERP Nexus."

    def add_arguments(self, parser):
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Retorna erro se houver alertas críticos.",
        )

    def handle(self, *args, **options):
        checks = []
        checks.extend(self._django_checks())
        checks.extend(self._backup_checks())
        checks.extend(self._windows_task_checks())
        checks.extend(self._firewall_checks())

        critical = 0
        warning = 0

        self.stdout.write("")
        self.stdout.write("Auditoria de segurança do ERP Nexus")
        self.stdout.write("=" * 42)

        for level, title, detail in checks:
            if level == "OK":
                style = self.style.SUCCESS
            elif level == "AVISO":
                style = self.style.WARNING
                warning += 1
            else:
                style = self.style.ERROR
                critical += 1

            self.stdout.write(style(f"[{level}] {title}"))
            if detail:
                self.stdout.write(f"      {detail}")

        self.stdout.write("")
        self.stdout.write(f"Resumo: {critical} crítico(s), {warning} aviso(s).")

        if options["strict"] and critical:
            raise SystemExit(1)

    def _django_checks(self):
        checks = []

        if settings.DEBUG:
            checks.append(("AVISO", "DEBUG está ativo", "Ok para teste local. Não use assim exposto na rede/internet."))
        else:
            checks.append(("OK", "DEBUG desativado", "Configuração adequada para uso real."))

        unsafe_keys = {"unsafe-default-key-local-dev", "django-insecure"}
        secret = str(settings.SECRET_KEY)
        if any(marker in secret for marker in unsafe_keys) or len(secret) < 32:
            checks.append(("CRITICO", "SECRET_KEY fraca ou padrão", "Defina uma SECRET_KEY forte no erp_backend/.env."))
        else:
            checks.append(("OK", "SECRET_KEY configurada", "Chave não parece ser padrão."))

        broad_hosts = {"*", "0.0.0.0"}
        allowed_hosts = set(settings.ALLOWED_HOSTS)
        if allowed_hosts.intersection(broad_hosts):
            checks.append(("AVISO", "ALLOWED_HOSTS amplo", f"Hosts atuais: {', '.join(settings.ALLOWED_HOSTS)}"))
        else:
            checks.append(("OK", "ALLOWED_HOSTS restrito", f"Hosts atuais: {', '.join(settings.ALLOWED_HOSTS)}"))

        if getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False):
            checks.append(("AVISO", "CORS aberto em DEBUG", "Ok em desenvolvimento; desative para uso real."))
        else:
            checks.append(("OK", "CORS restrito", "CORS_ALLOW_ALL_ORIGINS=False."))

        if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION") is True:
            checks.append(("OK", "JWT refresh protegido", "Blacklist ativada após rotação."))
        else:
            checks.append(("AVISO", "JWT refresh sem blacklist", "Ative BLACKLIST_AFTER_ROTATION."))

        if getattr(settings, "SESSION_COOKIE_HTTPONLY", False):
            checks.append(("OK", "Cookies HttpOnly", "Sessão protegida contra leitura via JavaScript."))
        else:
            checks.append(("AVISO", "Cookies sem HttpOnly", "Ative SESSION_COOKIE_HTTPONLY."))

        return checks

    def _backup_checks(self):
        backup_dir = Path(getattr(settings, "ERP_BACKUP_DIR", r"C:\ERP_BACKUPS\ERP_NEXUS"))
        if not backup_dir.exists():
            return [("CRITICO", "Pasta de backup inexistente", str(backup_dir))]

        dumps = sorted(backup_dir.glob("*.dump"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not dumps:
            return [("CRITICO", "Nenhum backup .dump encontrado", str(backup_dir))]

        latest = dumps[0]
        modified = datetime.fromtimestamp(latest.stat().st_mtime)
        age = datetime.now() - modified
        if age > timedelta(days=2):
            return [("AVISO", "Backup mais recente está antigo", f"{latest.name} gerado em {modified:%d/%m/%Y %H:%M}")]

        return [("OK", "Backup recente encontrado", f"{latest.name} gerado em {modified:%d/%m/%Y %H:%M}")]

    def _windows_task_checks(self):
        if os.name != "nt":
            return [("AVISO", "Agendador Windows não verificado", "Sistema operacional não é Windows.")]

        result = subprocess.run(
            ["schtasks", "/Query", "/TN", "ERP Nexus Backup Diario"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return [("OK", "Backup diário agendado", "Tarefa: ERP Nexus Backup Diario.")]
        return [("CRITICO", "Backup diário não agendado", "Execute agendar_backup_diario.bat.")]

    def _firewall_checks(self):
        if os.name != "nt":
            return [("AVISO", "Firewall Windows não verificado", "Sistema operacional não é Windows.")]

        result = subprocess.run(
            ["netsh", "advfirewall", "firewall", "show", "rule", "name=ERP Nexus Bloquear Acesso Externo"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0 and "ERP Nexus Bloquear Acesso Externo" in result.stdout:
            return [("OK", "Firewall bloqueando acesso externo", "Regra ativa para portas locais do ERP.")]
        return [("AVISO", "Firewall sem regra do ERP", "Execute bloquear_acesso_externo.bat para bloquear acesso externo.")]
