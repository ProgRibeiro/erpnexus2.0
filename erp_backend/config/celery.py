import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("erp_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'verificar-slas-5min': {
        'task': 'apps.saas.tasks.verificar_slas',
        'schedule': 300.0,
    },
}
