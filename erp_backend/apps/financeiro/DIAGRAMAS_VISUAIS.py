"""
DIAGRAMA VISUAL - Integração OS → Financeiro

Visualização dos fluxos e relacionamentos da integração.
"""

# ============================================================
# 1. DIAGRAMA DE FLUXO - Faturamento
# ============================================================

DIAGRAMA_FATURAMENTO = """
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE FATURAMENTO                         │
└─────────────────────────────────────────────────────────────────┘

1. Usuário cria OS e trabalha nela
   ┌──────────────────┐
   │ OrdemServico     │
   │ status: ABERTA   │
   │ valor: 5000.00   │
   └──────────────────┘

2. Usuário muda OS para FATURADA
   ┌──────────────────┐
   │ OrdemServico     │
   │ status: FATURADA ◄─── .save()
   │ numero_nf: 001   │
   └──────────────────┘
            │
            ▼
   ┌─────────────────────────────────────┐
   │ [Signal: pre_save]                  │
   │ guardar_status_anterior_os()        │
   │ Armazena: status_anterior = ABERTA  │
   └─────────────────────────────────────┘
            │
            ▼
   ┌──────────────────┐
   │ .save() chamado  │
   └──────────────────┘
            │
            ▼
   ┌─────────────────────────────────────┐
   │ [Signal: post_save]                 │
   │ sincronizar_lancamento_os()         │
   │                                     │
   │ if status == FATURADA and           │
   │    status_anterior != FATURADA:     │
   │   Cria Lancamento...                │
   └─────────────────────────────────────┘
            │
            ▼ Cria automaticamente
   ┌──────────────────────────────┐
   │ Lancamento (RECEITA)         │
   │ descricao: Faturamento OS-01 │
   │ valor: 5000.00               │
   │ status: PENDENTE             │
   │ conta: Caixa principal       │
   │ data_vencimento: +30 dias    │
   └──────────────────────────────┘
            │
            ▼
   ┌──────────────────┐
   │ OS atualizada    │
   │ status_pagamento │
   │    = PENDENTE    │
   └──────────────────┘

resultado: ✅ OS faturada + Lancamento receita criado
"""

# ============================================================
# 2. DIAGRAMA DE FLUXO - Pagamento
# ============================================================

DIAGRAMA_PAGAMENTO = """
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE PAGAMENTO                           │
└─────────────────────────────────────────────────────────────────┘

1. Cliente paga → Usuário marca Lancamento como PAGO
   ┌──────────────────────┐
   │ Lancamento (RECEITA) │
   │ status: PENDENTE     │ ◄─── .save()
   │ valor: 5000.00       │
   │ os: OS-01            │
   └──────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────┐
   │ [Signal: pre_save]                  │
   │ guardar_status_anterior_lancamento()│
   │ Armazena: status_anterior = PENDENTE│
   └─────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────┐
   │ [Signal: post_save] #1   │
   │ atualizar_pagamento_os() │
   │                          │
   │ OS.status_pagamento      │
   │    = PAGO                │
   └──────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ [Signal: post_save] #2               │
   │ atualizar_data_recebimento_os()      │
   │                                      │
   │ if status == PAGO:                   │
   │   OS.data_recebimento = hoje         │
   │   OS.status_pagamento = PAGO         │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ [Signal: post_save] #3               │
   │ recalcular_saldo_conta_ao_pagar()    │
   │                                      │
   │ Chama:                               │
   │ recalcular_saldo_conta(conta_id)     │
   └──────────────────────────────────────┘
            │
            ▼
   ┌────────────────────────────────────┐
   │ Helper: recalcular_saldo_conta()   │
   │                                    │
   │ receitas = SUM(RECEITA.PAGO)       │
   │ despesas = SUM(DESPESA.PAGO)       │
   │                                    │
   │ saldo = inicial + receitas - despesas│
   │ saldo = 1000 + 5000 - 500 = 5500   │
   └────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────┐
   │ ContaBancaria atualizada │
   │ saldo_calculado: 5500    │
   └──────────────────────────┘

resultado: ✅ OS.status_pagamento = PAGO
           ✅ OS.data_recebimento = hoje
           ✅ Saldo da conta recalculado
"""

# ============================================================
# 3. DIAGRAMA DE FLUXO - Atraso (Celery Beat)
# ============================================================

