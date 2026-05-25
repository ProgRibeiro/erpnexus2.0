import io
import re
import unicodedata
from collections import Counter
from decimal import Decimal, InvalidOperation

from django.db.models import Count
from django.utils import timezone
from pypdf import PdfReader

from apps.estoque.models import Produto, Servico
from .models import ItemOrcamento
from .models import AprendizadoPedidoCompra


class PedidoCompraInteligente:
    money_pattern = re.compile(r"R\$\s*([\d\.\,]+)")
    date_pattern = re.compile(r"\b(\d{2}/\d{2}/\d{4})\b")
    number_patterns = [
        re.compile(r"(?:pedido\s*de\s*compra|n[úu]mero\s*do\s*pc|pc|po)[^\w]{0,10}([A-Z0-9\-\/]{4,})", re.IGNORECASE),
        re.compile(r"\b([A-Z]{1,4}-\d{4,}[\w\-\/]*)\b"),
    ]

    def analisar_arquivo(self, arquivo, ordem=None):
        texto = self._extrair_texto_pdf(arquivo)
        return self.analisar_texto(texto, ordem=ordem)

    def analisar_texto(self, texto, ordem=None):
        texto_limpo = self._normalizar_texto(texto)
        linhas = [linha.strip() for linha in texto_limpo.splitlines() if linha.strip()]

        numero_pc = self._extrair_numero_pc(texto_limpo)
        valor_sugerido = self._extrair_maior_valor(texto_limpo)
        validade = self._extrair_validade(texto_limpo)
        itens_detectados = self._extrair_itens(linhas)
        descricao_sugerida = self._montar_descricao_sugerida(ordem, linhas, itens_detectados)
        aprendizado = self._consultar_aprendizado(ordem)
        confianca = self._calcular_confianca(numero_pc, valor_sugerido, validade, itens_detectados, aprendizado)

        resumo = descricao_sugerida or "Nenhum resumo relevante foi encontrado no PDF."

        return {
            "texto_extraido": texto_limpo[:12000],
            "numero_pc_sugerido": numero_pc,
            "valor_autorizado_sugerido": str(valor_sugerido or Decimal("0.00")),
            "validade_sugerida": validade.isoformat() if validade else None,
            "descricao_sugerida": descricao_sugerida,
            "itens_detectados": itens_detectados,
            "resumo": resumo,
            "confianca": str(confianca),
            "aprendizado_cliente": aprendizado,
            "analisado_em": timezone.now().isoformat(),
        }

    def registrar_aprendizado(self, ordem, usuario=None):
        if not ordem or not ordem.tem_pedido_compra:
            return None

        texto_extraido = ""
        if isinstance(ordem.dados_pc_extraidos, dict):
            texto_extraido = ordem.dados_pc_extraidos.get("texto_extraido", "")

        if not any([texto_extraido, ordem.descricao_servico, ordem.numero_pc]):
            return None

        aprendizado, _ = AprendizadoPedidoCompra.objects.update_or_create(
            os=ordem,
            defaults={
                "cliente": ordem.cliente,
                "texto_extraido": texto_extraido[:12000],
                "descricao_confirmada": ordem.descricao_servico or "",
                "numero_pc_confirmado": ordem.numero_pc or "",
                "valor_autorizado_confirmado": ordem.valor_autorizado_pc or Decimal("0.00"),
                "validade_confirmada": ordem.validade_pc,
                "criado_por": usuario,
            },
        )
        return aprendizado

    def _extrair_texto_pdf(self, arquivo):
        if hasattr(arquivo, "seek"):
            arquivo.seek(0)
        conteudo = arquivo.read() if hasattr(arquivo, "read") else arquivo
        if hasattr(arquivo, "seek"):
            arquivo.seek(0)

        reader = PdfReader(io.BytesIO(conteudo))
        textos = []
        for page in reader.pages:
            try:
                textos.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(textos)

    def _normalizar_texto(self, texto):
        bruto = str(texto or "").replace("\x00", " ")
        return re.sub(r"[ \t]+", " ", bruto).strip()

    def _extrair_numero_pc(self, texto):
        for pattern in self.number_patterns:
            match = pattern.search(texto)
            if match:
                return match.group(1).strip(" .:-")
        return ""

    def _extrair_maior_valor(self, texto):
        valores = []
        for match in self.money_pattern.findall(texto):
            valor = self._parse_decimal(match)
            if valor is not None:
                valores.append(valor)
        return max(valores) if valores else None

    def _extrair_validade(self, texto):
        hoje = timezone.localdate()
        datas = []
        for match in self.date_pattern.findall(texto):
            try:
                data = timezone.datetime.strptime(match, "%d/%m/%Y").date()
                if data >= hoje:
                    datas.append(data)
            except ValueError:
                continue
        return min(datas) if datas else None

    def _extrair_itens(self, linhas):
        ignorar = {
            "pedido de compra",
            "cliente",
            "fornecedor",
            "valor total",
            "validade",
            "condicao de pagamento",
            "cnpj",
            "telefone",
        }
        itens = []
        for linha in linhas:
            texto = linha.strip()
            if len(texto) < 8 or len(texto) > 180:
                continue
            texto_lower = texto.lower()
            if any(chave in texto_lower for chave in ignorar):
                continue
            if re.search(r"\b(qtd|quantidade|valor|unit|total)\b", texto_lower):
                continue
            if re.search(r"\d{2}/\d{2}/\d{4}", texto_lower):
                continue
            itens.append(texto)
        return itens[:8]

    def _montar_descricao_sugerida(self, ordem, linhas, itens_detectados):
        if itens_detectados:
            return " | ".join(itens_detectados[:4])

        aprendizado = AprendizadoPedidoCompra.objects.filter(
            cliente=getattr(ordem, "cliente", None)
        ).exclude(descricao_confirmada="")[:5]
        if aprendizado:
            descricoes = [registro.descricao_confirmada for registro in aprendizado if registro.descricao_confirmada]
            if descricoes:
                return descricoes[0]

        linhas_longas = [linha for linha in linhas if 20 <= len(linha) <= 180]
        return " ".join(linhas_longas[:3]).strip()

    def _consultar_aprendizado(self, ordem):
        if not ordem or not getattr(ordem, "cliente_id", None):
            return {"exemplos": 0, "termos_frequentes": []}

        exemplos = AprendizadoPedidoCompra.objects.filter(cliente_id=ordem.cliente_id)[:10]
        termos = Counter()
        for exemplo in exemplos:
            for termo in re.findall(r"[A-Za-zÀ-ÿ]{4,}", exemplo.descricao_confirmada or ""):
                termos[termo.lower()] += 1

        return {
            "exemplos": exemplos.count(),
            "termos_frequentes": [termo for termo, _ in termos.most_common(6)],
        }

    def _calcular_confianca(self, numero_pc, valor_sugerido, validade, itens_detectados, aprendizado):
        score = Decimal("0")
        if numero_pc:
            score += Decimal("25")
        if valor_sugerido:
            score += Decimal("25")
        if validade:
            score += Decimal("15")
        if itens_detectados:
            score += Decimal("25")
        if aprendizado.get("exemplos", 0):
            score += Decimal("10")
        return min(score, Decimal("100"))

    def _parse_decimal(self, valor):
        normalizado = str(valor).replace(".", "").replace(",", ".").strip()
        try:
            return Decimal(normalizado)
        except (InvalidOperation, ValueError):
            return None


