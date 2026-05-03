# Portal do Cliente - Guia de Deployment e Setup

## Pré-requisitos

- Django 5.0+
- Django REST Framework
- PostgreSQL (ou outro banco de dados configurado)
- Python 3.11+

## Passos de Setup

### 1. Aplicar Migrações

```bash
# Ir para a pasta do projeto
cd erp_backend

# Aplicar migrações do portal
python manage.py migrate portal

# Verificar status
python manage.py showmigrations portal
```

### 2. Criar Usuário do Portal via Admin

#### Opção A: Via Django Admin (GUI)

1. Acesse: `http://localhost:8000/admin/`
2. Faça login com usuário admin
3. Navegue para: Portal → Usuarios do portal
4. Clique em "Adicionar Usuario do portal"
5. Preencha:
   - Email: `contato@cliente.com`
   - Cliente: Selecione um cliente existente
   - Senha: Defina uma senha (será hasheada automaticamente)
   - Ativo: Marque como True
6. Clique em "Salvar"

#### Opção B: Via Script Python

```python
# manage.py shell
from apps.portal.models import UsuarioPortal
from apps.clientes.models import Cliente

cliente = Cliente.objects.first()  # Pega primeiro cliente
usuario = UsuarioPortal.objects.create(
    cliente=cliente,
    email='contato@cliente.com',
    ativo=True
)
usuario.set_password('senha123')
usuario.save()
```

#### Opção C: Via Django Command (recomendado)

```bash
# Crie um custom command (apps/portal/management/commands/criar_usuario_portal.py)
python manage.py criar_usuario_portal \
  --email contato@cliente.com \
  --cliente 1 \
  --senha senha123
```

### 3. Testar a API

#### Login

```bash
curl -X POST http://localhost:8000/api/v1/portal/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contato@cliente.com",
    "senha": "senha123"
  }'
```

Resposta esperada:
```json
{
  "token": "zADpd2NoZWdhZGEK:1r9S2B:...",
  "cliente_id": 1,
  "cliente_nome": "Empresa XYZ Ltda",
  "email": "contato@cliente.com"
}
```

#### Usar token

```bash
# Guardar o token
TOKEN="zADpd2NoZWdhZGEK:1r9S2B:..."

# Listar OS do cliente
curl -H "X-Portal-Token: $TOKEN" \
  http://localhost:8000/api/v1/portal/minhas-os/
```

### 4. Rodar Testes

```bash
# Testes do portal
python manage.py test apps.portal

# Com verbosidade
python manage.py test apps.portal -v 2

# Teste específico
python manage.py test apps.portal.tests.PortalLoginAPITest.test_login_com_credenciais_validas

# Com cobertura
pip install coverage
coverage run --source='apps/portal' manage.py test apps.portal
coverage report
coverage html  # Gera relatório HTML
```

---

## Configurações Opcionais

### 1. Rate Limiting (Recomendado em Produção)

Instale django-ratelimit:

```bash
pip install django-ratelimit
```

Adicione ao settings.py:

```python
INSTALLED_APPS = [
    ...
    'django_ratelimit',
]
```

Modifique as views:

```python
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='10/h', method='POST')
@api_view(['POST'])
def login(request):
    # ... sua lógica
```

### 2. Logs Detalhados

