import io

import openpyxl
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from apps.importacao.views import _decimal, _linhas_arquivo, _normalizar_header


class LeituraArquivoImportacaoTests(SimpleTestCase):
    def test_le_csv_com_ponto_e_virgula_e_cabecalho_acentuado(self):
        arquivo = SimpleUploadedFile(
            "servicos.csv",
            "Nome;Preço Padrão;Descrição\nLimpeza;1.234,56;Limpeza técnica\n".encode("utf-8"),
            content_type="text/csv",
        )

        linhas = list(_linhas_arquivo(arquivo, ["nome"]))

        self.assertEqual(linhas[0][0], 2)
        self.assertEqual(linhas[0][1]["preco_padrao"], "1.234,56")
        self.assertEqual(_decimal(linhas[0][1]["preco_padrao"]), _decimal("1234.56"))

    def test_le_xlsx_e_preserva_codigo_numerico_sem_decimal(self):
        workbook = openpyxl.Workbook()
        worksheet = workbook.active
        worksheet.append(["Código", "Nome"])
        worksheet.append([123, "Produto teste"])
        buffer = io.BytesIO()
        workbook.save(buffer)
        arquivo = SimpleUploadedFile(
            "produtos.xlsx",
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        linhas = list(_linhas_arquivo(arquivo, ["nome"]))

        self.assertEqual(_normalizar_header("Código"), "codigo")
        self.assertEqual(linhas[0][1]["codigo"], 123)

    def test_rejeita_formato_xls_legado_com_mensagem_clara(self):
        arquivo = SimpleUploadedFile("clientes.xls", b"arquivo legado")

        with self.assertRaisesMessage(ValueError, "Formato não suportado"):
            list(_linhas_arquivo(arquivo, ["nome"]))

    def test_rejeita_planilha_sem_coluna_obrigatoria(self):
        arquivo = SimpleUploadedFile(
            "clientes.csv",
            b"email;telefone\ncliente@example.com;11999999999\n",
            content_type="text/csv",
        )

        with self.assertRaisesMessage(ValueError, "Coluna obrigatória ausente: nome"):
            list(_linhas_arquivo(arquivo, ["nome"]))

    def test_converte_valores_monetarios_brasileiros(self):
        self.assertEqual(_decimal("R$ 1.234,56"), _decimal("1234.56"))

