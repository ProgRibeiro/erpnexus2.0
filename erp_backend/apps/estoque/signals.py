from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.ordens.models import DespesaOS

from .models import MovimentacaoEstoque, Produto


@receiver(post_save, sender=DespesaOS)
def perguntar_baixa_estoque_material(sender, instance, created, **kwargs):
    if not created or instance.tipo != DespesaOS.Tipo.MATERIAL:
        return

    observacoes = instance.descricao.lower()
    if "baixar_estoque=sim" not in observacoes:
        instance.observacoes_estoque = (
            "Despesa de material criada. Confirme manualmente se deve baixar estoque."
        )
        return

    produto = Produto.objects.filter(nome__icontains=instance.descricao.split(":")[0].strip()).first()
    if produto:
        MovimentacaoEstoque.objects.create(
            produto=produto,
            tipo=MovimentacaoEstoque.Tipo.SAIDA,
            quantidade=1,
            valor_unitario=instance.valor,
            motivo=MovimentacaoEstoque.Motivo.USO_OS,
            os=instance.os,
            observacoes=f"Baixa automatica gerada pela despesa #{instance.id}.",
            realizado_por=instance.registrado_por,
        )
