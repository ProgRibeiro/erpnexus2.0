# Portal do Cliente - App Django

## O que é

O Portal do Cliente é um módulo separado do ERP que fornece uma interface simplificada para clientes finais acessarem:
- Suas Ordens de Serviço (OS)
- Orçamentos pendentes de aprovação
- Notas Fiscais
- Relatórios de serviços

## Características

- **Autenticação separada**: Cada cliente tem um usuário/senha específico do portal
- **Dados públicos**: Cliente vê apenas dados relevantes (sem margens, despesas internas, etc)
- **Token-based**: Usa Django Signer para gerar tokens seguros
- **API REST**: Endpoints em `/api/v1/portal/`
- **Multi-cliente**: Suporta múltiplos clientes com isolamento de dados

## Estrutura

```
apps/portal/
├── migrations/         # Migrações do banco
├── admin.py           # Interface admin do Django
├── models.py          # Modelo UsuarioPortal
├── serializers.py     # Serializadores para API
├── views.py           # Endpoints da API
├── urls.py            # Roteamento das URLs
├── permissions.py     # Classes de permissão
├── tests.py           # Testes unitários
├── PORTAL_API.md      # Documentação completa da API
└── README.md          # Este arquivo
```

## Modelos

### UsuarioPortal

Usuário específico do portal (diferente de `Usuario` interno):

```python
class UsuarioPortal(models.Model):
    cliente = ForeignKey(Cliente)  # FK para o cliente
    email = EmailField(unique=True)  # Email único
    senha = CharField(max_length=128)  # Senha com hash
    ativo = BooleanField(default=True)  # Ativo/inativo
    ultimo_acesso = DateTimeField(null=True)  # Rastreamento
    criado_em = DateTimeField(auto_now_add=True)
    atualizado_em = DateTimeField(auto_now=True)
```

## Endpoints

Todos os endpoints requerem autenticação via token:

```
POST   /api/v1/portal/auth/login/                  # Fazer login
GET    /api/v1/portal/minhas-os/                   # Listar OS
GET    /api/v1/portal/minhas-os/{id}/              # Detalhes da OS
GET    /api/v1/portal/minhas-os/{id}/relatorio/    # Download relatório PDF
GET    /api/v1/portal/meus-orcamentos/             # Listar orçamentos
POST   /api/v1/portal/orcamentos/{id}/aprovar/     # Aprovar orçamento
POST   /api/v1/portal/orcamentos/{id}/recusar/     # Recusar orçamento
GET    /api/v1/portal/minhas-notas/                # Listar notas fiscais
```

Veja `PORTAL_API.md` para documentação detalhada.

## Autenticação

### Login

```bash
curl -X POST http://localhost:8000/api/v1/portal/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contato@cliente.com",
    "senha": "senha123"
  }'
```

Resposta:
```json
{
  "token": "zADpd2NoZWdhZGEK:1r9S2B:...",
  "cliente_id": 1,
  "cliente_nome": "Empresa XYZ",
  "email": "contato@cliente.com"
}
```

### Usar token

Em cada requisição, adicione o header:

```
X-Portal-Token: zADpd2NoZWdhZGEK:1r9S2B:...
```

Ou como query parameter:

```
GET /api/v1/portal/minhas-os/?token=zADpd2NoZWdhZGEK:1r9S2B:...
```

## Permissões

Três classes de permissão customizadas em `permissions.py`:

1. **IsPortalUser**: Valida o token
2. **IsPortalOwner**: Garante isolamento por cliente
3. **IsPortalAuthenticatedOrReadOnly**: Requer autenticação

## Usando o Django Admin

Para criar/gerenciar usuários do portal:

1. Acesse `/admin/portal/usuarioportal/`
2. Clique em "Adicionar Usuario do portal"
3. Preencha: email, cliente, senha
4. Ative/desative o usuário conforme necessário

O admin exibe:
- Email e cliente
- Status (Ativo/Inativo)
- Último acesso
- Data de criação

## Desenvolvimento

### Criar um novo endpoint

1. Crie a view em `views.py`:

```python
@api_view(['GET'])
@permission_classes([AllowAny])
def meu_endpoint(request):
    usuario = _usuario_portal(request)
    if not usuario:
        return Response({"detail": "Token invalido."}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Sua lógica aqui
    return Response(dados)
```

2. Adicione a URL em `urls.py`:

```python
path('meu-endpoint/', meu_endpoint, name='portal-meu-endpoint'),
```

3. Atualize `PORTAL_API.md` com a documentação do novo endpoint

### Testar endpoints

Use `tests.py` como base:

```bash
python manage.py test apps.portal
```

## Segurança

- **Tokens assinados**: Usa Django Signer com salt `portal-cliente`
- **Isolamento de dados**: Cada cliente só vê seus próprios dados
- **Senhas hasheadas**: PBKDF2 ou Argon2
- **Sem dados sensíveis**: Cliente não vê chat, despesas, margens internas

## Dados visíveis para o cliente

✓ Número da OS
✓ Status (em linguagem amigável)
✓ Data agendada
✓ Nome do técnico
✓ Descrição do serviço
✓ Fotos (antes e depois)
✓ Valor orçado e faturado
✓ Número da NF
✓ Status de pagamento
✓ Observações técnicas (laudo)

✗ Chat interno
✗ Despesas
✗ Margens
✗ Informações financeiras internas
✗ Dados de outros clientes

## Integração com o frontend

O frontend pode ser:

1. **Separado**: Domínio diferente (portal.minhaempresa.com.br)
2. **Integrado**: Mesma aplicação React com rotas separadas (ex: /portal/login)

Exemplo de integração:

```javascript
// Login
const response = await fetch('/api/v1/portal/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, senha })
});

const { token } = await response.json();
localStorage.setItem('portalToken', token);

// Usar em requisições subsequentes
const osResponse = await fetch('/api/v1/portal/minhas-os/', {
  headers: { 'X-Portal-Token': token }
});
```

## Próximas features

- [ ] Envio automático de link de relatório por email
- [ ] Suporte a 2FA (autenticação de dois fatores)
- [ ] Download de orçamento em PDF
- [ ] Histórico de alterações de status
- [ ] Chat com suporte técnico
- [ ] Notificações por push (PWA)
- [ ] Integração com WhatsApp

## Troubleshooting

### Token inválido
- Verifique se o usuário está ativo (campo `ativo=True`)
- Verifique se está usando o header correto `X-Portal-Token`
- Token é case-sensitive

### Usuário não vê sua OS
- Verifique se o cliente da OS é igual ao cliente do usuário
- Verifique se a OS existe no banco

### Migração falha
```bash
python manage.py migrate portal
```

## Referências

- `PORTAL_API.md`: Documentação completa da API
- `models.py`: Definição do modelo UsuarioPortal
- `views.py`: Lógica dos endpoints
- `serializers.py`: Formatação de dados para JSON
- `permissions.py`: Classes de permissão

## Contato

Para dúvidas ou sugestões sobre o Portal do Cliente, contacte o time de desenvolvimento.
