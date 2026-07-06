#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="$APP_DIR/erp_backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERRO: arquivo $ENV_FILE nao encontrado."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BACKUP_DIR="${ERP_BACKUP_DIR:-/var/backups/erp-nexus}"
RETENTION_DAYS="${ERP_BACKUP_RETENTION_DAYS:-30}"
PASSPHRASE="${ERP_BACKUP_ENCRYPTION_PASSPHRASE:-}"

if [[ -z "$PASSPHRASE" ]]; then
  echo "ERRO: ERP_BACKUP_ENCRYPTION_PASSPHRASE nao definido."
  exit 1
fi

timestamp="$(date +%Y%m%d_%H%M%S)"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

export PGPASSWORD="$DB_PASSWORD"
pg_dump --host="${DB_HOST:-127.0.0.1}" --port="${DB_PORT:-5432}" --username="$DB_USER" --format=custom --file="$workdir/erp_db.dump" "$DB_NAME"

if [[ -d "$APP_DIR/erp_backend/media" ]]; then
  tar -C "$APP_DIR/erp_backend" -czf "$workdir/media.tar.gz" media
else
  tar -C "$workdir" -czf "$workdir/media.tar.gz" --files-from /dev/null
fi

cat > "$workdir/manifesto.txt" <<MANIFEST
ERP Nexus backup
Data: $(date -Iseconds)
Banco: $DB_NAME
Host: ${DB_HOST:-127.0.0.1}
Restauracao banco:
  pg_restore --clean --if-exists --no-owner --dbname=$DB_NAME erp_db.dump
MANIFEST

tar -C "$workdir" -czf "$workdir/erp_nexus_${timestamp}.tar.gz" erp_db.dump media.tar.gz manifesto.txt
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 \
  -in "$workdir/erp_nexus_${timestamp}.tar.gz" \
  -out "$BACKUP_DIR/erp_nexus_${timestamp}.tar.gz.enc" \
  -pass "pass:$PASSPHRASE"

chmod 600 "$BACKUP_DIR/erp_nexus_${timestamp}.tar.gz.enc"
find "$BACKUP_DIR" -name 'erp_nexus_*.tar.gz.enc' -type f -mtime "+$RETENTION_DAYS" -delete

echo "Backup criptografado criado: $BACKUP_DIR/erp_nexus_${timestamp}.tar.gz.enc"
