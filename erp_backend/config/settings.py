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
    SECURE_SSL_REDIRECT=(bool, False),
    SESSION_COOKIE_SECURE=(bool, False),
    CSRF_COOKIE_SECURE=(bool, False),
    SECURE_HSTS_SECONDS=(int, 0),
    ERP_BACKUP_RETENTION_DAYS=(int, 30),
)

environ.Env.read_env(BASE_DIR.parent / ".env")
environ.Env.read_env(BASE_DIR / ".env", overwrite=True)

SECRET_KEY = env("SECRET_KEY", default=env("DJANGO_SECRET_KEY", default="unsafe-default-key-local-dev"))
DEBUG = env.bool("DEBUG", default=env("DJANGO_DEBUG", default=True))
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0", ".localhost"])

SHARED_APPS = [
    'django_tenants',
    'apps.tenants',  # DEVE ser o primeiro app compartilhado
    'django.contrib.contenttypes',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'storages',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'apps.usuarios',  # requerido no public por admin e FKs dos módulos SaaS
    'apps.saas',  # planos, diretório, licitações — ficam no public schema
    'apps.master_admin',  # painel master do proprietário do SaaS
]

TENANT_APPS = [
    'django.contrib.contenttypes',
    'apps.usuarios',
    'apps.clientes',
    'apps.ordens',
    'apps.financeiro',
    'apps.crm',
    'apps.estoque',
    'apps.relatorios',
    'apps.notificacoes',
    'apps.portal',
    'apps.configuracoes',
    'apps.fiscal',
    'apps.fiscal_rules',
    'apps.fiscal_calculator',
    'apps.fiscal_emission',
    'apps.fiscal_obligations',
    'apps.importacao',
    'apps.auditoria',
    'apps.terceiros',
    'apps.loja',
    'apps.facilities',
    'apps.contratos',
    'apps.portal_contratante',
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = 'tenants.Client'
TENANT_DOMAIN_MODEL = 'tenants.Domain'

MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',  # DEVE SER O PRIMEIRO
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.saas.middleware.AuditoriaSaaSMiddleware",  # Auditoria automática Facilities
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
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": env("DB_NAME", default="erp_db"),
        "USER": env("DB_USER", default="postgres"),
        "PASSWORD": env("DB_PASSWORD", default="73882768"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }
}
DATABASE_ROUTERS = ('django_tenants.routers.TenantSyncRouter',)

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
STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"
WHITENOISE_USE_FINDERS = DEBUG
WHITENOISE_MAX_AGE = 31536000 if not DEBUG else 0

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
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Em dev permite tudo
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://.*\.localhost(:\d+)?$",
    r"^http://localhost(:\d+)?$",
    r"^http://127\.0\.0\.1(:\d+)?$",
]

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
SECURE_REFERRER_POLICY = "same-origin"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT")
SESSION_COOKIE_SECURE = env("SESSION_COOKIE_SECURE")
CSRF_COOKIE_SECURE = env("CSRF_COOKIE_SECURE")
SECURE_HSTS_SECONDS = env("SECURE_HSTS_SECONDS")
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
DATA_UPLOAD_MAX_MEMORY_SIZE = env.int("DATA_UPLOAD_MAX_MEMORY_SIZE", default=10 * 1024 * 1024)
FILE_UPLOAD_MAX_MEMORY_SIZE = env.int("FILE_UPLOAD_MAX_MEMORY_SIZE", default=10 * 1024 * 1024)

# Backups locais do PostgreSQL e uploads
ERP_BACKUP_DIR = env("ERP_BACKUP_DIR", default=r"C:\ERP_BACKUPS\ERP_NEXUS")
ERP_BACKUP_RETENTION_DAYS = env.int("ERP_BACKUP_RETENTION_DAYS", default=30)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env("ACCESS_TOKEN_LIFETIME_MINUTES")
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("REFRESH_TOKEN_LIFETIME_DAYS")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
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

# ─── Master Admin ─────────────────────────────────────────────────────────────
# Credenciais do painel master (somente o proprietário tem acesso)
MASTER_ADMIN_EMAIL = env("MASTER_ADMIN_EMAIL", default="admin@admin.com")
MASTER_ADMIN_PASSWORD = env("MASTER_ADMIN_PASSWORD", default="admin123")
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
    # Tarefa a cada 5 min: Verificar SLAs de chamados da plataforma Facilities
    "verificar_slas": {
        "task": "apps.saas.tasks.verificar_slas",
        "schedule": timedelta(seconds=300),
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
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env("EMAIL_USE_SSL", default=False)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default=EMAIL_HOST_USER or "admin@example.com")
SERVER_EMAIL = env("SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)

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
        "schedule": timedelta(seconds=10),
    },
    # Verificar SLAs de chamados da plataforma SaaS (a cada 5 min)
    "verificar-slas": {
        "task": "apps.saas.tasks.verificar_slas",
        "schedule": timedelta(seconds=300),
    },
    # Processar mensagens do Outbox SaaS (a cada 30 segundos)
    "processar-outbox-saas": {
        "task": "apps.saas.tasks.processar_outbox_periodico",
        "schedule": 30.0,
    },
    # Reconciliar propostas SaaS (a cada 15 minutos)
    "reconciliar-propostas-saas": {
        "task": "apps.saas.tasks.reconciliar_propostas",
        "schedule": crontab(minute='*/15'),
    },
    # Contratos de preventiva: faturas recorrentes
    "gerar-faturas-contratos-preventiva": {
        "task": "apps.contratos.tasks.gerar_faturas_mensais",
        "schedule": crontab(day_of_month=1, hour=8, minute=0),
    },
    # Contratos de preventiva: alertas de visitas próximas
    "alertar-os-proximas-contratos": {
        "task": "apps.contratos.tasks.alertar_os_proximas",
        "schedule": crontab(hour=8, minute=0),
    },
    # Contratos de preventiva: reajuste anual
    "reajustar-contratos-preventiva": {
        "task": "apps.contratos.tasks.reajustar_contratos_anuais",
        "schedule": crontab(day_of_month=1, hour=7, minute=30),
    },
}
