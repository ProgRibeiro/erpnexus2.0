"""
Signals para disparar notificações automáticas em cada app.
"""
import logging
import socket
from urllib.parse import urlparse

from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from apps.ordens.models import OrdemServico
from apps.financeiro.models import Lancamento
from apps.estoque.models import Produto

from .tasks import (
    enviar_email_os_atribuida,
    enviar_email_os_aprovada,
    enviar_email_os_finalizada,
    enviar_email_relatorio_pronto,
)

logger = logging.getLogger(__name__)


def _enfileirar_notificacao(task, *args):
    broker_url = getattr(settings, "CELERY_BROKER_URL", "")
    parsed = urlparse(broker_url)
    if parsed.scheme.startswith("redis"):
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        try:
            with socket.create_connection((host, port), timeout=0.2):
                pass
        except OSError:
            logger.warning("Redis indisponível em %s:%s; notificação %s ignorada.", host, port, task.name)
            return

    try:
        task.delay(*args)
    except Exception as exc:
        logger.warning("Não foi possível enfileirar notificação %s: %s", task.name, exc)


# ======================== SIGNALS DE ORDENS ========================


@receiver(post_save, sender=OrdemServico)
def disparar_notificacoes_ordem_servico(sender, instance, created, update_fields, **kwargs):
    """
    Dispara notificações quando uma OS é criada ou modificada.
    """
    if update_fields is None:
        return

    # OS atribuída a um técnico
    if "tecnico_responsavel_id" in update_fields and instance.tecnico_responsavel_id:
        _enfileirar_notificacao(enviar_email_os_atribuida, instance.id)

    # OS aprovada
    if "status" in update_fields and instance.status == "aprovada":
        _enfileirar_notificacao(enviar_email_os_aprovada, instance.id)

    # OS finalizada
    if "status" in update_fields and instance.status == "concluida":
        _enfileirar_notificacao(enviar_email_os_finalizada, instance.id)


# ======================== SIGNALS DE FINANCEIRO ========================


@receiver(post_save, sender=Lancamento)
def disparar_notificacoes_lancamento(sender, instance, created, update_fields, **kwargs):
    """
    Dispara notificações quando um lançamento financeiro é criado ou modificado.
    As notificações de atraso são disparadas pela tarefa agendada diariamente.
    """
    # Este signal pode ser expandido conforme necessário
    pass


# ======================== SIGNALS DE ESTOQUE ========================


@receiver(post_save, sender=Produto)
def disparar_notificacoes_estoque(sender, instance, created, update_fields, **kwargs):
    """
    Dispara notificações quando estoque de um produto muda.
    A notificação geral de estoque baixo é disparada pela tarefa semanal.
    """
    if update_fields is None:
        return

    # Se estoque foi atualizado
    if "estoque_atual" in update_fields:
        # Verificar se ficou abaixo do mínimo
        if instance.estoque_atual < instance.estoque_minimo:
            print(f"Produto {instance.nome} com estoque baixo: {instance.estoque_atual}/{instance.estoque_minimo}")
