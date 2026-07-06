from decimal import Decimal

from django.test import SimpleTestCase

from apps.fiscal.models import ApuracaoSimplesNacional
from apps.fiscal.serializers import SimularSimplesSerializer, VersaoRegraSimplesNacionalSerializer
from apps.fiscal.views import _alerta_por_limites, _buscar_faixa_customizada


class SimplesApiUnitTests(SimpleTestCase):
    def test_busca_faixa_customizada_retorna_faixa_esperada(self):
        tabela = [
            {"limite": "180000.00", "aliquota": "6.00", "deduzir": "0.00"},
            {"limite": "360000.00", "aliquota": "11.20", "deduzir": "9360.00"},
        ]

        faixa, aliquota, deduzir = _buscar_faixa_customizada(Decimal("300000.00"), tabela)

        self.assertEqual(faixa, 2)
        self.assertEqual(aliquota, Decimal("0.112"))
        self.assertEqual(deduzir, Decimal("9360.00"))

    def test_alerta_por_limites(self):
        alerta = _alerta_por_limites(
            Decimal("3900000.00"),
            Decimal("3600000.00"),
            Decimal("4800000.00"),
        )
        self.assertEqual(alerta, ApuracaoSimplesNacional.Alerta.PERTO_TETO)

    def test_serializer_simulacao_aceita_payload(self):
        serializer = SimularSimplesSerializer(
            data={
                "competencia": "2026-01-01",
                "receita_bruta": "50000.00",
                "origem": "api",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["origem"], "api")

    def test_serializer_regra_expoe_campos_esperados(self):
        fields = VersaoRegraSimplesNacionalSerializer().get_fields()
        self.assertIn("nome", fields)
        self.assertIn("anexo", fields)
        self.assertIn("tabela_faixas", fields)
