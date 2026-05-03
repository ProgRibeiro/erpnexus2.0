# Portal do Cliente - Documentação da API

## Visão Geral

O Portal do Cliente é uma interface separada e simplificada do ERP que permite que clientes acessem dados públicos sobre suas Ordens de Serviço, Orçamentos e Notas Fiscais.

**Prefixo de todas as rotas:** `/api/v1/portal/`

## Modelo de Autenticação

O Portal utiliza um sistema de autenticação separado do sistema interno, baseado em tokens assinados (Django Signer).

### UsuarioPortal

- `id`: ID único
- `cliente` (FK): Cliente associado ao usuário
- `email`: Email único (credencial de login)
- `senha`: Senha com hash (usando pbkdf2 ou argon2)
- `ativo`: Boolean (ativo ou inativo)
- `ultimo_acesso`: DateTime (rastreamento de acesso)
- `criado_em`: DateTime (auto-criado)
- `atualizado_em`: DateTime (auto-atualizado)

### Fluxo de Autenticação

1. Cliente faz login com `email` e `senha`
2. Backend retorna um `token` assinado (válido indefinidamente)
3. Cliente usa o token em cada requisição via header `X-Portal-Token` ou query parameter `token`
4. Backend valida o token e retorna dados correspondentes

## Endpoints da API

### 1. Autenticação

#### POST `/api/v1/portal/auth/login/`

**Descrição:** Faz login do cliente no portal

**Request:**
```json
{
  "email": "contato@cliente.com",
  "senha": "senha123"
}
```

**Response (200):**
```json
{
  "token": "zADpd2NoZWdhZGEK:1r9S2B:e8f9c0d1a2b3c4d5e6f7a8b9",
  "cliente_id": 1,
  "cliente_nome": "Empresa XYZ Ltda",
  "email": "contato@cliente.com"
}
```

**Erros:**
- 400: Credenciais inválidas
- 400: Usuário inativo

---

### 2. Ordens de Serviço

#### GET `/api/v1/portal/minhas-os/`

**Descrição:** Lista todas as Ordens de Serviço do cliente

**Query Parameters:**
- `token`: Token do portal (opcional, se não usar header)

**Headers:**
- `X-Portal-Token`: Token do portal

**Response (200):**
```json
[
  {
    "id": 1,
    "numero": "OS-2025-0001",
    "status": "em_execucao",
    "data_agendada": "2025-05-02",
    "tecnico_nome": "João Silva",
    "descricao_servico": "Manutenção preventiva em ar condicionado",
    "valor_total_orcado": "500.00",
    "valor_final_faturado": "500.00",
    "numero_nf": "NF-2025-0001",
    "data_vencimento": "2025-05-15",
    "status_pagamento": "pago"
  }
]
```

**Erros:**
- 401: Token inválido ou ausente

---

#### GET `/api/v1/portal/minhas-os/{id}/`

**Descrição:** Obtém detalhes completos de uma Ordem de Serviço específica

**Response (200):**
```json
{
  "id": 1,
  "numero": "OS-2025-0001",
  "status": "em_execucao",
  "data_agendada": "2025-05-02",
  "tecnico_nome": "João Silva",
  "descricao_servico": "Manutenção preventiva em ar condicionado",
  "valor_total_orcado": "500.00",
  "valor_final_faturado": "500.00",
  "numero_nf": "NF-2025-0001",
  "data_vencimento": "2025-05-15",
  "status_pagamento": "pago",
  "tipo_servico": "preventiva",
  "prioridade": "normal",
  "endereco_servico": "Rua das Flores, 123 - São Paulo",
  "observacoes_tecnicas": "Equipamento revisado e funcionando normalmente.",
  "cliente_nome": "Empresa XYZ Ltda",
  "contato_responsavel_nome": "Maria Silva",
  "itens": [
    {
      "descricao": "Serviço de limpeza e inspeção",
      "quantidade": "1.00",
      "valor_unitario": "300.00",
      "valor_total": "300.00"
    },
    {
      "descricao": "Substituição de filtro",
      "quantidade": "2.00",
      "valor_unitario": "100.00",
      "valor_total": "200.00"
    }
  ],
  "fotos_antes": [
    {
      "id": 1,
      "arquivo": "https://exemplo.com/media/fotos/os_1_antes_1.jpg",
      "legenda": "Equipamento antes da limpeza"
    }
  ],
  "fotos_depois": [
    {
      "id": 2,
      "arquivo": "https://exemplo.com/media/fotos/os_1_depois_1.jpg",
      "legenda": "Equipamento após limpeza"
    }
  ]
}
```

**Erros:**
- 401: Token inválido
- 404: OS não encontrada

---

#### GET `/api/v1/portal/minhas-os/{id}/relatorio/`

**Descrição:** Retorna link para download do PDF do relatório da OS

**Response (200):**
```json
{
  "pdf_url": "https://exemplo.com/media/relatorios/OS-2025-0001.pdf",
  "numero_os": "OS-2025-0001",
  "cliente": "Empresa XYZ Ltda",
  "data_relatorio": "2025-05-02T10:30:00Z"
}
```

**Erros:**
- 401: Token inválido
- 404: OS não encontrada
- 400: Relatório não disponível (OS ainda não finalizada)

---

### 3. Orçamentos

#### GET `/api/v1/portal/meus-orcamentos/`

**Descrição:** Lista orçamentos pendentes de aprovação do cliente