Adicione ao settings.py:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/portal.log',
        },
    },
    'loggers': {
        'apps.portal': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### 3. CORS para Domínio Separado

Se o portal for em domínio diferente, configure CORS:

```bash
pip install django-cors-headers
```

settings.py:

```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    "https://portal.minhaempresa.com.br",
    "http://localhost:3000",  # React dev
]

CORS_ALLOW_CREDENTIALS = True
```

### 4. HTTPS em Produção

settings.py:

```python
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
```

---

## Troubleshooting

### Erro: "Token invalido"

**Causa:** Token expirado ou inválido

**Solução:**
- Faça login novamente
- Verifique se o token está correto
- Verifique o header `X-Portal-Token`

### Erro: "Credentials invalidas"

**Causa:** Email ou senha incorretos

**Solução:**
- Verifique se o usuário existe no Django Admin
- Confirme a senha (case-sensitive)
- Verifique se o usuário está ativo (ativo=True)

### Erro: "OS nao encontrada"

**Causa:** OS não pertence ao cliente

**Solução:**
- Verifique se a OS tem cliente_id igual ao do usuário logado
- Verifique se a OS existe no banco

### Migração não aplicada

**Causa:** Migração não foi executada

**Solução:**
```bash
python manage.py showmigrations portal  # Ver status
python manage.py migrate portal         # Aplicar
```

### Usuário do portal não consegue logar

**Causa:** Usuário inativo ou dados incorretos

**Solução:**
1. Verifique no Django Admin: `/admin/portal/usuarioportal/`
2. Confirme: email correto, ativo=True, cliente definido
3. Tente resetar a senha:
   ```python
   # manage.py shell
   usuario = UsuarioPortal.objects.get(email='email@teste.com')
   usuario.set_password('nova_senha')
   usuario.save()
   ```

---

## Ambiente de Desenvolvimento

### Setup Local

```bash
# Clone e entre na pasta
cd erp_backend

# Crie venv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instale dependências
pip install -r requirements.txt

# Crie banco local
python manage.py migrate

# Crie superuser
python manage.py createsuperuser

# Crie cliente de teste
python manage.py shell
>>> from apps.clientes.models import Cliente
>>> Cliente.objects.create(
...   tipo_pessoa='juridica',
...   nome='Empresa Teste',
...   cnpj='12.345.678/0001-90',
...   email='empresa@teste.com'
... )

# Crie usuário do portal
python manage.py shell
>>> from apps.portal.models import UsuarioPortal
>>> from apps.clientes.models import Cliente
>>> cliente = Cliente.objects.first()
>>> UsuarioPortal.objects.create(
...   cliente=cliente,
...   email='portal@teste.com',
...   senha='senha123',
...   ativo=True
... )

# Inicie servidor
python manage.py runserver

# Em outro terminal, teste
curl -X POST http://localhost:8000/api/v1/portal/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "portal@teste.com", "senha": "senha123"}'
```

### VS Code Settings (opcional)

.vscode/settings.json:
```json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "python.linting.flake8Enabled": true,
  "[python]": {
    "editor.formatOnSave": true
  }
}
```

---

## Produção

### Checklist de Deploy

- [ ] Migração aplicada: `python manage.py migrate portal`
- [ ] Variáveis de ambiente configuradas em `.env`
- [ ] HTTPS habilitado
- [ ] CORS configurado para domínio do portal
- [ ] Rate limiting configurado
- [ ] Logs configurados
- [ ] Backup do banco antes de deploy
- [ ] Testes passando: `python manage.py test apps.portal`
- [ ] Admin acessível: `/admin/`
- [ ] Login testado manualmente
- [ ] Endpoints testados com token válido

### Monitoramento

Recomenda-se monitorar:

1. **Logs de erro:**
   ```bash
   tail -f logs/portal.log | grep ERROR
   ```

2. **Taxa de login falho:**
   - Monitore tentativas de login com credenciais inválidas
   - Alerte se > 5 tentativas em 1 hora por IP

3. **Acesso a dados:**
   - Registre todos os acessos ao portal
   - Monitore acessos a OS de clientes diferentes

4. **Performance:**
   - Tempo de resposta dos endpoints
   - Número de requisições por segundo

---

## Integração com Sistema Existente

### Sincronização de Clientes

Se mudar dados do cliente, o portal reflete automaticamente via FK.

Exemplo:
```python
# Atualizar cliente
cliente = Cliente.objects.get(id=1)
cliente.nome = "Novo Nome"
cliente.save()

# Todos os usuários do portal desse cliente veem o novo nome
```

### Notificações ao Aprovar Orçamento

Adicione um signal em `apps/portal/signals.py`:

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.ordens.models import OrdemServico

@receiver(post_save, sender=OrdemServico)
def enviar_notificacao_aprovacao(sender, instance, created, **kwargs):
    if instance.status == OrdemServico.Status.APROVADA:
        # Enviar email ao administrativo
        enviar_email_aprovacao(instance)
```

---

## Suporte e Documentação

Para mais informações:
- README.md - Guia geral do app
- PORTAL_API.md - Documentação completa da API
- PORTAL_INTEGRATION_EXAMPLE.js - Exemplos React
- tests.py - Exemplos de uso

---

## Próximas Fases

Após implementação bem-sucedida do portal:

1. **Frontend:** Criar interface React específica do portal
2. **Notificações:** Implementar envio de email ao cliente
3. **Relatório Público:** Criar página pública sem autenticação
4. **Mobile:** Adaptação para mobile responsivo
5. **Analytics:** Rastrear acessos e uso do portal

---

**Setup completado! O Portal do Cliente está pronto para uso.**
