from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.fiscal_calculator.services import (
    deve_destacar_ibs_cbs,
    obrigatorio_em_producao_ibs_cbs,
)
from apps.fiscal.models import ConfiguracaoFiscal
from apps.fiscal.services import CalculadoraImpostos
from apps.fiscal_rules.models import RegimeTributario


class DecisaoIbsCbsTests(SimpleTestCase):
    def test_regime_normal_destaca_em_2026(self):
        self.assertTrue(deve_destacar_ibs_cbs(RegimeTributario.LUCRO_PRESUMIDO, date(2026, 1, 1)))

    def test_regime_normal_obrigatorio_em_producao_em_agosto_2026(self):
        self.assertFalse(obrigatorio_em_producao_ibs_cbs(RegimeTributario.LUCRO_REAL, date(2026, 8, 2)))
        self.assertTrue(obrigatorio_em_producao_ibs_cbs(RegimeTributario.LUCRO_REAL, date(2026, 8, 3)))

    def test_simples_e_mei_so_destacam_em_2027(self):
        self.assertFalse(deve_destacar_ibs_cbs(RegimeTributario.SIMPLES_NACIONAL, date(2026, 12, 31)))
        self.assertTrue(deve_destacar_ibs_cbs(RegimeTributario.SIMPLES_NACIONAL, date(2027, 1, 4)))
        self.assertTrue(deve_destacar_ibs_cbs(RegimeTributario.MEI, date(2027, 1, 4)))


class CalculadoraRegimesTests(SimpleTestCase):
    def setUp(self):
        self.calculadora = CalculadoraImpostos()
        self.tabela_lucro_presumido = SimpleNamespace(
            pis=Decimal("0.65"),
            cofins=Decimal("3.00"),
            irpj_servicos=Decimal("4.80"),
            csll_servicos=Decimal("2.88"),
        )

    def _config(self, regime):
        return SimpleNamespace(
            regime_tributario=regime,
            aliquota_iss=Decimal("5.00"),
        )

    def test_simples_nao_aplica_lucro_presumido(self):
        resultado = self.calculadora.calcular(
            Decimal("1000.00"),
            Decimal("0.00"),
            self._config(ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL),
        )

        self.assertEqual(resultado["regime"], "simples_nacional")
        self.assertEqual(resultado["irpj"], Decimal("0.00"))
        self.assertEqual(resultado["csll"], Decimal("0.00"))
        self.assertEqual(resultado["aliquotas"]["das"], Decimal("6.00"))
        self.assertFalse(resultado["perfil_regime"]["usa_presuncao_irpj_csll"])

    def test_lucro_presumido_aplica_presuncao(self):
        with self._mock_tabela_lucro_presumido():
            resultado = self.calculadora.calcular(
                Decimal("1000.00"),
                Decimal("0.00"),
                self._config(ConfiguracaoFiscal.RegimeTributario.LUCRO_PRESUMIDO),
            )

        self.assertEqual(resultado["regime"], "lucro_presumido")
        self.assertEqual(resultado["irpj"], Decimal("48.00"))
        self.assertEqual(resultado["csll"], Decimal("28.80"))
        self.assertTrue(resultado["perfil_regime"]["usa_presuncao_irpj_csll"])

    def test_lucro_real_nao_usa_presuncao_de_irpj_csll(self):
        with self._mock_tabela_lucro_presumido():
            resultado = self.calculadora.calcular(
                Decimal("1000.00"),
                Decimal("0.00"),
                self._config(ConfiguracaoFiscal.RegimeTributario.LUCRO_REAL),
            )

        self.assertEqual(resultado["regime"], "lucro_real")
        self.assertEqual(resultado["irpj"], Decimal("0.00"))
        self.assertEqual(resultado["csll"], Decimal("0.00"))
        self.assertFalse(resultado["perfil_regime"]["usa_presuncao_irpj_csll"])

    def _mock_tabela_lucro_presumido(self):
        class QueryMock:
            def __init__(self, tabela):
                self.tabela = tabela

            def order_by(self, *_args):
                return self

            def first(self):
                return self.tabela

        return patch(
            "apps.fiscal.services.TabelaImpostoLucroPresumido.objects.filter",
            return_value=QueryMock(self.tabela_lucro_presumido),
        )
