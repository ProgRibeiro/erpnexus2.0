"""
Exemplos Práticos de Uso da Integração OS → Financeiro

Este arquivo contém exemplos reais de como a integração funciona.
"""

# ============================================================
# EXEMPLO 1: Criar uma OS e gerar automaticamente receita
# ============================================================

from decimal import Decimal
from django.utils import timezone
from apps.clientes.models import Cliente
from apps.ordens.models import OrdemServico
from apps.financeiro.models import Lancamento, ContaBancaria

# Criar cliente
cliente = Cliente.objects.create(
    nome="Empresa XYZ",
    cnpj="12.345.678/0001-00",
    email="contato@xyz.com",
)

# Criar OS
os = OrdemServico.objects.create(
    cliente=cliente,
    status=OrdemServico.Status.ABERTA,
    tipo_servico=OrdemServico.TipoServico.MANUTENCAO,
    prioridade=OrdemServico.Prioridade.ALTA,
    valor_total_orcado=Decimal("5000.00"),
    valor_final_faturado=Decimal("5200.00"),
    data_vencimento=timezone.localdate() + timezone.timedelta(days=30),
)

# ... trabalho na OS, depois faturar:
os.status = OrdemServico.Status.FATURADA
os.numero_nf = "NF-2026-001"
os.data_emissao_nf = timezone.localdate()
os.save()

# AUTOMÁTICO: Signal cria Lancamento receita
lancamento = Lancamento.objects.filter(os=os).first()
print(f"✅ Lançamento criado automaticamente: {lancamento}")
print(f"   - Tipo: {lancamento.tipo}")
print(f"   - Valor: R$ {lancamento.valor}")
print(f"   - Status: {lancamento.status}")
# Output:
# ✅ Lançamento criado automaticamente: Faturamento OS-2026-0001
#    - Tipo: receita
#    - Valor: R$ 5200.00
#    - Status: pendente


# ============================================================
# EXEMPLO 2: Registrar uma despesa na OS
# ============================================================

from apps.ordens.models import DespesaOS

# Criar despesa
despesa = DespesaOS.objects.create(
    os=os,
    descricao="Material de substituição",
    valor=Decimal("500.00"),
    tipo=DespesaOS.Tipo.MATERIAL,
    data_despesa=timezone.localdate(),
)

# AUTOMÁTICO: Signal cria Lancamento despesa
lancamento_despesa = Lancamento.objects.filter(
    os=os,
    tipo=Lancamento.Tipo.DESPESA
).first()
print(f"✅ Lançamento de despesa criado automaticamente: {lancamento_despesa}")
print(f"   - Valor: R$ {lancamento_despesa.valor}")
print(f"   - Status: {lancamento_despesa.status} (já pago)")
# Output:
# ✅ Lançamento de despesa criado automaticamente: Despesa OS OS-2026-0001: Material de substituição
#    - Valor: R$ 500.00
#    - Status: pago (já pago)


# ============================================================
# EXEMPLO 3: Receber pagamento e atualizar OS
# ============================================================

# Cliente paga o lançamento
lancamento.status = Lancamento.Status.PAGO
lancamento.data_pagamento = timezone.localdate()
lancamento.save()

# AUTOMÁTICO: Múltiplos signals executam
os.refresh_from_db()
print(f"✅ OS atualizada automaticamente após pagamento:")
print(f"   - status_pagamento: {os.status_pagamento} (era: pendente)")
print(f"   - data_recebimento: {os.data_recebimento}")
# Output:
# ✅ OS atualizada automaticamente após pagamento:
#    - status_pagamento: pago (era: pendente)
#    - data_recebimento: 2026-05-02


# ============================================================
# EXEMPLO 4: Recalcular saldo de uma conta manualmente
# ============================================================

from apps.financeiro.tasks import recalcular_saldo_conta

conta = ContaBancaria.objects.get(nome="Caixa principal")

# Chamar função helper
resultado = recalcular_saldo_conta(conta.id)

print(f"✅ Saldo recalculado para {resultado['conta_nome']}:")
print(f"   - Saldo Inicial: R$ {resultado['saldo_inicial']:.2f}")
print(f"   - Receitas Pagas: R$ {resultado['receitas']:.2f}")
print(f"   - Despesas Pagas: R$ {resultado['despesas']:.2f}")
print(f"   - Saldo Calculado: R$ {resultado['saldo_calculado']:.2f}")
# Output:
# ✅ Saldo recalculado para Caixa principal:
#    - Saldo Inicial: R$ 1000.00
#    - Receitas Pagas: R$ 5200.00
#    - Despesas Pagas: R$ 500.00
#    - Saldo Calculado: R$ 5700.00


