from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import AlertaEstoque, MovimentacaoEstoque, Produto


class MotorEstoqueOS:
    """Integra estoque, OS e financeiro quando uma OS é concluída."""

    def processar_conclusao_os(self, ordem, usuario=None):
        from apps.financeiro.models import CategoriaFinanceira, ContaBancaria, Lancamento
        from apps.ordens.models import DespesaOS

        itens_produto = ordem.itens.filter(origem_tipo="produto", produto__isnull=False).select_related("produto")
        resultados = []

        if not itens_produto.exists():
            return resultados

        conta, _ = ContaBancaria.objects.get_or_create(
            nome="Caixa principal",
            defaults={"banco": "Caixa interno", "tipo": ContaBancaria.Tipo.CAIXA, "saldo_inicial": 0, "ativo": True},
        )
        categoria_despesa, _ = CategoriaFinanceira.objects.get_or_create(
            nome="Custo de produtos aplicados em OS",
            tipo=Lancamento.Tipo.DESPESA,
            defaults={"cor": "#EF4444"},
        )
        categoria_receita, _ = CategoriaFinanceira.objects.get_or_create(
            nome="Receita de venda de produtos",
            tipo=Lancamento.Tipo.RECEITA,
            defaults={"cor": "#10B981"},
        )

        with transaction.atomic():
            for item in itens_produto:
                produto = item.produto
                quantidade = Decimal(item.quantidade or 0)
                custo_unitario = Decimal(produto.preco_custo or 0)
                venda_unitaria = Decimal(item.valor_unitario or produto.preco_venda or 0)
                custo_total = quantidade * custo_unitario
                venda_total = quantidade * venda_unitaria
                referencia = f"OS {ordem.numero} item {item.id}"

                if produto.tipo_suprimento == Produto.TipoSuprimento.ESTOQUE:
                    movimento, criado = MovimentacaoEstoque.objects.get_or_create(
                        produto=produto,
                        os=ordem,
                        motivo=MovimentacaoEstoque.Motivo.USO_OS,
                        observacoes=referencia,
                        defaults={
                            "tipo": MovimentacaoEstoque.Tipo.SAIDA,
                            "quantidade": quantidade,
                            "valor_unitario": custo_unitario,
                            "realizado_por": usuario,
                        },
                    )
                    self._sincronizar_alerta(produto)
                    resultados.append({"produto": produto.nome, "acao": "saida_estoque", "criado": criado})
                else:
                    self._criar_alerta_futuro(produto, ordem, quantidade)
                    resultados.append({"produto": produto.nome, "acao": "produto_futuro", "criado": True})

                DespesaOS.objects.get_or_create(
                    os=ordem,
                    descricao=f"Custo produto {produto.nome} - {referencia}",
                    defaults={
                        "valor": custo_total,
                        "tipo": DespesaOS.Tipo.MATERIAL,
                        "registrado_por": usuario,
                        "data_despesa": timezone.localdate(),
                    },
                )

                Lancamento.objects.get_or_create(
                    os=ordem,
                    tipo=Lancamento.Tipo.DESPESA,
                    descricao=f"Custo produto {produto.nome} - {ordem.numero}",
                    defaults={
                        "valor": custo_total,
                        "data_competencia": timezone.localdate(),
                        "data_vencimento": timezone.localdate(),
                        "status": Lancamento.Status.PENDENTE,
                        "conta_bancaria": conta,
                        "categoria": categoria_despesa,
                        "fornecedor_cliente": produto.nome,
                        "numero_documento": ordem.numero,
                        "criado_por": usuario,
                    },
                )

                Lancamento.objects.get_or_create(
                    os=ordem,
                    tipo=Lancamento.Tipo.RECEITA,
                    descricao=f"Venda produto {produto.nome} - {ordem.numero}",
                    defaults={
                        "valor": venda_total,
                        "data_competencia": timezone.localdate(),
                        "data_vencimento": ordem.data_vencimento or timezone.localdate(),
                        "status": Lancamento.Status.PENDENTE,
                        "conta_bancaria": conta,
                        "categoria": categoria_receita,
                        "fornecedor_cliente": ordem.cliente.nome if ordem.cliente else "",
                        "numero_documento": ordem.numero,
                        "criado_por": usuario,
                    },
                )

        return resultados

    def _sincronizar_alerta(self, produto):
        if produto.estoque_atual <= 0:
            tipo = AlertaEstoque.TipoAlerta.SEM_ESTOQUE
            descricao = f"{produto.nome} está sem estoque."
        elif produto.em_alerta:
            tipo = AlertaEstoque.TipoAlerta.ESTOQUE_BAIXO
            descricao = f"{produto.nome} está abaixo do estoque mínimo."
        else:
            return

        AlertaEstoque.objects.get_or_create(
            produto=produto,
            tipo=tipo,
            lido=False,
            defaults={"descricao": descricao},
        )

    def _criar_alerta_futuro(self, produto, ordem, quantidade):
        AlertaEstoque.objects.get_or_create(
            produto=produto,
            tipo=AlertaEstoque.TipoAlerta.FORA_MINIMO,
            lido=False,
            defaults={
                "descricao": f"Produto futuro para compra: {quantidade} x {produto.nome} na OS {ordem.numero}.",
            },
        )
