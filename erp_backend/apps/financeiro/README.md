# README - Integração OS → Financeiro (C5)

Implementação completa da integração entre Ordens de Serviço (OS) e Módulo Financeiro do ERP.

## Arquivo de Início Rápido

Para entender como funciona a integração, comece aqui:

1. **INTEGRACAO_OS_FINANCEIRO.md** - Documentação técnica completa
   - Arquitetura
   - Todos os signals
   - Todas as tasks Celery
   - Fluxos de dados
   - Troubleshooting

2. **EXEMPLOS_PRATICOS.py** - Código executável com exemplos reais
   - Como criar OS e gerar receita automaticamente
   - Como registrar despesas
   - Como receber pagamentos
   - Funções de auditoria

## Estrutura de Arquivos

```
apps/financeiro/
├── signals.py                       # Automação em tempo real (240 linhas)
│   ├── @receiver(pre_save, OrdemServico)
│   ├── @receiver(post_save, OrdemServico)
│   ├── @receiver(pre_save, Lancamento)
│   ├── @receiver(post_save, Lancamento) - 3 signals para sincronização
│   └── @receiver(post_save, DespesaOS)
│
├── tasks.py                         # Tarefas Celery agendadas (200 linhas)
│   ├── recalcular_saldo_conta()     # Helper para cálculo preciso
│   ├── atualizar_lancamentos_vencidos()
│   ├── notificar_financeiro_atrasos()
│   └── recalcular_saldo_todas_contas()
│
├── tests.py                         # Suite completa de testes (350 linhas)
│   ├── FinanceiroSignalTests (6 testes)
│   └── FinanceiroCeleryTests (3 testes)
│
├── apps.py                          # Registro de signals (MODIFICADO)
├── models.py                        # Modelos do financeiro
├── INTEGRACAO_OS_FINANCEIRO.md      # Documentação técnica completa
└── EXEMPLOS_PRATICOS.py             # Exemplos de código executável
```

## Mudanças Principais

### 1. signals.py (Expandido)

**Antes**: 114 linhas com signals básicos

**Depois**: 240 linhas com signals completos e documentados

Novos signals:
- `atualizar_data_recebimento_os()` - Atualiza data_recebimento quando pago
- `recalcular_saldo_conta_ao_pagar()` - Recalcula saldo da conta
- Logging detalhado para cada operação

### 2. tasks.py (Expandido)

**Antes**: 28 linhas com uma única tarefa

**Depois**: 200 linhas com 3 tasks + função helper

Novas tasks:
- `recalcular_saldo_conta(conta_id)` - Helper para recálculo de saldo
- `notificar_financeiro_atrasos()` - Notifica atrasos automaticamente
- `recalcular_saldo_todas_contas()` - Recalcula todas as contas diariamente

### 3. tests.py (Novo)

**Antes**: Vazio

**Depois**: 350 linhas com 9 testes completos

Cobertura:
- 6 testes de signals
- 3 testes de Celery tasks
- Cobertura de fluxos completos

### 4. settings.py (Adicionado)

**Novo**: CELERY_BEAT_SCHEDULE com 3 tarefas agendadas

```python
CELERY_BEAT_SCHEDULE = {
    "atualizar_lancamentos_vencidos": {...},
    "notificar_financeiro_atrasos": {...},
    "recalcular_saldo_todas_contas": {...},
}
```

## Como Usar

### Teste Local

```bash
# Executar todos os testes
python manage.py test apps.financeiro.tests -v 2

# Teste específico
python manage.py test apps.financeiro.tests.FinanceiroSignalTests.test_sinal_faturamento_cria_lancamento_receita
```

### Celery Beat (Produção)

```bash
# Terminal 1: Iniciar Celery Beat
celery -A config beat -l info

# Terminal 2: Iniciar Celery Worker
celery -A config worker -l info

# Terminal 3: Monitor
celery -A config events
```

### Executar Tasks Manualmente

