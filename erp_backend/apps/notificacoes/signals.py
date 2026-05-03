"""
Signals para disparar notificações automáticas em cada app.
"""
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
        enviar_email_os_atribuida.delay(instance.id)

    # OS aprovada
    if "status" in update_fields and instance.status == "aprovada":
        enviar_email_os_aprovada.delay(instance.id)

    # OS finalizada
    if "status" in update_fields and instance.status == "concluida":
        enviar_email_os_finalizada.delay(instance.id)


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
