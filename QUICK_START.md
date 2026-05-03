QUICK START - Módulo de Notificações
====================================

## 1. INSTALAÇÃO (5 MINUTOS)

### 1.1 Preparar ambiente
```bash
cd erp_backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 1.2 Configurar .env
```bash
cp .env.example .env

# Editar .env e preencher:
# - EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
# - ADMIN_EMAIL, FINANCEIRO_EMAIL, ESTOQUE_EMAIL
# - WHATSAPP_PROVEDOR (opcional)
```

### 1.3 Banco de dados
```bash
python manage.py makemigrations notificacoes
python manage.py migrate
python init_notificacoes.py
```

### 1.4 Iniciar Celery
```bash
# Terminal 1: Celery Beat (scheduler)
celery -A config beat -l info

# Terminal 2: Celery Worker
celery -A config worker -l info
```

## 2. TESTANDO (5 MINUTOS)

### 2.1 Via Admin
1. Acesse: http://localhost:8000/admin/
2. Vá a: Notificações > Log de notificação
3. Ação: "Testar Notificação"
4. Preencha e envie

### 2.2 Via API (com curl)
```bash
curl -X POST http://localhost:8000/api/v1/notificacoes/logs/testar_notificacao/ \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "os_atribuida",
    "destinatario": "seu-email@gmail.com",
    "conteudo": "Teste de notificação",
    "canal": "email"
  }'
```

### 2.3 Monitorar
```bash
# Dashboard
curl http://localhost:8000/api/v1/notificacoes/logs/resumo/ \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 3. CONFIGURANDO GMAIL (10 MINUTOS)

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione: Mail e Windows Computer (ou seu OS)
3. Copie a senha gerada (sem espaços)
4. Em .env:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=seu-email@gmail.com
   EMAIL_HOST_PASSWORD=<senha gerada acima>
   EMAIL_USE_TLS=True
   ```

## 4. CONFIGURANDO WHATSAPP (5-10 MINUTOS)

### Opção A: CallMeBot (MAIS SIMPLES)

1. Adicione o número: +55 61 98115-1300 no WhatsApp
2. Envie: I allow callmebot to send me messages
3. Copie a API Key enviada pelo bot
4. Em .env:
   ```
   WHATSAPP_PROVEDOR=callmebot
   CALLMEBOT_APIKEY=sua-api-key-aqui
   ```

### Opção B: Z-API (MAIS ROBUSTO)

1. Acesse: https://z-api.io/
2. Crie conta e conecte WhatsApp Business
3. Copie Instância ID e Token
4. Em .env:
   ```
   WHATSAPP_PROVEDOR=zapi
   ZAPI_INSTANCIA=sua-instancia
   ZAPI_TOKEN=seu-token
   ```

## 5. NOTIFICAÇÕES AUTOMÁTICAS

### Já funcionam automaticamente após setup:

1. **OS Atribuída** → Email ao técnico (instantâneo)
2. **OS Aprovada** → Email ao admin (instantâneo)
3. **Lembrança Agendamento** → Email ao técnico (18h, diariamente)
4. **OS Finalizada** → Email ao admin (instantâneo)
5. **Pagamentos Atrasados** → Email financeiro (09h, diariamente)
6. **Estoque Baixo** → Email estoque (segunda 08h)
7. **Relatório Pronto** → Email ao cliente (instantâneo)

### Personalizar
```bash
# Via Admin: /admin/notificacoes/configuracaousuario/
# Escolha frequência e canais por usuário
```

## 6. VERIFICANDO SE FUNCIONA

### 6.1 Checar Celery Worker
```bash
# Em outro terminal:
celery -A config inspect active
celery -A config inspect reserved
```

### 6.2 Ver Logs
```bash
# Admin dashboard
http://localhost:8000/admin/notificacoes/lognotificacao/

# API
GET /api/v1/notificacoes/logs/resumo/
GET /api/v1/notificacoes/logs/com_erro/
GET /api/v1/notificacoes/logs/pendentes/
```

### 6.3 Teste Manual
```bash
# Criar nova OS
POST /api/v1/ordens/ordem-servicos/
# (certifique-se de atribuir técnico)

# Verificar notificação criada
GET /api/v1/notificacoes/logs/
```

## 7. TROUBLESHOOTING

### Email não chega
1. Verificar SPAM folder
2. Confirmar credenciais SMTP
3. Ver logs: `/admin/notificacoes/lognotificacao/`
4. Status = ERRO? Ver campo "erro"

### Celery não funciona
```bash
# Verificar se Redis está rodando
redis-cli ping
# Resposta: PONG

# Se não tiver Redis:
# Windows: Usar https://github.com/microsoftarchive/redis/releases
# Linux: sudo apt-get install redis-server
# Mac: brew install redis
```

### Notificação não é disparada
1. Verificar se Celery Worker está rodando
2. Verificar signal foi registrado (apps.py ready())
3. Ver logs do worker: `celery -A config worker -l debug`

## 8. ESTRUTURA DE DIRETÓRIOS

```
erp_backend/
├── apps/notificacoes/
│   ├── models.py          # LogNotificacao, ConfiguracaoNotificacao
│   ├── email.py           # EmailNotificacao + templates
│   ├── whatsapp.py        # WhatsAppNotificacao
│   ├── tasks.py           # Tasks Celery
│   ├── signals.py         # Disparadores automáticos
│   ├── views.py           # ViewSets API
│   ├── serializers.py     # Serializers
│   ├── admin.py           # Admin dashboard
│   ├── urls.py            # Rotas API
│   ├── apps.py            # Config app
│   └── tests.py           # Testes
├── config/
│   ├── settings.py        # Configs Celery + Email
│   ├── urls.py            # URLs principais (inclui notificacoes)
│   └── celery.py          # Config Celery
└── init_notificacoes.py   # Script init

Documentação:
├── MODULO_NOTIFICACOES_DOCUMENTACAO.md     # Docs completas
├── INSTALACAO_NOTIFICACOES.py              # Guia instalação
├── RESUMO_IMPLEMENTACAO_NOTIFICACOES.txt   # O que foi feito
└── QUICK_START.md                          # Este arquivo
```

## 9. PRÓXIMAS ETAPAS (OPCIONAL)

1. **Adicionar mais templates** em `email.py`
2. **Integrar SMS** com Twilio
3. **Push Notifications** mobile
4. **Webhooks** Slack/Discord
5. **Analytics** de engajamento
6. **Rate limiting** antispam

## 10. HELP

- Docs: `MODULO_NOTIFICACOES_DOCUMENTACAO.md`
- Setup: `INSTALACAO_NOTIFICACOES.py`
- Tests: `python manage.py test apps.notificacoes`
- Admin: http://localhost:8000/admin/notificacoes/
- API: http://localhost:8000/api/v1/notificacoes/

---

PRONTO! Seu sistema de notificações está operacional.
Qualquer dúvida, consulte a documentação completa.
