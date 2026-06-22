from .settings import *  # noqa: F403


DEBUG = False

# A suíte unitária usa um único schema temporário. Em execução normal, a
# separação SHARED_APPS/TENANT_APPS de settings.py continua inalterada.
SHARED_APPS = list(INSTALLED_APPS)  # noqa: F405
# django-tenants exige ao menos um app nessa lista durante a inicialização;
# migrations de teste continuam restritas ao schema público por SHARED_APPS.
TENANT_APPS = ["apps.usuarios"]
MIDDLEWARE = [
    middleware
    for middleware in MIDDLEWARE  # noqa: F405
    if middleware != "django_tenants.middleware.main.TenantMainMiddleware"
]

DATABASES["default"]["TEST"] = {"NAME": "test_erp_nexus"}  # noqa: F405
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
WHITENOISE_USE_FINDERS = True