# ============================================================
# EXEMPLO 5: Cancelar uma OS e seus lançamentos
# ============================================================

# Cancelar OS
os.status = OrdemServico.Status.CANCELADA
os.save()

# AUTOMÁTICO: Signal cancela lançamentos pendentes
lancamento.refresh_from_db()
print(f"✅ Lançamento cancelado automaticamente:")
print(f"   - Status: {lancamento.status}")
# Output:
# ✅ Lançamento cancelado automaticamente:
#    - Status: cancelado

# Verificar que OS também foi atualizada
os.refresh_from_db()
print(f"   - OS status_pagamento: {os.status_pagamento}")
# Output:
#    - OS status_pagamento: cancelado


# ============================================================
# EXEMPLO 6: Executar tarefas Celery manualmente
# ============================================================

from apps.financeiro.tasks import (
    atualizar_lancamentos_vencidos,
    notificar_financeiro_atrasos,
    recalcular_saldo_todas_contas,
)

# Tarefa 1: Atualizar lançamentos vencidos
resultado_vencidos = atualizar_lancamentos_vencidos()
print(f"✅ Lançamentos vencidos atualizados:")
print(f"   - Total atualizado: {resultado_vencidos['lancamentos_atualizados']}")
print(f"   - Ordens atualizadas: {resultado_vencidos['ordens_atualizadas']}")

# Tarefa 2: Notificar atrasos
resultado_notificacoes = notificar_financeiro_atrasos()
print(f"✅ Notificações de atraso criadas:")
print(f"   - Total: {resultado_notificacoes['notificacoes_criadas']}")
print(f"   - Valor total em atraso: R$ {resultado_notificacoes['valor_total_atraso']:.2f}")

# Tarefa 3: Recalcular saldo de todas as contas
resultado_saldos = recalcular_saldo_todas_contas()
print(f"✅ Saldo recalculado para {resultado_saldos['total_contas']} contas")
for conta_info in resultado_saldos['contas']:
    print(f"   - {conta_info['conta_nome']}: R$ {conta_info['saldo_calculado']:.2f}")


# ============================================================
# EXEMPLO 7: Simular lançamento vencido (Celery Beat)
# ============================================================

import datetime
from apps.financeiro.models import Lancamento

# Criar lançamento que venceu ontem
ontem = timezone.localdate() - timezone.timedelta(days=1)

lancamento_vencido = Lancamento.objects.create(
    tipo=Lancamento.Tipo.RECEITA,
    descricao="Faturamento pendente",
    valor=Decimal("1000.00"),
    data_competencia=ontem,
    data_vencimento=ontem,  # Venceu!
    status=Lancamento.Status.PENDENTE,
    conta_bancaria=ContaBancaria.objects.get(nome="Caixa principal"),
    categoria=None,
)

print(f"📌 Lançamento criado com vencimento: {lancamento_vencido.data_vencimento}")
print(f"   - Status: {lancamento_vencido.status}")

# Quando Celery Beat executar atualizar_lancamentos_vencidos():
resultado = atualizar_lancamentos_vencidos()

lancamento_vencido.refresh_from_db()
print(f"✅ Após Celery Beat:")
print(f"   - Status: {lancamento_vencido.status} (atualizado para ATRASADO)")
print(f"   - Total atualizado: {resultado['lancamentos_atualizados']}")


# ============================================================
# EXEMPLO 8: Fluxo completo de uma OS (início ao fim)
# ============================================================

from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

# 1. Criar usuário e cliente
usuario = User.objects.create_user(username="tecnico@test.com", password="senha")
cliente_novo = Cliente.objects.create(
    nome="Cliente ABC",
    cnpj="98.765.432/0001-11",
)

# 2. Criar OS em rascunho
os_nova = OrdemServico.objects.create(
    numero="OS-2026-0100",
    cliente=cliente_novo,
    status=OrdemServico.Status.RASCUNHO,
    valor_total_orcado=Decimal("10000.00"),
    criado_por=usuario,
)
print(f"1️⃣ OS criada em rascunho: {os_nova.numero}")

# 3. Aprovar OS
os_nova.status = OrdemServico.Status.APROVADA
os_nova.save()
print(f"2️⃣ OS aprovada")

# 4. Executar serviço
os_nova.status = OrdemServico.Status.EM_EXECUCAO
os_nova.save()
print(f"3️⃣ OS em execução")

# 5. Concluir serviço
os_nova.status = OrdemServico.Status.CONCLUIDA
os_nova.save()
print(f"4️⃣ OS concluída")

