# Módulo de Estoque - Guia de Implementação

## Resumo Executivo

O módulo de Estoque foi completamente implementado conforme o Prompt 6.1 do ERP_Prompts_Completo_3.md com as seguintes funcionalidades:

✅ CRUD completo de Produtos e Categorias  
✅ Sistema de Movimentações com 4 tipos (entrada, saída, ajuste, transferência)  
✅ Cálculo automático de estoque: `estoque_atual = soma(entradas) - soma(saídas) + ajustes`  
✅ Sistema de Alertas automáticos quando `estoque_atual <= estoque_minimo`  
✅ Endpoints de Relatórios (movimentações, produtos, dashboard)  
✅ Integração com Ordens de Serviço para baixa de material  
✅ Signals para notificação de alertas por email  
✅ Admin Django customizado  
✅ Testes unitários  

---

## Arquitetura

### Modelos (models.py)

#### 1. **CategoriaProduto**
- Organiza produtos por tipo
- Campos: nome (unique), descricao, ativo, timestamps

#### 2. **Produto**
- Produto do estoque com rastreamento completo
- Campos-chave:
  - `codigo` (gerado automaticamente)
  - `preco_custo`, `preco_venda`
  - `estoque_minimo` (para alertas)
  - `localizacao` (texto livre: prateleira, gaveta, etc)
  
- Propriedades calculadas:
  - `estoque_atual` - Calculado dinamicamente
  - `em_alerta` - Boolean se `estoque_atual <= estoque_minimo`
  - `margem_unitaria` - `preco_venda - preco_custo`
  - `margem_percentual` - Cálculo percentual

#### 3. **MovimentacaoEstoque**
- Registra cada movimento de estoque
- Tipos:
  - `entrada` - Recebimento
  - `saida` - Consumo/Venda
  - `ajuste` - Correção de inventário
  - `transferencia` - Entre locais
  
- Motivos:
  - `compra`, `uso_os`, `perda`, `ajuste_inventario`
  - `devolucao`, `consumo_interno`, `amostra`
  
- Campos:
  - `os` (ForeignKey opcional) - Vincula à Ordem de Serviço
  - `fornecedor` - Nome do fornecedor
  - `numero_nota` - NF ou documento
  - `realizado_por` - Usuário que fez a movimentação

#### 4. **AlertaEstoque**
- Alertas automáticos de estoque baixo
- Tipos:
  - `estoque_baixo` - Abaixo do mínimo
  - `sem_estoque` - Quantidade = 0
  - `fora_minimo` - Fora da configuração
  
- Campos:
  - `lido` - Controle de leitura
  - `resolvido_em` - Quando foi resolvido

---

### Serializers (serializers.py)

- **CategoriaProdutoSerializer** - Básico
- **ProdutoSerializer** - Com campos calculados
- **ProdutoDetalheSerializer** - Inclui movimentações e alertas
- **MovimentacaoEstoqueSerializer** - Com dados relacionados
- **AlertaEstoqueSerializer** - Alertas com referências
- **ServicoSerializer** - Serviços (não é estoque mas está no app)

Todos com validações e campos read-only apropriados.

---

### Views (views.py)

#### ViewSets
- `CategoriaProdutoViewSet` - CRUD de categorias
- `ProdutoViewSet` - CRUD + ações customizadas
  - Ação: `em_alerta` - GET produtos em alerta
  - Ação: `historico_movimentacoes` - GET histórico do produto
- `MovimentacaoEstoqueViewSet` - CRUD + validações
- `AlertaEstoqueViewSet` - Read-only + ações
  - Ação: `marcar_como_lido` - POST marca alerta como lido
  - Ação: `marcar_todos_como_lido` - POST marca todos
  - Ação: `nao_lidos` - GET apenas não lidos

#### Funções (API Views)
- `relatorio_estoque()` - GET histórico de movimentações com filtros
- `relatorio_produtos()` - GET resumo de todos os produtos
- `dashboard_estoque()` - GET métricas principais

**Todos os endpoints requerem autenticação (IsAuthenticated)**

---

### Signals (signals.py)

#### 1. `gerar_alerta_estoque_baixo`
- **Trigger**: `post_save` de MovimentacaoEstoque
- **Ação**: Cria AlertaEstoque se estoque <= mínimo
- **Tipos**: SEM_ESTOQUE (qty=0) ou ESTOQUE_BAIXO

#### 2. `notificar_movimentacao_registrada`
- **Trigger**: `post_save` de MovimentacaoEstoque com motivo USO_OS
- **Ação**: Prepara notificação para financeiro (extensível)