class MotorOrcamentoInteligente:
    """
    Motor local de sugestão de orçamento.

    A primeira versão roda 100% offline: cruza descrição/e-mail/observações da foto
    com produtos, serviços e histórico de itens já orçados no ERP.
    """

    STOPWORDS = {
        "para", "com", "sem", "uma", "uns", "das", "dos", "por", "que", "nao",
        "não", "ser", "foi", "tem", "esta", "está", "estao", "estão", "cliente",
        "favor", "segue", "bom", "boa", "dia", "tarde", "noite", "preciso",
        "solicito", "orcamento", "orçamento", "servico", "serviço",
    }

    TIPO_KEYWORDS = {
        "hvac": ["ar", "split", "condensadora", "evaporadora", "hvac", "climatizacao", "climatização"],
        "refrigeracao": ["refrigeracao", "refrigeração", "camara", "câmara", "freezer", "geladeira", "frio"],
        "eletrica": ["eletrica", "elétrica", "quadro", "disjuntor", "cabo", "fio", "tomada", "curto"],
        "civil": ["civil", "parede", "pintura", "gesso", "forro", "alvenaria", "piso", "porta"],
        "manutencao": ["manutencao", "manutenção", "limpeza", "preventiva", "corretiva", "revisao", "revisão"],
        "instalacao": ["instalacao", "instalação", "instalar", "montagem", "substituicao", "substituição"],
    }

    DEFAULT_SERVICES = [
        {
            "keywords": ["limpeza", "higienizacao", "higienização", "lavagem"],
            "descricao": "Limpeza e higienização de equipamento de ar-condicionado",
            "tipo_servico": "hvac",
            "valor": Decimal("280.00"),
        },
        {
            "keywords": ["manutencao", "manutenção", "corretiva", "nao liga", "não liga", "falha", "barulho"],
            "descricao": "Manutenção corretiva com diagnóstico técnico",
            "tipo_servico": "manutencao",
            "valor": Decimal("450.00"),
        },
        {
            "keywords": ["instalacao", "instalação", "instalar", "split"],
            "descricao": "Instalação de equipamento de ar-condicionado split",
            "tipo_servico": "instalacao",
            "valor": Decimal("850.00"),
        },
        {
            "keywords": ["eletrica", "elétrica", "quadro", "disjuntor", "tomada"],
            "descricao": "Serviço técnico elétrico com diagnóstico e correção",
            "tipo_servico": "eletrica",
            "valor": Decimal("420.00"),
        },
        {
            "keywords": ["vazamento", "dreno", "agua", "água", "pingando"],
            "descricao": "Correção de vazamento e revisão de dreno",
            "tipo_servico": "hvac",
            "valor": Decimal("380.00"),
        },
    ]

    PRODUCT_KEYWORDS = {
        "capacitor": ["capacitor"],
        "rele": ["rele", "relé"],
        "gas": ["gas", "gás", "fluido", "r410", "r22", "r32"],
        "filtro": ["filtro"],
        "cabo": ["cabo", "fio"],
        "disjuntor": ["disjuntor"],
        "tubo": ["tubo", "tubulacao", "tubulação", "cobre"],
        "dreno": ["dreno", "mangueira"],
    }

    def analisar(self, *, descricao="", email_texto="", observacoes_foto="", arquivos=None, cliente=None):
        arquivos = arquivos or []
        texto_base = "\n".join(
            parte for parte in [descricao, email_texto, observacoes_foto, self._texto_dos_arquivos(arquivos)] if parte
        )
        texto_normalizado = self._normalizar(texto_base)
        tokens = self._tokens(texto_normalizado)
        quantidade_base = self._inferir_quantidade(texto_normalizado)
        tipo_servico = self._inferir_tipo_servico(texto_normalizado)
        prioridade = self._inferir_prioridade(texto_normalizado)

        itens = self._montar_itens(tokens, texto_normalizado, quantidade_base, tipo_servico)
        if not itens:
            itens.append(self._item_avulso(
                descricao="Diagnóstico técnico e elaboração de orçamento",
                quantidade=Decimal("1"),
                valor_unitario=Decimal("250.00"),
                ordem=0,
                motivo="Fallback quando nenhum produto ou serviço da base combinou com a entrada.",
            ))

        subtotal = sum(Decimal(str(item["quantidade"])) * Decimal(str(item["valor_unitario"])) for item in itens)
        confianca = self._calcular_confianca(tokens, itens, arquivos, cliente)
        resumo = self._montar_resumo(texto_base, tipo_servico, itens)

        return {
            "entrada": {
                "descricao": descricao,
                "email_texto": email_texto,
                "observacoes_foto": observacoes_foto,
                "arquivos": [getattr(arquivo, "name", "arquivo") for arquivo in arquivos],
            },
            "cliente": getattr(cliente, "id", None),
            "tipo_servico": tipo_servico,
            "prioridade": prioridade,
            "descricao_servico": resumo,
            "itens": itens,
            "subtotal": str(subtotal.quantize(Decimal("0.01"))),
            "confianca": confianca,
            "avisos": self._avisos(confianca, arquivos, texto_base),
            "integracoes": {
                "produtos": "Itens vinculados ao estoque quando há produto correspondente.",
                "servicos": "Itens vinculados ao cadastro de serviços quando há serviço correspondente.",
                "financeiro": "Receita será criada pelo fluxo de faturamento após aprovação, execução e confirmação.",
            },
        }

    def _montar_itens(self, tokens, texto_normalizado, quantidade_base, tipo_servico):
        itens = []
        servico = self._melhor_servico(tokens, tipo_servico)
        if servico:
            itens.append(self._item_servico(servico, quantidade_base, len(itens), "Serviço encontrado no cadastro."))
        else:
            padrao = self._servico_padrao(texto_normalizado, tipo_servico)
            itens.append(self._item_avulso(
                descricao=padrao["descricao"],
                quantidade=quantidade_base,
                valor_unitario=self._preco_historico(padrao["descricao"], padrao["valor"]),
                ordem=len(itens),
                motivo="Serviço sugerido por regra local e histórico.",
            ))

        for produto in self._produtos_relevantes(tokens, texto_normalizado)[:4]:
            itens.append(self._item_produto(produto, Decimal("1"), len(itens), "Produto encontrado no estoque."))

        return itens

    def _melhor_servico(self, tokens, tipo_servico):
        candidatos = Servico.objects.filter(ativo=True)
        if tipo_servico and tipo_servico != "outro":
            candidatos = candidatos.filter(categoria=tipo_servico)

        melhor = None
        melhor_score = 0
        for servico in candidatos[:300]:
            texto = self._normalizar(" ".join([servico.nome, servico.descricao, servico.categoria]))
            score = len(tokens.intersection(self._tokens(texto)))
            if score > melhor_score:
                melhor = servico
                melhor_score = score
        return melhor if melhor_score > 0 else None

    def _produtos_relevantes(self, tokens, texto_normalizado):
        termos_produto = {
            chave
            for chave, palavras in self.PRODUCT_KEYWORDS.items()
            if any(self._normalizar(palavra) in texto_normalizado for palavra in palavras)
        }
        if not termos_produto:
            return []

        produtos = []
        for produto in Produto.objects.select_related("categoria").filter(ativo=True)[:500]:
            texto = self._normalizar(" ".join([produto.nome, produto.descricao, produto.categoria.nome if produto.categoria else ""]))
            score = len(tokens.intersection(self._tokens(texto)))
            if any(termo in texto for termo in termos_produto):
                score += 3
            if score > 0:
                produtos.append((score, produto))
        produtos.sort(key=lambda item: item[0], reverse=True)
        return [produto for _, produto in produtos]

    def _servico_padrao(self, texto_normalizado, tipo_servico):
        for padrao in self.DEFAULT_SERVICES:
            if any(self._normalizar(chave) in texto_normalizado for chave in padrao["keywords"]):
                return padrao
        return {
            "descricao": f"Atendimento técnico de {dict(Servico.Categoria.choices).get(tipo_servico, 'serviços')}",
            "tipo_servico": tipo_servico,
            "valor": Decimal("350.00"),
        }

    def _preco_historico(self, descricao, fallback):
        termos = self._tokens(self._normalizar(descricao))
        if not termos:
            return fallback
        historicos = (
            ItemOrcamento.objects
            .filter(origem_tipo__in=[ItemOrcamento.OrigemTipo.SERVICO, ItemOrcamento.OrigemTipo.AVULSO])
            .exclude(valor_unitario=0)
            .order_by("-id")[:200]
        )
        valores = [
            item.valor_unitario
            for item in historicos
            if len(termos.intersection(self._tokens(self._normalizar(item.descricao)))) >= 2
        ]
        if not valores:
            return fallback
        valores_ordenados = sorted(valores)
        return valores_ordenados[len(valores_ordenados) // 2]

    def _item_servico(self, servico, quantidade, ordem, motivo):
        return {
            "origem_tipo": ItemOrcamento.OrigemTipo.SERVICO,
            "produto": None,
            "servico": servico.id,
            "codigo_referencia": servico.codigo or "",
            "unidade_referencia": servico.unidade_medida or "uni",
            "descricao": servico.nome,
            "quantidade": str(quantidade),
            "valor_unitario": str(Decimal(servico.preco_padrao or 0).quantize(Decimal("0.01"))),
            "ordem": ordem,
            "motivo_sugestao": motivo,
        }

    def _item_produto(self, produto, quantidade, ordem, motivo):
        return {
            "origem_tipo": ItemOrcamento.OrigemTipo.PRODUTO,
            "produto": produto.id,
            "servico": None,
            "codigo_referencia": produto.codigo or "",
            "unidade_referencia": produto.unidade_medida or "un",
            "descricao": produto.nome,
            "quantidade": str(quantidade),
            "valor_unitario": str(Decimal(produto.preco_venda or 0).quantize(Decimal("0.01"))),
            "ordem": ordem,
            "motivo_sugestao": motivo,
        }

    def _item_avulso(self, descricao, quantidade, valor_unitario, ordem, motivo):
        return {
            "origem_tipo": ItemOrcamento.OrigemTipo.AVULSO,
            "produto": None,
            "servico": None,
            "codigo_referencia": "",
            "unidade_referencia": "uni",
            "descricao": descricao,
            "quantidade": str(quantidade),
            "valor_unitario": str(Decimal(valor_unitario or 0).quantize(Decimal("0.01"))),
            "ordem": ordem,
            "motivo_sugestao": motivo,
        }

    def _inferir_quantidade(self, texto):
        patterns = [
            r"(\d+)\s*(?:x\s*)?(?:ar(?:es)?|split(?:s)?|maquina(?:s)?|máquina(?:s)?|equipamento(?:s)?)",
            r"(?:qtd|quantidade)\s*[:\-]?\s*(\d+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, texto, re.IGNORECASE)
            if match:
                return Decimal(match.group(1))
        return Decimal("1")

    def _inferir_tipo_servico(self, texto):
        scores = {}
        for tipo, palavras in self.TIPO_KEYWORDS.items():
            scores[tipo] = sum(1 for palavra in palavras if self._normalizar(palavra) in texto)
        tipo, score = max(scores.items(), key=lambda item: item[1])
        return tipo if score > 0 else "outro"

    def _inferir_prioridade(self, texto):
        if any(chave in texto for chave in ["urgente", "emergencia", "emergência", "parado", "sem funcionar"]):
            return "urgente"
        if any(chave in texto for chave in ["hoje", "quanto antes", "vazamento", "curto"]):
            return "alta"
        return "media"

    def _montar_resumo(self, texto_base, tipo_servico, itens):
        primeira_linha = next((linha.strip() for linha in str(texto_base or "").splitlines() if linha.strip()), "")
        if primeira_linha:
            return primeira_linha[:500]
        descricoes = ", ".join(item["descricao"] for item in itens[:3])
        tipo = dict(Servico.Categoria.choices).get(tipo_servico, "serviço")
        return f"Orçamento inteligente para {tipo}: {descricoes}"

    def _calcular_confianca(self, tokens, itens, arquivos, cliente):
        score = 20
        if tokens:
            score += min(30, len(tokens) * 2)
        if any(item["origem_tipo"] == ItemOrcamento.OrigemTipo.SERVICO and item.get("servico") for item in itens):
            score += 20
        if any(item["origem_tipo"] == ItemOrcamento.OrigemTipo.PRODUTO and item.get("produto") for item in itens):
            score += 15
        if arquivos:
            score += 5
        if cliente:
            historico = ItemOrcamento.objects.filter(os__cliente=cliente).aggregate(total=Count("id"))["total"] or 0
            if historico:
                score += min(10, historico)
        return min(score, 95)

    def _avisos(self, confianca, arquivos, texto_base):
        avisos = []
        if arquivos:
            avisos.append("A foto foi registrada e usada por nome/observação; a leitura visual profunda fica pronta para plugar uma IA externa quando desejado.")
        if confianca < 55:
            avisos.append("Confiança moderada: revise itens, quantidades e valores antes de enviar ao cliente.")
        if not str(texto_base or "").strip():
            avisos.append("Pouca informação de entrada; o motor usou um orçamento técnico mínimo.")
        return avisos

    def _texto_dos_arquivos(self, arquivos):
        nomes = [getattr(arquivo, "name", "") for arquivo in arquivos if getattr(arquivo, "name", "")]
        return " ".join(nomes)

    def _normalizar(self, texto):
        texto = unicodedata.normalize("NFKD", str(texto or "").lower())
        texto = "".join(char for char in texto if not unicodedata.combining(char))
        return re.sub(r"\s+", " ", texto).strip()

    def _tokens(self, texto):
        return {
            token
            for token in re.findall(r"[a-z0-9]{3,}", self._normalizar(texto))
            if token not in self.STOPWORDS
        }
