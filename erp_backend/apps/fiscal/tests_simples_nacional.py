from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.fiscal.models import ConfiguracaoFiscal
from apps.fiscal.services import SimplesNacionalService


class SimplesNacionalServiceTests(SimpleTestCase):
    def setUp(self):
        self.service = SimplesNacionalService()
        self.config = SimpleNamespace(
            data_abertura_simples=date(2025, 12, 18),
            anexo_simples=ConfiguracaoFiscal.AnexoSimples.ANEXO_III,
        )

    def test_calcula_rbt12_proporcional_para_empresa_nova(self):
        receitas = {date(2026, 1, 1): Decimal("50000.00")}

        resultado = self.service._calcular_com_receitas(
            self.config,
            date(2026, 1, 1),
            receitas,
            Decimal("50000.00"),
        )

        self.assertTrue(resultado["proporcionalizado"])
        self.assertEqual(resultado["rbt12"], Decimal("300000.00"))
        self.assertEqual(resultado["faixa"], 2)
        self.assertEqual(resultado["das_estimado"], Decimal("4040.00"))

    def test_muda_para_ultimos_doze_meses_reais_apos_primeiro_ano(self):
        receitas = {
            date(2026, mes, 1): Decimal("50000.00")
            for mes in range(1, 13)
        }

        resultado = self.service._calcular_com_receitas(
            self.config,
            date(2026, 12, 1),
            receitas,
            Decimal("50000.00"),
        )

        self.assertFalse(resultado["proporcionalizado"])
        self.assertEqual(resultado["rbt12"], Decimal("600000.00"))
        self.assertEqual(resultado["faixa"], 3)
