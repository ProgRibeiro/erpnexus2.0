# Integração OS → Financeiro (C5) do ERP

Documentação técnica completa da integração entre Ordens de Serviço e Financeiro.

## Visão Geral

A integração OS→Financeiro automatiza a criação e atualização de lançamentos financeiros com base nas mudanças de status das Ordens de Serviço. O sistema utiliza Django Signals para automação em tempo real e Celery Beat para tarefas agendadas.

## Arquitetura

### 1. Signals (tempo real)

Arquivo: `signals.py`

#### 1.1 Signals da OrdemServico

**Signal: `guardar_status_anterior_os`** (pre_save)
- Armazena o status anterior da OS antes de salvar
- Necessário para detectar mudanças de status

**Signal: `sincronizar_lancamento_os`** (post_save)
- **FATURADA**: Cria automaticamente um Lancamento tipo RECEITA
  - Valor: `valor_final_faturado` ou `valor_total_orcado`
  - Status: PENDENTE
  - Categoria: "Receita de servicos"
  - Conta: Caixa principal
  - Data vencimento: `data_vencimento` da OS

- **CANCELADA**: Cancela todos os lançamentos associados
  - Exceção: Lançamentos já pagos não são cancelados
  - Outros lançamentos: Status muda para CANCELADO

#### 1.2 Signals do Lancamento

**Signal: `guardar_status_anterior_lancamento`** (pre_save)
- Armazena o status anterior do Lancamento antes de salvar
- Necessário para detectar mudanças de status

**Signal: `atualizar_pagamento_os`** (post_save)
- Sincroniza status de pagamento da OS com status do Lancamento

Mapeamento:
| Lancamento Status | OS status_pagamento |
|---|---|
| PAGO | PAGO |
| ATRASADO | VENCIDO |
| CANCELADO | CANCELADO |
| Outros | PENDENTE |

**Signal: `atualizar_data_recebimento_os`** (post_save)
- Quando Lancamento status muda para "pago" → atualiza OS.data_recebimento
- Define `data_recebimento` para data de pagamento ou hoje
- Sincroniza `status_pagamento` para PAGO

**Signal: `recalcular_saldo_conta_ao_pagar`** (post_save)
- Quando Lancamento é pago → recalcula o saldo da ContaBancaria
- Previne inconsistências de saldo
- Chamada: `recalcular_saldo_conta(conta_id)`

#### 1.3 Signals da DespesaOS

**Signal: `criar_lancamento_despesa_os`** (post_save)
- Quando DespesaOS é registrada → cria automaticamente um Lancamento DESPESA
- Características:
  - Tipo: DESPESA
  - Status: PAGO (despesas já são consideradas realizadas)
  - Data pagamento: `data_despesa`
  - Categoria: "Despesas de OS"
  - Conta: Caixa principal
  - Valor igual ao da DespesaOS
- Após criação, recalcula saldo da conta

## 2. Tarefas Celery (agendadas diariamente)

Arquivo: `tasks.py`

### 2.1 `recalcular_saldo_conta(conta_id)` - Função Helper

**Tipo**: Função sincronizada (não é task)

**Descrição**: Recalcula o saldo de uma conta bancária sem confiar no `saldo_atual`.

**Fórmula**:
```
Saldo = Saldo Inicial + (Receitas Pagas - Despesas Pagas)
```

**Parâmetros**:
- `conta_id` (int): ID da ContaBancaria

**Retorno**:
```python
{
    "conta_id": int,
    "conta_nome": str,
    "saldo_inicial": float,
    "receitas": float,      # Soma de Lancamentos RECEITA pagos
    "despesas": float,      # Soma de Lancamentos DESPESA pagos
    "saldo_calculado": float,
    "erro": str  # Opcional, se conta não encontrada
}
```

**Princípio**: Nunca confie no `saldo_atual` sem recalcular!

### 2.2 `atualizar_lancamentos_vencidos()` - Task Celery

**Agendamento**: Diariamente (configurado em CELERY_BEAT_SCHEDULE)

**Nome da Task**: `financeiro.atualizar_lancamentos_vencidos`

**Descrição**: Varrer lançamentos vencidos e marcar como atrasados.

**Lógica**:
1. Encontrar Lancamentos com `status=PENDENTE` e `data_vencimento < hoje`
2. Atualizar status para `ATRASADO`
3. Para lançamentos receita vinculados a OS, atualizar `status_pagamento` para `VENCIDO`

**Retorno**:
```python
{
    "data_execucao": "2026-05-02",
    "lancamentos_atualizados": int,
    "ordens_atualizadas": int,
    "status": "sucesso"
}
```

### 2.3 `notificar_financeiro_atrasos()` - Task Celery

**Agendamento**: Diariamente (configurado em CELERY_BEAT_SCHEDULE)

