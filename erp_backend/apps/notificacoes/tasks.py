from celery import shared_task
from django.utils import timezone

from apps.estoque.models import Produto
from apps.financeiro.models import Lancamento
from apps.ordens.models import OrdemServico

from .models import LogNotificacao


def registrar(tipo, destinatario, conteudo):
    log = LogNotificacao.objects.create(
        tipo=tipo,
        destinatario=destinatario or "sem-email@example.com",
        conteudo=conteudo,
        status=LogNotificacao.Status.ENVIADO,
        enviado_em=timezone.now(),
    )
    return log.id


@shared_task
def notificar_os_atribuida(os_id):
    os = OrdemServico.objects.select_related("tecnico_responsavel").get(id=os_id)
    email = os.tecnico_responsavel.email if os.tecnico_responsavel else ""
    return registrar(LogNotificacao.Tipo.OS_ATRIBUIDA, email, f"OS {os.numero} atribuida a voce.")


@shared_task
def notificar_os_agendada_amanha():
    amanha = timezone.localdate() + timezone.timedelta(days=1)
    ids = []
    for os in OrdemServico.objects.filter(data_agendada=amanha).select_related("tecnico_responsavel"):
        ids.append(
            registrar(
                LogNotificacao.Tipo.OS_AGENDADA_AMANHA,
                os.tecnico_responsavel.email if os.tecnico_responsavel else "",
                f"OS {os.numero} agendada para amanha.",
            )
        )
    return ids


@shared_task
def notificar_os_finalizada(os_id):
    os = OrdemServico.objects.get(id=os_id)
    return registrar(LogNotificacao.Tipo.OS_FINALIZADA, "administrativo@example.com", f"OS {os.numero} finalizada.")


@shared_task
def notificar_pagamentos_atrasados():
    ids = []
    for lancamento in Lancamento.objects.filter(status=Lancamento.Status.ATRASADO):
        ids.append(
            registrar(
                LogNotificacao.Tipo.PAGAMENTO_ATRASADO,
                "financeiro@example.com",
                f"Pagamento atrasado: {lancamento.descricao} - {lancamento.valor}.",
            )
        )
    return ids


@shared_task
def notificar_estoque_baixo():
    ids = []
    for produto in Produto.objects.all():
        if produto.estoque_atual < produto.estoque_minimo:
            ids.append(
                registrar(
                    LogNotificacao.Tipo.ESTOQUE_BAIXO,
                    "estoque@example.com",
                    f"Produto {produto.nome} abaixo do minimo.",
                )
            )
    return ids


@shared_task
def notificar_relatorio_finalizado(os_id, link):
    os = OrdemServico.objects.select_related("cliente").get(id=os_id)
    return registrar(
        LogNotificacao.Tipo.RELATORIO_FINALIZADO,
        os.cliente.email,
        f"Relatorio da OS {os.numero}: {link}",
    )
