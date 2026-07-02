from datetime import date

from django.test import SimpleTestCase

from apps.fiscal_calculator.services import (
    deve_destacar_ibs_cbs,
    obrigatorio_em_producao_ibs_cbs,
)
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
