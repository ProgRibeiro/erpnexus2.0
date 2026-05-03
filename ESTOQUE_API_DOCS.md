# Módulo de Estoque - Documentação da API

## Visão Geral

O módulo de Estoque fornece controle completo de inventário com:
- CRUD de Produtos
- Rastreamento de movimentações
- Alertas automáticos de estoque baixo
- Relatórios detalhados
- Integração com Ordens de Serviço

---

## Endpoints da API

### Categorias de Produtos

#### Lista todas as categorias
```
GET /api/v1/estoque/categorias/
```
**Filtros**: `nome`, `ativo`
**Busca**: `nome`, `descricao`

#### Criar categoria
```
POST /api/v1/estoque/categorias/
Content-Type: application/json

{
  "nome": "Gás Refrigerante",
  "descricao": "Gases para sistemas de climatização",
  "ativo": true
}
```

#### Atualizar categoria
```
PATCH /api/v1/estoque/categorias/{id}/
```

#### Deletar categoria
```
DELETE /api/v1/estoque/categorias/{id}/
```

---

### Produtos

#### Lista todos os produtos
```
GET /api/v1/estoque/produtos/
```

**Filtros disponíveis**:
- `?ativo=true` - Apenas produtos ativos
- `?categoria={id}` - Produtos de uma categoria específica
- `?unidade_medida=un` - Produtos em unidade específica
- `?abaixo_minimo=true` - Produtos com estoque abaixo do mínimo

**Busca**:
- `?search=PRD-0001` - Por código
- `?search=Filtro` - Por nome

**Ordenação**:
- `?ordering=nome` - Alfabético
- `?ordering=-preco_venda` - Maior preço primeiro

#### Detalhes do produto
```
GET /api/v1/estoque/produtos/{id}/
```

**Resposta inclui**:
- Dados do produto
- Estoque atual (calculado)
- Se está em alerta
- Margens unitária e percentual
- Histórico de movimentações
- Alertas associados

#### Criar produto
```
POST /api/v1/estoque/produtos/
Content-Type: application/json

{
  "nome": "Filtro de Ar 5 micra",
  "categoria": "550e8400-e29b-41d4-a716-446655440000",
  "unidade_medida": "caixa",
  "preco_custo": "15.00",
  "preco_venda": "35.00",
  "estoque_minimo": "5",
  "localizacao": "Prateleira A3",
  "ativo": true
}
```

#### Atualizar produto
```
PATCH /api/v1/estoque/produtos/{id}/
```

#### Produtos em alerta
```
GET /api/v1/estoque/produtos/em_alerta/
```

#### Histórico de movimentações do produto
```
GET /api/v1/estoque/produtos/{id}/historico_movimentacoes/
```

---

### Movimentações de Estoque

#### Listar movimentações
```
GET /api/v1/estoque/movimentacoes/
```

**Filtros**:
- `?tipo=entrada` - Apenas entradas
- `?tipo=saida` - Apenas saídas
- `?motivo=compra` - Por motivo
- `?os={id}` - Movimentações de uma OS específica
- `?produto={id}` - Movimentações de um produto

**Busca**: `produto`, `fornecedor`, `numero_nota`

#### Registrar entrada de estoque
```
POST /api/v1/estoque/movimentacoes/
Content-Type: application/json

{
  "produto": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "entrada",
  "quantidade": "100",
  "valor_unitario": "2.50",
  "motivo": "compra",
  "fornecedor": "Fornecedor ABC",
  "numero_nota": "NF-001",
  "observacoes": "Lote 001"
}
```

#### Registrar saída de estoque
```
POST /api/v1/estoque/movimentacoes/
Content-Type: application/json

{
  "produto": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "saida",
  "quantidade": "10",
  "valor_unitario": "2.50",
  "motivo": "uso_os",
  "os": "550e8400-e29b-41d4-a716-446655440001",
  "observacoes": "Material utilizado na OS"
}
```

**Motivos de movimentação**:
- `compra` - Compra de fornecedor
- `uso_os` - Uso em Ordem de Serviço
- `perda` - Perda/dano
- `ajuste_inventario` - Ajuste de inventário
- `devolucao` - Devolução de fornecedor
- `consumo_interno` - Consumo administrativo
- `amostra` - Amostra

---

### Alertas de Estoque

#### Listar todos os alertas
```
GET /api/v1/estoque/alertas/
```

**Filtros**:
- `?tipo=estoque_baixo`
- `?tipo=sem_estoque`
- `?lido=false` - Alertas não lidos
- `?produto={id}` - Alertas de um produto

#### Alertas não lidos
```
GET /api/v1/estoque/alertas/nao_lidos/
```

#### Marcar alerta como lido
```
POST /api/v1/estoque/alertas/{id}/marcar_como_lido/
```

#### Marcar todos os alertas como lidos
```
POST /api/v1/estoque/alertas/marcar_todos_como_lido/
```

---

### Relatórios

#### Dashboard de estoque
```
GET /api/v1/estoque/dashboard/
```

