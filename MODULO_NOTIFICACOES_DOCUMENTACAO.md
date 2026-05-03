Módulo de Notificações Automáticas (C3) - Documentação Completa
==============================================================

## Visão Geral

O módulo de notificações automáticas do ERP monitora eventos importantes em toda a aplicação e envia notificações automáticas aos usuários através de múltiplos canais (email, WhatsApp, notificação interna).

## Arquitetura

### 1. Models (apps/notificacoes/models.py)

#### LogNotificacao
Registra todas as notificações enviadas:
- **tipo**: Tipo de evento (OS_ATRIBUIDA, OS_APROVADA, etc)
- **destinatario**: Email ou número de telefone
- **canal**: EMAIL, WHATSAPP ou INTERNO
- **status**: PENDENTE, ENVIADO ou ERRO
- **usuario**: Usuário relacionado (opcional)
- **ordem_servico_id**: ID da OS relacionada
- **tentativas**: Número de tentativas de envio
- **dados_adicionais**: JSON com contexto adicional

#### ConfiguracaoNotificacao
Permite customizar preferências por usuário:
- Frequência para cada tipo (INSTANTANEA, DIARIA, SEMANAL, DESATIVADA)
- Canais preferidos (email e/ou WhatsApp)
- Número de WhatsApp

### 2. Email (apps/notificacoes/email.py)

Módulo `EmailNotificacao` para envio de emails com templates HTML:

```python
from apps.notificacoes.email import EmailNotificacao

email = EmailNotificacao(
    assunto="Seu assunto aqui",
    destinatarios=["usuario@example.com"],
    template_name="os_atribuida",
    contexto={"numero_os": "001", "cliente": "Acme Corp"}
)
email.enviar()
```

**Templates disponíveis:**
- `os_atribuida`: Quando OS é atribuída a técnico
- `os_aprovada`: Quando OS é aprovada
- `os_agendada_amanha`: Lembrança 1 dia antes
- `os_finalizada`: Quando OS é finalizada
- `pagamento_atrasado`: Relatório de atrasos
- `estoque_baixo`: Produtos com estoque baixo
- `relatorio_finalizado`: Relatório pronto para cliente

### 3. WhatsApp (apps/notificacoes/whatsapp.py)

Integração com API WhatsApp (CallMeBot ou Z-API):

```python
from apps.notificacoes.whatsapp import WhatsAppNotificacao, MensagensWhatsApp

# Usar CallMeBot
whatsapp = WhatsAppNotificacao(
    numero="5511999999999",
    mensagem=MensagensWhatsApp.os_atribuida("001", "Acme Corp", "15/05/2025"),
    provedor="callmebot"
)
whatsapp.enviar()
```

**Provedores suportados:**
- **CallMeBot**: Mais simples, sem backend requerido
- **Z-API**: Mais robusto, melhor para produção

### 4. Tasks Celery (apps/notificacoes/tasks.py)

#### Tasks Disparadas por Eventos

1. **enviar_email_os_atribuida(os_id)**
   - Disparado quando OS é atribuída a técnico
   - Envia email ao técnico com detalhes da OS

2. **enviar_email_os_aprovada(os_id)**
   - Disparado quando OS é aprovada
   - Envia email ao responsável interno

3. **enviar_email_os_finalizada(os_id)**
   - Disparado quando OS é finalizada
   - Envia email ao departamento administrativo

4. **enviar_email_relatorio_pronto(os_id, link_relatorio)**
   - Disparado quando relatório é gerado
   - Envia email ao cliente com link de download

#### Tasks Agendadas (via Celery Beat)

1. **enviar_lembranca_agendamento()**
   - Executa: Diariamente às 18h
   - Verifica OS agendadas para o dia seguinte
   - Envia lembrete ao técnico responsável

2. **enviar_notificacao_pagamentos_atrasados()**
   - Executa: Diariamente às 09h
   - Identifica pagamentos em atraso
   - Envia relatório ao departamento financeiro

3. **enviar_notificacao_estoque_baixo()**
   - Executa: Toda segunda-feira às 08h
   - Identifica produtos com estoque abaixo do mínimo
   - Envia relatório ao departamento de estoque

4. **reenviar_notificacoes_falhadas()**
   - Executa: A cada 30 minutos
   - Retenta envio de notificações com erro
   - Máximo 3 tentativas por notificação

### 5. Signals (apps/notificacoes/signals.py)

Conecta eventos de outros apps ao sistema de notificações:

```python
from django.db.models.signals import post_save
from apps.ordens.models import OrdemServico

@receiver(post_save, sender=OrdemServico)
def disparar_notificacoes_ordem_servico(sender, instance, created, update_fields, **kwargs):
    # Dispara notificações quando OS é criada ou modificada
    pass
```

### 6. Views & API (apps/notificacoes/views.py)

#### Endpoints disponíveis:

