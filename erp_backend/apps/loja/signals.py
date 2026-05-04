from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import PedidoCompra, Venda
from .services import finalizar_venda, receber_pedido_compra


@receiver(post_save, sender=Venda)
def venda_finalizada_signal(sender, instance, created, **kwargs):
    if instance.status == Venda.Status.FINALIZADA and not instance.pagamentos.exists():
        # Vendas finalizadas pela API passam pelo serviço com pagamentos.
        return


@receiver(post_save, sender=PedidoCompra)
def pedido_recebido_signal(sender, instance, created, **kwargs):
    if instance.status == PedidoCompra.Status.RECEBIDO and not instance.data_recebimento:
        receber_pedido_compra(instance)