```python
from apps.financeiro.tasks import (
    atualizar_lancamentos_vencidos,
    recalcular_saldo_todas_contas,
)

# Executar
resultado = atualizar_lancamentos_vencidos()
print(resultado)
```

## Fluxos Principais

### Fluxo 1: Faturamento Automático

```
OS.status = FATURADA
    ↓
[Signal] Cria Lancamento RECEITA
    ↓
OS.status_pagamento = PENDENTE
```

### Fluxo 2: Recebimento de Pagamento

```
Lancamento.status = PAGO
    ↓
[3 Signals] Atualizam OS + Recalculam saldo
    ↓
OS.status_pagamento = PAGO
OS.data_recebimento = data_pagamento
ContaBancaria.saldo recalculado
```

### Fluxo 3: Detecção de Atraso (Diário)

```
[Celery Beat - 00:00]
    ↓
atualizar_lancamentos_vencidos()
    ↓
Lancamento.status = ATRASADO
OS.status_pagamento = VENCIDO
    ↓
notificar_financeiro_atrasos()
    ↓
LogNotificacao criada
```

## Princípios Implementados

### 1. Automação em Tempo Real
- Signals síncronos executam imediatamente
- Não há lag entre mudança e sincronização
- Dados sempre consistentes

### 2. Recálculo Automático de Saldo
- Função `recalcular_saldo_conta()` para precisão
- Nunca confie no `saldo_atual` sem recalcular
- Previne inconsistências contábeis

### 3. Notificações Automáticas
- Financeiro notificado automaticamente de atrasos
- LogNotificacao integrada com notificacoes app
- Diário via Celery Beat

### 4. Rastreabilidade Completa
- Logging detalhado em cada operação
- LogStatusOS para OS (já existente)
- Possibilitar auditoria financeira

### 5. Idempotência
- Tasks podem rodar múltiplas vezes com segurança
- Uso de `get_or_create()` em signals
- Sem efeitos colaterais

## Estatísticas

| Métrica | Valor |
|---|---|
| Linhas de código (signals) | 240 |
| Linhas de código (tasks) | 200 |
| Linhas de código (testes) | 350 |
| Signals implementados | 7 |
| Tasks Celery | 3 |
| Testes | 9 |
| Documentação (linhas) | 500+ |

## Próximos Passos

### Sugerido para Produção

1. **Índices de Banco de Dados**
   ```sql
   CREATE INDEX idx_lancamento_status_data_vencimento 
   ON financeiro_lancamento(status, data_vencimento);
   ```

2. **Retry com Exponencial Backoff**
   ```python
   @shared_task(bind=True, autoretry_for=(...), max_retries=3)
   def atualizar_lancamentos_vencidos(self):
       ...
   ```

3. **Dead Letter Queue para Falhas**
   - Configurar Celery DLQ para tasks falhadas
   - Monitor via Sentry

4. **Métricas e Alertas**
   - Monitorar tempo de execução de tasks
   - Alertas se task falha (Datadog/NewRelic)

## Troubleshooting

### Lançamentos não criados?
1. Verificar se signals estão importados em `apps.py` ✓
2. Verificar se `ContaBancaria` "Caixa principal" existe
3. Verificar logs: `DEBUG=True`

### Saldo inconsistente?
1. Executar `recalcular_saldo_conta(conta_id)` manualmente
2. Verificar se não há Lancamentos duplicados
3. Verificar se `saldo_inicial` está correto

### Tasks não executando?
1. Verificar se Celery Beat está rodando
2. Verificar se Redis está acessível
3. Testar manualmente: `from apps.financeiro.tasks import *; atualizar_lancamentos_vencidos()`

## Suporte

Para dúvidas, consulte:
1. INTEGRACAO_OS_FINANCEIRO.md - Documentação técnica
2. EXEMPLOS_PRATICOS.py - Exemplos de código
3. tests.py - Testes como documentação executável
