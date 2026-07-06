from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.ordens.serializers import OrdemServicoSerializer
from apps.ordens.views import OrdemServicoViewSet


class ValorReceberParaFaturamentoTests(SimpleTestCase):
    def setUp(self):
        self.viewset = OrdemServicoViewSet()

    def test_prefere_liquido_da_nota_quando_pdf_existe(self):
        ordem = SimpleNamespace(
            valor_final_faturado=Decimal("4160.00"),
            total_com_impostos=Decimal("0.00"),
            valor_total_orcado=Decimal("0.00"),
            valor_liquido_nf=Decimal("3910.00"),
            pdf_nf=SimpleNamespace(name="nota.pdf"),
        )

        resultado = self.viewset._valor_receber_para_faturamento(ordem, {})

        self.assertEqual(resultado, Decimal("3910.00"))

    def test_sem_pdf_usar_valor_final_faturado(self):
        ordem = SimpleNamespace(
            valor_final_faturado=Decimal("4160.00"),
            total_com_impostos=Decimal("0.00"),
            valor_total_orcado=Decimal("0.00"),
            valor_liquido_nf=Decimal("3910.00"),
            pdf_nf=None,
        )

        resultado = self.viewset._valor_receber_para_faturamento(ordem, {})

        self.assertEqual(resultado, Decimal("4160.00"))

    def test_serializer_nao_recalcula_quando_edicao_eh_somente_nf(self):
        class DummyOrder:
            def __init__(self):
                self.valor_final_faturado = Decimal("4160.00")
                self.numero_nf = ""
                self.valor_total_retencoes = Decimal("0.00")
                self.valor_liquido_nf = Decimal("0.00")
                self.total_com_impostos = Decimal("0.00")
                self.valor_total_orcado = Decimal("0.00")
                self.tem_pedido_compra = False
                self.itens = SimpleNamespace(all=lambda: [])
                self.update_calls = 0

            def save(self, *args, **kwargs):
                self.update_calls += 1

        class SerializerSpy(OrdemServicoSerializer):
            def _atualizar_totais_fiscais(self, ordem):
                raise AssertionError("Não deveria recalcular totais fiscais para campos exclusivos de NF")

        serializer = SerializerSpy()
        instance = DummyOrder()
        validated_data = {
            "numero_nf": "123",
            "valor_liquido_nf": Decimal("3910.00"),
            "valor_total_retencoes": Decimal("250.00"),
            "valor_final_faturado": Decimal("4160.00"),
        }

        resultado = serializer.update(instance, validated_data)

        self.assertEqual(resultado.numero_nf, "123")
        self.assertEqual(resultado.valor_liquido_nf, Decimal("3910.00"))
        self.assertEqual(resultado.valor_total_retencoes, Decimal("250.00"))
        self.assertEqual(instance.update_calls, 1)

    def test_serializer_zera_tributos_federais_separados_no_simples(self):
        class DummyOrder:
            def __init__(self):
                self.valor_final_faturado = Decimal("850.00")
                self.numero_nf = ""
                self.valor_total_retencoes = Decimal("0.00")
                self.valor_liquido_nf = Decimal("0.00")
                self.total_com_impostos = Decimal("0.00")
                self.valor_total_orcado = Decimal("0.00")
                self.tem_pedido_compra = False
                self.tipo_regime_tributario = "simples"
                self.itens = SimpleNamespace(all=lambda: [])

            def save(self, *args, **kwargs):
                pass

        serializer = OrdemServicoSerializer()
        instance = DummyOrder()
        validated_data = {
            "valor_pis": Decimal("5.53"),
            "valor_cofins": Decimal("25.50"),
            "valor_irpj": Decimal("40.80"),
            "valor_csll": Decimal("24.48"),
            "valor_irrf": Decimal("10.00"),
            "dados_impostos": {
                "regime": "simples_nacional",
                "pis": 5.53,
                "cofins": 25.50,
                "irpj": 40.80,
                "csll": 24.48,
                "irrf": 10.00,
                "pis_aliquota": 0.65,
                "cofins_aliquota": 3,
                "irpj_aliquota": 4.8,
                "csll_aliquota": 2.88,
                "total_impostos": 106.31,
                "total_geral": 956.31,
            },
        }

        resultado = serializer.update(instance, validated_data)

        self.assertEqual(resultado.valor_pis, Decimal("0.00"))
        self.assertEqual(resultado.valor_cofins, Decimal("0.00"))
        self.assertEqual(resultado.valor_irpj, Decimal("0.00"))
        self.assertEqual(resultado.valor_csll, Decimal("0.00"))
        self.assertEqual(resultado.valor_irrf, Decimal("0.00"))
        self.assertEqual(resultado.dados_impostos["pis"], 0)
        self.assertEqual(resultado.dados_impostos["cofins"], 0)
        self.assertIsNone(resultado.dados_impostos["total_impostos"])