#### 3. `perguntar_baixa_estoque_material`
- **Trigger**: `post_save` de DespesaOS (Ordens)
- **Ação**: Se descricao contém "baixar_estoque=sim"
  - Procura produto por nome
  - Cria MovimentacaoEstoque de saída automaticamente

#### 4. `enviar_notificacao_estoque_baixo`
- **Trigger**: Chamada interna após gerar alerta
- **Ação**: Envia email para EMAIL_NOTIFICACAO_ESTOQUE
- **Configurável**: NOTIFICAR_ESTOQUE_BAIXO (settings.py)

---

### Admin Django (admin.py)

Interfaces customizadas para:
- **ProdutoAdmin** - Exibe estoque_atual, mostra alertas visuais
- **MovimentacaoEstoqueAdmin** - Filtros por tipo, motivo, data
- **AlertaEstoqueAdmin** - Gerenciar alertas com status
- **CategoriaProdutoAdmin** - Básico
- **ServicoAdmin** - Serviços associados

---

## Endpoints Principais

### Base URL
```
/api/v1/estoque/
```

### Categorias
```
GET    /categorias/                           - Listar
POST   /categorias/                           - Criar
GET    /categorias/{id}/                      - Detalhe
PATCH  /categorias/{id}/                      - Atualizar
DELETE /categorias/{id}/                      - Deletar
```

### Produtos
```
GET    /produtos/                             - Listar (com filtros)
GET    /produtos/?abaixo_minimo=true          - Produtos em alerta
POST   /produtos/                             - Criar
GET    /produtos/{id}/                        - Detalhe (com histórico)
PATCH  /produtos/{id}/                        - Atualizar
DELETE /produtos/{id}/                        - Deletar
GET    /produtos/em_alerta/                   - Ação customizada
GET    /produtos/{id}/historico_movimentacoes/ - Ação customizada
```

### Movimentações
```
GET    /movimentacoes/                        - Listar (com filtros)
POST   /movimentacoes/                        - Registrar entrada/saída
GET    /movimentacoes/{id}/                   - Detalhe
PATCH  /movimentacoes/{id}/                   - Atualizar
DELETE /movimentacoes/{id}/                   - Deletar
```

### Alertas
```
GET    /alertas/                              - Listar
GET    /alertas/nao_lidos/                    - Apenas não lidos
POST   /alertas/{id}/marcar_como_lido/        - Marcar como lido
POST   /alertas/marcar_todos_como_lido/       - Marcar todos
```

### Relatórios
```
GET    /relatorio/                            - Movimentações com filtros
GET    /relatorio-produtos/                   - Resumo de produtos
GET    /dashboard/                            - Métricas principais
```

---

## Integração com Ordens de Serviço

### Fluxo Automático

1. **Despesa de Material em OS criada**
   - Sistema detecta `tipo=MATERIAL`
   - Se descricao contém `"baixar_estoque=sim"`:
     - Procura produto por nome
     - Cria MovimentacaoEstoque de saída
     - Registra motivo como USO_OS
     - Vincula à OS para rastreabilidade

2. **Movimentação de Saída criada**
   - Signal `gerar_alerta_estoque_baixo` executado
   - Se `estoque_atual <= estoque_minimo`:
     - Cria AlertaEstoque
     - Envia email de notificação (se configurado)

### Exemplo de Integração

```python
# Em DespesaOS, ao criar despesa de material:
despesa = DespesaOS.objects.create(
    os=ordem_servico,
    descricao="Compressor de Ar 3hp: baixar_estoque=sim",
    valor=Decimal("1200.00"),
    tipo=DespesaOS.Tipo.MATERIAL,
    registrado_por=usuario
)
# → Signal cria automaticamente:
#   MovimentacaoEstoque(
#     produto=Compressor,
#     tipo=SAIDA,
#     motivo=USO_OS,
#     os=ordem_servico
#   )
```

---

## Testes

Arquivo: `tests.py`

### Cobertura de Testes

- **CategoriaProdutoTestCase**
  - ✅ Criar categoria
  - ✅ Validar unicidade

- **ProdutoTestCase**
  - ✅ Criar produto
  - ✅ Gerar código automático
  - ✅ Calcular estoque_atual
  - ✅ Detectar alerta
  - ✅ Calcular margens

- **MovimentacaoEstoqueTestCase**
  - ✅ Entrada de estoque
  - ✅ Saída de estoque
  - ✅ Geração de alertas
  - ✅ Cálculo correto

### Executar Testes

```bash
python manage.py test apps.estoque
```

---

## Configurações Necessárias

### settings.py