DIAGRAMA_ATRASO = """
┌─────────────────────────────────────────────────────────────────┐
│                FLUXO DE ATRASO (Celery Beat)                    │
└─────────────────────────────────────────────────────────────────┘

[Scheduler Celery Beat - Diário às 00:00]
         │
         ▼
   ┌─────────────────────────────────────┐
   │ Task: atualizar_lancamentos_vencidos│
   │ schedule: timedelta(days=1)         │
   └─────────────────────────────────────┘
         │
         ▼
   ┌──────────────────────────────────────┐
   │ Encontra Lancamento onde:            │
   │ - status = PENDENTE                  │
   │ - data_vencimento < hoje (2026-05-01)│
   │ - hoje é 2026-05-02                  │
   │                                      │
   │ Resultado: 5 lançamentos vencidos    │
   └──────────────────────────────────────┘
         │
         ▼
   ┌──────────────────────────────────────┐
   │ Atualiza:                            │
   │                                      │
   │ Lancamento.status = ATRASADO         │
   │ (5 registros)                        │
   └──────────────────────────────────────┘
         │
         ▼
   ┌──────────────────────────────────────┐
   │ Para cada OS vinculada (receita):    │
   │ OS.status_pagamento = VENCIDO        │
   │ (3 ordens)                           │
   └──────────────────────────────────────┘
         │
         ▼
   ┌──────────────────────────────────────┐
   │ Task: notificar_financeiro_atrasos()  │
   │                                       │
   │ Para cada Lancamento ATRASADO:        │
   │   Cria LogNotificacao                 │
   │   tipo: PAGAMENTO_ATRASADO            │
   │   conteúdo: dias de atraso + valor    │
   │   destinatario: financeiro@empresa    │
   │                                       │
   │ Resultado: 5 notificações             │
   └──────────────────────────────────────┘
         │
         ▼
   ┌──────────────────────────────────────┐
   │ Task: recalcular_saldo_todas_contas()│
   │                                       │
   │ Para cada ContaBancaria ativa:        │
   │   recalcular_saldo_conta()            │
   │                                       │
   │ Resultado: 3 contas recalculadas      │
   └──────────────────────────────────────┘

resultado: ✅ Lançamentos marcados como ATRASADO
           ✅ OS status_pagamento = VENCIDO
           ✅ Financeiro notificado
           ✅ Saldos recalculados
"""

# ============================================================
# 4. DIAGRAMA DE FLUXO - Despesa
# ============================================================

DIAGRAMA_DESPESA = """
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE DESPESA                             │
└─────────────────────────────────────────────────────────────────┘

1. Usuário registra DespesaOS
   ┌──────────────────────┐
   │ DespesaOS            │
   │ os: OS-01            │ ◄─── .save()
   │ descricao: Material  │
   │ valor: 500.00        │
   │ tipo: MATERIAL       │
   │ data_despesa: hoje   │
   └──────────────────────┘
         │
         ▼
   ┌──────────────────────────────────────┐
   │ [Signal: post_save]                  │
   │ criar_lancamento_despesa_os()        │
   │                                      │
   │ if created:                          │
   │   Cria Lancamento...                 │
   └──────────────────────────────────────┘
         │
         ▼ Cria automaticamente
   ┌──────────────────────────────┐
   │ Lancamento (DESPESA)         │
   │ descricao: Despesa OS OS-01  │
   │ valor: 500.00                │
   │ status: PAGO (já realizada)  │
   │ data_pagamento: hoje         │
   │ conta: Caixa principal       │
   └──────────────────────────────┘
         │
         ▼
   ┌──────────────────────────────────────┐
   │ [Signal: post_save]                  │
   │ recalcular_saldo_conta_ao_pagar()    │
   │                                      │
   │ Recalcula saldo da conta imediatamente
   │ saldo = 5500 - 500 = 5000            │
   └──────────────────────────────────────┘

resultado: ✅ DespesaOS criada
           ✅ Lancamento despesa criado
           ✅ Saldo da conta recalculado
"""

# ============================================================
# 5. DIAGRAMA DE ESTRUTURA DE BANCO DE DADOS
# ============================================================