**Response (200):**
```json
[
  {
    "id": 2,
    "numero": "OS-2025-0002",
    "cliente_nome": "Empresa XYZ Ltda",
    "descricao_servico": "Instalação de novo sistema de refrigeração",
    "valor_total_orcado": "5000.00",
    "condicao_pagamento": "30d",
    "validade_orcamento": "2025-05-20",
    "itens": [
      {
        "descricao": "Equipamento de refrigeração modelo ABC",
        "quantidade": "1.00",
        "valor_unitario": "4000.00",
        "valor_total": "4000.00"
      },
      {
        "descricao": "Mão de obra de instalação",
        "quantidade": "8.00",
        "valor_unitario": "125.00",
        "valor_total": "1000.00"
      }
    ]
  }
]
```

---

#### POST `/api/v1/portal/orcamentos/{id}/aprovar/`

**Descrição:** Cliente aprova um orçamento

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "id": 2,
  "numero": "OS-2025-0002",
  "status": "aprovado",
  "valor_total_orcado": "5000.00",
  "data_aprovacao": "2025-05-02T14:00:00Z"
}
```

**Erros:**
- 401: Token inválido
- 404: Orçamento não encontrado

---

#### POST `/api/v1/portal/orcamentos/{id}/recusar/`

**Descrição:** Cliente recusa um orçamento com motivo

**Request:**
```json
{
  "motivo": "Valor fora do orçamento da empresa"
}
```

**Response (200):**
```json
{
  "id": 2,
  "numero": "OS-2025-0002",
  "status": "cancelado",
  "valor_total_orcado": "5000.00"
}
```

**Erros:**
- 401: Token inválido
- 404: Orçamento não encontrado

---

### 4. Notas Fiscais

#### GET `/api/v1/portal/minhas-notas/`

**Descrição:** Lista todas as Notas Fiscais emitidas para o cliente

**Response (200):**
```json
[
  {
    "id": 1,
    "numero": "OS-2025-0001",
    "numero_nf": "NF-2025-0001",
    "cliente_nome": "Empresa XYZ Ltda",
    "data_emissao_nf": "2025-05-02",
    "data_vencimento": "2025-05-15",
    "valor_final_faturado": "500.00",
    "status_pagamento": "pago",
    "pdf_nf": "https://exemplo.com/media/notas/NF-2025-0001.pdf"
  }
]
```

---

## Dados Visíveis para o Cliente

O Portal fornece acesso apenas aos dados públicos/relevantes para o cliente:

### Visível ✓
- Número da OS
- Status (em linguagem amigável)
- Data agendada
- Nome do técnico (apenas o nome, não dados internos)
- Descrição do serviço
- Fotos (antes e depois)
- Valor orçado
- Valor faturado
- Número da NF
- Status de pagamento
- Observações técnicas (laudo)

### Oculto ✗
- Chat interno
- Despesas
- Margens
- Informações financeiras internas
- Dados de outros clientes
- Histórico de mudanças de status
- Hora de início/conclusão do serviço
- Técnicos auxiliares

---

## Tratamento de Erros

Todos os endpoints retornam status HTTP apropriado:

- `200 OK`: Sucesso
- `201 Created`: Recurso criado
- `400 Bad Request`: Dados inválidos ou operação não permitida
- `401 Unauthorized`: Token inválido, ausente ou usuário inativo
- `404 Not Found`: Recurso não encontrado
- `500 Internal Server Error`: Erro no servidor

Formato de erro:
```json
{
  "detail": "Mensagem descritiva do erro"
}
```

---

## Exemplo de Uso (Frontend)

```javascript
// 1. Login
const loginResponse = await fetch('/api/v1/portal/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'contato@cliente.com',
    senha: 'senha123'
  })
});

const { token } = await loginResponse.json();
localStorage.setItem('portalToken', token);

// 2. Listar OS do cliente
const osResponse = await fetch('/api/v1/portal/minhas-os/', {
  headers: {
    'X-Portal-Token': localStorage.getItem('portalToken')
  }
});

const minhasOS = await osResponse.json();

// 3. Obter detalhes de uma OS
const detalheResponse = await fetch(`/api/v1/portal/minhas-os/1/`, {
  headers: {
    'X-Portal-Token': localStorage.getItem('portalToken')
  }
});

const detalhes = await detalheResponse.json();

// 4. Aprovar orçamento
const aprovarResponse = await fetch('/api/v1/portal/orcamentos/2/aprovar/', {
  method: 'POST',
  headers: {
    'X-Portal-Token': localStorage.getItem('portalToken')
  }
});

// 5. Recusar orçamento
const recusarResponse = await fetch('/api/v1/portal/orcamentos/2/recusar/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Portal-Token': localStorage.getItem('portalToken')
  },
  body: JSON.stringify({
    motivo: 'Valor fora do orçamento'
  })
});
```

---

## Segurança

- Tokens são assinados com salt único (`portal-cliente`)
- Cada requisição valida o token antes de retornar dados
- Dados do cliente são isolados por ID do cliente
- Senhas são hasheadas com PBKDF2 ou Argon2
- Sem acesso a dados de outros clientes ou informações sensíveis internas

---

## Configuração do Django

### settings.py

Adicione ao `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    ...
    'apps.portal',
    ...
]
```

### urls.py

Já incluído na config principal:
```python
path("portal/", include("apps.portal.urls")),
```

---

## Permissões

O app portal fornece três classes de permissão customizadas em `permissions.py`:

1. **IsPortalUser**: Valida se o token é válido
2. **IsPortalOwner**: Garante que o usuário só acessa seus próprios dados
3. **IsPortalAuthenticatedOrReadOnly**: Requer autenticação

---

## Admin Django

O modelo `UsuarioPortal` é acessível no Django Admin para criar/gerenciar usuários do portal.

Acesse: `/admin/portal/usuarioportal/`

---

## Próximos Passos

1. Criar frontend separado para o portal (React)
2. Implementar relative link de relatório público (sem autenticação)
3. Adicionar notificações por email ao cliente
4. Implementar sistema de suporte integrado
5. Adicionar histórico de acessos e auditoria
