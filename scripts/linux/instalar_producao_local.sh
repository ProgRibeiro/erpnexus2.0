#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERRO: execute com sudo/root."
  echo "Exemplo: sudo ERP_DOMAIN=erp.seudominio.com bash scripts/linux/instalar_producao_local.sh"
  exit 1
fi

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
APP_USER="${APP_USER:-erpnexus}"
APP_NAME="erp-nexus"
DOMAIN="${ERP_DOMAIN:-localhost}"
DB_NAME="${DB_NAME:-erp_nexus}"
DB_USER="${DB_USER:-erp_nexus}"
ADMIN_EMAIL="${LINUX_ADMIN_EMAIL:-admin@erp.local}"
BACKUP_DIR="${ERP_BACKUP_DIR:-/var/backups/erp-nexus}"
STATE_DIR="/var/lib/erp-nexus"
CREDS_FILE="/root/erp-nexus-credenciais-iniciais.txt"
USE_HTTPS="${ERP_ENABLE_HTTPS:-auto}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

rand_secret() {
  openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 48
}

escape_sed() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

write_template() {
  local source="$1"
  local target="$2"
  sed \
    -e "s/__APP_USER__/$(escape_sed "$APP_USER")/g" \
    -e "s/__APP_DIR__/$(escape_sed "$APP_DIR")/g" \
    -e "s/__BACKUP_DIR__/$(escape_sed "$BACKUP_DIR")/g" \
    -e "s/__DOMAIN__/$(escape_sed "$DOMAIN")/g" \
    "$source" > "$target"
}

require_ubuntu_like() {
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "ERRO: este instalador automatizado suporta sistemas Debian/Ubuntu com apt-get."
    exit 1
  fi
}

install_node20_if_needed() {
  local major=0
  if command -v node >/dev/null 2>&1; then
    major="$(node -v | sed 's/^v//' | cut -d. -f1)"
  fi
  if [[ "$major" -ge 18 ]]; then
    return
  fi
  echo "Instalando Node.js 20 LTS via NodeSource..."
  apt-get install -y ca-certificates curl gnupg
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
}

configure_postgresql() {
  local db_password="$1"
  echo "Configurando PostgreSQL local com SCRAM-SHA-256..."
  systemctl enable --now postgresql

  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
SELECT pg_reload_conf();
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${db_password}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${db_password}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

  local hba_file
  hba_file="$(sudo -u postgres psql -tAc "SHOW hba_file;" | xargs)"
  if [[ -n "$hba_file" && -f "$hba_file" ]] && ! grep -q "ERP_NEXUS_SCRAM" "$hba_file"; then
    cp "$hba_file" "${hba_file}.bak.$(date +%Y%m%d%H%M%S)"
    local tmp_file
    tmp_file="$(mktemp)"
    {
      echo "# ERP_NEXUS_SCRAM"
      echo "host ${DB_NAME} ${DB_USER} 127.0.0.1/32 scram-sha-256"
      echo "host ${DB_NAME} ${DB_USER} ::1/128 scram-sha-256"
      cat "$hba_file"
    } > "$tmp_file"
    cat "$tmp_file" > "$hba_file"
    rm -f "$tmp_file"
    systemctl restart postgresql
  fi
}

configure_redis() {
  local redis_password="$1"
  echo "Configurando Redis local protegido..."
  systemctl enable --now redis-server
  cp /etc/redis/redis.conf "/etc/redis/redis.conf.bak.$(date +%Y%m%d%H%M%S)"
  sed -i "s/^# *requirepass .*/requirepass ${redis_password}/" /etc/redis/redis.conf
  if ! grep -q "^requirepass " /etc/redis/redis.conf; then
    echo "requirepass ${redis_password}" >> /etc/redis/redis.conf
  fi
  sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
  sed -i 's/^protected-mode .*/protected-mode yes/' /etc/redis/redis.conf
  systemctl restart redis-server
}

