from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import OrdemServico
from .tasks import gerar_relatorio_async, gerar_orcamento_async


@receiver(post_save, sender=OrdemServico)
def gerar_pdf_ao_faturar(sender, instance, created, update_fields, **kwargs):
    """
    Dispara geração de PDF automaticamente quando OS muda para status 'faturada'.
    """
    if update_fields is None:
        return

    if 'status' in update_fields and instance.status == 'faturada':
        gerar_relatorio_async.delay(instance.pk)
        gerar_orcamento_async.delay(instance.pk)
