"""
Tasks Celery para processamento assíncrono do Outbox de Licitações.
Garantem entrega eventual mesmo em caso de falha de rede ou serviço externo.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=10,
)
def processar_outbox_message(self, message_id):
    """Processa uma mensagem do Outbox com retry automático."""
    from .models import OutboxMessage

    try:
        msg = OutboxMessage.objects.get(id=message_id)
    except OutboxMessage.DoesNotExist:
        logger.warning("OutboxMessage %s não encontrada, ignorando.", message_id)
        return

    if msg.status in ("processado", "processando"):
        return

    msg.status = "processando"
    msg.save(update_fields=["status"])

    try:
        if msg.event_type == "proposta.enviada":
            _handle_proposta_enviada(msg.payload)

        msg.status = "processado"
        msg.processado_em = timezone.now()
        msg.save(update_fields=["status", "processado_em"])
        logger.info("OutboxMessage %s processada com sucesso.", message_id)

    except Exception as exc:
        msg.tentativas += 1
        msg.erro_ultimo = str(exc)
        if msg.tentativas >= 5:
            msg.status = "falhou"
            logger.error("OutboxMessage %s FALHOU após 5 tentativas: %s", message_id, exc)
        else:
            msg.status = "pendente"
            delay_seconds = 10 * (2 ** msg.tentativas)
            msg.proxima_tentativa = timezone.now() + timedelta(seconds=delay_seconds)
            logger.warning(
                "OutboxMessage %s falhou (tentativa %s), retry em %ss: %s",
                message_id, msg.tentativas, delay_seconds, exc,
            )
        msg.save(update_fields=["status", "tentativas", "erro_ultimo", "proxima_tentativa"])
        raise self.retry(exc=exc, countdown=10 * (2 ** msg.tentativas))


def _handle_proposta_enviada(payload):
    """Lógica de negócio quando uma proposta é enviada (ex: notificações internas)."""
    logger.info(
        "Processando proposta.enviada — proposta_id=%s licitacao_id=%s prestador=%s valor=%s",
        payload.get("proposta_id"),
        payload.get("licitacao_id"),
        payload.get("prestador_email"),
        payload.get("valor"),
    )
    # Aqui pode-se adicionar: envio de e-mail, webhook para contratante, etc.


@shared_task
def processar_outbox_periodico():
    """Roda periodicamente e dispara processamento das mensagens pendentes."""
    from .models import OutboxMessage

    pendentes = OutboxMessage.objects.filter(
        status="pendente",
        proxima_tentativa__lte=timezone.now(),
    ).values_list("id", flat=True)[:100]

    count = len(pendentes)
    for msg_id in pendentes:
        processar_outbox_message.delay(msg_id)

    if count:
        logger.info("processar_outbox_periodico: disparou %s tarefas.", count)


@shared_task
def reconciliar_propostas():
    """
    Task de segurança: propostas que ficaram presas em status 'enviando'
    por mais de 10 minutos são marcadas como 'enviada' automaticamente.
    """
    from .models import PropostaLicitacao

    limite = timezone.now() - timedelta(minutes=10)
    atualizadas = PropostaLicitacao.objects.filter(
        status="enviando",
        enviado_em__lte=limite,
    ).update(status=PropostaLicitacao.Status.ENVIADA)

    if atualizadas:
        logger.warning("reconciliar_propostas: %s propostas reconciliadas.", atualizadas)