**Retorna**:
```json
{
  "produtos_total": 45,
  "produtos_em_alerta": 3,
  "alertas_nao_lidos": 2,
  "movimentacoes_hoje": 5,
  "valor_total_estoque": "15234.50"
}
```

#### Relatório de movimentações
```
GET /api/v1/estoque/relatorio/
```

**Filtros**:
- `?produto={id}` - Movimentações de um produto
- `?tipo=entrada` - Apenas entradas
- `?motivo=compra` - Por motivo
- `?data_inicio=2025-04-01` - Data inicial
- `?data_fim=2025-04-30` - Data final

#### Relatório de produtos
```
GET /api/v1/estoque/relatorio-produtos/
```

**Retorna resumo de todos os produtos com**:
- Estoque atual
- Movimentações (entradas, saídas, ajustes)
- Valor total de custo
- Margens calculadas

---

## Tipos de Dados

### Unidades de Medida
- `un` - Unidade
- `m` - Metro
- `m2` - Metro quadrado
- `kg` - Quilograma
- `litro` - Litro
- `par` - Par
- `caixa` - Caixa

### Tipos de Movimentação
- `entrada` - Entrada de estoque
- `saida` - Saída de estoque
- `ajuste` - Ajuste de inventário
- `transferencia` - Transferência entre locais

### Tipos de Alerta
- `estoque_baixo` - Estoque abaixo do mínimo
- `sem_estoque` - Estoque zerado
- `fora_minimo` - Fora do mínimo configurado

---

## Propriedades Calculadas

### Estoque Atual
```
estoque_atual = soma(entradas) - soma(saídas) + ajustes
```

### Margem Unitária
```
margem_unitaria = preco_venda - preco_custo
```

### Margem Percentual
```
margem_percentual = ((preco_venda - preco_custo) / preco_custo) * 100
```

### Em Alerta
```
em_alerta = estoque_atual <= estoque_minimo
```

---

## Regras de Negócio

1. **Cálculo de Estoque Automático**: O estoque_atual é calculado dinamicamente baseado nas movimentações
2. **Geração de Alertas**: Um alerta é criado automaticamente quando uma movimentação resulta em estoque abaixo do mínimo
3. **Baixa por Despesa de Material**: Ao lançar uma despesa de material em uma OS, é possível baixar automaticamente do estoque (adicionar `baixar_estoque=sim` na descrição)
4. **Integração com OS**: Movimentações podem estar vinculadas a uma Ordem de Serviço para rastreabilidade completa
5. **Rastreabilidade**: Todas as movimentações registram usuário, data/hora e motivo

---

## Integração com Ordens de Serviço

### Baixar estoque ao lançar despesa de material

Ao criar uma DespesaOS com `tipo=material`:

1. Se a descrição contiver `baixar_estoque=sim`:
   - Procura um produto com nome semelhante
   - Cria automaticamente uma MovimentacaoEstoque de saída
   - Registra motivo como `uso_os`

**Exemplo de descrição**:
```
"Filtro de Ar 5 micra: baixar_estoque=sim"
```

---

## Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| 404 Not Found | Produto não existe | Verificar o ID do produto |
| 400 Bad Request | Quantidade negativa | Quantidade deve ser > 0 |
| 400 Bad Request | Categoria não existe | Criar categoria primeiro |
| 403 Forbidden | Sem autenticação | Adicionar token de autenticação |
| 409 Conflict | Código duplicado | Código gerado automaticamente |

---

## Configurações (settings.py)

```python
# Email de notificação de estoque baixo
EMAIL_NOTIFICACAO_ESTOQUE = "administrativo@empresa.com.br"

# Ativar/desativar notificações
NOTIFICAR_ESTOQUE_BAIXO = True
```

---

## Exemplos de Uso

### 1. Criar um novo produto

```bash
curl -X POST http://localhost:8000/api/v1/estoque/produtos/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Compressor de Ar",
    "categoria": "550e8400-e29b-41d4-a716-446655440000",
    "preco_custo": "500.00",
    "preco_venda": "1200.00",
    "estoque_minimo": "2",
    "unidade_medida": "un"
  }'
```

### 2. Registrar entrada de estoque

```bash
curl -X POST http://localhost:8000/api/v1/estoque/movimentacoes/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "produto": "550e8400-e29b-41d4-a716-446655440001",
    "tipo": "entrada",
    "quantidade": "5",
    "valor_unitario": "500.00",
    "motivo": "compra",
    "fornecedor": "Distribuidor XYZ",
    "numero_nota": "NF-12345"
  }'
```

### 3. Listar produtos em alerta

```bash
curl -X GET "http://localhost:8000/api/v1/estoque/produtos/?abaixo_minimo=true" \
  -H "Authorization: Bearer {token}"
```

### 4. Obter dashboard de estoque

```bash
curl -X GET http://localhost:8000/api/v1/estoque/dashboard/ \
  -H "Authorization: Bearer {token}"
```
