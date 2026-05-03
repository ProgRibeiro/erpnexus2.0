from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    ACCESS_TOKEN_LIFETIME_MINUTES=(int, 60),
    REFRESH_TOKEN_LIFETIME_DAYS=(int, 7),
    EMAIL_PORT=(int, 587),
    EMAIL_USE_TLS=(bool, True),
    EMAIL_USE_SSL=(bool, False),
    USE_S3=(bool, False),
    AWS_QUERYSTRING_AUTH=(bool, False),
)

environ.Env.read_env(BASE_DIR.parent / ".env")
environ.Env.read_env(BASE_DIR / ".env", overwrite=True)

SECRET_KEY = env("SECRET_KEY", default=env("DJANGO_SECRET_KEY", default="unsafe-default-key-local-dev"))
DEBUG = env.bool("DEBUG", default=env("DJANGO_DEBUG", default=True))
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "storages",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "apps.usuarios",
    "apps.clientes",
    "apps.ordens",
    "apps.financeiro",
    "apps.crm",
    "apps.estoque",
    "apps.relatorios",
    "apps.notificacoes",
    "apps.portal",
    "apps.configuracoes",
    "apps.fiscal",
    "apps.importacao",
    "apps.auditoria",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates", BASE_DIR / "frontend_dist"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="erp_db"),
        "USER": env("DB_USER", default="postgres"),
        "PASSWORD": env("DB_PASSWORD", default="73882768"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "usuarios.Usuario"

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "frontend_dist"]

MEDIA_URL = env("MEDIA_URL", default="/media/")
MEDIA_ROOT = BASE_DIR / env("MEDIA_ROOT", default="media")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env.list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)
CSRF_TRUSTED_ORIGINS = env.list(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)
CORS_ALLOW_CREDENTIALS = True

AUTHENTICATION_BACKENDS = [
    "apps.usuarios.backends.EmailOrUsernameBackend",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",
        "user": "200/minute",
    },
}

# Cabeçalhos de segurança HTTP
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env("ACCESS_TOKEN_LIFETIME_MINUTES")
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("REFRESH_TOKEN_LIFETIME_DAYS")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend"
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="contato@example.com")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.example.com")
EMAIL_PORT = env("EMAIL_PORT")
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env("EMAIL_USE_TLS")
EMAIL_USE_SSL = env("EMAIL_USE_SSL")

CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
AUTO_GERAR_PDF_AO_FATURAR = env.bool("AUTO_GERAR_PDF_AO_FATURAR", default=False)

# Configuração de agendamento de tarefas Celery Beat
CELERY_BEAT_SCHEDULE = {
    # Tarefa diária: Varrer lançamentos vencidos e marcar como atrasados
    "atualizar_lancamentos_vencidos": {
        "task": "financeiro.atualizar_lancamentos_vencidos",
        "schedule": timedelta(days=1),
        "options": {"queue": "default"},
    },
    # Tarefa diária: Notificar financeiro sobre atrasos
    "notificar_financeiro_atrasos": {
        "task": "financeiro.notificar_financeiro_atrasos",
        "schedule": timedelta(days=1),
        "options": {"queue": "default"},
    },
    # Tarefa diária: Recalcular saldo de todas as contas (previne inconsistências)
    "recalcular_saldo_todas_contas": {
        "task": "financeiro.recalcular_saldo_todas_contas",
        "schedule": timedelta(days=1),
        "options": {"queue": "default"},
    },
}

USE_S3 = env("USE_S3")
if USE_S3:
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="")
    AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default="")
    AWS_DEFAULT_ACL = env("AWS_DEFAULT_ACL", default=None)
    AWS_QUERYSTRING_AUTH = env("AWS_QUERYSTRING_AUTH")
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
else:
    DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "WARNING",
        },
    },
    "loggers": {
        "apps.usuarios": {
            "handlers": ["console"],
            "level": "WARNING",
        },
    },
}

# ======================== CONFIGURAÇÕES DE NOTIFICAÇÕES ========================

# URLs base para links nos emails
BASE_URL = env("BASE_URL", default="http://localhost:5173")

# Configurações de Email SMTP
# Exemplo com Gmail: https://support.google.com/mail/answer/185833
# EMAIL_HOST = "smtp.gmail.com"
# EMAIL_PORT = 587
# EMAIL_HOST_USER = "seu-email@gmail.com"
# EMAIL_HOST_PASSWORD = "sua-senha-app"
# EMAIL_USE_TLS = True

# Configurações de WhatsApp (escolha um provedor)
# WHATSAPP_PROVEDOR = "callmebot"  # ou "zapi"
# CALLMEBOT_APIKEY = "sua-chave-api-callmebot"  # Para CallMeBot
# ZAPI_INSTANCIA = "sua-instancia"  # Para Z-API
# ZAPI_TOKEN = "seu-token"  # Para Z-API

# Emails administrativos
ADMIN_EMAIL = env("ADMIN_EMAIL", default="admin@example.com")
FINANCEIRO_EMAIL = env("FINANCEIRO_EMAIL", default="financeiro@example.com")
ESTOQUE_EMAIL = env("ESTOQUE_EMAIL", default="estoque@example.com")

# ======================== CONFIGURAÇÕES DE CELERY BEAT ========================

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Lembrança de OS agendadas para amanhã (diariamente às 18h)
    "lembranca-agendamento-diaria": {
        "task": "apps.notificacoes.tasks.enviar_lembranca_agendamento",
        "schedule": crontab(hour=18, minute=0),
    },
    # Notificação de pagamentos atrasados (diariamente às 09h)
    "notificar-pagamentos-atrasados": {
        "task": "apps.notificacoes.tasks.enviar_notificacao_pagamentos_atrasados",
        "schedule": crontab(hour=9, minute=0),
    },
    # Notificação de estoque baixo (toda segunda-feira às 08h)
    "notificar-estoque-baixo": {
        "task": "apps.notificacoes.tasks.enviar_notificacao_estoque_baixo",
        "schedule": crontab(day_of_week=1, hour=8, minute=0),
    },
    # Reenviar notificações falhadas (a cada 30 minutos)
    "reenviar-notificacoes-falhadas": {
        "task": "apps.notificacoes.tasks.reenviar_notificacoes_falhadas",
        "schedule": timedelta(minutes=30),
    },
    # Inicializar sistema de notificações (uma vez ao iniciar)
    "inicializar-notificacoes": {
        "task": "apps.notificacoes.tasks.inicializar_sistema_notificacoes",
        "schedule": timedelta(seconds=10),  # Executa 10 segundos após iniciar
    },
}

