from io import BytesIO
from openpyxl import load_workbook
from apps.clientes.models import Cliente
from apps.estoque.models import Servico, Produto, CategoriaProduto
from decimal import Decimal


class ExcelImporter:
    @staticmethod
    def importar_clientes(arquivo):
        """Importa clientes a partir de arquivo Excel"""
        try:
            wb = load_workbook(BytesIO(arquivo.read()))
            ws = wb.active

            sucesso = 0
            falhas = 0
            erros = []

            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    if not row[0]:  # nome é obrigatório
                        continue

                    nome_fantasia = row[0] if row[0] else ""
                    razao_social = row[1] if len(row) > 1 and row[1] else nome_fantasia
                    cnpj = row[2] if len(row) > 2 and row[2] else ""
                    telefone = row[3] if len(row) > 3 and row[3] else ""
                    email = row[4] if len(row) > 4 and row[4] else ""
                    segmento = row[5] if len(row) > 5 and row[5] else ""
                    status = row[6] if len(row) > 6 and row[6] else "ativo"
                    cidade = row[7] if len(row) > 7 and row[7] else ""
                    uf = row[8] if len(row) > 8 and row[8] else ""

                    cliente, created = Cliente.objects.get_or_create(
                        cnpj_cpf=cnpj if cnpj else None,
                        defaults={
                            "nome": nome_fantasia,
                            "nome_fantasia": nome_fantasia,
                            "razao_social": razao_social,
                            "telefone": telefone,
                            "email": email,
                            "segmento": segmento if segmento in dict(Cliente.Segmento.choices) else None,
                            "status": status if status in ["ativo", "inativo"] else "ativo",
                            "cidade": cidade,
                            "uf": uf,
                        }
                    )
                    sucesso += 1
                except Exception as e:
                    falhas += 1
                    erros.append(f"Linha {row_idx}: {str(e)}")

            return {"sucesso": sucesso, "falhas": falhas, "erros": erros}
        except Exception as e:
            return {"sucesso": 0, "falhas": 1, "erros": [str(e)]}

    @staticmethod
    def importar_servicos(arquivo):
        """Importa serviços a partir de arquivo Excel"""
        try:
            wb = load_workbook(BytesIO(arquivo.read()))
            ws = wb.active

            sucesso = 0
            falhas = 0
            erros = []

            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    if not row[0]:  # nome é obrigatório
                        continue

                    nome = row[0] if row[0] else ""
                    descricao = row[1] if len(row) > 1 and row[1] else ""
                    categoria = row[2] if len(row) > 2 and row[2] else "hvac"
                    preco_padrao = Decimal(str(row[3])) if len(row) > 3 and row[3] else Decimal("0")
                    tributacao = row[4] if len(row) > 4 and row[4] else "iss"
                    codigo_lc116 = row[5] if len(row) > 5 and row[5] else ""
                    unidade_medida = row[6] if len(row) > 6 and row[6] else "uni"

                    servico, created = Servico.objects.get_or_create(
                        nome=nome,
                        defaults={
                            "descricao": descricao,
                            "categoria": categoria if categoria in dict(Servico.Categoria.choices) else "hvac",
                            "preco_padrao": preco_padrao,
                            "tributacao": tributacao if tributacao in dict(Servico.Tributacao.choices) else "iss",
                            "codigo_lc116": codigo_lc116,
                            "unidade_medida": unidade_medida if unidade_medida in dict(Servico.UnidadeMedida.choices) else "uni",
                        }
                    )
                    sucesso += 1
                except Exception as e:
                    falhas += 1
                    erros.append(f"Linha {row_idx}: {str(e)}")

            return {"sucesso": sucesso, "falhas": falhas, "erros": erros}
        except Exception as e:
            return {"sucesso": 0, "falhas": 1, "erros": [str(e)]}

    @staticmethod
    def importar_produtos(arquivo):
        """Importa produtos a partir de arquivo Excel"""
        try:
            wb = load_workbook(BytesIO(arquivo.read()))
            ws = wb.active

            sucesso = 0
            falhas = 0
            erros = []

            for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    if not row[0]:  # nome é obrigatório
                        continue

                    nome = row[0] if row[0] else ""
                    descricao = row[1] if len(row) > 1 and row[1] else ""
                    categoria_nome = row[2] if len(row) > 2 and row[2] else "Geral"
                    unidade_medida = row[3] if len(row) > 3 and row[3] else "un"
                    preco_custo = Decimal(str(row[4])) if len(row) > 4 and row[4] else Decimal("0")
                    preco_venda = Decimal(str(row[5])) if len(row) > 5 and row[5] else Decimal("0")
                    estoque_minimo = Decimal(str(row[6])) if len(row) > 6 and row[6] else Decimal("0")
                    localizacao = row[7] if len(row) > 7 and row[7] else ""

                    categoria, _ = CategoriaProduto.objects.get_or_create(nome=categoria_nome)

                    produto, created = Produto.objects.get_or_create(
                        nome=nome,
                        defaults={
                            "descricao": descricao,
                            "categoria": categoria,
                            "unidade_medida": unidade_medida if unidade_medida in dict(Produto.UnidadeMedida.choices) else "un",
                            "preco_custo": preco_custo,
                            "preco_venda": preco_venda,
                            "estoque_minimo": estoque_minimo,
                            "localizacao": localizacao,
                        }
                    )
                    sucesso += 1
                except Exception as e:
                    falhas += 1
                    erros.append(f"Linha {row_idx}: {str(e)}")

            return {"sucesso": sucesso, "falhas": falhas, "erros": erros}
        except Exception as e:
            return {"sucesso": 0, "falhas": 1, "erros": [str(e)]}
