from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from apps.ordens.models import DespesaOS, OrdemServico

from .models import CategoriaFinanceira, ContaBancaria, Lancamento


def _conta_padrao():
    conta, _ = ContaBancaria.objects.get_or_create(
        nome="Caixa principal",
        defaults={
            "banco": "Caixa interno",
            "tipo": ContaBancaria.Tipo.CAIXA,
            "saldo_inicial": 0,
            "ativo": True,
        },
    )
    return conta


def _categoria_padrao(tipo, nome):
    categoria, _ = CategoriaFinanceira.objects.get_or_create(
        nome=nome,
        tipo=tipo,
        defaults={"cor": "#1677ff" if tipo == Lancamento.Tipo.RECEITA else "#cf1322"},
    )
    return categoria


@receiver(pre_save, sender=OrdemServico)
def guardar_status_anterior_os(sender, instance, **kwargs):
    if instance.pk:
        instance._status_anterior = (
            sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
        )
    else:
        instance._status_anterior = None


@receiver(post_save, sender=OrdemServico)
def sincronizar_lancamento_os(sender, instance, created, **kwargs):
    status_anterior = getattr(instance, "_status_anterior", None)
    if instance.status == OrdemServico.Status.FATURADA and status_anterior != instance.status:
        Lancamento.objects.get_or_create(
            os=instance,
            tipo=Lancamento.Tipo.RECEITA,
            defaults={
                "descricao": f"Faturamento {instance.numero}",
                "valor": instance.valor_final_faturado or instance.valor_total_orcado,
                "data_competencia": instance.data_emissao_nf or timezone.localdate(),
                "data_vencimento": instance.data_vencimento or timezone.localdate(),
                "status": Lancamento.Status.PENDENTE,
                "conta_bancaria": _conta_padrao(),
                "categoria": _categoria_padrao(Lancamento.Tipo.RECEITA, "Receita de servicos"),
                "fornecedor_cliente": instance.cliente.nome,
                "numero_documento": instance.numero_nf,
                "criado_por": instance.atualizado_por or instance.criado_por,
            },
        )

    if instance.status == OrdemServico.Status.CANCELADA and status_anterior != instance.status:
        Lancamento.objects.filter(os=instance).exclude(status=Lancamento.Status.PAGO).update(
            status=Lancamento.Status.CANCELADO
        )


@receiver(pre_save, sender=Lancamento)
def guardar_status_anterior_lancamento(sender, instance, **kwargs):
    if instance.pk:
        instance._status_anterior = (
            sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
        )
    else:
        instance._status_anterior = None


@receiver(post_save, sender=Lancamento)
def atualizar_pagamento_os(sender, instance, created, **kwargs):
    if not instance.os or instance.tipo != Lancamento.Tipo.RECEITA:
        return
    if instance.status == Lancamento.Status.PAGO:
        status_pagamento = OrdemServico.StatusPagamento.PAGO
    elif instance.status == Lancamento.Status.ATRASADO:
        status_pagamento = OrdemServico.StatusPagamento.VENCIDO
    elif instance.status == Lancamento.Status.CANCELADO:
        status_pagamento = OrdemServico.StatusPagamento.CANCELADO
    else:
        status_pagamento = OrdemServico.StatusPagamento.PENDENTE
    OrdemServico.objects.filter(pk=instance.os_id).update(status_pagamento=status_pagamento)


@receiver(post_save, sender=DespesaOS)
def criar_lancamento_despesa_os(sender, instance, created, **kwargs):
    if not created:
        return
    Lancamento.objects.get_or_create(
        os=instance.os,
        tipo=Lancamento.Tipo.DESPESA,
        descricao=f"Despesa OS {instance.os.numero}: {instance.descricao}",
        defaults={
            "valor": instance.valor,
            "data_competencia": instance.data_despesa,
            "data_vencimento": instance.data_despesa,
            "data_pagamento": instance.data_despesa,
            "status": Lancamento.Status.PAGO,
            "conta_bancaria": _conta_padrao(),
            "categoria": _categoria_padrao(Lancamento.Tipo.DESPESA, "Despesas de OS"),
            "fornecedor_cliente": instance.os.cliente.nome,
            "criado_por": instance.registrado_por,
        },
    )
