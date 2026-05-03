"""
Tarefas Celery para Financeiro - Integração com Ordens de Serviço.

Responsabilidades:
- Varrer lançamentos vencidos diariamente
- Notificar financeiro sobre atrasos
- Recalcular saldo de todas as contas
- Função auxiliar para recalcular saldo de uma conta específica
"""

from celery import shared_task
from django.utils import timezone
from django.db.models import Sum, Q
import logging

from apps.ordens.models import OrdemServico
from apps.notificacoes.models import LogNotificacao

from .models import Lancamento, ContaBancaria

logger = logging.getLogger(__name__)


def recalcular_saldo_conta(conta_id):
    """
    Função helper: Recalcula o saldo de uma conta bancária.

    Suma todos os lançamentos pagos (receitas - despesas) e nunca confie no saldo_atual
    sem recalcular.

    Args:
        conta_id: ID da ContaBancaria

    Returns:
        dict com informação do saldo recalculado
    """
    try:
        conta = ContaBancaria.objects.get(id=conta_id)
    except ContaBancaria.DoesNotExist:
        logger.error(f"Conta bancária {conta_id} não encontrada")
        return {"erro": "Conta não encontrada", "conta_id": conta_id}

    # Somar receitas pagas
    receitas = Lancamento.objects.filter(
        conta_bancaria=conta,
        tipo=Lancamento.Tipo.RECEITA,
        status=Lancamento.Status.PAGO,
    ).aggregate(total=Sum("valor"))["total"] or 0

    # Somar despesas pagas
    despesas = Lancamento.objects.filter(
        conta_bancaria=conta,
        tipo=Lancamento.Tipo.DESPESA,
        status=Lancamento.Status.PAGO,
    ).aggregate(total=Sum("valor"))["total"] or 0

    # Saldo = Saldo Inicial + Receitas - Despesas
    saldo_calculado = conta.saldo_inicial + receitas - despesas

    logger.info(
        f"Saldo recalculado para {conta.nome}: "
        f"Inicial={conta.saldo_inicial} + Receitas={receitas} - Despesas={despesas} = {saldo_calculado}"
    )

    return {
        "conta_id": conta_id,
        "conta_nome": conta.nome,
        "saldo_inicial": float(conta.saldo_inicial),
        "receitas": float(receitas),
        "despesas": float(despesas),
        "saldo_calculado": float(saldo_calculado),
    }


@shared_task(name="financeiro.atualizar_lancamentos_vencidos")
def atualizar_lancamentos_vencidos():
    """
    Tarefa Celery: Varrer lançamentos vencidos e marcar como atrasados.

    Roda diariamente (configurado em CELERY_BEAT_SCHEDULE).

    Returns:
        dict com estatísticas da execução
    """
    hoje = timezone.localdate()

    # Encontrar lançamentos pendentes que venceram
    lancamentos_vencidos = Lancamento.objects.filter(
        status=Lancamento.Status.PENDENTE,
        data_vencimento__lt=hoje,
    )

    # Extrair IDs de OS vinculadas (receitas)
    os_ids = list(
        lancamentos_vencidos.filter(
            tipo=Lancamento.Tipo.RECEITA,
            os__isnull=False,
        ).values_list("os_id", flat=True)
    )

    # Atualizar status dos lançamentos
    total_atualizados = lancamentos_vencidos.update(status=Lancamento.Status.ATRASADO)

    # Atualizar status de pagamento das OS
    if os_ids:
        OrdemServico.objects.filter(id__in=os_ids).update(
            status_pagamento=OrdemServico.StatusPagamento.VENCIDO
        )

    logger.info(
        f"Lançamentos vencidos atualizados: {total_atualizados}, "
        f"Ordens de Serviço atualizadas: {len(os_ids)}"
    )

    return {
        "data_execucao": str(hoje),
        "lancamentos_atualizados": total_atualizados,
        "ordens_atualizadas": len(os_ids),
        "status": "sucesso",
    }


@shared_task(name="financeiro.notificar_financeiro_atrasos")
def notificar_financeiro_atrasos():
    """
    Tarefa Celery: Notificar financeiro sobre lançamentos em atraso.

    Roda diariamente (configurado em CELERY_BEAT_SCHEDULE).

    Returns:
        dict com informações das notificações criadas
    """
    # Encontrar lançamentos atrasados que ainda não foram notificados
    lancamentos_atrasados = Lancamento.objects.filter(
        status=Lancamento.Status.ATRASADO,
    ).select_related("conta_bancaria", "os")

    # Agrupar por dias de atraso
    total_valor_atraso = 0
    notificacoes_criadas = 0

    for lancamento in lancamentos_atrasados:
        total_valor_atraso += lancamento.valor

        # Criar notificação se não existir
        descricao_atraso = f"Atraso: {lancamento.descricao} - Vencimento: {lancamento.data_vencimento}"

        notificacao, criada = LogNotificacao.objects.get_or_create(
            tipo=LogNotificacao.Tipo.PAGAMENTO_ATRASADO,
            destinatario="financeiro@empresa.com",
            conteudo__contains=str(lancamento.id),
            defaults={
                "conteudo": (
                    f"Lançamento {lancamento.id} em atraso: {descricao_atraso}\n"
                    f"Valor: R$ {lancamento.valor:.2f}\n"
                    f"Dias de atraso: {(timezone.localdate() - lancamento.data_vencimento).days}"
                ),
                "status": LogNotificacao.Status.PENDENTE,
            },
        )

        if criada:
            notificacoes_criadas += 1

    logger.info(
        f"Notificações de atraso criadas: {notificacoes_criadas}, "
        f"Valor total em atraso: R$ {total_valor_atraso:.2f}"
    )

    return {
        "notificacoes_criadas": notificacoes_criadas,
        "valor_total_atraso": float(total_valor_atraso),
        "status": "sucesso",
    }


@shared_task(name="financeiro.recalcular_saldo_todas_contas")
def recalcular_saldo_todas_contas():
    """
    Tarefa Celery: Recalcular saldo de todas as contas bancárias.

    Roda diariamente (configurado em CELERY_BEAT_SCHEDULE).
    Previne inconsistências de saldo.

    Returns:
        dict com estatísticas de todas as contas
    """
    contas = ContaBancaria.objects.filter(ativo=True)
    resultados = []

    for conta in contas:
        resultado = recalcular_saldo_conta(conta.id)
        resultados.append(resultado)

    logger.info(f"Saldo recalculado para {len(resultados)} contas ativas")

    return {
        "total_contas": len(resultados),
        "contas": resultados,
        "status": "sucesso",
    }
