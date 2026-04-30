from django.apps import AppConfig


class OrdensConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ordens"
    verbose_name = "Ordens de Servico"

    def ready(self):
        import apps.ordens.signals  # noqa
