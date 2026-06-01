#!/bin/bash
# ============================================
# ERP Nexus - Setup Server Linux (Ubuntu/Debian)
# Execute uma única vez em servidor zerado
# ============================================

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  ERP Nexus - Setup Server (Linux)          ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗ Este script deve ser executado como root (use: sudo bash setup-server.sh)${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Atualizando repositórios...${NC}"
apt-get update && apt-get upgrade -y

echo -e "${YELLOW}📦 Instalando dependências do sistema...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    htop \
    net-tools \
    ufw \
    fail2ban \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    postgresql \
    postgresql-contrib \
    libpq-dev \
    redis-server \
    nginx \
    nodejs \
    npm

echo -e "${YELLOW}🔗 Instalando cloudflared...${NC}"
mkdir -p --mode=0755 /usr/share/keyrings
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | \
    tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/linux `lsb_release -cs` main" | \
    tee /etc/apt/sources.list.d/cloudflare-main.list
apt-get update && apt-get install -y cloudflared

echo -e "${YELLOW}👤 Criando usuário 'erp'...${NC}"
if ! id "erp" &>/dev/null; then
    useradd -m -s /bin/bash -d /opt/erpnexus erp
    echo -e "${GREEN}✓ Usuário 'erp' criado${NC}"
else
    echo -e "${GREEN}✓ Usuário 'erp' já existe${NC}"
fi

echo -e "${YELLOW}📁 Criando diretórios...${NC}"
mkdir -p /opt/erpnexus/backups
mkdir -p /opt/erpnexus/logs
chown -R erp:erp /opt/erpnexus
chmod -R 755 /opt/erpnexus

echo -e "${YELLOW}🔒 Configurando PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

echo -e "${YELLOW}💾 Configurando Redis...${NC}"
systemctl start redis-server
systemctl enable redis-server

echo -e "${YELLOW}🔥 Configurando Firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP (para Cloudflare Tunnel)
ufw allow 443/tcp       # HTTPS (se direto, sem Cloudflare)
ufw --force enable

echo -e "${YELLOW}🛡️  Configurando Fail2Ban...${NC}"
systemctl start fail2ban
systemctl enable fail2ban

echo -e "${YELLOW}🌐 Configurando Nginx...${NC}"
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx
# A config do nginx será colocada depois do clone do repo

echo -e "${YELLOW}📦 Atualizando npm globalmente...${NC}"
npm install -g n
n 20
npm install -g npm

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ✅ Setup do Sistema Completo!             ║"
echo "╚════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}Próximos passos:${NC}"
echo "1. Clonar repositório:"
echo "   cd /opt && git clone https://github.com/ProgRibeiro/erpnexus2.0.git"
echo ""
echo "2. Criar banco de dados PostgreSQL:"
echo "   sudo -u postgres psql -c \"CREATE USER erp WITH PASSWORD 'sua-senha';\""
echo "   sudo -u postgres psql -c \"CREATE DATABASE erp_db OWNER erp;\""
echo ""
echo "3. Continuar com setup:"
echo "   cd /opt/erpnexus && bash deploy/continue-setup.sh"
echo ""
