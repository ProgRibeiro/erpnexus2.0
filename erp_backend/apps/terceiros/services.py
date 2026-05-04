from decimal import Decimal

from django.db import transaction
from django.utils import timezone


def criar_contas_pagar_terceiros(ordem, usuario=None):
    from apps.financeiro.models import CategoriaFinanceira, ContaBancaria, Lancamento

    categoria, _ = CategoriaFinanceira.objects.get_or_create(
        nome="Terceirizados",
        tipo=Lancamento.Tipo.DESPESA,
        defaults={"cor": "#3B82F6", "icone": "team"},
    )
    conta, _ = ContaBancaria.objects.get_or_create(
        nome="Caixa principal",
        defaults={
            "banco": "Caixa interno",
            "tipo": ContaBancaria.Tipo.CAIXA,
            "saldo_inicial": 0,
            "ativo": True,
        },
    )

    criados = []
    with transaction.atomic():
        for item in ordem.itens.select_related("terceiro", "lancamento_terceiro").filter(
            terceiro__isnull=False,
            gerar_contas_pagar_terceiro=True,
        ):
            custo = Decimal(item.custo_terceiro or 0)
            if custo <= 0:
                continue
            lancamento = item.lancamento_terceiro
            defaults = {
                "descricao": f"Terceiro {item.terceiro} - {ordem.numero}",
                "valor": custo,
                "data_competencia": timezone.localdate(),
                "data_vencimento": ordem.data_vencimento or ordem.data_agendada or timezone.localdate(),
                "status": Lancamento.Status.PENDENTE,
                "conta_bancaria": conta,
                "categoria": categoria,
                "os": ordem,
                "fornecedor_cliente": str(item.terceiro),
                "numero_documento": f"{ordem.numero}-T{item.id}",
                "observacoes": "Custo interno de terceirizado gerado pelo orçamento. Não aparece para o cliente.",
                "criado_por": usuario,
            }
            if lancamento:
                for campo, valor in defaults.items():
                    setattr(lancamento, campo, valor)
                lancamento.save()
            else:
                lancamento = Lancamento.objects.create(tipo=Lancamento.Tipo.DESPESA, **defaults)
                item.lancamento_terceiro = lancamento
                item.save(update_fields=["lancamento_terceiro"])
            criados.append(lancamento)
    return criados
