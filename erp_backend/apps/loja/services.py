from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.estoque.models import MovimentacaoEstoque
from apps.financeiro.models import CategoriaFinanceira, ContaBancaria, Lancamento

from .models import EntregaPedido, FormaPagamento, ItemPedidoCompra, MovimentoCaixa, PagamentoVenda, PedidoCompra, Venda


def _conta_padrao():
    return ContaBancaria.objects.get_or_create(
        nome="Caixa loja",
        defaults={"banco": "Caixa interno", "tipo": ContaBancaria.Tipo.CAIXA, "saldo_inicial": 0, "ativo": True},
    )[0]


def _categoria(nome, tipo, cor):
    return CategoriaFinanceira.objects.get_or_create(nome=nome, tipo=tipo, defaults={"cor": cor})[0]


def finalizar_venda(venda, pagamentos, usuario=None):
    with transaction.atomic():
        venda.recalcular_totais()
        total_pago = sum(Decimal(str(pag.get("valor") or 0)) for pag in pagamentos)
        if total_pago < venda.valor_total:
            raise ValueError("Pagamentos inferiores ao total da venda.")
        if venda.status == Venda.Status.FINALIZADA:
            return venda

        PagamentoVenda.objects.filter(venda=venda).delete()
        for pagamento in pagamentos:
            forma = FormaPagamento.objects.get(pk=pagamento["forma"])
            PagamentoVenda.objects.create(
                venda=venda,
                forma_pagamento=forma,
                valor=pagamento.get("valor") or 0,
                parcelas=pagamento.get("parcelas") or 1,
                bandeira_cartao=pagamento.get("bandeira_cartao", ""),
                numero_autorizacao=pagamento.get("numero_autorizacao", ""),
                status=PagamentoVenda.Status.APROVADO,
            )

        for item in venda.itens.select_related("produto__produto"):
            MovimentacaoEstoque.objects.get_or_create(
                produto=item.produto.produto,
                tipo=MovimentacaoEstoque.Tipo.SAIDA,
                motivo=MovimentacaoEstoque.Motivo.CONSUMO_INTERNO,
                observacoes=f"Venda loja {venda.numero}",
                defaults={
                    "quantidade": item.quantidade,
                    "valor_unitario": item.produto.produto.preco_custo,
                    "realizado_por": usuario,
                },
            )

        conta = _conta_padrao()
        categoria = _categoria("Receita loja", Lancamento.Tipo.RECEITA, "#10B981")
        for pagamento in venda.pagamentos.select_related("forma_pagamento"):
            vencimento = timezone.localdate() + timedelta(days=pagamento.forma_pagamento.prazo_recebimento_dias)
            Lancamento.objects.get_or_create(
                tipo=Lancamento.Tipo.RECEITA,
                numero_documento=f"{venda.numero}-{pagamento.id}",
                defaults={
                    "descricao": f"Venda loja {venda.numero} - {pagamento.forma_pagamento.nome}",
                    "valor": pagamento.valor,
                    "data_competencia": timezone.localdate(),
                    "data_vencimento": vencimento,
                    "status": Lancamento.Status.PENDENTE,
                    "conta_bancaria": conta,
                    "categoria": categoria,
                    "fornecedor_cliente": venda.cliente.nome if venda.cliente else "Venda balcão",
                    "criado_por": usuario,
                },
            )
            MovimentoCaixa.objects.create(
                caixa=venda.caixa,
                tipo=MovimentoCaixa.Tipo.ENTRADA,
                valor=pagamento.valor,
                forma_pagamento=pagamento.forma_pagamento,
                descricao=f"Recebimento venda {venda.numero}",
                venda=venda,
                usuario=usuario,
            )
            venda.caixa.saldo_atual = Decimal(venda.caixa.saldo_atual or 0) + Decimal(pagamento.valor or 0)
            venda.caixa.save(update_fields=["saldo_atual"])

        venda.status = Venda.Status.FINALIZADA
        venda.finalizada_em = timezone.now()
        venda.nfc_e_emitida = not bool(venda.cliente)
        venda.nfe_emitida = bool(venda.cliente)
        venda.save(update_fields=["status", "finalizada_em", "nfc_e_emitida", "nfe_emitida"])

        if venda.cliente:
            historicos = getattr(venda.cliente, "historicos", None)
            if historicos is not None:
                historicos.create(tipo="observacao", descricao=f"Venda loja {venda.numero} finalizada.", data_contato=timezone.now(), usuario=usuario)

        if venda.canal != Venda.Canal.BALCAO:
            EntregaPedido.objects.get_or_create(
                venda=venda,
                defaults={
                    "tipo": EntregaPedido.Tipo.ENTREGA_PROPRIA,
                    "endereco_entrega": "",
                    "valor_frete": venda.valor_frete,
                    "status": EntregaPedido.Status.PREPARANDO,
                },
            )

    return venda


def receber_pedido_compra(pedido, usuario=None):
    with transaction.atomic():
        if pedido.status == PedidoCompra.Status.RECEBIDO:
            return pedido
        for item in pedido.itens.select_related("produto__produto"):
            produto = item.produto.produto
            MovimentacaoEstoque.objects.create(
                produto=produto,
                tipo=MovimentacaoEstoque.Tipo.ENTRADA,
                quantidade=item.quantidade,
                valor_unitario=item.valor_unitario,
                motivo=MovimentacaoEstoque.Motivo.COMPRA,
                fornecedor=pedido.fornecedor.nome,
                numero_nota=pedido.numero_nf_fornecedor,
                observacoes=f"Pedido loja {pedido.numero}",
                realizado_por=usuario,
            )
            if produto.preco_custo != item.valor_unitario:
                produto.preco_custo = item.valor_unitario
                produto.save(update_fields=["preco_custo", "preco_venda_sugerido", "preco_venda"])

        conta = _conta_padrao()
        categoria = _categoria("Compra de mercadorias loja", Lancamento.Tipo.DESPESA, "#EF4444")
        Lancamento.objects.get_or_create(
            tipo=Lancamento.Tipo.DESPESA,
            numero_documento=pedido.numero_nf_fornecedor or pedido.numero,
            defaults={
                "descricao": f"Pedido de compra {pedido.numero}",
                "valor": pedido.valor_total,
                "data_competencia": timezone.localdate(),
                "data_vencimento": timezone.localdate() + timedelta(days=pedido.fornecedor.prazo_pagamento_padrao),
                "status": Lancamento.Status.PENDENTE,
                "conta_bancaria": conta,
                "categoria": categoria,
                "fornecedor_cliente": pedido.fornecedor.nome,
                "criado_por": usuario,
            },
        )
        pedido.status = PedidoCompra.Status.RECEBIDO
        pedido.data_recebimento = timezone.localdate()
        pedido.save(update_fields=["status", "data_recebimento"])
    return pedido
