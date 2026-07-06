#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERRO: execute com sudo/root."
  exit 1
fi

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="$APP_DIR/erp_backend/.env"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Uso: sudo APP_DIR=/caminho/erp bash scripts/linux/restaurar_backup_criptografado.sh /var/backups/erp-nexus/arquivo.tar.gz.enc"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERRO: arquivo $ENV_FILE nao encontrado."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PASSPHRASE="${ERP_BACKUP_ENCRYPTION_PASSPHRASE:-}"
if [[ -z "$PASSPHRASE" ]]; then
  echo "ERRO: ERP_BACKUP_ENCRYPTION_PASSPHRASE nao definido no .env."
  exit 1
fi

echo "ATENCAO: esta restauracao substitui o banco ${DB_NAME} e a pasta media atual."
read -r -p "Digite RESTAURAR para continuar: " confirmation
if [[ "$confirmation" != "RESTAURAR" ]]; then
  echo "Cancelado."
  exit 1
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -in "$BACKUP_FILE" \
  -out "$workdir/backup.tar.gz" \
  -pass "pass:$PASSPHRASE"

tar -C "$workdir" -xzf "$workdir/backup.tar.gz"

systemctl stop erp-nexus-celerybeat erp-nexus-celery erp-nexus || true

export PGPASSWORD="$DB_PASSWORD"
pg_restore \
  --host="${DB_HOST:-127.0.0.1}" \
  --port="${DB_PORT:-5432}" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  "$workdir/erp_db.dump"

if [[ -f "$workdir/media.tar.gz" ]]; then
  rm -rf "$APP_DIR/erp_backend/media"
  mkdir -p "$APP_DIR/erp_backend/media"
  tar -C "$APP_DIR/erp_backend" -xzf "$workdir/media.tar.gz"
  chown -R "${APP_USER:-erpnexus}:${APP_USER:-erpnexus}" "$APP_DIR/erp_backend/media" || true
fi

systemctl start erp-nexus erp-nexus-celery erp-nexus-celerybeat

echo "Restauracao concluida."