**GET /api/v1/notificacoes/logs/**
- Lista todos os logs de notificação (admin apenas)
- Filtros: status, tipo, canal, criado_em
- Busca: destinatario, conteudo

**GET /api/v1/notificacoes/logs/resumo/**
- Retorna resumo de notificações
- Total pendentes, total com erro, últimas 24h
- Breakdown por tipo e status

**GET /api/v1/notificacoes/logs/pendentes/**
- Retorna notificações não enviadas

**GET /api/v1/notificacoes/logs/com_erro/**
- Retorna notificações com erro

**POST /api/v1/notificacoes/logs/testar_notificacao/**
- Testa envio de notificação (admin apenas)
- Body: { "tipo", "destinatario", "conteudo", "canal" }

**POST /api/v1/notificacoes/logs/disparar_notificacao/**
- Dispara tarefa Celery específica (admin apenas)
- Body: { "tipo", "os_id" (opcional) }

**GET /api/v1/notificacoes/configuracoes/minha_configuracao/**
- Retorna configurações do usuário autenticado

**PUT /api/v1/notificacoes/configuracoes/atualizar_minha_configuracao/**
- Atualiza preferências de notificação do usuário

## Configuração

### 1. Variáveis de Ambiente (.env)

```env
# SMTP Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-app
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=contato@example.com

# Emails administrativos
ADMIN_EMAIL=admin@example.com
FINANCEIRO_EMAIL=financeiro@example.com
ESTOQUE_EMAIL=estoque@example.com

# WhatsApp (escolha um)
WHATSAPP_PROVEDOR=callmebot
CALLMEBOT_APIKEY=sua-api-key

# ou

WHATSAPP_PROVEDOR=zapi
ZAPI_INSTANCIA=sua-instancia
ZAPI_TOKEN=seu-token

# URLs
BASE_URL=https://seu-dominio.com
```

### 2. Executar Migrações

```bash
python manage.py makemigrations notificacoes
python manage.py migrate notificacoes
```

### 3. Inicializar Sistema

```bash
python init_notificacoes.py
```

Isso irá:
- Criar templates de email
- Criar configurações padrão para usuários existentes

### 4. Iniciar Celery

Abra dois terminais:

**Terminal 1 - Celery Beat (scheduler):**
```bash
celery -A config beat -l info
```

**Terminal 2 - Celery Worker (executor):**
```bash
celery -A config worker -l info
```

Ou ambos em um único processo (desenvolvimento):
```bash
celery -A config worker -B -l info
```

## Uso

### Exemplo 1: Disparar notificação quando OS é criada

```python
# No signal ou view:
from apps.notificacoes.tasks import enviar_email_os_atribuida

def criar_ordem_servico(request):
    os = OrdemServico.objects.create(...)
    
    # Dispara notificação de forma assíncrona
    enviar_email_os_atribuida.delay(os.id)
    
    return JsonResponse({"id": os.id})
```

### Exemplo 2: Testar notificação via admin

1. Acesse http://localhost:8000/admin/
2. Vá para "Notificações" > "Log de notificação"
3. Clique em "Testar notificação"
4. Preencha os dados e clique em "Enviar"

### Exemplo 3: Configurar preferências de notificação

```python
# Para usuario autenticado:
PUT /api/v1/notificacoes/configuracoes/atualizar_minha_configuracao/

{
    "enviar_email": true,
    "enviar_whatsapp": true,
    "numero_whatsapp": "5511999999999",
    "os_atribuida": "instantanea",
    "pagamento_atrasado": "diaria"
}
```

## Troubleshooting

### Notificações não são enviadas

1. **Verificar Celery:** Verifique se o worker está rodando
   ```bash
   celery -A config inspect active
   ```

2. **Verificar fila:** Veja tarefas pendentes
   ```bash
   celery -A config inspect reserved
   ```

3. **Logs:** Verificar logs de erro
   ```
   SELECT * FROM notificacoes_lognotificacao WHERE status = 'erro'
   ```

### Email não funciona

1. Verificar credenciais SMTP no .env
2. Testar com `python manage.py shell`:
   ```python
   from django.core.mail import send_mail
   send_mail('teste', 'conteúdo', 'from@example.com', ['to@example.com'])
   ```

3. Para Gmail: Usar "Senha de Aplicativo" em vez de senha normal

### WhatsApp não funciona

1. **CallMeBot:** 
   - Enviar mensagem "I allow callmebot to send me messages" ao bot
   - Copiar API key do bot

2. **Z-API:**
   - Verificar se instância está ativa
   - Verificar token no dashboard Z-API

## Monitoramento

### Dashboard Admin

Acesse: http://localhost:8000/admin/notificacoes/

Mostra:
- Total de notificações por status
- Notificações com erro (para retry)
- Configurações de usuários
- Preview de conteúdo

### Endpoint de Resumo

```bash
GET /api/v1/notificacoes/logs/resumo/
```

Retorna:
```json
{
    "total_pendentes": 5,
    "total_erros": 2,
    "ultimas_24h": 45,
    "por_tipo": {
        "os_atribuida": 20,
        "pagamento_atrasado": 15,
        ...
    },
    "por_status": {
        "enviado": 40,
        "pendente": 5,
        "erro": 2
    }
}
```

## Extensões Futuras

1. **SMS**: Integrar com Twilio para SMS
2. **Push Notifications**: Notificações em app mobile
3. **Templates customizáveis**: Admin poder criar templates
4. **Webhooks**: Integração com Slack, Discord
5. **Rate limiting**: Evitar spam de notificações
6. **Histórico**: Dashboard com análise de engajamento

## Suporte

Para dúvidas ou problemas:
1. Verificar logs em notificacoes_lognotificacao
2. Consultar Django logs
3. Verificar Celery logs
4. Testar manualmente via /api/v1/notificacoes/logs/testar_notificacao/
