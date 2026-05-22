from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

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

@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=10,
    retry_backoff=True,
    retry_jitter=True
)
def processar_outbox_message(self, message_id):
    from .models_licitacao import OutboxMessage
    msg = OutboxMessage.objects.get(id=message_id)
    
    try:
        if msg.event_type == 'proposta.enviada':
            payload = msg.payload
            logger.info(f"Processando proposta enviada: {payload}")
            
            # Aqui entrariam as chamadas reais para notificações e emails
            # Ex: criar_notificacao(tenant_id=payload['contratante_id'], ...)
        
        msg.status = 'processado'
        msg.processado_em = timezone.now()
        msg.save()
        
    except Exception as e:
        msg.tentativas += 1
        msg.erro_ultimo = str(e)
        if msg.tentativas >= 5:
            msg.status = 'falhou'
        else:
            msg.status = 'pendente'
            msg.proxima_tentativa = timezone.now() + timedelta(seconds=10 * (2 ** msg.tentativas))
        msg.save()
        raise self.retry(exc=e)

@shared_task
def processar_outbox_periodico():
    from .models_licitacao import OutboxMessage
    pendentes = OutboxMessage.objects.filter(
        status='pendente',
        proxima_tentativa__lte=timezone.now()
    )[:100]
    
    for msg in pendentes:
        processar_outbox_message.delay(msg.id)

@shared_task
def reconciliar_propostas():
    from .models_licitacao import PropostaLicitacao
    propostas_pendentes = PropostaLicitacao.objects.filter(
        status='enviando',
        criado_em__lte=timezone.now() - timedelta(minutes=5)
    )
    for p in propostas_pendentes:
        p.status = 'recebida'
        p.save()
