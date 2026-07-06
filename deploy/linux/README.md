# ERP Nexus em Linux local seguro

Este pacote prepara um servidor Debian/Ubuntu para rodar o ERP Nexus com banco local.

## Instalacao

Servidor com dominio e HTTPS automatico:

```bash
sudo ERP_DOMAIN=erp.seudominio.com CERTBOT_EMAIL=voce@email.com bash scripts/linux/instalar_producao_local.sh
```

Servidor somente local:

```bash
sudo bash scripts/linux/instalar_producao_local.sh
```

O instalador cria `/root/erp-nexus-credenciais-iniciais.txt`. Guarde em cofre de senhas e apague do servidor depois.

## Camadas aplicadas

- PostgreSQL local com usuario proprio e SCRAM-SHA-256.
- Redis local com senha e bind em loopback.
- `.env` com permissao `600`.
- Nginx como unica camada HTTP publica.
- Rate limit no Nginx para API e autenticacao.
- UFW liberando apenas OpenSSH e Nginx.
- fail2ban para abuso no Nginx.
- unattended-upgrades para atualizacoes de seguranca.
- systemd com hardening para Gunicorn, Celery e Celery Beat.
- Backup diario criptografado com AES-256-CBC + PBKDF2.

## Verificacao

```bash
sudo bash scripts/linux/verificar_linux.sh
```

## Backup

Backup manual:

```bash
sudo APP_DIR=/caminho/do/projeto /usr/local/bin/erp-nexus-backup
```

Arquivos ficam em `/var/backups/erp-nexus` por padrao.

## Restauracao

```bash
sudo APP_DIR=/caminho/do/projeto bash scripts/linux/restaurar_backup_criptografado.sh /var/backups/erp-nexus/erp_nexus_YYYYMMDD_HHMMSS.tar.gz.enc
```

A restauracao exige digitar `RESTAURAR` e substitui banco e media atuais.

## Criptografia de disco

O projeto criptografa backups. Para criptografia em repouso de todo o banco e uploads, habilite LUKS/disk encryption no provedor ou no instalador do Linux antes de instalar o ERP. Isso nao deve ser automatizado por este script porque pode apagar discos se usado errado.
