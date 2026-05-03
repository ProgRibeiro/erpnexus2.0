from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import CategoriaProduto, Produto, MovimentacaoEstoque, AlertaEstoque

User = get_user_model()


class CategoriaProdutoTestCase(TestCase):
    def setUp(self):
        self.categoria = CategoriaProduto.objects.create(
            nome="Gás Refrigerante",
            descricao="Gases refrigerantes para sistemas de climatização"
        )

    def test_criar_categoria(self):
        self.assertEqual(self.categoria.nome, "Gás Refrigerante")
        self.assertEqual(CategoriaProduto.objects.count(), 1)

    def test_categoria_unique(self):
        with self.assertRaises(Exception):
            CategoriaProduto.objects.create(nome="Gás Refrigerante")


class ProdutoTestCase(TestCase):
    def setUp(self):
        self.categoria = CategoriaProduto.objects.create(nome="Filtros")
        self.usuario = User.objects.create_user(
            username="tecnico",
            email="tecnico@test.com",
            password="senha123"
        )
        self.produto = Produto.objects.create(
            nome="Filtro de Ar 5 micra",
            categoria=self.categoria,
            preco_custo=Decimal("15.00"),
            preco_venda=Decimal("35.00"),
            estoque_minimo=Decimal("5"),
            unidade_medida="caixa"
        )

    def test_criar_produto(self):
        self.assertEqual(self.produto.nome, "Filtro de Ar 5 micra")
        self.assertTrue(self.produto.codigo)

    def test_estoque_atual_vazio(self):
        self.assertEqual(self.produto.estoque_atual, 0)

    def test_estoque_em_alerta(self):
        self.assertTrue(self.produto.em_alerta)

    def test_margem_unitaria(self):
        margem = self.produto.margem_unitaria
        self.assertEqual(margem, Decimal("20.00"))

    def test_margem_percentual(self):
        margem_perc = float(self.produto.margem_percentual)
        self.assertAlmostEqual(margem_perc, 133.33, places=1)


class MovimentacaoEstoqueTestCase(TestCase):
    def setUp(self):
        self.categoria = CategoriaProduto.objects.create(nome="Cabos")
        self.usuario = User.objects.create_user(
            username="gerente",
            email="gerente@test.com",
            password="senha123"
        )
        self.produto = Produto.objects.create(
            nome="Cabo Amarelo 6mm²",
            categoria=self.categoria,
            preco_custo=Decimal("2.50"),
            preco_venda=Decimal("5.00"),
            estoque_minimo=Decimal("10"),
            unidade_medida="m"
        )

    def test_entrada_estoque(self):
        movimentacao = MovimentacaoEstoque.objects.create(
            produto=self.produto,
            tipo=MovimentacaoEstoque.Tipo.ENTRADA,
            quantidade=Decimal("100"),
            valor_unitario=Decimal("2.50"),
            motivo=MovimentacaoEstoque.Motivo.COMPRA,
            fornecedor="Fornecedor ABC",
            numero_nota="NF-001",
            realizado_por=self.usuario
        )

        self.assertEqual(movimentacao.quantidade, Decimal("100"))
        self.assertEqual(movimentacao.valor_total, Decimal("250.00"))
        self.assertEqual(self.produto.estoque_atual, Decimal("100"))

    def test_saida_estoque(self):
        MovimentacaoEstoque.objects.create(
            produto=self.produto,
            tipo=MovimentacaoEstoque.Tipo.ENTRADA,
            quantidade=Decimal("50"),
            valor_unitario=Decimal("2.50"),
            motivo=MovimentacaoEstoque.Motivo.COMPRA,
            realizado_por=self.usuario
        )

        MovimentacaoEstoque.objects.create(
            produto=self.produto,
            tipo=MovimentacaoEstoque.Tipo.SAIDA,
            quantidade=Decimal("20"),
            valor_unitario=Decimal("2.50"),
            motivo=MovimentacaoEstoque.Motivo.USO_OS,
            realizado_por=self.usuario
        )

        self.assertEqual(self.produto.estoque_atual, Decimal("30"))

    def test_alerta_estoque_baixo(self):
        MovimentacaoEstoque.objects.create(
            produto=self.produto,
            tipo=MovimentacaoEstoque.Tipo.ENTRADA,
            quantidade=Decimal("5"),
            motivo=MovimentacaoEstoque.Motivo.COMPRA,
            realizado_por=self.usuario
        )

        self.assertEqual(self.produto.estoque_atual, Decimal("5"))
        self.assertTrue(self.produto.em_alerta)
        self.assertEqual(AlertaEstoque.objects.count(), 1)
