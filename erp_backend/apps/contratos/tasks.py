from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import ContratoPreventiva, FaturaContrato, OSContratoPreventiva
from .services import GeradorFatura


@shared_task
def gerar_faturas_mensais():
    hoje = timezone.localdate()
    for contrato in ContratoPreventiva.objects.filter(status=ContratoPreventiva.Status.ATIVO):
        GeradorFatura().gerar_fatura_mensal(contrato, hoje.month, hoje.year)


@shared_task
def alertar_os_proximas():
    hoje = timezone.localdate()
    proximas = OSContratoPreventiva.objects.filter(
        status=OSContratoPreventiva.Status.PROGRAMADA,
        data_prevista__range=[hoje, hoje + timedelta(days=7)],
    )
    return proximas.count()


@shared_task
def reajustar_contratos_anuais():
    reajustados = 0
    for contrato in ContratoPreventiva.objects.filter(reajuste_anual=True, status=ContratoPreventiva.Status.ATIVO):
        if contrato._deve_reajustar_agora() and contrato._aplicar_reajuste():
            reajustados += 1
    return reajustados