# 6. Faturar (CRIA RECEITA AUTOMATICAMENTE)
os_nova.status = OrdemServico.Status.FATURADA
os_nova.numero_nf = "NF-2026-0100"
os_nova.data_emissao_nf = timezone.localdate()
os_nova.data_vencimento = timezone.localdate() + timezone.timedelta(days=15)
os_nova.valor_final_faturado = Decimal("10500.00")
os_nova.save()
print(f"5️⃣ OS faturada - Lançamento receita criado automaticamente")

# 7. Registrar despesas (CRIA DESPESAS AUTOMATICAMENTE)
despesa_novo = DespesaOS.objects.create(
    os=os_nova,
    descricao="Compressor",
    valor=Decimal("1500.00"),
    tipo=DespesaOS.Tipo.MATERIAL,
    registrado_por=usuario,
)
print(f"6️⃣ Despesa registrada - Lançamento despesa criado automaticamente")

# 8. Receber pagamento (ATUALIZA OS AUTOMATICAMENTE)
lancamento_receita = Lancamento.objects.get(
    os=os_nova,
    tipo=Lancamento.Tipo.RECEITA,
)
lancamento_receita.status = Lancamento.Status.PAGO
lancamento_receita.data_pagamento = timezone.localdate()
lancamento_receita.save()

os_nova.refresh_from_db()
print(f"7️⃣ Pagamento recebido")
print(f"   - OS status_pagamento: {os_nova.status_pagamento}")
print(f"   - OS data_recebimento: {os_nova.data_recebimento}")

# 9. Recalcular saldo
conta_principal = ContaBancaria.objects.get(nome="Caixa principal")
resultado_final = recalcular_saldo_conta(conta_principal.id)
print(f"8️⃣ Saldo final da conta: R$ {resultado_final['saldo_calculado']:.2f}")

print(f"\n✅ Fluxo completo finalizado com sucesso!")


# ============================================================
# EXEMPLO 9: Query para auditoria
# ============================================================

# Encontrar todas as OS com atraso
from apps.ordens.models import OrdemServico

os_atrasadas = OrdemServico.objects.filter(
    status_pagamento=OrdemServico.StatusPagamento.VENCIDO,
    data_vencimento__lt=timezone.localdate(),
)

for os_atrasada in os_atrasadas:
    lancamentos = Lancamento.objects.filter(os=os_atrasada)
    dias_atraso = (timezone.localdate() - os_atrasada.data_vencimento).days
    print(f"⚠️ OS {os_atrasada.numero}: {dias_atraso} dias de atraso")
    for lancamento in lancamentos:
        print(f"   - {lancamento.descricao}: R$ {lancamento.valor} ({lancamento.status})")


# ============================================================
# EXEMPLO 10: Troubleshooting - Verificar integridade
# ============================================================

# Função para verificar integridade da integração
def verificar_integridade_os_financeiro():
    """Verifica se a integração está funcionando corretamente."""

    problemas = []

    # 1. Verificar se existe conta padrão
    conta_padrao = ContaBancaria.objects.filter(nome="Caixa principal").first()
    if not conta_padrao:
        problemas.append("❌ Conta 'Caixa principal' não existe")

    # 2. Verificar se existem categorias padrão
    categorias = CategoriaFinanceira.objects.filter(
        nome__in=["Receita de servicos", "Despesas de OS"]
    )
    if categorias.count() < 2:
        problemas.append("❌ Categorias padrão não configuradas")

    # 3. Verificar OS faturadas sem lançamentos
    os_faturadas_sem_lancamento = OrdemServico.objects.filter(
        status=OrdemServico.Status.FATURADA,
    ).exclude(lancamentos_financeiros__isnull=False)

    if os_faturadas_sem_lancamento.exists():
        problemas.append(
            f"⚠️ {os_faturadas_sem_lancamento.count()} OS faturadas sem lançamentos"
        )

    # 4. Verificar saldos inconsistentes
    contas = ContaBancaria.objects.filter(ativo=True)
    for conta in contas:
        resultado = recalcular_saldo_conta(conta.id)
        # Aqui poderia comparar com um saldo_atual se fosse armazenado
        print(f"   ✅ Conta {conta.nome}: R$ {resultado['saldo_calculado']:.2f}")

    if not problemas:
        print("✅ Integração OS ↔ Financeiro funcionando corretamente!")
        return True
    else:
        print("❌ Problemas encontrados:")
        for problema in problemas:
            print(f"   {problema}")
        return False

# Executar verificação
verificar_integridade_os_financeiro()
