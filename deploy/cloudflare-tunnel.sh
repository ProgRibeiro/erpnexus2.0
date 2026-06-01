#!/bin/bash
# ============================================
# ERP Nexus - Cloudflare Tunnel Setup
# Configure Cloudflare Tunnel para expor app
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Cloudflare Tunnel Setup               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}✗ cloudflared não está instalado${NC}"
    echo "Execute primeiro: sudo bash deploy/setup-server.sh"
    exit 1
fi

echo -e "${YELLOW}1️⃣  Faça login no Cloudflare...${NC}"
echo "Isso abrirá seu browser para autenticar. Após o login, volte aqui."
echo ""

cloudflared tunnel login

TUNNEL_NAME="erpnexus"
DOMAIN=$(grep "DJANGO_ALLOWED_HOSTS=" /opt/erpnexus/erp_backend/.env | cut -d= -f2 | awk '{print $1}')

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}✗ Não consegui encontrar o domínio em .env${NC}"
    echo "Configure DJANGO_ALLOWED_HOSTS em /opt/erpnexus/erp_backend/.env primeiro"
    exit 1
fi

echo ""
echo -e "${YELLOW}2️⃣  Criando tunnel '$TUNNEL_NAME'...${NC}"

# Criar tunnel
cloudflared tunnel create "$TUNNEL_NAME" || true

# Esperar um pouco
sleep 2

echo ""
echo -e "${YELLOW}3️⃣  Configurando DNS do tunnel para: $DOMAIN${NC}"

# Configurar DNS (rotear domínio para o tunnel)
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || true

echo ""
echo -e "${YELLOW}4️⃣  Criando arquivo de configuração do tunnel...${NC}"

# Criar config.yml do tunnel
CONFIG_FILE="$HOME/.cloudflared/config.yml"

cat > "$CONFIG_FILE" << EOF
# Cloudflare Tunnel config para ERP Nexus
tunnel: $TUNNEL_NAME
credentials-file: $HOME/.cloudflared/${TUNNEL_NAME}.json

ingress:
  # API e Static files
  - hostname: $DOMAIN
    service: http://localhost:80

  # Admin Django (protegido por autenticação)
  - hostname: admin.$DOMAIN
    service: http://localhost:80

  # Fallback
  - service: http_status:404

# Retentar conexão
retries: 5
grace-period: 15s
EOF

echo -e "${GREEN}✓ Config criado em: $CONFIG_FILE${NC}"

echo ""
echo -e "${YELLOW}5️⃣  Testando tunnel...${NC}"

# Testar tunnel
timeout 10 cloudflared tunnel run "$TUNNEL_NAME" || true

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Tunnel Configurado!               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Próximos passos:${NC}"
echo ""
echo "1️⃣  Habilitar o tunnel como serviço (background):"
echo "   sudo cloudflared service install"
echo "   sudo systemctl start cloudflared"
echo "   sudo systemctl enable cloudflared"
echo ""
echo "2️⃣  Verificar status:"
echo "   sudo systemctl status cloudflared"
echo ""
echo "3️⃣  Ver logs em tempo real:"
echo "   sudo journalctl -u cloudflared -f"
echo ""
echo "4️⃣  Testar acesso:"
echo "   curl https://$DOMAIN/health"
echo ""
