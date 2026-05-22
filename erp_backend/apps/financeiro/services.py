from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django.db import transaction

from apps.estoque.models import MovimentacaoEstoque
from apps.loja.models import Venda, ItemVenda
from .models import Lancamento, CategoriaFinanceira, ContaBancaria


class GeradorLancamentoFinanceiro:
    """
    Generates financial transactions (Lancamentos) automatically from inventory movements
    and sales. Implements the integrated financial flow:
    - Product entry (ENTRADA) creates DESPESA
    - Product sale creates RECEITA and inventory debit
    - Tracks and calculates profit margin
    """

    def criar_despesa_entrada(self, movimentacao: MovimentacaoEstoque, ja_foi_pago: bool = False):
        """
        Creates a DESPESA Lancamento when product enters inventory (ENTRADA).

        Args:
            movimentacao: MovimentacaoEstoque instance with tipo=ENTRADA
            ja_foi_pago: If True, status=PAGO; else PENDENTE with future due date

        Returns:
            Lancamento instance or None if already exists
        """
        if movimentacao.tipo != MovimentacaoEstoque.Tipo.ENTRADA:
            return None

        if Lancamento.objects.filter(movimentacao_estoque=movimentacao).exists():
            return None

        categoria = self._obter_categoria("Compra de Produtos", CategoriaFinanceira.Tipo.DESPESA)
        conta = self._obter_conta_padrao()

        if not conta:
            return None

        valor_total = movimentacao.valor_total
        data_vencimento = timezone.localdate()
        status = Lancamento.Status.PAGO if ja_foi_pago else Lancamento.Status.PENDENTE

        if not ja_foi_pago:
            data_vencimento += timedelta(days=30)

        lancamento = Lancamento.objects.create(
            tipo=Lancamento.Tipo.DESPESA,
            descricao=f"Entrada de {movimentacao.produto.nome} - {movimentacao.quantidade} {movimentacao.produto.unidade_medida}",
            valor=valor_total,
            data_competencia=movimentacao.data_movimentacao.date(),
            data_vencimento=data_vencimento,
            data_pagamento=timezone.localdate() if ja_foi_pago else None,
            status=status,
            conta_bancaria=conta,
            categoria=categoria,
            movimentacao_estoque=movimentacao,
            fornecedor_cliente=movimentacao.fornecedor or "Fornecedor não especificado",
            numero_documento=movimentacao.numero_nota,
            observacoes=f"Automático: Entrada #{movimentacao.id}. {movimentacao.observacoes}",
            criado_por=movimentacao.realizado_por,
        )

        return lancamento

    def criar_receita_venda(self, venda: Venda):
        """
        Creates RECEITA Lancamento when sale is finalized.
        Also creates SAIDA MovimentacaoEstoque for each item sold.

        Args:
            venda: Venda instance with status=FINALIZADA

        Returns:
            (lancamento, movimentacoes_criadas) tuple
        """
        if venda.status != Venda.Status.FINALIZADA:
            return None, []

        if Lancamento.objects.filter(venda=venda, tipo=Lancamento.Tipo.RECEITA).exists():
            return None, []

        categoria = self._obter_categoria("Venda de Produtos", CategoriaFinanceira.Tipo.RECEITA)
        conta = self._obter_conta_padrao()

        if not conta:
            return None, []

        movimentacoes_criadas = []
        with transaction.atomic():
            # Criar RECEITA Lancamento
            lancamento = Lancamento.objects.create(
                tipo=Lancamento.Tipo.RECEITA,
                descricao=f"Venda {venda.numero}",
                valor=venda.valor_total,
                data_competencia=venda.finalizada_em.date() if venda.finalizada_em else timezone.localdate(),
                data_vencimento=timezone.localdate(),
                data_pagamento=timezone.localdate(),
                status=Lancamento.Status.PAGO,
                conta_bancaria=conta,
                categoria=categoria,
                venda=venda,
                fornecedor_cliente=venda.cliente.nome if venda.cliente else "Cliente não especificado",
                numero_documento=venda.numero_nf or venda.numero,
                observacoes=f"Automático: Venda #{venda.id}",
                criado_por=venda.caixa.responsavel if venda.caixa.responsavel else None,
            )

            # Criar SAIDA MovimentacaoEstoque para cada item
            for item_venda in venda.itens.all():
                try:
                    movimentacao = MovimentacaoEstoque.objects.create(
                        produto=item_venda.produto.produto,
                        tipo=MovimentacaoEstoque.Tipo.SAIDA,
                        quantidade=item_venda.quantidade,
                        valor_unitario=item_venda.valor_unitario,
                        motivo=MovimentacaoEstoque.Motivo.CONSUMO_INTERNO,
                        observacoes=f"Saída automática por venda #{venda.id}",
                        realizado_por=venda.vendedor.usuario if hasattr(venda, 'vendedor') else None,
                        data_movimentacao=venda.finalizada_em or timezone.now(),
                    )
                    movimentacoes_criadas.append(movimentacao)
                except Exception as e:
                    print(f"Erro ao criar MovimentacaoEstoque para item {item_venda.id}: {str(e)}")

        return lancamento, movimentacoes_criadas

    def criar_receita_prevista_venda(self, venda: Venda):
        """
        Creates RECEITA PENDENTE when sale is created (before finalization).
        Tracks future revenue opportunity.

        Args:
            venda: Venda instance

        Returns:
            Lancamento instance or None
        """
        if Lancamento.objects.filter(venda=venda, tipo=Lancamento.Tipo.RECEITA, status=Lancamento.Status.PENDENTE).exists():
            return None

        categoria = self._obter_categoria("Venda de Produtos", CategoriaFinanceira.Tipo.RECEITA)
        conta = self._obter_conta_padrao()

        if not conta:
            return None

        lancamento = Lancamento.objects.create(
            tipo=Lancamento.Tipo.RECEITA,
            descricao=f"Receita prevista - Venda {venda.numero}",
            valor=venda.valor_total,
            data_competencia=timezone.localdate(),
            data_vencimento=timezone.localdate() + timedelta(days=7),
            status=Lancamento.Status.PENDENTE,
            conta_bancaria=conta,
            categoria=categoria,
            venda=venda,
            fornecedor_cliente=venda.cliente.nome if venda.cliente else "Cliente",
            observacoes=f"Receita prevista: Venda #{venda.id}",
            criado_por=venda.vendedor.usuario if hasattr(venda, 'vendedor') else None,
        )

        return lancamento

    def calcular_margem_venda(self, venda: Venda):
        """
        Calculates profit margin for a sale.

        Returns:
            dict with margem_unitaria and margem_total
        """
        if not venda.itens.exists():
            return {"margem_unitaria": Decimal("0"), "margem_total": Decimal("0")}

        margem_total = Decimal("0")

        for item in venda.itens.all():
            custo_unitario = item.produto.produto.preco_custo or Decimal("0")
            preco_venda = item.valor_unitario or Decimal("0")
            margem_item = (preco_venda - custo_unitario) * item.quantidade
            margem_total += margem_item

        margem_media = margem_total / venda.valor_total if venda.valor_total > 0 else Decimal("0")

        return {
            "margem_total": margem_total,
            "margem_percentual": (margem_media * 100),
            "receita": venda.valor_total,
            "custo_total": sum(
                (item.produto.produto.preco_custo or Decimal("0")) * item.quantidade
                for item in venda.itens.all()
            ),
        }

    def _obter_categoria(self, nome: str, tipo: str):
        """
        Gets or creates a financial category.
        """
        categoria, _ = CategoriaFinanceira.objects.get_or_create(
            nome=nome,
            tipo=tipo,
            defaults={"icone": "dollar" if tipo == CategoriaFinanceira.Tipo.RECEITA else "shopping-cart"}
        )
        return categoria

    def _obter_conta_padrao(self):
        """
        Gets the default bank account or creates one.
        """
        conta = ContaBancaria.objects.filter(ativo=True).first()

        if not conta:
            conta = ContaBancaria.objects.create(
                nome="Caixa Principal",
                tipo=ContaBancaria.Tipo.CAIXA,
                ativo=True,
            )

        return conta
