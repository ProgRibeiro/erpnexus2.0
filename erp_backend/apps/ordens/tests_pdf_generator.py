from decimal import Decimal

from django.test import SimpleTestCase

from apps.ordens.pdf_generator import _montar_impostos_detalhados_para_orcamento


class PdfGeneratorImpostosPorRegimeTests(SimpleTestCase):
    def test_simples_monta_das_e_nao_lista_tributos_federais_separados(self):
        resultado = _montar_impostos_detalhados_para_orcamento(
            {
                "regime": "simples_nacional",
                "iss": Decimal("0.00"),
                "total_impostos": Decimal("4040.00"),
                "aliquotas": {"iss": Decimal("0.00"), "das": Decimal("8.08")},
            }
        )

        nomes = [item["nome"] for item in resultado]
        self.assertIn("DAS", nomes)
        self.assertIn("ISS", nomes)
        self.assertNotIn("PIS", nomes)
        self.assertNotIn("COFINS", nomes)
        self.assertNotIn("IRPJ", nomes)
        self.assertNotIn("CSLL", nomes)

    def test_lucro_presumido_lista_tributos_federais_separados(self):
        resultado = _montar_impostos_detalhados_para_orcamento(
            {
                "regime": "lucro_presumido",
                "iss": Decimal("42.50"),
                "pis": Decimal("5.53"),
                "cofins": Decimal("25.50"),
                "irpj": Decimal("40.80"),
                "csll": Decimal("24.48"),
                "aliquotas": {
                    "iss": Decimal("5.00"),
                    "pis": Decimal("0.65"),
                    "cofins": Decimal("3.00"),
                    "irpj": Decimal("4.80"),
                    "csll": Decimal("2.88"),
                },
            }
        )

        nomes = [item["nome"] for item in resultado]
        self.assertIn("ISS", nomes)
        self.assertIn("PIS", nomes)
        self.assertIn("COFINS", nomes)
        self.assertIn("IRPJ", nomes)
        self.assertIn("CSLL", nomes)
        self.assertNotIn("DAS", nomes)
