from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.ordens.services import NotaFiscalInteligente


class NotaFiscalInteligenteTests(SimpleTestCase):
    def test_extrai_modelo_prefeitura_duque_de_caxias_ibs_cbs(self):
        texto = """
        Prefeitura Municipal de Duque de Caxias - RJ
        Secretaria Mun de Fazenda Planejamento
        Secretaria Municipal Fazenda e Planejamento - Fone: (21)2672-8875
        Série do Documento
        Nota Fiscal de Serviço
        Eletrônica - NFS-e
        Número da Nota Fiscal
        1381
        Data de Geração da NFS-e Data de Competência Código de Autenticidade
        20/05/2026 14:33:26 20/05/2026 33017021245461929000156000000000138126051779298404
        Emitente da NFS-e Número da DPS Data Emissão da DPS Série da DPS
        Prestador
        Consulte a autenticidade desta nota lendo o QRcode ou acessando o site: https://www.issnetonline.com.br/duquedecaxias/online/
        IDENTIFICAÇÃO DO PRESTADOR
        CNPJ/CPF/NIF: 45.461.929/0001-56 Inscrição Municipal: 99142027 Telefone: (41)3209-5554
        Nome/Razão Social: Nexus Manutencao e Facilites Ltda
        Nome Fantasia: Nexus Manutencao, Obras e Facilities
        Endereço: Rua Acrópole, 0 - QUADRA3 LOTE 2 CEP: 25221-350
        Cidade: Duque de Caxias Estado/Prov./Reg.: Rio de Janeiro País: Brasil
        E-mail: nexusrefrigeracao@hotmail.com
        Situação Simples Nacional: Não Optante Regime Apuração: - Regime Especial: Nenhum
        IDENTIFICAÇÃO DO TOMADOR
        CNPJ/CPF/NIF: 78.876.950/0179-02 Inscrição Municipal: Telefone:
        Nome/Razão Social: CIA HERING
        Nome Fantasia:
        Endereço: Rua Visconde de Pirajá, 433 - LOJA 433 CEP: 22410-003
        Cidade: Rio de Janeiro Estado/Prov./Reg.: Rio de Janeiro País: Brasil
        E-mail:
        INTERMEDIÁRIO DO SERVIÇO NÃO IDENTIFICADO NA NFS-E
        DESTINATÁRIO É O PRÓPRIO TOMADOR IDENTIFICADO NA NFS-E
        DADOS DO SERVIÇO PRESTADO
        Cód. Trib. Nacional: 14.01.01 NBS: 1.2001.60.00 Atividade Municipal: 14.01 - Lubrificação, limpeza, lustração, revisão,...
        Local da Prestação: Duque de Caxias - RJ País Resultado da Prestação do Serviço: -
        Vl. do Serviço: R$579,09 Vl. do Desc. Incondicionado: - Vl. do Desc. Condicionado: -
        Descrição do Serviço: serviço emergencial executado no dia 20/04
        IMPOSTO SOBRE SERVIÇO DE QUALQUER NATUREZA - ISSQN
        Tipo Tributação: Operação tributável Tipo Susp. Exig.: - Nº Proc. Susp.: -
        Município de Incidência: Duque de Caxias - RJ Tipo de Retenção: Não Retido Valor Dedução: R$0,00
        Base de Cálculo: R$579,09 Alíquota: 5% Vl. ISSQN: R$28,95
        TRIBUTAÇÃO NACIONAL
        CST: Operação Tributável com Alíquota Básica
        Tipo de Retenção: PIS/COFINS Retido Vl. PIS: R$3,76 Vl. COFINS: R$17,37
        Vl. CSLL: R$5,79 Vl. IRRF: R$0,01 Vl. CP Retido: R$0,01
        IMPOSTO E CONTRIBUIÇÃO SOBRE BENS E SERVIÇOS - IBS/CBS
        Cód. Ind. Op.: 050101 Classif. Tributária: 000001 Situação Tributária: Tributação integral
        Município de Incidência: Duque de Caxias - RJ Tipo de Operação: -
        Tipo de Ente Governamental: - Perc. Red. Compra Gov.: - Base de Cálculo: R$529,01
        Alíq. CBS: 0,9% Perc. Red. Alíq. CBS: - Alíq. Efet. CBS: 0,9% Valor CBS: R$4,76
        Alíq. IBS Est.: 0,1% Perc. Red. Alíq. IBS Est.: - Alíq. Efet. IBS Est.: 0,1% Valor IBS Est.: R$0,53
        Alíq. IBS Mun.: 0% Perc. Red. Alíq. IBS Mun.: - Alíq. Efet. IBS Mun.: 0% Valor IBS Mun.: R$0,00
        Cód. Créd. Pres.: Alíq. do Créd. Pres. (CBS): - Alíq. do Créd. Pres. (IBS): -
        Vl. do Créd. Pres. (CBS): - Vl. do Créd. Pres. (IBS): -
        Classif. Tributária Regular: - Situação Tributária Regular: -
        Aliq. Efet. Regular - CBS: - Alíq. Efet. Regular - IBS Estadual: - Alíq. Efet. Regular - IBS Municipal: -
        Valor CBS: - Vl. IBS Regular Estadual: - Vl. IBS Regular Municipal: -
        Total de Retenção Valor Total do CBS Valor Total do IBS Valor Total Líquido Valor Total da Nota Fiscal - IBS/CBS
        R$5,81 R$4,76 R$0,53 R$552,15 R$552,15
        """

        resultado = NotaFiscalInteligente().analisar_texto(texto)

        self.assertEqual(resultado["tipo_documento"], "nfse")
        self.assertEqual(resultado["valor_total_sugerido"], "552.15")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_issqn"], "28.95")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_pis"], "3.76")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_cofins"], "17.37")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_csll"], "5.79")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_irrf"], "0.01")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_cbs"], "4.76")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_ibs"], "0.53")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_total_retencoes"], "5.81")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_liquido_nf"], "552.15")

    def test_extrai_modelo_prefeitura_duque_de_caxias(self):
        texto = """
        Prefeitura Municipal de Duque de Caxias - RJ
        Secretaria Mun de Fazenda Planejamento
        Nota Fiscal de Serviço Eletrônica - NFS-e
        Número da Nota Fiscal
        1379
        Data de Geração da NFS-e Data de Competência Código de Autenticidade
        12/05/2026 08:46:05 12/05/2026 33017021245461929000156000000000137926051778586364
        IDENTIFICAÇÃO DO PRESTADOR
        CNPJ/CPF/NIF: 45.461.929/0001-56 Inscrição Municipal: 99142027 Telefone: (41)3209-5554
        IDENTIFICAÇÃO DO TOMADOR
        CNPJ/CPF/NIF: 16.590.234/0091-22 Inscrição Municipal: Telefone: (21)2129-5000
        DADOS DO SERVIÇO PRESTADO
        Vl. do Serviço: R$345,00 Vl. do Desc. Incondicionado: - Vl. do Desc. Condicionado: -
        Descrição do Serviço: RESERVA LEBLON | FORNECIMENTO DE CENTRAL PORTA DE ENROLAR | ORC-260406-1431 - Pedido de Compra:
        4501881402
        IMPOSTO SOBRE SERVIÇO DE QUALQUER NATUREZA - ISSQN
        Base de Cálculo: R$345,00 Alíquota: 5% Vl. ISSQN: R$17,25
        TRIBUTAÇÃO NACIONAL
        Tipo de Retenção: PIS/COFINS/CSLL Retidos Vl. PIS: R$2,24 Vl. COFINS: R$10,35
        Vl. CSLL: R$3,45 Vl. IRRF: R$5,18 Vl. CP Retido: R$0,00
        IMPOSTO E CONTRIBUIÇÃO SOBRE BENS E SERVIÇOS - IBS/CBS
        Alíq. CBS: 0,9% Valor CBS: R$2,84
        Alíq. IBS Est.: 0,1% Valor IBS Est.: R$0,32
        Total de Retenção Valor Total do CBS Valor Total do IBS Valor Total Líquido Valor Total da Nota Fiscal - IBS/CBS
        R$8,63 R$2,84 R$0,32 R$323,78 R$323,78
        """

        resultado = NotaFiscalInteligente().analisar_texto(texto)

        self.assertEqual(resultado["tipo_documento"], "nfse")
        self.assertEqual(resultado["numero_nf_sugerido"], "1379")
        self.assertEqual(resultado["data_emissao_sugerida"], "2026-05-12")
        self.assertEqual(resultado["valor_total_sugerido"], "323.78")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_issqn"], "17.25")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_pis"], "2.24")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_cofins"], "10.35")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_csll"], "3.45")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_irrf"], "5.18")

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

    def test_nao_usa_aliquota_como_valor_de_imposto(self):
        texto = """
        NFS-e 123
        Data de Emissão: 05/07/2026
        Valor Total da Nota R$ 5.000,00
        ISS 3,00%
        PIS 0,65%
        COFINS 3,00%
        """

        resultado = NotaFiscalInteligente().analisar_texto(texto)

        self.assertNotIn("valor_issqn", resultado["impostos_sugeridos"])
        self.assertNotIn("valor_pis", resultado["impostos_sugeridos"])
        self.assertNotIn("valor_cofins", resultado["impostos_sugeridos"])

    def test_quando_linha_tem_percentual_e_reais_pega_somente_reais(self):
        texto = """
        NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e
        Número da NFS-e: 00012345
        Data de Emissão: 05/07/2026
        Valor Total da Nota R$ 5.000,00
        ISS 3,00% R$ 150,00
        PIS 0,65% R$ 32,50
        COFINS 3,00% R$ 150,00
        """

        resultado = NotaFiscalInteligente().analisar_texto(texto)

        self.assertEqual(resultado["impostos_sugeridos"]["valor_issqn"], "150.00")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_pis"], "32.50")
        self.assertEqual(resultado["impostos_sugeridos"]["valor_cofins"], "150.00")