DIAGRAMA_BANCO_DADOS = """
┌─────────────────────────────────────────────────────────────────┐
│              ESTRUTURA DE DADOS RELACIONADA                     │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  ContaBancaria      │
                    │  - nome             │
                    │  - banco            │
                    │  - saldo_inicial    │ ◄─── recalcular_saldo_conta()
                    │  - ativo            │      (nunca confia nele)
                    └─────────────────────┘
                            ▲
                            │ (FK)
                            │
        ┌─────────────────────────────────────┐
        │      Lancamento (RECEITA)           │
        │  - tipo: RECEITA                    │
        │  - descricao                        │
        │  - valor                            │
        │  - status (PENDENTE/PAGO/ATRASADO)  │
        │  - data_vencimento                  │
        │  - data_pagamento                   │
        │  - conta_bancaria (FK)              │
        │  - os (FK)  ─────────┐              │
        │  - categoria (FK)    │              │
        └─────────────────────────────────────┘
                            │
                            │ (FK)
                            │
                    ┌──────────────────────┐
                    │  OrdemServico        │
                    │  - status            │
                    │  - status_pagamento  │◄─── atualizado por Signals
                    │  - data_recebimento  │◄─── atualizado por Signals
                    │  - valor_final_      │
                    │    faturado          │
                    │  - data_vencimento   │
                    │  - cliente (FK)      │
                    └──────────────────────┘
                            │
                            ▼
                    ┌──────────────────────┐
                    │  DespesaOS           │
                    │  - os (FK)           │
                    │  - descricao         │
                    │  - valor             │
                    │  - tipo              │
                    │  - data_despesa      │
                    └──────────────────────┘
                            │
                            │ [Signal] Cria
                            ▼
        ┌─────────────────────────────────────┐
        │      Lancamento (DESPESA)           │
        │  - tipo: DESPESA                    │
        │  - status: PAGO                     │
        │  - valor                            │
        │  - data_pagamento = data_despesa    │
        │  - os (FK)                          │
        │  - conta_bancaria (FK)              │
        └─────────────────────────────────────┘

════════════════════════════════════════════════════════════════

Relacionamentos:
- OrdemServico.status = FATURADA → Signal cria Lancamento RECEITA
- DespesaOS criada → Signal cria Lancamento DESPESA
- Lancamento.status = PAGO → Signal atualiza OS
- Lancamento.status = ATRASADO → Task Celery Beat muda OS
"""

# ============================================================
# 6. DIAGRAMA DE SIGNALS
# ============================================================

DIAGRAMA_SIGNALS = """
┌─────────────────────────────────────────────────────────────────┐
│                      SIGNALS IMPLEMENTADOS                      │
└─────────────────────────────────────────────────────────────────┘

OrdemServico
│
├─ [pre_save]
│  └─ guardar_status_anterior_os()
│     └─ Armazena status anterior para comparação
│
├─ [post_save]
│  └─ sincronizar_lancamento_os()
│     ├─ Se status = FATURADA → Cria Lancamento RECEITA
│     └─ Se status = CANCELADA → Cancela Lancamentos vinculados
│
└─ Relacionados: OrdemServico.status_pagamento atualizado

Lancamento
│
├─ [pre_save]
│  └─ guardar_status_anterior_lancamento()
│     └─ Armazena status anterior para comparação
│
├─ [post_save] - Signal 1
│  └─ atualizar_pagamento_os()
│     └─ Se Lancamento RECEITA muda → Atualiza OS.status_pagamento
│        ├─ PAGO → status_pagamento = PAGO
│        ├─ ATRASADO → status_pagamento = VENCIDO
│        ├─ CANCELADO → status_pagamento = CANCELADO
│        └─ Outros → status_pagamento = PENDENTE
│
├─ [post_save] - Signal 2
│  └─ atualizar_data_recebimento_os()
│     └─ Se status = PAGO → Atualiza OS.data_recebimento
│        └─ data_recebimento = data_pagamento ou hoje
│
├─ [post_save] - Signal 3
│  └─ recalcular_saldo_conta_ao_pagar()
│     └─ Se status = PAGO → Recalcula saldo da conta
│        └─ Chama: recalcular_saldo_conta(conta_id)
│
└─ Relacionados: OrdemServico atualizado

DespesaOS
│
└─ [post_save]
   └─ criar_lancamento_despesa_os()
      ├─ Se criada (created=True) → Cria Lancamento DESPESA
      └─ Chama: recalcular_saldo_conta() imediatamente
"""

# ============================================================
# 7. DIAGRAMA DE TASKS CELERY BEAT
# ============================================================

