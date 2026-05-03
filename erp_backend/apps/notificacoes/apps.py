from django.apps import AppConfig


class NotificacoesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notificacoes"
    verbose_name = "Notificacoes"

    def ready(self):
        """Importa signals ao iniciar a aplicação."""
        import apps.notificacoes.signals  # noqa
