from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.ordens.services import NotaFiscalInteligente


class NotaFiscalInteligenteTests(SimpleTestCase):
    def test_extrai_campos_principais_e_valida_contra_os(self):
        texto = """
        NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e
        Número da NFS-e: 00012345
        Data e Hora de Emissão: 05/07/2026 14:22
        Tomador de Serviços
        CNPJ: 12.345.678/0001-90
        Discriminação dos Serviços
        Manutenção preventiva de ar condicionado conforme OS.
        Valor dos Serviços R$ 5.000,00
        Valor do ISS R$ 150,00
        PIS R$ 32,50
        COFINS R$ 150,00
        Valor Total da Nota R$ 5.000,00
        """
        ordem = SimpleNamespace(
            valor_final_faturado=Decimal("0.00"),
            total_com_impostos=Decimal("0.00"),
            valor_total_orcado=Decimal("5000.00"),
            descricao_servico="Manutenção preventiva de ar condicionado",
            descricao_servico_nf="",
            cliente=SimpleNamespace(cnpj_cpf="12.345.678/0001-90"),
        )

        resultado = NotaFiscalInteligente().analisar_texto(texto, ordem=ordem)

        self.assertEqual(resultado["tipo_documento"], "nfse")
        self.assertEqual(resultado["numero_nf_sugerido"], "00012345")
        self.assertEqual(resultado["data_emissao_sugerida"], "2026-07-05")
        self.assertEqual(resultado["valor_total_sugerido"], "5000.00")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_issqn"], "150.00")
        self.assertTrue(resultado["validacoes"]["valor_confere_os"])
        self.assertTrue(resultado["validacoes"]["cnpj_cliente_confere"])
        self.assertGreaterEqual(Decimal(resultado["confianca"]), Decimal("85"))

    def test_nao_chuta_quando_pdf_nao_tem_texto_util(self):
        resultado = NotaFiscalInteligente().analisar_texto("   \n  ")

        self.assertEqual(resultado["confianca"], "0")
        self.assertTrue(resultado["precisa_revisao"])
        self.assertEqual(resultado["numero_nf_sugerido"], "")
