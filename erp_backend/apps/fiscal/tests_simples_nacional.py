from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.fiscal.models import ConfiguracaoFiscal
from apps.fiscal.services import CalculadoraImpostos, MotorFiscalEspecialista, SimplesNacionalService


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


class CalculadoraImpostosSimplesTests(SimpleTestCase):
    def test_simples_operacional_usa_aliquota_efetiva_da_apuracao(self):
        config = SimpleNamespace(
            regime_tributario=ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL,
            anexo_simples=ConfiguracaoFiscal.AnexoSimples.ANEXO_III,
            aliquota_iss=Decimal("5.00"),
            apuracao_simples={
                "faixa": 2,
                "aliquota_efetiva": Decimal("0.0808"),
                "das_estimado": Decimal("4040.00"),
            },
        )

        resultado = CalculadoraImpostos().calcular(
            Decimal("50000.00"),
            Decimal("0.00"),
            config,
        )

        self.assertEqual(resultado["aliquotas"]["das"], Decimal("8.08"))
        self.assertEqual(resultado["total_impostos"], Decimal("4040.00"))
        self.assertEqual(resultado["total_geral"], Decimal("54040.00"))


class MotorFiscalEspecialistaSimplesTests(SimpleTestCase):
    def test_expoe_apuracao_simples_no_motor_fiscal(self):
        config = SimpleNamespace(
            regime_tributario=ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL,
            tipo_nota=ConfiguracaoFiscal.TipoNota.NFSE,
            codigo_servico_lc116="14.01",
            aliquota_iss=Decimal("5.00"),
            iss_retido_fonte=False,
            codigo_municipio_ibge="3301702",
            anexo_simples=ConfiguracaoFiscal.AnexoSimples.ANEXO_III,
            municipio="Duque de Caxias",
            uf="RJ",
            apuracao_simples={
                "rbt12": Decimal("300000.00"),
                "faixa": 2,
                "aliquota_efetiva": Decimal("0.0808"),
                "das_estimado": Decimal("4040.00"),
                "alerta": "ok",
            },
        )
        impostos = {
            "subtotal_servicos": Decimal("50000.00"),
            "subtotal_materiais": Decimal("0.00"),
            "subtotal": Decimal("50000.00"),
            "total_impostos": Decimal("4040.00"),
            "valor_liquido": Decimal("45960.00"),
            "perfil_regime": CalculadoraImpostos.PERFIS_REGIME[ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL],
        }

        resultado = MotorFiscalEspecialista().analisar_operacao(impostos, config, {})

        self.assertEqual(resultado["simples_apuracao"]["faixa"], 2)
        self.assertEqual(resultado["simples_apuracao"]["das_estimado"], Decimal("4040.00"))
