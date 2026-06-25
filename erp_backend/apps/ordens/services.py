import io
import re
import unicodedata
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation

from django.db.models import Count
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from pypdf import PdfReader

from apps.estoque.models import Produto, ReferenciaPrecoPublico, Servico
from apps.estoque.services import MemoriaMotorInteligente
from .models import AprendizadoPedidoCompra, ItemOrcamento, OrdemServico


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

    TECHNICAL_LABELS = {
        "disciplina_tecnica": "Disciplina",
        "tipo_intervencao": "Tipo de intervenção",
        "prioridade_tecnica": "Prioridade técnica",
        "local_atendimento": "Local de atendimento",
        "ativo_equipamento": "Ativo/equipamento",
        "equipamento_marca": "Marca",
        "equipamento_modelo": "Modelo",
        "equipamento_tag": "Tag/série",
        "capacidade_equipamento": "Capacidade/carga",
        "sintomas": "Sintomas observados",
        "diagnostico_preliminar": "Diagnóstico preliminar",
        "escopo_tecnico": "Escopo técnico previsto",
        "materiais_previstos": "Materiais/insumos previstos",
        "medicoes": "Medições/referências",
        "condicoes_acesso": "Condições de acesso",
        "criterios_aceite": "Critérios de aceite",
        "prazo_execucao": "Prazo de execução",
        "garantia": "Garantia técnica",
    }

    TIPO_INTERVENCAO_LABELS = {
        "diagnostico": "Diagnóstico técnico",
        "corretiva": "Manutenção corretiva",
        "preventiva": "Manutenção preventiva",
        "instalacao": "Instalação",
        "substituicao": "Substituição",
        "adequacao": "Adequação técnica",
        "laudo": "Laudo técnico",
    }

    def analisar(self, *, descricao="", email_texto="", observacoes_foto="", arquivos=None, cliente=None, dados_tecnicos=None):
        arquivos = arquivos or []
        dados_tecnicos = self._limpar_dados_tecnicos(dados_tecnicos or {})
        texto_tecnico = self._texto_dados_tecnicos(dados_tecnicos)
        texto_base = "\n".join(
            parte for parte in [descricao, texto_tecnico, email_texto, observacoes_foto, self._texto_dos_arquivos(arquivos)] if parte
        )
        texto_normalizado = self._normalizar(texto_base)
        tokens = self._tokens(texto_normalizado)
        quantidade_base = self._inferir_quantidade(texto_normalizado, dados_tecnicos)
        tipo_servico = dados_tecnicos.get("disciplina_tecnica") or self._inferir_tipo_servico(texto_normalizado)
        prioridade = dados_tecnicos.get("prioridade_tecnica") or self._inferir_prioridade(texto_normalizado)
        try:
            memoria = MemoriaMotorInteligente().aplicar_em_orcamento(texto_base)
        except (OperationalError, ProgrammingError):
            memoria = {"conhecimentos": [], "itens": []}
        tipo_servico = memoria.get("tipo_servico") or tipo_servico
        prioridade = memoria.get("prioridade") or prioridade

        itens = self._montar_itens(tokens, texto_normalizado, quantidade_base, tipo_servico)
        itens = self._aplicar_itens_tecnicos(itens, dados_tecnicos, texto_normalizado, quantidade_base)
        itens = self._aplicar_itens_memoria(itens, memoria, quantidade_base, dados_tecnicos)
        referencias_preco = self._referencias_preco(tokens, texto_normalizado, tipo_servico)
        itens = self._aplicar_referencias_preco(
            itens,
            referencias_preco,
            texto_normalizado,
            quantidade_base,
            prioridade,
            dados_tecnicos,
        )
        if not itens:
            itens.append(self._item_avulso(
                descricao="Diagnóstico técnico e elaboração de orçamento",
                quantidade=Decimal("1"),
                valor_unitario=Decimal("250.00"),
                ordem=0,
                motivo="Fallback quando nenhum produto ou serviço da base combinou com a entrada.",
            ))

        subtotal = sum(Decimal(str(item["quantidade"])) * Decimal(str(item["valor_unitario"])) for item in itens)
        confianca = self._calcular_confianca(tokens, itens, arquivos, cliente, dados_tecnicos)
        resumo = self._montar_resumo(texto_base, tipo_servico, itens, dados_tecnicos)

        return {
            "entrada": {
                "descricao": descricao,
                "email_texto": email_texto,
                "observacoes_foto": observacoes_foto,
                "arquivos": [getattr(arquivo, "name", "arquivo") for arquivo in arquivos],
            },
            "briefing_tecnico": self._briefing_tecnico_rotulado(dados_tecnicos),
            "cliente": getattr(cliente, "id", None),
            "tipo_servico": tipo_servico,
            "prioridade": prioridade,
            "descricao_servico": resumo,
            "itens": itens,
            "subtotal": str(subtotal.quantize(Decimal("0.01"))),
            "confianca": confianca,
            "avisos": self._avisos(confianca, arquivos, texto_base),
            "memoria_aplicada": memoria.get("conhecimentos", []),
            "referencias_preco": self._resumo_referencias_preco(itens),
            "metodologia_calculo": self._metodologia_calculo(),
            "integracoes": {
                "produtos": "Itens vinculados ao estoque quando há produto correspondente.",
                "servicos": "Itens vinculados ao cadastro de serviços quando há serviço correspondente.",
                "financeiro": "Receita será criada pelo fluxo de faturamento após aprovação, execução e confirmação.",
            },
        }

    def _limpar_dados_tecnicos(self, dados_tecnicos):
        return {
            chave: str(dados_tecnicos.get(chave) or "").strip()
            for chave in self.TECHNICAL_LABELS
            if str(dados_tecnicos.get(chave) or "").strip()
        }

    def _briefing_tecnico_rotulado(self, dados_tecnicos):
        briefing = {}
        for chave, valor in dados_tecnicos.items():
            label = self.TECHNICAL_LABELS.get(chave, chave)
            if chave == "tipo_intervencao":
                valor = self.TIPO_INTERVENCAO_LABELS.get(valor, valor)
            if chave == "disciplina_tecnica":
                valor = dict(Servico.Categoria.choices).get(valor, valor)
            if chave == "prioridade_tecnica":
                valor = {"media": "Programada", "alta": "Alta", "urgente": "Emergencial"}.get(valor, valor)
            briefing[label] = valor
        return briefing

    def _texto_dados_tecnicos(self, dados_tecnicos):
        briefing = self._briefing_tecnico_rotulado(dados_tecnicos)
        return "\n".join(f"{label}: {valor}" for label, valor in briefing.items())

    def _aplicar_itens_tecnicos(self, itens, dados_tecnicos, texto_normalizado, quantidade_base):
        if dados_tecnicos.get("diagnostico_preliminar") and not self._item_com_descricao(itens, "diagnostico"):
            itens.insert(0, self._item_avulso(
                descricao="Diagnóstico técnico, testes operacionais e emissão de parecer",
                quantidade=Decimal("1"),
                valor_unitario=Decimal("280.00"),
                ordem=0,
                motivo="Incluído pelo diagnóstico preliminar informado no briefing técnico.",
            ))

        if dados_tecnicos.get("escopo_tecnico") and not self._item_com_descricao(itens, "execucao"):
            itens.append(self._item_avulso(
                descricao="Execução técnica conforme escopo detalhado",
                quantidade=quantidade_base,
                valor_unitario=self._preco_historico("Execução técnica conforme escopo detalhado", Decimal("420.00")),
                ordem=len(itens),
                motivo="Incluído pelo escopo técnico previsto no briefing.",
            ))

        if dados_tecnicos.get("medicoes") and not self._item_com_descricao(itens, "medicao"):
            itens.append(self._item_avulso(
                descricao="Medições, testes de funcionamento e comissionamento",
                quantidade=Decimal("1"),
                valor_unitario=Decimal("180.00"),
                ordem=len(itens),
                motivo="Incluído pelas medições/referências técnicas informadas.",
            ))

        if any(chave in texto_normalizado for chave in ["altura", "telhado", "andaime", "escada", "fora do horario", "difícil acesso", "dificil acesso"]):
            itens.append(self._item_avulso(
                descricao="Mobilização técnica e condições especiais de acesso",
                quantidade=Decimal("1"),
                valor_unitario=Decimal("220.00"),
                ordem=len(itens),
                motivo="Incluído por condição de acesso ou mobilização especial.",
            ))

        for index, item in enumerate(itens):
            item["ordem"] = index
        return itens

    def _item_com_descricao(self, itens, termo):
        termo = self._normalizar(termo)
        return any(termo in self._normalizar(item.get("descricao", "")) for item in itens)

    def _aplicar_itens_memoria(self, itens, memoria, quantidade_base, dados_tecnicos=None):
        dados_tecnicos = dados_tecnicos or {}
        disciplina = dados_tecnicos.get("disciplina_tecnica")
        existentes_servicos = {item.get("servico") for item in itens if item.get("servico")}
        existentes_produtos = {item.get("produto") for item in itens if item.get("produto")}
        for tipo, obj, conhecimento in memoria.get("itens", [])[:4]:
            if (
                tipo == "servico"
                and disciplina
                and disciplina != "outro"
                and getattr(obj, "categoria", "")
                and obj.categoria != disciplina
            ):
                continue
            if tipo == "servico" and obj.id not in existentes_servicos:
                itens.insert(0, self._item_servico(
                    obj,
                    quantidade_base,
                    0,
                    f"Memória ensinada: {conhecimento['titulo']}.",
                ))
                existentes_servicos.add(obj.id)
            if tipo == "produto" and obj.id not in existentes_produtos:
                itens.append(self._item_produto(
                    obj,
                    Decimal("1"),
                    len(itens),
                    f"Memória ensinada: {conhecimento['titulo']}.",
                ))
                existentes_produtos.add(obj.id)
        for index, item in enumerate(itens):
            item["ordem"] = index
        return itens

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
        try:
            candidatos_lista = list(candidatos[:300])
        except (OperationalError, ProgrammingError):
            return None
        for servico in candidatos_lista:
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
        try:
            produtos_base = list(Produto.objects.select_related("categoria").filter(ativo=True)[:500])
        except (OperationalError, ProgrammingError):
            return []

        for produto in produtos_base:
            texto = self._normalizar(" ".join([produto.nome, produto.descricao, produto.categoria.nome if produto.categoria else ""]))
            score = len(tokens.intersection(self._tokens(texto)))
            if any(termo in texto for termo in termos_produto):
                score += 3
            if score > 0:
                produtos.append((score, produto))
        produtos.sort(key=lambda item: item[0], reverse=True)
        return [produto for _, produto in produtos]

    def _referencias_preco(self, tokens, texto_normalizado, tipo_servico):
        disciplinas = {tipo_servico, Servico.Categoria.MANUTENCAO, Servico.Categoria.INSTALACAO}
        referencias = ReferenciaPrecoPublico.objects.filter(ativo=True)
        if tipo_servico and tipo_servico != "outro":
            referencias = referencias.filter(disciplina__in=disciplinas)

        pontuadas = []
        try:
            referencias_lista = list(referencias[:500])
        except (OperationalError, ProgrammingError):
            return []

        for referencia in referencias_lista:
            termos_referencia = set()
            for termo in referencia.termos or []:
                termos_referencia.update(self._tokens(termo))
            texto_referencia = self._normalizar(" ".join([
                referencia.descricao,
                referencia.codigo,
                referencia.codigo_fonte,
                " ".join(referencia.termos or []),
            ]))
            tokens_referencia = termos_referencia.union(self._tokens(texto_referencia))
            score = len(tokens.intersection(tokens_referencia))
            if any(self._normalizar(termo) in texto_normalizado for termo in referencia.termos or []):
                score += 4
            if referencia.disciplina == tipo_servico:
                score += 2
            if score > 0:
                pontuadas.append((score, referencia))
        pontuadas.sort(key=lambda item: (item[0], item[1].confianca, item[1].data_referencia or date.min), reverse=True)
        return pontuadas

    def _aplicar_referencias_preco(self, itens, referencias_preco, texto_normalizado, quantidade_base, prioridade, dados_tecnicos):
        servico_referenciado = False
        for score, referencia in referencias_preco[:5]:
            if self._item_com_referencia(itens, referencia):
                continue

            valor_unitario = self._valor_referencia_sugerido(referencia, prioridade, dados_tecnicos)
            motivo = self._motivo_referencia(referencia, score, prioridade, dados_tecnicos)
            quantidade = self._quantidade_referencia(referencia, quantidade_base, texto_normalizado)

            if referencia.tipo_item in {
                ReferenciaPrecoPublico.TipoItem.SERVICO,
                ReferenciaPrecoPublico.TipoItem.MAO_OBRA,
                ReferenciaPrecoPublico.TipoItem.COMPOSICAO,
            }:
                alvo = self._item_avulso_sem_fonte(itens)
                if alvo and not servico_referenciado:
                    alvo.update({
                        "valor_unitario": str(valor_unitario),
                        "codigo_referencia": referencia.codigo,
                        "unidade_referencia": referencia.unidade_medida or alvo.get("unidade_referencia") or "un",
                        "motivo_sugestao": motivo,
                    })
                    self._anexar_memoria_calculo(alvo, referencia, valor_unitario, prioridade, dados_tecnicos, score)
                    servico_referenciado = True
                    continue

            itens.append(self._item_referencia(referencia, quantidade, valor_unitario, len(itens), motivo, score, prioridade, dados_tecnicos))

        for index, item in enumerate(itens):
            item["ordem"] = index
        return itens

    def _item_avulso_sem_fonte(self, itens):
        for item in itens:
            if item.get("origem_tipo") == ItemOrcamento.OrigemTipo.AVULSO and not item.get("fonte_preco"):
                return item
        return None

    def _item_com_referencia(self, itens, referencia):
        return any(item.get("codigo_referencia") == referencia.codigo for item in itens)

    def _quantidade_referencia(self, referencia, quantidade_base, texto_normalizado):
        if referencia.unidade_medida in {"m", "m2", "kg", "hora"}:
            match = re.search(r"(\d+(?:[,.]\d+)?)\s*" + re.escape(referencia.unidade_medida), texto_normalizado)
            if match:
                return Decimal(match.group(1).replace(",", "."))
        if referencia.tipo_item in {
            ReferenciaPrecoPublico.TipoItem.SERVICO,
            ReferenciaPrecoPublico.TipoItem.MAO_OBRA,
            ReferenciaPrecoPublico.TipoItem.COMPOSICAO,
        }:
            return quantidade_base
        return Decimal("1")

    def _valor_referencia_sugerido(self, referencia, prioridade, dados_tecnicos):
        margem = self._margem_referencia(referencia)
        fator_complexidade = self._fator_complexidade(prioridade, dados_tecnicos)
        return referencia.calcular_valor_sugerido(
            margem_percentual=margem,
            fator_complexidade=fator_complexidade,
            fator_regional=Decimal("1.00"),
        )

    def _margem_referencia(self, referencia):
        margens = {
            ReferenciaPrecoPublico.TipoItem.PRODUTO: Decimal("22"),
            ReferenciaPrecoPublico.TipoItem.INSUMO: Decimal("25"),
            ReferenciaPrecoPublico.TipoItem.SERVICO: Decimal("35"),
            ReferenciaPrecoPublico.TipoItem.MAO_OBRA: Decimal("45"),
            ReferenciaPrecoPublico.TipoItem.COMPOSICAO: Decimal("30"),
        }
        return margens.get(referencia.tipo_item, Decimal("30"))

    def _fator_complexidade(self, prioridade, dados_tecnicos):
        fator = Decimal("1.00")
        if prioridade == "urgente":
            fator += Decimal("0.20")
        elif prioridade == "alta":
            fator += Decimal("0.10")

        texto = self._normalizar(" ".join(str(valor) for valor in (dados_tecnicos or {}).values()))
        if any(chave in texto for chave in ["altura", "telhado", "andaime", "escada", "dificil acesso", "difícil acesso"]):
            fator += Decimal("0.12")
        if any(chave in texto for chave in ["fora do horario", "noturno", "shopping fechado", "madrugada"]):
            fator += Decimal("0.15")
        if any(chave in texto for chave in ["parado", "sem funcionar", "temperatura fora", "risco operacional"]):
            fator += Decimal("0.08")
        return fator

    def _motivo_referencia(self, referencia, score, prioridade, dados_tecnicos):
        margem = self._margem_referencia(referencia)
        fator = self._fator_complexidade(prioridade, dados_tecnicos)
        return (
            f"Referência {referencia.get_fonte_display()} ({referencia.codigo_fonte or referencia.codigo}); "
            f"mediana R$ {referencia.valor_mediano}; margem {margem}%; fator técnico {fator}; aderência {score}."
        )

    def _item_referencia(self, referencia, quantidade, valor_unitario, ordem, motivo, score, prioridade, dados_tecnicos):
        item = self._item_avulso(
            descricao=referencia.descricao,
            quantidade=quantidade,
            valor_unitario=valor_unitario,
            ordem=ordem,
            motivo=motivo,
        )
        item["codigo_referencia"] = referencia.codigo
        item["unidade_referencia"] = referencia.unidade_medida or "un"
        self._anexar_memoria_calculo(item, referencia, valor_unitario, prioridade, dados_tecnicos, score)
        return item

    def _anexar_memoria_calculo(self, item, referencia, valor_unitario, prioridade, dados_tecnicos, score):
        margem = self._margem_referencia(referencia)
        fator = self._fator_complexidade(prioridade, dados_tecnicos)
        item.update({
            "fonte_preco": referencia.fonte,
            "fonte_preco_label": referencia.get_fonte_display(),
            "codigo_fonte_preco": referencia.codigo_fonte,
            "link_fonte_preco": referencia.link_fonte,
            "base_legal_preco": referencia.base_legal,
            "componente_custo": referencia.componente_custo,
            "componente_custo_label": referencia.get_componente_custo_display(),
            "preco_base_referencia": str(referencia.valor_mediano),
            "preco_minimo_referencia": str(referencia.valor_minimo),
            "preco_maximo_referencia": str(referencia.valor_maximo),
            "margem_aplicada_percentual": str(margem),
            "fator_complexidade": str(fator),
            "confianca_preco": referencia.confianca,
            "score_referencia": score,
            "data_referencia": referencia.data_referencia.isoformat() if referencia.data_referencia else None,
            "memoria_calculo": (
                f"Valor sugerido = mediana pública/técnica {referencia.valor_mediano} "
                f"+ margem {margem}% x fator técnico {fator} = {valor_unitario}."
            ),
        })

    def _resumo_referencias_preco(self, itens):
        referencias = []
        for item in itens:
            if not item.get("fonte_preco"):
                continue
            referencias.append({
                "codigo": item.get("codigo_referencia"),
                "descricao": item.get("descricao"),
                "fonte": item.get("fonte_preco_label"),
                "codigo_fonte": item.get("codigo_fonte_preco"),
                "link_fonte": item.get("link_fonte_preco"),
                "base_legal": item.get("base_legal_preco"),
                "componente_custo": item.get("componente_custo_label"),
                "base": item.get("preco_base_referencia"),
                "margem": item.get("margem_aplicada_percentual"),
                "fator": item.get("fator_complexidade"),
                "valor_sugerido": item.get("valor_unitario"),
                "confianca": item.get("confianca_preco"),
                "data_referencia": item.get("data_referencia"),
            })
        return referencias

    def _metodologia_calculo(self):
        return [
            "Estrutura os itens no conceito de Planilha de Custos e Formação de Preços.",
            "Classifica cada referência como material, insumo, mão de obra, encargos, BDI/despesas, tributos, equipamento, deslocamento ou composição.",
            "Usa mediana da referência como base para evitar distorção por menor preço isolado.",
            "Aplica margem/BDI operacional por tipo de item: produto 22%, insumo 25%, serviço 35%, mão de obra 45% e composição 30%.",
            "Ajusta complexidade por urgência, acesso difícil, horário especial e risco operacional.",
            "Mantém o resultado revisável: fonte, quantidade, valor e escopo devem ser conferidos antes do envio ao cliente ou participação em edital.",
        ]

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
        try:
            historicos = list(
                ItemOrcamento.objects
                .filter(origem_tipo__in=[ItemOrcamento.OrigemTipo.SERVICO, ItemOrcamento.OrigemTipo.AVULSO])
                .exclude(valor_unitario=0)
                .order_by("-id")[:200]
            )
        except (OperationalError, ProgrammingError):
            return fallback
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

    def _inferir_quantidade(self, texto, dados_tecnicos=None):
        dados_tecnicos = dados_tecnicos or {}
        texto_com_capacidade = " ".join([
            texto,
            dados_tecnicos.get("ativo_equipamento", ""),
            dados_tecnicos.get("capacidade_equipamento", ""),
        ])
        patterns = [
            r"(\d+)\s*(?:x\s*)?(?:ar(?:es)?|split(?:s)?|maquina(?:s)?|máquina(?:s)?|equipamento(?:s)?)",
            r"(?:qtd|quantidade)\s*[:\-]?\s*(\d+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, texto_com_capacidade, re.IGNORECASE)
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

    def _montar_resumo(self, texto_base, tipo_servico, itens, dados_tecnicos=None):
        dados_tecnicos = dados_tecnicos or {}
        if dados_tecnicos:
            partes = []
            intervencao = self.TIPO_INTERVENCAO_LABELS.get(dados_tecnicos.get("tipo_intervencao"), "Atendimento técnico")
            ativo = dados_tecnicos.get("ativo_equipamento") or "ativo/equipamento informado"
            local = dados_tecnicos.get("local_atendimento")
            partes.append(f"{intervencao} em {ativo}{f' - {local}' if local else ''}.")
            if dados_tecnicos.get("sintomas"):
                partes.append(f"Sintomas relatados: {dados_tecnicos['sintomas']}.")
            if dados_tecnicos.get("diagnostico_preliminar"):
                partes.append(f"Diagnóstico preliminar: {dados_tecnicos['diagnostico_preliminar']}.")
            if dados_tecnicos.get("escopo_tecnico"):
                partes.append(f"Escopo técnico previsto: {dados_tecnicos['escopo_tecnico']}.")
            if dados_tecnicos.get("criterios_aceite"):
                partes.append(f"Critérios de aceite: {dados_tecnicos['criterios_aceite']}.")
            return "\n".join(partes)[:1200]

        primeira_linha = next((linha.strip() for linha in str(texto_base or "").splitlines() if linha.strip()), "")
        if primeira_linha:
            return primeira_linha[:500]
        descricoes = ", ".join(item["descricao"] for item in itens[:3])
        tipo = dict(Servico.Categoria.choices).get(tipo_servico, "serviço")
        return f"Orçamento inteligente para {tipo}: {descricoes}"

    def _calcular_confianca(self, tokens, itens, arquivos, cliente, dados_tecnicos=None):
        dados_tecnicos = dados_tecnicos or {}
        score = 20
        if tokens:
            score += min(30, len(tokens) * 2)
        if any(item["origem_tipo"] == ItemOrcamento.OrigemTipo.SERVICO and item.get("servico") for item in itens):
            score += 20
        if any(item["origem_tipo"] == ItemOrcamento.OrigemTipo.PRODUTO and item.get("produto") for item in itens):
            score += 15
        if any(item.get("fonte_preco") for item in itens):
            score += 12
        if arquivos:
            score += 5
        if cliente:
            historico = ItemOrcamento.objects.filter(os__cliente=cliente).aggregate(total=Count("id"))["total"] or 0
            if historico:
                score += min(10, historico)
        campos_tecnicos_fortes = [
            "ativo_equipamento",
            "sintomas",
            "diagnostico_preliminar",
            "escopo_tecnico",
            "criterios_aceite",
        ]
        score += min(15, sum(3 for campo in campos_tecnicos_fortes if dados_tecnicos.get(campo)))
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


class GovernancaRelatorioOS:
    """
    Motor de qualidade para geração de relatórios de OS.

    A ideia é tratar o PDF como uma entrega operacional: primeiro valida o dossiê,
    calcula score, classifica riscos e só libera o documento final quando os
    requisitos críticos estão atendidos. Ainda permite rascunho quando o usuário
    quer revisar antes de fechar.
    """

    SCORE_MINIMO_FINAL = 80

    def avaliar(self, ordem):
        fotos = list(ordem.fotos.all())
        respostas = list(
            ordem.respostas_checklist
            .select_related("item")
            .prefetch_related("fotos")
            .all()
        )
        checklist_total = len(respostas)
        checklist_respondido = sum(1 for resposta in respostas if self._resposta_preenchida(resposta))
        checklist_percentual = round((checklist_respondido / checklist_total) * 100) if checklist_total else 0

        requisitos = [
            self._item(
                "cliente",
                "Cliente vinculado",
                bool(ordem.cliente_id),
                "critico",
                "Vincule um cliente antes de gerar documentos finais.",
            ),
            self._item(
                "descricao",
                "Descrição do serviço",
                bool(str(ordem.descricao_servico or "").strip()),
                "critico",
                "Preencha escopo, demanda ou serviço executado.",
            ),
            self._item(
                "tipo_relatorio",
                "Tipo de relatório",
                bool(ordem.tipo_relatorio),
                "critico",
                "Selecione o tipo de relatório na etapa Execução.",
            ),
            self._item(
                "tecnico",
                "Técnico responsável",
                bool(ordem.tecnico_responsavel_id),
                "critico",
                "Defina quem executou ou será responsável pelo atendimento.",
            ),
            self._item(
                "data_execucao",
                "Data de execução/agendamento",
                bool(ordem.data_agendada),
                "critico",
                "Informe a data do serviço para rastreabilidade.",
            ),
            self._item(
                "observacoes_tecnicas",
                "Observações técnicas",
                bool(str(ordem.observacoes_tecnicas or "").strip()),
                "importante",
                "Registre diagnóstico, solução, testes e recomendações.",
            ),
            self._item(
                "fotos",
                "Registro fotográfico",
                bool(fotos),
                "importante",
                "Anexe fotos antes/depois ou evidências do checklist.",
            ),
            self._item(
                "checklist",
                "Checklist técnico",
                checklist_total == 0 or checklist_percentual >= 80,
                "recomendado",
                "Responda ao menos 80% do checklist quando houver modelo aplicado.",
            ),
            self._item(
                "equipamento",
                "Dados do equipamento",
                any([ordem.equipamento_marca, ordem.equipamento_modelo, ordem.equipamento_serie]),
                "recomendado",
                "Informe marca, modelo ou série quando aplicável.",
            ),
        ]

        score = 0
        pesos = {"critico": 14, "importante": 10, "recomendado": 6}
        for requisito in requisitos:
            if requisito["ok"]:
                score += pesos[requisito["peso"]]
        score = min(score, 100)

        criticos = [item for item in requisitos if item["peso"] == "critico" and not item["ok"]]
        importantes = [item for item in requisitos if item["peso"] == "importante" and not item["ok"]]
        recomendados = [item for item in requisitos if item["peso"] == "recomendado" and not item["ok"]]
        pendencias = criticos + importantes + recomendados

        pronto_final = not criticos and score >= self.SCORE_MINIMO_FINAL
        nivel = "excelente" if score >= 92 else "bom" if score >= 80 else "atencao" if score >= 60 else "critico"

        return {
            "score": score,
            "nivel": nivel,
            "pronto_final": pronto_final,
            "pode_rascunho": True,
            "minimo_final": self.SCORE_MINIMO_FINAL,
            "requisitos": requisitos,
            "pendencias": pendencias,
            "bloqueios": criticos,
            "alertas": importantes,
            "melhorias": recomendados,
            "metricas": {
                "fotos": len(fotos),
                "checklist_total": checklist_total,
                "checklist_respondido": checklist_respondido,
                "checklist_percentual": checklist_percentual,
                "itens_orcamento": ordem.itens.count(),
            },
            "proxima_acao": self._proxima_acao(criticos, importantes, recomendados, pronto_final),
            "nome_arquivo_sugerido": self.nome_arquivo(ordem, "relatorio_tecnico", final=pronto_final),
        }

    def validar_geracao_final(self, ordem, permitir_rascunho=False):
        avaliacao = self.avaliar(ordem)
        if avaliacao["pronto_final"] or permitir_rascunho:
            return avaliacao
        mensagens = [item["ajuda"] for item in avaliacao["bloqueios"]] or [
            f"O relatório precisa atingir pelo menos {self.SCORE_MINIMO_FINAL}% de qualidade para emissão final."
        ]
        raise ValueError(" ".join(mensagens))

    def nome_arquivo(self, ordem, tipo_documento, final=True):
        numero = re.sub(r"[^A-Za-z0-9_-]+", "-", str(ordem.numero or ordem.pk)).strip("-")
        cliente = re.sub(r"[^A-Za-z0-9_-]+", "-", str(getattr(ordem.cliente, "nome", "cliente") or "cliente")).strip("-")
        versao = "final" if final else "rascunho"
        data = timezone.localdate().strftime("%Y%m%d")
        return f"{tipo_documento}_{numero}_{cliente[:32]}_{versao}_{data}.pdf"

    def _item(self, codigo, titulo, ok, peso, ajuda):
        return {
            "codigo": codigo,
            "titulo": titulo,
            "ok": bool(ok),
            "peso": peso,
            "ajuda": ajuda,
        }

    def _resposta_preenchida(self, resposta):
        return any(
            [
                resposta.valor_bool is not None,
                bool(str(resposta.valor_texto or "").strip()),
                resposta.valor_numero is not None,
                resposta.fotos.exists(),
            ]
        )

    def _proxima_acao(self, criticos, importantes, recomendados, pronto_final):
        if pronto_final:
            return "Relatório pronto para emissão final."
        if criticos:
            return criticos[0]["ajuda"]
        if importantes:
            return importantes[0]["ajuda"]
        if recomendados:
            return recomendados[0]["ajuda"]
        return "Revise o relatório antes de emitir."
