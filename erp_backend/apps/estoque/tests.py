from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import CategoriaProduto, Produto, MovimentacaoEstoque, AlertaEstoque, Servico
from .services import MotorCatalogoInteligente

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


class MotorCatalogoInteligenteTestCase(TestCase):
    def setUp(self):
        self.motor = MotorCatalogoInteligente()

    def test_analisar_texto_separa_produto_e_servico(self):
        texto = "\n".join([
            "Limpeza quimica de split; tipo: servico; categoria: hvac; venda: 280",
            "Capacitor 45uF; tipo: produto; categoria: Ar condicionado / HVAC; custo: 38; markup: 60",
        ])

        resultado = self.motor.analisar(texto=texto)

        self.assertEqual(resultado["resumo"]["total_linhas"], 2)
        self.assertEqual(resultado["resumo"]["servicos"], 1)
        self.assertEqual(resultado["resumo"]["produtos"], 1)
        self.assertEqual(resultado["itens"][0]["tipo"], "servico")
        self.assertEqual(resultado["itens"][1]["tipo"], "produto")
        self.assertEqual(resultado["itens"][1]["preco_custo"], "38.00")
        self.assertGreater(Decimal(resultado["itens"][1]["preco_venda"]), Decimal("38.00"))

    def test_criar_itens_em_lote_cria_produto_servico_e_categoria(self):
        itens = self.motor.analisar(
            texto="\n".join([
                "Manutencao corretiva de ar-condicionado; tipo: servico; categoria: hvac; venda: 450",
                "Rele termico compressor; tipo: produto; categoria: Ar condicionado / HVAC; custo: 72; venda: 145",
            ])
        )["itens"]

        resultado = self.motor.criar(itens)

        self.assertEqual(resultado["erros"], [])
        self.assertEqual(resultado["servicos_criados"], 1)
        self.assertEqual(resultado["produtos_criados"], 1)
        self.assertTrue(Servico.objects.filter(nome="Manutencao corretiva de ar-condicionado").exists())
        produto = Produto.objects.get(nome="Rele termico compressor")
        self.assertEqual(produto.preco_custo, Decimal("72.00"))
        self.assertEqual(produto.preco_venda, Decimal("145.00"))
        self.assertEqual(produto.categoria.nome, "Ar condicionado / HVAC")

    def test_criar_itens_em_lote_atualiza_existentes(self):
        categoria = CategoriaProduto.objects.create(nome="Ar condicionado / HVAC")
        Produto.objects.create(
            nome="Capacitor 45uF",
            categoria=categoria,
            preco_custo=Decimal("30.00"),
            preco_venda=Decimal("60.00"),
            preco_manual=True,
        )

        itens = self.motor.analisar(
            texto="Capacitor 45uF; tipo: produto; categoria: Ar condicionado / HVAC; custo: 40; venda: 80"
        )["itens"]
        resultado = self.motor.criar(itens)

        self.assertEqual(resultado["produtos_criados"], 0)
        self.assertEqual(resultado["produtos_atualizados"], 1)
        self.assertEqual(Produto.objects.count(), 1)
        self.assertEqual(Produto.objects.get(nome="Capacitor 45uF").preco_venda, Decimal("80.00"))