**Nome da Task**: `financeiro.notificar_financeiro_atrasos`

**Descrição**: Notificar financeiro sobre lançamentos em atraso.

**Lógica**:
1. Encontrar todos os Lancamentos com `status=ATRASADO`
2. Criar LogNotificacao para cada um (se não existir)
3. Tipo de notificação: `PAGAMENTO_ATRASADO`
4. Destinatário: `financeiro@empresa.com`
5. Conteúdo inclui: dias de atraso, valor e descrição

**Retorno**:
```python
{
    "notificacoes_criadas": int,
    "valor_total_atraso": float,  # Soma de valores em atraso
    "status": "sucesso"
}
```

### 2.4 `recalcular_saldo_todas_contas()` - Task Celery

**Agendamento**: Diariamente (configurado em CELERY_BEAT_SCHEDULE)

**Nome da Task**: `financeiro.recalcular_saldo_todas_contas`

**Descrição**: Recalcular saldo de todas as contas bancárias ativas.

**Lógica**:
1. Filtrar ContaBancaria com `ativo=True`
2. Para cada conta, chamar `recalcular_saldo_conta(conta_id)`
3. Retornar lista com todos os resultados

**Retorno**:
```python
{
    "total_contas": int,
    "contas": [
        {
            "conta_id": int,
            "conta_nome": str,
            "saldo_inicial": float,
            "receitas": float,
            "despesas": float,
            "saldo_calculado": float
        },
        ...
    ],
    "status": "sucesso"
}
```

## 3. Configuração

### 3.1 Celery Beat Schedule (settings.py)

```python
CELERY_BEAT_SCHEDULE = {
    # Tarefa diária: Varrer lançamentos vencidos e marcar como atrasados
    "atualizar_lancamentos_vencidos": {
        "task": "financeiro.atualizar_lancamentos_vencidos",
        "schedule": timedelta(days=1),
        "options": {"queue": "default"},
    },
    # Tarefa diária: Notificar financeiro sobre atrasos
    "notificar_financeiro_atrasos": {
        "task": "financeiro.notificar_financeiro_atrasos",
        "schedule": timedelta(days=1),
        "options": {"queue": "default"},
    },
    # Tarefa diária: Recalcular saldo de todas as contas
    "recalcular_saldo_todas_contas": {
        "task": "financeiro.recalcular_saldo_todas_contas",
        "schedule": timedelta(days=1),
        "options": {"queue": "default"},
    },
}
```

### 3.2 Registro de Signals (apps.py)

```python
class FinanceiroConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.financeiro"
    verbose_name = "Financeiro"

    def ready(self):
        import apps.financeiro.signals  # noqa: F401
```

## 4. Fluxo de Dados

### 4.1 Fluxo de Faturamento

```
OrdemServico.status = FATURADA
    ↓
[Signal: sincronizar_lancamento_os]
    ↓
Cria Lancamento RECEITA
    ↓
OrdemServico.status_pagamento = PENDENTE
```

### 4.2 Fluxo de Pagamento

```
Lancamento.status = PAGO
    ↓
[Signal: atualizar_pagamento_os]
[Signal: atualizar_data_recebimento_os]
[Signal: recalcular_saldo_conta_ao_pagar]
    ↓
OrdemServico.status_pagamento = PAGO
OrdemServico.data_recebimento = (data pagamento)
ContaBancaria.saldo recalculado
```

### 4.3 Fluxo de Atraso

```
[Celery Beat - Diário]
    ↓
[Task: atualizar_lancamentos_vencidos]
    ↓
Lancamento.status = ATRASADO
OrdemServico.status_pagamento = VENCIDO
    ↓
[Task: notificar_financeiro_atrasos]
    ↓
Cria LogNotificacao PAGAMENTO_ATRASADO
```

### 4.4 Fluxo de Despesa

```
DespesaOS criada
    ↓
[Signal: criar_lancamento_despesa_os]
    ↓
Cria Lancamento DESPESA (Status: PAGO)
    ↓
[Signal: recalcular_saldo_conta_ao_pagar]
    ↓
ContaBancaria.saldo recalculado
```

## 5. Testes

Arquivo: `tests.py`

### Testes de Signals (FinanceiroSignalTests)

1. `test_sinal_faturamento_cria_lancamento_receita`
   - Verifica criação automática de receita quando OS é faturada

2. `test_sinal_os_cancelada_cancela_lancamentos`
   - Verifica cancelamento de lançamentos quando OS é cancelada

3. `test_sinal_lancamento_pago_atualiza_os`
   - Verifica atualização de status_pagamento quando Lancamento é pago
   - Verifica atualização de data_recebimento

4. `test_sinal_lancamento_atrasado_atualiza_os`
   - Verifica sincronização de status quando Lancamento fica atrasado

5. `test_sinal_despesa_os_cria_lancamento_despesa`
   - Verifica criação automática de despesa quando DespesaOS é registrada

