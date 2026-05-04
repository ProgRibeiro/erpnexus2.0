from django.apps import AppConfig


class LojaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.loja"
    verbose_name = "Loja"

    def ready(self):
        from . import signals  # noqa: F401
