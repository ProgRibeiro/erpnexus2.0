#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DOMAIN="${ERP_DOMAIN:-localhost}"

echo "[1/7] Verificando arquivos sensiveis"
test -f "$APP_DIR/erp_backend/.env"
perm="$(stat -c '%a' "$APP_DIR/erp_backend/.env")"
if [[ "$perm" != "600" ]]; then
  echo "ERRO: erp_backend/.env deve estar com permissao 600. Atual: $perm"
  exit 1
fi

echo "[2/7] Django check"
"$APP_DIR/.venv/bin/python" "$APP_DIR/erp_backend/manage.py" check

echo "[3/7] Django deploy check"
"$APP_DIR/.venv/bin/python" "$APP_DIR/erp_backend/manage.py" check --deploy || true

echo "[4/7] Servicos systemd"
systemctl is-active --quiet erp-nexus
systemctl is-active --quiet erp-nexus-celery
systemctl is-active --quiet erp-nexus-celerybeat

echo "[5/7] Portas locais"
ss -lntp | grep -E ':(80|443|5432|6379)\b' || true

echo "[6/7] Firewall"
ufw status verbose || true

echo "[7/7] HTTP local"
curl -fsS "http://127.0.0.1/api/v1/health/" >/dev/null || curl -fsS "http://$DOMAIN/api/v1/health/" >/dev/null

echo "OK: verificacao Linux concluida."
