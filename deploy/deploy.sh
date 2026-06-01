#!/bin/bash
# ============================================
# ERP Nexus - Deploy Script
# Execute após cada git pull
# ============================================

set -e

PROJECT_DIR="/opt/erpnexus"
BACKEND_DIR="$PROJECT_DIR/erp_backend"
FRONTEND_DIR="$PROJECT_DIR/erp_frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔════════════════════════════════════════════╗"
echo "║  ERP Nexus - Deploy                        ║"
echo "╚════════════════════════════════════════════╝"
echo ""

echo -e "${YELLOW}🔄 Entrando em $PROJECT_DIR...${NC}"
cd "$PROJECT_DIR"

echo -e "${YELLOW}🔄 Compilando Frontend...${NC}"
cd "$FRONTEND_DIR"
npm ci --legacy-peer-deps
npm run build

echo -e "${YELLOW}🔄 Atualizando Backend...${NC}"
cd "$BACKEND_DIR"
source .venv/bin/activate

pip install -r requirements.txt

echo -e "${YELLOW}🗄️  Executando migrações...${NC}"
python manage.py migrate --noinput
python manage.py migrate_schemas --noinput

echo -e "${YELLOW}📦 Coletando arquivos estáticos...${NC}"
python manage.py collectstatic --noinput

echo -e "${YELLOW}🔄 Reiniciando serviços...${NC}"
sudo systemctl restart gunicorn || true
sudo systemctl restart celery || true
sudo systemctl restart celery-beat || true

# Valida nginx antes de reiniciar
echo -e "${YELLOW}✓ Validando Nginx...${NC}"
sudo nginx -t && sudo systemctl reload nginx || true

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ✅ Deploy Completo!                       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}Comandos úteis:${NC}"
echo "sudo systemctl status gunicorn"
echo "sudo systemctl status celery"
echo "sudo journalctl -u gunicorn -f"
echo "sudo journalctl -u celery -f"
echo ""
