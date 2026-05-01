# Guia de Deployment - ERP Sistema Completo

## 1. Requisitos do Servidor

### Ambiente
- **OS**: Ubuntu 22.04 LTS ou superior
- **RAM**: Mínimo 2GB (4GB recomendado)
- **CPU**: 2 cores mínimo
- **Disco**: 20GB mínimo para aplicação + dados

### Dependências Instaladas
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Certbot (para SSL/TLS com Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Instalar Git (se necessário)
sudo apt install -y git
```

## 2. Passo a Passo do Primeiro Deploy

### 2.1 Preparação do Servidor
```bash
# Criar diretório do projeto
mkdir -p /var/www/erp
cd /var/www/erp

# Clonar repositório
git clone <seu-repositorio> .

# Ou se estiver em um servidor existente
cd /caminho/do/projeto
```

### 2.2 Configurar Variáveis de Ambiente
```bash
# Copiar template de produção
cp .env.production.example .env

# Editar arquivo com valores reais
nano .env

# Variáveis críticas a alterar:
# - SECRET_KEY: gerar com python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
# - DB_PASSWORD: senha segura do PostgreSQL (mínimo 16 caracteres)
# - REDIS_PASSWORD: senha segura do Redis (mínimo 16 caracteres)
# - ALLOWED_HOSTS: seus domínios (ex: example.com,www.example.com)
# - CORS_ALLOWED_ORIGINS: seus domínios com https
# - EMAIL_HOST_USER e EMAIL_HOST_PASSWORD: credenciais do Gmail
# - VITE_API_URL: URL da sua API (ex: https://example.com/api)
```

### 2.3 Validar Configuração Docker
```bash
# Verificar se docker-compose.prod.yml está correto
docker-compose -f docker-compose.prod.yml config

# Se houver erros, corrigir antes de continuar
```

### 2.4 Deploy Inicial
```bash
# Construir imagens Docker
docker-compose -f docker-compose.prod.yml build

# Iniciar containers
docker-compose -f docker-compose.prod.yml up -d

# Verificar status dos containers
docker-compose -f docker-compose.prod.yml ps

# Monitorar logs (pressione Ctrl+C para sair)
docker-compose -f docker-compose.prod.yml logs -f
```

### 2.5 Verificar Deploy
```bash
# Verificar se backend está respondendo
curl http://localhost:8000/api/

# Verificar se frontend está acessível
curl http://localhost

# Verificar health check do nginx
curl http://localhost/health/

# Ver logs específicos de um container
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs postgres
docker-compose -f docker-compose.prod.yml logs redis
```

## 3. Configurar Domínio e HTTPS com Certbot

### 3.1 Pré-requisitos
- Domínio registrado e apontando para seu servidor (DNS A record)
- Porta 80 e 443 abertas no firewall

### 3.2 Obter Certificado SSL
```bash
# Parar Nginx temporariamente para Certbot obter certificado
docker-compose -f docker-compose.prod.yml down nginx

# Obter certificado (substitua seu-dominio.com)
sudo certbot certonly --standalone \
  -d seu-dominio.com \
  -d www.seu-dominio.com \
  --email seu-email@example.com \
  --agree-tos \
  --non-interactive

# Certificado será salvo em: /etc/letsencrypt/live/seu-dominio.com/
```

### 3.3 Configurar Nginx com HTTPS
```bash
# Editar nginx.conf e descomentar a seção HTTPS
nano nginx.conf

# Alterações necessárias:
# 1. Descomentar bloco "server" em listen 443 ssl http2
# 2. Substituir "your-domain.com" pelo seu domínio real
# 3. Descomentar bloco "server" em listen 80 com redirect para HTTPS
```

### 3.4 Atualizar Variáveis de Ambiente
```bash
# Editar .env
nano .env

# Alterar:
# ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com,localhost,127.0.0.1
# CORS_ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
# VITE_API_URL=https://seu-dominio.com/api
```

### 3.5 Reiniciar com Configuração HTTPS
```bash
# Reconstruir e reiniciar containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Verificar certificado
curl https://seu-dominio.com

# Renovação automática (Certbot cria cronjob automaticamente)
sudo systemctl status certbot.timer
```

### 3.6 Renew Automático de Certificados
```bash
# Certbot configura renovação automática, mas você pode testar:
sudo certbot renew --dry-run

# Se precisar configurar manualmente:
# 0 3 * * * certbot renew --quiet --renew-hook "docker-compose -f /var/www/erp/docker-compose.prod.yml restart nginx"
```

## 4. Restaurar Backup

### 4.1 Listar Backups Disponíveis
```bash
# Se você executou backup.sh previamente
ls -lah ./backups/
```

### 4.2 Restaurar Banco de Dados
```bash
# Parar serviços (opcional, mas seguro)
docker-compose -f docker-compose.prod.yml pause backend celery_worker celery_beat

# Restaurar database backup
gunzip < ./backups/erp_db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres psql \
  -U ${DB_USER:-erp_user} \
  ${DB_NAME:-erp_db}

# Retomar serviços
docker-compose -f docker-compose.prod.yml unpause backend celery_worker celery_beat

# Ou reiniciar se algo der errado
docker-compose -f docker-compose.prod.yml restart
```

### 4.3 Restaurar Arquivos de Mídia
```bash
# Descompactar backup de mídia
tar -xzf ./backups/erp_media_YYYYMMDD_HHMMSS.tar.gz -C ./

# Ou se preferir restaurar em local específico
tar -xzf ./backups/erp_media_YYYYMMDD_HHMMSS.tar.gz -C /caminho/destino
```

### 4.4 Verificar Integridade
```bash
# Acessar backend container e verificar dados
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py dbshell

# Verificar alguns registros
SELECT COUNT(*) FROM users_user;
SELECT COUNT(*) FROM ordens_os;
\q
```

## 5. Manutenção e Atualizações do Sistema

### 5.1 Executar Script de Backup Automatizado
```bash
# Dar permissão de execução
chmod +x scripts/backup.sh

# Executar backup manualmente
./scripts/backup.sh

# Agendar backup diário com cron (2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/erp/scripts/backup.sh >> /var/log/erp-backup.log 2>&1") | crontab -

# Verificar se cron foi configurado
crontab -l | grep backup.sh
```

### 5.2 Atualizações de Código
```bash
# Pull das mudanças
git pull origin main

# Reconstruir imagens (se houver mudanças em requirements ou Dockerfile)
docker-compose -f docker-compose.prod.yml build

# Parar containers atuais
docker-compose -f docker-compose.prod.yml down

# Iniciar com novo código
docker-compose -f docker-compose.prod.yml up -d

# Executar migrações se necessário
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5.3 Limpeza de Dados Antigos
```bash
# Limpar media files antigos (opcional)
find ./erp_backend/media -type f -mtime +90 -delete

# Limpar logs antigos
docker exec erp-backend find /app/logs -type f -mtime +30 -delete

# Compactar banco de dados (PostgreSQL vacuum)
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U ${DB_USER:-erp_user} ${DB_NAME:-erp_db} \
  -c "VACUUM ANALYZE;"
```

### 5.4 Monitoramento e Logs
```bash
# Ver logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f celery_worker

# Ver status dos containers
docker-compose -f docker-compose.prod.yml ps

# Ver uso de recursos
docker stats

# Entrar em um container para debug
docker-compose -f docker-compose.prod.yml exec backend bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U erp_user erp_db
```

### 5.5 Reinicialização e Recuperação
```bash
# Reiniciar todos os containers
docker-compose -f docker-compose.prod.yml restart

# Reiniciar um serviço específico
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart celery_worker

# Parar todos (sem remover volumes)
docker-compose -f docker-compose.prod.yml down

# Remover tudo incluindo volumes (CUIDADO - apaga dados!)
docker-compose -f docker-compose.prod.yml down -v

# Atualizar apenas imagens
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker-compose -f docker-compose.prod.yml up -d
```

## 6. Troubleshooting

### Container falhando ao iniciar
```bash
# Verificar logs detalhados
docker-compose -f docker-compose.prod.yml logs backend

# Verificar se .env está correto
cat .env | head -20

# Testar variáveis de ambiente
docker-compose -f docker-compose.prod.yml config | grep -A 10 environment
```

### Erro de conexão com banco de dados
```bash
# Verificar se PostgreSQL está rodando
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Verificar credenciais
docker-compose -f docker-compose.prod.yml logs postgres

# Testar conexão
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U erp_user -d erp_db -c "SELECT 1;"
```

### Falta de espaço em disco
```bash
# Ver uso de disco
df -h

# Limpar Docker
docker system prune -a

# Verificar tamanho de volumes
docker volume ls --format "{{.Name}}" | xargs -I {} docker volume inspect {}
```

### Problemas com SSL/HTTPS
```bash
# Verificar certificado
sudo certbot certificates

# Testar renovação
sudo certbot renew --dry-run

# Ver erros do Certbot
sudo journalctl -u certbot.timer -n 50

# Reconstruir configuração Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## 7. Checklist de Deploy

- [ ] Ubuntu 22.04 LTS instalado e atualizado
- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado em `/var/www/erp`
- [ ] `.env` configurado com valores reais
- [ ] `docker-compose -f docker-compose.prod.yml config` validado sem erros
- [ ] Containers iniciados com `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Todos os containers com status "Up"
- [ ] Backend respondendo em `http://localhost:8000/api/`
- [ ] Frontend acessível em `http://localhost`
- [ ] Domínio apontando para servidor (DNS)
- [ ] Certificado SSL obtido com Certbot
- [ ] Nginx configurado com HTTPS
- [ ] Sistema acessível em `https://seu-dominio.com`
- [ ] Backup configurado em cron job
- [ ] Logs sendo monitorados
- [ ] Emails funcionando (teste envio)
- [ ] Backup restaurado com sucesso (teste)

## 8. Suporte e Recursos

### Documentação
- Django: https://docs.djangoproject.com
- PostgreSQL: https://www.postgresql.org/docs
- Redis: https://redis.io/documentation
- Celery: https://docs.celeryproject.org
- Docker: https://docs.docker.com
- Certbot: https://certbot.eff.org/docs

### Contato e Ajuda
Para problemas específicos, consultar:
- Logs da aplicação: `docker-compose logs`
- Documentação do Django: `docker-compose exec backend python manage.py help`
- Status do sistema: `docker stats` e `df -h`
