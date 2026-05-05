from celery import shared_task
from django.utils import timezone


@shared_task
def verificar_slas():
    """Verifica SLAs a cada 5 minutos"""
    from apps.saas.models import SLAChamado
    agora = timezone.now()
    slas = SLAChamado.objects.filter(chamado__status__in=['aberto', 'aguardando_orcamento', 'em_execucao'])
    for sla in slas:
        abertura = sla.chamado.abertura
        total = (sla.prazo_conclusao - abertura).total_seconds()
        decorrido = (agora - abertura).total_seconds()
        if total > 0:
            pct = decorrido / total
            if pct >= 1.0 and sla.status != 'vencido':
                sla.status = 'vencido'
                sla.chamado.status = 'cancelado'
                sla.save()
                sla.chamado.save()
            elif pct >= 0.8 and sla.status == 'no_prazo':
                sla.status = 'alerta'
                sla.save()
    return f"SLAs verificados: {slas.count()}"