write_env_file() {
  local secret_key="$1"
  local db_password="$2"
  local redis_password="$3"
  local admin_password="$4"
  local backup_passphrase="$5"
  local env_file="$APP_DIR/erp_backend/.env"
  local scheme="http"
  local secure_ssl="False"
  local hsts="0"
  local hsts_subdomains="False"

  if [[ "$USE_HTTPS" == "true" || ( "$USE_HTTPS" == "auto" && "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ) ]]; then
    scheme="https"
    secure_ssl="True"
    hsts="31536000"
    hsts_subdomains="True"
  fi

  cat > "$env_file" <<ENV
DEBUG=False
SECRET_KEY=${secret_key}
ERP_DOMAIN=${DOMAIN}
BASE_URL=${scheme}://${DOMAIN}
DJANGO_ALLOWED_HOSTS=${DOMAIN},localhost,127.0.0.1
DJANGO_CORS_ALLOWED_ORIGINS=${scheme}://${DOMAIN}
DJANGO_CSRF_TRUSTED_ORIGINS=${scheme}://${DOMAIN}

DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${db_password}
DB_HOST=127.0.0.1
DB_PORT=5432

REDIS_PASSWORD=${redis_password}
REDIS_URL=redis://:${redis_password}@127.0.0.1:6379/0

SECURE_SSL_REDIRECT=${secure_ssl}
SESSION_COOKIE_SECURE=${secure_ssl}
CSRF_COOKIE_SECURE=${secure_ssl}
SECURE_HSTS_SECONDS=${hsts}
SECURE_HSTS_INCLUDE_SUBDOMAINS=${hsts_subdomains}
SECURE_HSTS_PRELOAD=False

ACCESS_TOKEN_LIFETIME_MINUTES=30
REFRESH_TOKEN_LIFETIME_DAYS=7

MEDIA_URL=/media/
MEDIA_ROOT=media
ERP_BACKUP_DIR=${BACKUP_DIR}
ERP_BACKUP_RETENTION_DAYS=30
ERP_BACKUP_ENCRYPTION_PASSPHRASE=${backup_passphrase}

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=
ADMIN_EMAIL=${ADMIN_EMAIL}
FINANCEIRO_EMAIL=${ADMIN_EMAIL}
ESTOQUE_EMAIL=${ADMIN_EMAIL}

LINUX_ADMIN_EMAIL=${ADMIN_EMAIL}
LINUX_ADMIN_PASSWORD=${admin_password}
MASTER_ADMIN_EMAIL=${ADMIN_EMAIL}
MASTER_ADMIN_PASSWORD=${admin_password}
ENV
  chown "$APP_USER:$APP_USER" "$env_file"
  chmod 600 "$env_file"
}

create_initial_admin() {
  local admin_password="$1"
  echo "Criando/atualizando admin inicial com senha forte..."
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_backend' && LINUX_ADMIN_EMAIL='${ADMIN_EMAIL}' LINUX_ADMIN_PASSWORD='${admin_password}' '$APP_DIR/.venv/bin/python' manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model

User = get_user_model()
email = os.environ.get('LINUX_ADMIN_EMAIL', '${ADMIN_EMAIL}')
password = os.environ.get('LINUX_ADMIN_PASSWORD')
if not password:
    raise SystemExit('LINUX_ADMIN_PASSWORD ausente')
user, _ = User.objects.get_or_create(
    email=email,
    defaults={
        'username': email.split('@')[0].lower(),
        'first_name': 'Admin',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': True,
        'is_active': True,
    },
)
user.is_staff = True
user.is_superuser = True
user.is_active = True
user.role = 'admin'
user.set_password(password)
user.save()
print(f'Admin inicial pronto: {email}')
PY"
}

main() {
  require_ubuntu_like

  if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" && -z "$CERTBOT_EMAIL" && "${ERP_ALLOW_HTTP:-false}" != "true" ]]; then
    echo "ERRO: para dominio publico, informe CERTBOT_EMAIL para HTTPS automatico."
    echo "Exemplo: sudo ERP_DOMAIN=erp.seudominio.com CERTBOT_EMAIL=voce@email.com bash scripts/linux/instalar_producao_local.sh"
    echo "Se ja existe proxy TLS externo, use ERP_ALLOW_HTTP=true conscientemente."
    exit 1
  fi

  local db_password redis_password secret_key admin_password backup_passphrase
  db_password="$(rand_secret)"
  redis_password="$(rand_secret)"
  secret_key="$(openssl rand -hex 48)"
  admin_password="$(rand_secret)"
  backup_passphrase="$(openssl rand -base64 64 | tr -d '\n')"

  echo "[1/13] Instalando pacotes do sistema"
  apt-get update
  apt-get install -y \
    build-essential ca-certificates curl git nginx openssl ufw \
    postgresql postgresql-contrib redis-server \
    python3 python3-venv python3-dev libpq-dev \
    gettext-base
  if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" && -n "$CERTBOT_EMAIL" ]]; then
    apt-get install -y certbot python3-certbot-nginx
    USE_HTTPS="true"
  elif [[ "${ERP_ALLOW_HTTP:-false}" == "true" ]]; then
    USE_HTTPS="false"
  fi
  install_node20_if_needed

  echo "[2/13] Criando usuario de servico"
  if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "/var/lib/${APP_NAME}" --shell /usr/sbin/nologin "$APP_USER"
  fi
  mkdir -p "$STATE_DIR" "$BACKUP_DIR"
  chown -R "$APP_USER:$APP_USER" "$STATE_DIR" "$BACKUP_DIR" "$APP_DIR"
  chmod 700 "$BACKUP_DIR"

  echo "[3/13] PostgreSQL"
  configure_postgresql "$db_password"

  echo "[4/13] Redis"
  configure_redis "$redis_password"

  echo "[5/13] Arquivo .env seguro"
  write_env_file "$secret_key" "$db_password" "$redis_password" "$admin_password" "$backup_passphrase"

  echo "[6/13] Python virtualenv"
  sudo -u "$APP_USER" python3 -m venv "$APP_DIR/.venv"
  sudo -u "$APP_USER" "$APP_DIR/.venv/bin/python" -m pip install --upgrade pip wheel
  sudo -u "$APP_USER" "$APP_DIR/.venv/bin/python" -m pip install -r "$APP_DIR/erp_backend/requirements.txt"

  echo "[7/13] Frontend"
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_frontend' && npm ci && npm run build"

  echo "[8/13] Django migrations e staticfiles"
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_backend' && '$APP_DIR/.venv/bin/python' manage.py check"
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_backend' && '$APP_DIR/.venv/bin/python' manage.py migrate_schemas --shared --noinput"
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_backend' && '$APP_DIR/.venv/bin/python' manage.py migrate_schemas --tenant --noinput"
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_backend' && '$APP_DIR/.venv/bin/python' manage.py collectstatic --noinput"

  echo "[9/13] Tenant local seguro"
  if [[ "$DOMAIN" == "localhost" || "$DOMAIN" == "127.0.0.1" ]]; then
    sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_backend' && '$APP_DIR/.venv/bin/python' manage.py configurar_ambiente_local"
  else
    sudo -u "$APP_USER" bash -lc "cd '$APP_DIR/erp_backend' && '$APP_DIR/.venv/bin/python' manage.py criar_tenant --nome 'ERP Nexus' --schema demo_erp --dominio '$DOMAIN' --tipo ambos --plano enterprise --email '$ADMIN_EMAIL' || true"
  fi
  create_initial_admin "$admin_password"

  echo "[10/13] systemd"
  write_template "$APP_DIR/deploy/linux/erp-nexus.service.template" /etc/systemd/system/erp-nexus.service
  write_template "$APP_DIR/deploy/linux/erp-nexus-celery.service.template" /etc/systemd/system/erp-nexus-celery.service
  write_template "$APP_DIR/deploy/linux/erp-nexus-celerybeat.service.template" /etc/systemd/system/erp-nexus-celerybeat.service
  systemctl daemon-reload
  systemctl enable --now erp-nexus erp-nexus-celery erp-nexus-celerybeat

  echo "[11/13] Nginx"
  write_template "$APP_DIR/deploy/linux/nginx-erp-nexus.conf.template" "/etc/nginx/sites-available/${APP_NAME}"
  ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
  if [[ "$USE_HTTPS" == "true" ]]; then
    certbot --nginx --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL" -d "$DOMAIN"
    systemctl reload nginx
  fi

  echo "[12/13] Firewall"
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable

  echo "[13/13] Backup criptografado diario"
  install -m 0750 -o "$APP_USER" -g "$APP_USER" "$APP_DIR/scripts/linux/backup_criptografado.sh" /usr/local/bin/erp-nexus-backup
  cat > /etc/cron.d/erp-nexus-backup <<CRON
SHELL=/bin/bash
15 2 * * * root APP_DIR=${APP_DIR} /usr/local/bin/erp-nexus-backup >/var/log/erp-nexus-backup.log 2>&1
CRON
  chmod 644 /etc/cron.d/erp-nexus-backup

  cat > "$CREDS_FILE" <<CREDS
ERP Nexus - credenciais iniciais Linux
Dominio: ${DOMAIN}
URL: $(grep '^BASE_URL=' "$APP_DIR/erp_backend/.env" | cut -d= -f2-)
Admin email: ${ADMIN_EMAIL}
Admin senha inicial: ${admin_password}
DB_NAME: ${DB_NAME}
DB_USER: ${DB_USER}
DB_PASSWORD: ${db_password}
Redis password: ${redis_password}
Backup passphrase: ${backup_passphrase}

IMPORTANTE:
- Guarde este arquivo em cofre de senhas e apague do servidor depois.
- O banco aceita conexao da aplicacao somente via loopback.
- Nginx e a unica camada HTTP exposta pelo firewall.
CREDS
  chmod 600 "$CREDS_FILE"

  echo
  echo "Instalacao concluida."
  echo "URL: $(grep '^BASE_URL=' "$APP_DIR/erp_backend/.env" | cut -d= -f2-)"
  echo "Credenciais iniciais salvas em: $CREDS_FILE"
  echo "Execute: sudo bash $APP_DIR/scripts/linux/verificar_linux.sh"
}

main "$@"
