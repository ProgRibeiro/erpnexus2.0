from celery import shared_task
from django.utils import timezone

from apps.ordens.models import OrdemServico

from .models import Lancamento


@shared_task
def atualizar_lancamentos_vencidos():
    hoje = timezone.localdate()
    lancamentos = Lancamento.objects.filter(
        status=Lancamento.Status.PENDENTE,
        data_vencimento__lt=hoje,
    )
    os_ids = list(
        lancamentos.filter(
            tipo=Lancamento.Tipo.RECEITA,
            os__isnull=False,
        ).values_list("os_id", flat=True)
    )
    total = lancamentos.update(status=Lancamento.Status.ATRASADO)
    if os_ids:
        OrdemServico.objects.filter(id__in=os_ids).update(
            status_pagamento=OrdemServico.StatusPagamento.VENCIDO
        )
    return {"atualizados": total, "ordens_atualizadas": len(os_ids)}
