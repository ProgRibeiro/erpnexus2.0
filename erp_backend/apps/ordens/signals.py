from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
import logging

from .models import OrdemServico
from .tasks import gerar_relatorio_async, gerar_orcamento_async

logger = logging.getLogger(__name__)


@receiver(post_save, sender=OrdemServico)
def gerar_pdf_ao_faturar(sender, instance, created, update_fields, **kwargs):
    """
    Dispara geração de PDF automaticamente quando OS muda para status 'faturada'.
    """
    if update_fields is None:
        return

    if 'status' in update_fields and instance.status == 'faturada':
        if not getattr(settings, "AUTO_GERAR_PDF_AO_FATURAR", False):
            return
        try:
            gerar_relatorio_async.delay(instance.pk)
            gerar_orcamento_async.delay(instance.pk)
        except Exception as exc:
            logger.warning(
                "Não foi possível enfileirar PDFs da OS %s: %s",
                instance.pk,
                exc,
            )
