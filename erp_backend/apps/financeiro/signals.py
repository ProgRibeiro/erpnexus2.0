"""
Signals para integração entre Ordens de Serviço (OS) e Financeiro.

Responsabilidades:
- Criar lançamentos receita automaticamente quando OS é faturada
- Atualizar status de pagamento da OS quando Lancamento é pago/atrasado/cancelado
- Criar lançamentos despesa automaticamente quando DespesaOS é registrada
- Cancelar lançamentos quando OS é cancelada
- Atualizar data_recebimento da OS quando pagamento é recebido
- Recalcular saldo da conta quando lançamento é pago
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
import logging

from apps.ordens.models import DespesaOS, OrdemServico
from apps.notificacoes.models import LogNotificacao

from .models import CategoriaFinanceira, ContaBancaria, Lancamento

logger = logging.getLogger(__name__)


def _conta_padrao():
    """Retorna a conta bancária padrão (Caixa principal)."""
    conta, _ = ContaBancaria.objects.get_or_create(
        nome="Caixa principal",
        defaults={
            "banco": "Caixa interno",
            "tipo": ContaBancaria.Tipo.CAIXA,
            "saldo_inicial": 0,
            "ativo": True,
        },
    )
    return conta


def _categoria_padrao(tipo, nome):
    """Retorna a categoria financeira padrão para o tipo especificado."""
    categoria, _ = CategoriaFinanceira.objects.get_or_create(
        nome=nome,
        tipo=tipo,
        defaults={"cor": "#1677ff" if tipo == Lancamento.Tipo.RECEITA else "#cf1322"},
    )
    return categoria


# ========== SIGNALS DA ORDEM DE SERVIÇO ==========


@receiver(pre_save, sender=OrdemServico)
def guardar_status_anterior_os(sender, instance, **kwargs):
    """
    Signal: Armazena o status anterior da OS antes de salvar.
    Necessário para detectar mudanças de status.
    """
    if instance.pk:
        instance._status_anterior = (
            sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
        )
    else:
        instance._status_anterior = None


@receiver(post_save, sender=OrdemServico)
def sincronizar_lancamento_os(sender, instance, created, **kwargs):
    """
    Signal: Sincroniza lançamentos financeiros com mudanças de status da OS.

    1. FATURADA: Cria automaticamente um Lancamento de receita
    2. CANCELADA: Cancela todos os lançamentos associados (exceto já pagos)
    """
    status_anterior = getattr(instance, "_status_anterior", None)

    # Quando OS muda para "faturado" → cria Lancamento receita automático
    if instance.status == OrdemServico.Status.FATURADA and status_anterior != instance.status:
        lancamento, created = Lancamento.objects.get_or_create(
            os=instance,
            tipo=Lancamento.Tipo.RECEITA,
            defaults={
                "descricao": f"Faturamento {instance.numero}",
                "valor": instance.valor_final_faturado or instance.valor_total_orcado,
                "data_competencia": instance.data_emissao_nf or timezone.localdate(),
                "data_vencimento": instance.data_vencimento or timezone.localdate(),
                "status": Lancamento.Status.PENDENTE,
                "conta_bancaria": _conta_padrao(),
                "categoria": _categoria_padrao(Lancamento.Tipo.RECEITA, "Receita de servicos"),
                "fornecedor_cliente": instance.cliente.nome,
                "numero_documento": instance.numero_nf,
                "criado_por": instance.atualizado_por or instance.criado_por,
            },
        )
        if created:
            logger.info(f"Lançamento receita criado automaticamente para OS {instance.numero}")

    # Quando OS é cancelada → cancela Lancamento vinculado
    if instance.status == OrdemServico.Status.CANCELADA and status_anterior != instance.status:
        cancelados = Lancamento.objects.filter(os=instance).exclude(
            status=Lancamento.Status.PAGO
        ).update(status=Lancamento.Status.CANCELADO)
        if cancelados:
            logger.info(f"{cancelados} lançamentos foram cancelados para OS {instance.numero}")


# ========== SIGNALS DO LANÇAMENTO FINANCEIRO ==========


@receiver(pre_save, sender=Lancamento)
def guardar_status_anterior_lancamento(sender, instance, **kwargs):
    """
    Signal: Armazena o status anterior do Lancamento antes de salvar.
    Necessário para detectar mudanças de status.
    """
    if instance.pk:
        instance._status_anterior = (
            sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
        )
    else:
        instance._status_anterior = None


@receiver(post_save, sender=Lancamento)
def atualizar_pagamento_os(sender, instance, created, **kwargs):
    """
    Signal: Atualiza o status de pagamento da OS quando Lancamento muda.

    Sincroniza:
    - PAGO (receita) → OS.status_pagamento = PAGO
    - ATRASADO (receita) → OS.status_pagamento = VENCIDO
    - CANCELADO (receita) → OS.status_pagamento = CANCELADO
    - Outros → OS.status_pagamento = PENDENTE
    """
    if not instance.os or instance.tipo != Lancamento.Tipo.RECEITA:
        return

    status_anterior = getattr(instance, "_status_anterior", None)

    # Mapear status do Lancamento para StatusPagamento da OS
    if instance.status == Lancamento.Status.PAGO:
        status_pagamento = OrdemServico.StatusPagamento.PAGO
    elif instance.status == Lancamento.Status.ATRASADO:
        status_pagamento = OrdemServico.StatusPagamento.VENCIDO
    elif instance.status == Lancamento.Status.CANCELADO:
        status_pagamento = OrdemServico.StatusPagamento.CANCELADO
    else:
        status_pagamento = OrdemServico.StatusPagamento.PENDENTE

    # Atualizar OS se status mudou
    OrdemServico.objects.filter(pk=instance.os_id).update(
        status_pagamento=status_pagamento
    )

    # Log de mudanças importantes
    if status_anterior != instance.status:
        logger.info(
            f"Lançamento {instance.id} status: {status_anterior} → {instance.status}, "
            f"OS {instance.os.numero} status_pagamento: {status_pagamento}"
        )


@receiver(post_save, sender=Lancamento)
def atualizar_data_recebimento_os(sender, instance, created, **kwargs):
    """
    Signal: Atualiza data_recebimento da OS quando Lancamento status muda para "pago".

    Quando Lancamento status muda para "pago" → atualiza OS.data_recebimento e data_pagamento
    """
    if not instance.os or instance.tipo != Lancamento.Tipo.RECEITA:
        return

    status_anterior = getattr(instance, "_status_anterior", None)

    # Apenas se o status mudou para PAGO
    if instance.status == Lancamento.Status.PAGO and status_anterior != Lancamento.Status.PAGO:
        hoje = timezone.localdate()
        OrdemServico.objects.filter(pk=instance.os_id).update(
            data_recebimento=instance.data_pagamento or hoje,
            status_pagamento=OrdemServico.StatusPagamento.PAGO,
        )
        logger.info(
            f"Data de recebimento atualizada para OS {instance.os.numero}: {hoje}"
        )


@receiver(post_save, sender=Lancamento)
def recalcular_saldo_conta_ao_pagar(sender, instance, created, **kwargs):
    """
    Signal: Recalcula o saldo da conta quando lançamento é pago.

    Recalcula saldo da conta quando lançamento é pago (previne inconsistências).
    """
    if not instance.conta_bancaria:
        return

    status_anterior = getattr(instance, "_status_anterior", None)

    # Recalcular apenas se mudou para PAGO
    if instance.status == Lancamento.Status.PAGO and status_anterior != Lancamento.Status.PAGO:
        # Importar aqui para evitar circular import
        from .tasks import recalcular_saldo_conta

        try:
            recalcular_saldo_conta(instance.conta_bancaria.id)
            logger.info(f"Saldo recalculado para conta {instance.conta_bancaria.nome}")
        except Exception as e:
            logger.error(f"Erro ao recalcular saldo: {str(e)}")


# ========== SIGNALS DA DESPESA OS ==========


@receiver(post_save, sender=DespesaOS)
def criar_lancamento_despesa_os(sender, instance, created, **kwargs):
    """
    Signal: Quando DespesaOS é lançada → cria Lancamento despesa automático.

    As despesas já são consideradas pagas (data_pagamento = data_despesa).
    """
    if not created:
        return

    lancamento, novo = Lancamento.objects.get_or_create(
        os=instance.os,
        tipo=Lancamento.Tipo.DESPESA,
        descricao=f"Despesa OS {instance.os.numero}: {instance.descricao}",
        defaults={
            "valor": instance.valor,
            "data_competencia": instance.data_despesa,
            "data_vencimento": instance.data_despesa,
            "data_pagamento": instance.data_despesa,
            "status": Lancamento.Status.PAGO,
            "conta_bancaria": _conta_padrao(),
            "categoria": _categoria_padrao(Lancamento.Tipo.DESPESA, "Despesas de OS"),
            "fornecedor_cliente": instance.os.cliente.nome,
            "criado_por": instance.registrado_por,
        },
    )

    if novo:
        logger.info(f"Lançamento despesa criado automaticamente para OS {instance.os.numero}")

        # Recalcular saldo imediatamente
        from .tasks import recalcular_saldo_conta
        try:
            recalcular_saldo_conta(lancamento.conta_bancaria.id)
        except Exception as e:
            logger.error(f"Erro ao recalcular saldo após despesa: {str(e)}")