```python
# Email de notificação de estoque baixo
EMAIL_NOTIFICACAO_ESTOQUE = "administrativo@empresa.com.br"

# Ativar/desativar notificações
NOTIFICAR_ESTOQUE_BAIXO = True

# Servidor SMTP (já configurado no ERP)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'seu-servidor-smtp.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'seu-email@empresa.com.br'
EMAIL_HOST_PASSWORD = 'senha'
DEFAULT_FROM_EMAIL = 'sistema@empresa.com.br'
```

### Migrações

```bash
# Criar migrações
python manage.py makemigrations estoque

# Aplicar migrações
python manage.py migrate estoque
```

---

## Casos de Uso

### 1. Recebimento de Material

```bash
POST /api/v1/estoque/movimentacoes/
{
  "produto": "uuid-123",
  "tipo": "entrada",
  "quantidade": 100,
  "valor_unitario": 2.50,
  "motivo": "compra",
  "fornecedor": "Fornecedor ABC",
  "numero_nota": "NF-001"
}
```

### 2. Usar Material em OS

```bash
# Opção A: Via despesa (automático)
POST /api/v1/ordens/{id}/despesas/
{
  "descricao": "Compressor de Ar: baixar_estoque=sim",
  "valor": 1200.00,
  "tipo": "material"
}

# Opção B: Via movimentação (manual)
POST /api/v1/estoque/movimentacoes/
{
  "produto": "uuid-456",
  "tipo": "saida",
  "quantidade": 1,
  "motivo": "uso_os",
  "os": "uuid-os-123"
}
```

### 3. Ajuste de Inventário

```bash
POST /api/v1/estoque/movimentacoes/
{
  "produto": "uuid-789",
  "tipo": "ajuste",
  "quantidade": 5,  # Positivo para aumentar
  "motivo": "ajuste_inventario",
  "observacoes": "Contagem física revelou diferença"
}
```

### 4. Consultar Alertas

```bash
# Não lidos
GET /api/v1/estoque/alertas/nao_lidos/

# Marcar como lido
POST /api/v1/estoque/alertas/{id}/marcar_como_lido/

# Dashboard com resumo
GET /api/v1/estoque/dashboard/
```

---

## Performance

### Otimizações Implementadas

1. **Database Queries**
   - ViewSets usam `select_related()` e `prefetch_related()`
   - Índices no banco para campos frequentes

2. **Cálculos**
   - Propriedades `estoque_atual` calculadas dinamicamente
   - Agregações via `.aggregate(Sum())` para melhor performance

3. **Paginação**
   - DefaultRouter configura paginação automática
   - 20 itens por página (configurável)

---

## Segurança

1. **Autenticação**: Todos os endpoints requerem token JWT
2. **Permissões**: `IsAuthenticated` em todas as views
3. **Auditoria**: Cada movimentação registra `realizado_por` e timestamps
4. **Validações**: Serializers validam quantidade > 0, valores >= 0

---

## Próximas Melhorias (Opcional)

- [ ] Relatório de movimentações exportável em Excel
- [ ] Previsão de demanda com base em histórico
- [ ] Transferências entre locais com aprovação
- [ ] Integração com APIs de fornecedores
- [ ] Notificações em tempo real via WebSocket
- [ ] Mobile app para leitura de código de barras

---

## Arquivos Modificados/Criados

```
apps/estoque/
├── models.py              ← Expandido com AlertaEstoque e propriedades
├── serializers.py         ← Expandido com novos serializers
├── views.py               ← Expandido com novo ViewSet e endpoints
├── urls.py                ← Atualizado com novos endpoints
├── signals.py             ← Expandido com novos signals
├── admin.py               ← Customizado com interfaces
├── tests.py               ← Testes unitários implementados
└── apps.py                ← Signals registrados (já estava)

Documentação:
├── ESTOQUE_API_DOCS.md    ← Documentação completa da API
└── ESTOQUE_IMPLEMENTACAO.md ← Este arquivo
```

---

## Suporte e Troubleshooting

### Problema: Alertas não estão sendo criados

**Solução**:
1. Verificar se `apps.estoque` está em `INSTALLED_APPS`
2. Verificar se `apps.estoque.signals` foi importado em `apps.py`
3. Executar: `python manage.py makemigrations && python manage.py migrate`

### Problema: Email não está sendo enviado

**Solução**:
1. Verificar configurações SMTP em `settings.py`
2. Verificar se `EMAIL_NOTIFICACAO_ESTOQUE` está configurado
3. Verificar se `NOTIFICAR_ESTOQUE_BAIXO = True`
4. Testar conexão SMTP

### Problema: Estoque_atual sempre retorna zero

**Solução**:
1. Verificar se MovimentacaoEstoque foi criada
2. Verificar tipo: deve ser `entrada`, não `saida`
3. Verificar se os dados foram salvos no banco

---

**Implementação completa conforme Prompt 6.1 ✅**