DIAGRAMA_CELERY_BEAT = """
┌─────────────────────────────────────────────────────────────────┐
│              TASKS CELERY BEAT (Agendadas Diariamente)          │
└─────────────────────────────────────────────────────────────────┘

[Scheduler Celery Beat]
│
├─ Schedule: timedelta(days=1)  (DIÁRIO, 00:00 por padrão)
│
├─ Task 1: atualizar_lancamentos_vencidos()
│  ├─ Encontra: Lancamento.status = PENDENTE AND data_vencimento < hoje
│  ├─ Ação: Marca como ATRASADO
│  ├─ Efeito: OS.status_pagamento = VENCIDO
│  └─ Retorna: {lancamentos_atualizados, ordens_atualizadas}
│
├─ Task 2: notificar_financeiro_atrasos()
│  ├─ Encontra: Lancamento.status = ATRASADO
│  ├─ Ação: Cria LogNotificacao
│  ├─ Tipo: PAGAMENTO_ATRASADO
│  └─ Retorna: {notificacoes_criadas, valor_total_atraso}
│
└─ Task 3: recalcular_saldo_todas_contas()
   ├─ Itera: Todas as ContaBancaria com ativo = True
   ├─ Ação: Chama recalcular_saldo_conta() para cada
   ├─ Fórmula: saldo = inicial + receitas_pagas - despesas_pagas
   └─ Retorna: {total_contas, [contas com saldos]}

════════════════════════════════════════════════════════════════

Função Helper (não é task, mas usada por signals e tasks):
├─ recalcular_saldo_conta(conta_id)
│  ├─ Suma: Lancamento.RECEITA.PAGO
│  ├─ Soma: Lancamento.DESPESA.PAGO
│  ├─ Calcula: saldo_inicial + receitas - despesas
│  ├─ Logging: Detalhado
│  └─ Retorna: {conta_id, conta_nome, saldo_inicial, receitas, despesas, saldo_calculado}
│
└─ Princípio: NUNCA confiar no saldo_atual sem recalcular
"""

# ============================================================
# 8. DIAGRAMA DE EXECUTION FLOW
# ============================================================

DIAGRAMA_EXECUTION_FLOW = """
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION FLOW COMPLETO                      │
└─────────────────────────────────────────────────────────────────┘

Timeline - Uma OS completa do início ao fim:

T0: Criar OS
    └─ os = OrdemServico.objects.create(...)
       └─ Nenhum signal dispara

T1: Executar trabalho
    └─ os.status = "em_execucao"
       └─ os.save()
          └─ Nenhum lancamento criado

T2: Faturar
    └─ os.status = "faturada"
       └─ os.numero_nf = "NF-001"
          └─ os.save()
             ├─ [pre_save] Guarda status anterior
             ├─ [post_save] Detecta mudança para FATURADA
             ├─ [post_save] Cria Lancamento RECEITA
             └─ OS.status_pagamento = PENDENTE

T3: (Opcional) Registrar Despesa
    └─ despesa = DespesaOS.objects.create(...)
       ├─ [post_save] Cria Lancamento DESPESA
       ├─ [post_save] Recalcula saldo: 1000 + 5000 - 500 = 4500
       └─ Lancamento.status = PAGO (já pago)

T4: Cliente paga
    └─ lancamento.status = "pago"
       └─ lancamento.save()
          ├─ [pre_save] Guarda status anterior = PENDENTE
          ├─ [post_save] #1 Atualiza OS.status_pagamento = PAGO
          ├─ [post_save] #2 Atualiza OS.data_recebimento = hoje
          ├─ [post_save] #3 Recalcula saldo conta
          └─ OS completamente paga e com data confirmada

════════════════════════════════════════════════════════════════

Alternativo - Se não pagar até vencimento:

T0: Lancamento criado
    └─ data_vencimento = 2026-05-01
       └─ status = PENDENTE

T1: Passa 1 dia (Celery Beat executa)
    └─ hoje = 2026-05-02
       ├─ Task: atualizar_lancamentos_vencidos()
       │  └─ Encontra Lancamento com data_vencimento < hoje
       │     ├─ Marca como ATRASADO
       │     └─ OS.status_pagamento = VENCIDO
       │
       ├─ Task: notificar_financeiro_atrasos()
       │  └─ Cria LogNotificacao
       │     └─ Financeiro notificado
       │
       └─ Task: recalcular_saldo_todas_contas()
          └─ Recalcula saldos (nenhum pagamento, sem mudança)
"""

# Imprimir todos os diagramas
if __name__ == "__main__":
    print(DIAGRAMA_FATURAMENTO)
    print("\n" + "="*70 + "\n")
    print(DIAGRAMA_PAGAMENTO)
    print("\n" + "="*70 + "\n")
    print(DIAGRAMA_ATRASO)
    print("\n" + "="*70 + "\n")
    print(DIAGRAMA_DESPESA)
    print("\n" + "="*70 + "\n")
    print(DIAGRAMA_BANCO_DADOS)
    print("\n" + "="*70 + "\n")
    print(DIAGRAMA_SIGNALS)
    print("\n" + "="*70 + "\n")
    print(DIAGRAMA_CELERY_BEAT)
    print("\n" + "="*70 + "\n")
    print(DIAGRAMA_EXECUTION_FLOW)