6. `test_sinal_lancamento_cancelado_atualiza_os`
   - Verifica atualização de status quando Lancamento é cancelado

### Testes de Celery (FinanceiroCeleryTests)

1. `test_tarefa_recalcular_saldo_conta`
   - Verifica cálculo correto: Inicial + Receitas - Despesas
   - Testa fórmula: 1000 + 500 - 100 = 1400

2. `test_tarefa_atualizar_lancamentos_vencidos`
   - Verifica que apenas pendentes vencidos são marcados como atrasados
   - Verifica que futuros não são afetados

3. `test_saldo_nunca_confia_sem_recalcular`
   - Confirma que saldo deve ser recalculado (não confiar em saldo_atual)

## 6. Executar os Testes

```bash
# Todos os testes
python manage.py test apps.financeiro.tests

# Apenas signals
python manage.py test apps.financeiro.tests.FinanceiroSignalTests -v 2

# Apenas celery
python manage.py test apps.financeiro.tests.FinanceiroCeleryTests -v 2

# Teste específico
python manage.py test apps.financeiro.tests.FinanceiroSignalTests.test_sinal_faturamento_cria_lancamento_receita
```

## 7. Monitorar Tarefas Celery Beat

```bash
# Iniciar Celery Beat
celery -A config beat -l info

# Iniciar Celery Worker (em outro terminal)
celery -A config worker -l info

# Monitor Celery em tempo real
celery -A config events
```

## 8. Logs

Os signals e tasks registram informações em `logging.getLogger(__name__)`.

Exemplo de logs:
```
INFO: Lançamento receita criado automaticamente para OS OS-2026-0001
INFO: Data de recebimento atualizada para OS OS-2026-0001: 2026-05-02
INFO: Saldo recalculado para conta Caixa principal
INFO: Lançamentos vencidos atualizados: 5, Ordens de Serviço atualizadas: 3
ERROR: Erro ao recalcular saldo: Conta não encontrada
```

## 9. Considerações de Produção

### 9.1 Reliability
- Signals são síncronos (executam imediatamente)
- Tasks Celery são assincronos (podem ter falhas)
- Implemente retry com `celery.shared_task(bind=True, autoretry_for=(...), max_retries=3)`

### 9.2 Performance
- Consultas de lançamentos podem ser lentas com muitos registros
- Considere índices em `Lancamento(status, data_vencimento)`
- Batch updates para evitar N+1 queries

### 9.3 Transações
- Signals dentro de transações da requisição
- Tasks Celery fora de transações (execute após commit)
- Use `transaction.on_commit()` para garantir ordem

### 9.4 Idempotência
- Tasks devem ser idempotentes (seguras de rodar múltiplas vezes)
- Use `get_or_create()` em vez de `create()`

## 10. Troubleshooting

### Problema: Lançamentos não estão sendo criados

**Solução**:
1. Verificar se signals estão importados em `apps.py`
2. Verificar logs: `DEBUG=True` e `LOGGING['apps.financeiro']`
3. Verificar se ContaBancaria "Caixa principal" existe
4. Verificar se CategoriaFinanceira existe

### Problema: Saldo inconsistente

**Solução**:
1. Executar `recalcular_saldo_conta(conta_id)` manualmente
2. Verificar se existem Lancamentos não pagos
3. Verificar se `saldo_inicial` está correto

### Problema: Tasks não executando

**Solução**:
1. Verificar se Celery Beat está rodando
2. Verificar se Redis está acessível
3. Verificar se tasks estão importadas corretamente
4. Executar manualmente: `from apps.financeiro.tasks import *; atualizar_lancamentos_vencidos()`

## 11. Estrutura de Arquivos

```
apps/financeiro/
├── __init__.py
├── models.py              # Modelos (Lancamento, ContaBancaria, etc)
├── signals.py             # Signals (NOVO: expandido)
├── tasks.py               # Tasks Celery (NOVO: expandido)
├── tests.py               # Testes (NOVO: expandido)
├── apps.py                # Configuração (inclui signals)
├── serializers.py
├── views.py
├── urls.py
├── admin.py
└── INTEGRACAO_OS_FINANCEIRO.md  # Esta documentação
```

## 12. Resumo de Mudanças

### Antes
- Apenas alguns signals básicos
- Sem notificações automáticas
- Sem recálculo de saldo automático
- Sem testes

### Depois (Implementação C5)
- ✅ Todos os signals organizados e documentados
- ✅ Função `recalcular_saldo_conta()` para cálculo preciso
- ✅ Tarefas Celery Beat para automação diária
- ✅ Notificações automáticas de atrasos
- ✅ Suite completa de testes
- ✅ Integração OS ↔ Financeiro bidirecional
- ✅ Logging detalhado para troubleshooting

