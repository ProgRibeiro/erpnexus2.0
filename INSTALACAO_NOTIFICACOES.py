"""
Guia de instalação e configuração do módulo de notificações.
"""

# PASSO 1: INSTALAR DEPENDÊNCIAS
# ================================
# O módulo já usa bibliotecas que já estão no requirements.txt:
# - celery (para tarefas assíncronas)
# - redis (para fila de tarefas)
# - django (para email nativo)
#
# Nenhuma dependência adicional obrigatória!
#
# OPCIONAL:
# - Para melhor suporte a HTML: pip install premailer
# - Para envio em massa: pip install django-anymail

# PASSO 2: CRIAR MIGRATION
# ========================
# cd erp_backend
# python manage.py makemigrations notificacoes
# python manage.py migrate

# PASSO 3: CONFIGURAR VARIÁVEIS DE AMBIENTE
# ===========================================
# Editar .env:

"""
# SMTP Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-app-especifica
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=seu-email@gmail.com

# Emails administrativos
ADMIN_EMAIL=admin@sua-empresa.com
FINANCEIRO_EMAIL=financeiro@sua-empresa.com
ESTOQUE_EMAIL=estoque@sua-empresa.com

# WhatsApp (ESCOLHA UM DOS DOIS)

# Opção 1: CallMeBot (mais simples)
WHATSAPP_PROVEDOR=callmebot
CALLMEBOT_APIKEY=sua-api-key-aqui

# Opção 2: Z-API (mais robusto)
# WHATSAPP_PROVEDOR=zapi
# ZAPI_INSTANCIA=sua-instancia-id
# ZAPI_TOKEN=seu-token-aqui

# URL Base para links nos emails
BASE_URL=https://seu-dominio.com
REDIS_URL=redis://localhost:6379/0
"""

# PASSO 4: CONFIGURAR GMAIL (se usar)
# ===================================
# 1. Ativar 2FA em sua conta Google
# 2. Gerar "Senha de Aplicativo" em:
#    https://myaccount.google.com/apppasswords
# 3. Copiar a senha gerada para EMAIL_HOST_PASSWORD

# PASSO 5: INICIALIZAR
# ====================
# python init_notificacoes.py

# PASSO 6: INICIAR CELERY
# =======================
# Opção A - Separado (produção):
# Terminal 1: celery -A config beat -l info
# Terminal 2: celery -A config worker -l info

# Opção B - Junto (desenvolvimento):
# celery -A config worker -B -l info

# PASSO 7: TESTAR
# ===============
# Via Admin: http://localhost:8000/admin/notificacoes/
# Via API: POST /api/v1/notificacoes/logs/testar_notificacao/

print("Instalação completa! Para começar:")
print("1. Editar .env com suas configurações")
print("2. python manage.py migrate")
print("3. python init_notificacoes.py")
print("4. Iniciar Celery (veja PASSO 6)")
print("5. Testar via admin ou API")
