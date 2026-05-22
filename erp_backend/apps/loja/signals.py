from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.financeiro.services import GeradorLancamentoFinanceiro
from .models import PedidoCompra, Venda
from .services import finalizar_venda, receber_pedido_compra


@receiver(post_save, sender=Venda)
def venda_finalizada_signal(sender, instance, created, **kwargs):
    if instance.status == Venda.Status.FINALIZADA and not instance.pagamentos.exists():
        # Vendas finalizadas pela API passam pelo serviço com pagamentos.
        return


@receiver(post_save, sender=Venda)
def gerar_lancamento_venda(sender, instance, created, **kwargs):
    """
    Automatically creates RECEITA Lancamento and inventory SAIDA when sale is finalized.
    Integrates sales with financial module and inventory.
    """
    # Only trigger on status change to FINALIZADA, not on creation
    if created or instance.status != Venda.Status.FINALIZADA:
        return

    try:
        gerador = GeradorLancamentoFinanceiro()
        lancamento, movimentacoes = gerador.criar_receita_venda(instance)

        # Also calculate and log margin for reporting
        margem = gerador.calcular_margem_venda(instance)
        print(f"Venda #{instance.numero} finalizada. Margem: R$ {margem['margem_total']} ({margem['margem_percentual']:.2f}%)")
    except Exception as e:
        print(f"Erro ao gerar Lancamento para Venda #{instance.id}: {str(e)}")


@receiver(post_save, sender=PedidoCompra)
def pedido_recebido_signal(sender, instance, created, **kwargs):
    if instance.status == PedidoCompra.Status.RECEBIDO and not instance.data_recebimento:
        receber_pedido_compra(instance)
