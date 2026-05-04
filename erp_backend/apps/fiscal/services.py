from decimal import Decimal, ROUND_HALF_UP

import requests

from .models import ConfiguracaoFiscal, TabelaImpostoLucroPresumido


class ConsultaCNPJ:
    base_url = "https://brasilapi.com.br/api/cnpj/v1"

    def consultar(self, cnpj: str) -> dict:
        documento = "".join(filter(str.isdigit, str(cnpj or "")))
        if len(documento) != 14:
            raise ValueError("CNPJ inválido.")

        try:
            response = requests.get(f"{self.base_url}/{documento}", timeout=10)
        except requests.RequestException as exc:
            raise ConnectionError("Não foi possível consultar a BrasilAPI.") from exc

        if response.status_code == 404:
            raise ValueError("CNPJ não encontrado.")
        if response.status_code >= 400:
            raise ConnectionError("Erro ao consultar dados do CNPJ.")

        data = response.json()
        atividade_principal = ""
        if data.get("cnae_fiscal_descricao"):
            atividade_principal = data["cnae_fiscal_descricao"]
        elif data.get("descricao_identificador_matriz_filial"):
            atividade_principal = data["descricao_identificador_matriz_filial"]

        return {
            "cnpj": documento,
            "razao_social": data.get("razao_social") or data.get("nome_fantasia") or "",
            "municipio": data.get("municipio") or "",
            "uf": data.get("uf") or "",
            "codigo_municipio": str(data.get("codigo_municipio_ibge") or ""),
            "atividade_principal": atividade_principal,
        }


class CalculadoraImpostos:
    anexo_iii = [
        (Decimal("180000"), Decimal("6.00")),
        (Decimal("360000"), Decimal("11.20")),
        (Decimal("720000"), Decimal("13.50")),
        (Decimal("1800000"), Decimal("16.00")),
        (Decimal("3600000"), Decimal("21.00")),
        (None, Decimal("33.00")),
    ]

    def calcular(self, valor_servicos: Decimal, valor_materiais: Decimal, config: ConfiguracaoFiscal) -> dict:
        valor_servicos = Decimal(valor_servicos or 0)
        valor_materiais = Decimal(valor_materiais or 0)
        subtotal = valor_servicos + valor_materiais

        if config.regime_tributario == ConfiguracaoFiscal.RegimeTributario.MEI:
            return self._build_response(
                regime="mei",
                subtotal_servicos=valor_servicos,
                subtotal_materiais=valor_materiais,
                subtotal=subtotal,
                iss=Decimal("0"),
                pis=Decimal("0"),
                cofins=Decimal("0"),
                irpj=Decimal("0"),
                csll=Decimal("0"),
                observacao="MEI possui DAS fixo mensal, sem impostos destacados por nota.",
                aliquotas={"iss": Decimal("0"), "pis": Decimal("0"), "cofins": Decimal("0"), "irpj": Decimal("0"), "csll": Decimal("0")},
            )

        if config.regime_tributario == ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL:
            aliquota_das = self._obter_aliquota_simples(subtotal)
            total_das = self._percentual(subtotal, aliquota_das)
            return self._build_response(
                regime="simples_nacional",
                subtotal_servicos=valor_servicos,
                subtotal_materiais=valor_materiais,
                subtotal=subtotal,
                iss=Decimal("0"),
                pis=Decimal("0"),
                cofins=Decimal("0"),
                irpj=Decimal("0"),
                csll=Decimal("0"),
                observacao="Simples Nacional com DAS unificado pelo Anexo III.",
                aliquotas={"iss": Decimal("0"), "pis": Decimal("0"), "cofins": Decimal("0"), "irpj": Decimal("0"), "csll": Decimal("0"), "das": aliquota_das},
                total_impostos=total_das,
                total_geral=subtotal + total_das,
            )

        tabela = (
            TabelaImpostoLucroPresumido.objects.filter(ativo=True)
            .order_by("-vigencia_inicio")
            .first()
        )
        if not tabela:
            tabela = TabelaImpostoLucroPresumido(
                descricao="Tabela padrão",
                vigencia_inicio="2025-01-01",
            )

        iss = self._percentual(valor_servicos, config.aliquota_iss)
        pis = self._percentual(subtotal, tabela.pis)
        cofins = self._percentual(subtotal, tabela.cofins)
        irpj = self._percentual(valor_servicos, tabela.irpj_servicos)
        csll = self._percentual(valor_servicos, tabela.csll_servicos)
        observacao = ""

        if config.regime_tributario == ConfiguracaoFiscal.RegimeTributario.LUCRO_REAL:
            observacao = "Lucro Real exige apuração contábil efetiva; valores exibidos são referência operacional."

        return self._build_response(
            regime=config.regime_tributario,
            subtotal_servicos=valor_servicos,
            subtotal_materiais=valor_materiais,
            subtotal=subtotal,
            iss=iss,
            pis=pis,
            cofins=cofins,
            irpj=irpj,
            csll=csll,
            observacao=observacao,
            aliquotas={
                "iss": config.aliquota_iss,
                "pis": tabela.pis,
                "cofins": tabela.cofins,
                "irpj": tabela.irpj_servicos,
                "csll": tabela.csll_servicos,
            },
        )

    def _obter_aliquota_simples(self, subtotal: Decimal) -> Decimal:
        for limite, aliquota in self.anexo_iii:
            if limite is None or subtotal <= limite:
                return aliquota
        return Decimal("0")

    def _percentual(self, valor: Decimal, aliquota: Decimal) -> Decimal:
        return self._round((valor * Decimal(aliquota or 0)) / Decimal("100"))

    def _round(self, valor: Decimal) -> Decimal:
        return Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _build_response(
        self,
        regime: str,
        subtotal_servicos: Decimal,
        subtotal_materiais: Decimal,
        subtotal: Decimal,
        iss: Decimal,
        pis: Decimal,
        cofins: Decimal,
        irpj: Decimal,
        csll: Decimal,
        aliquotas: dict,
        observacao: str = "",
        total_impostos: Decimal | None = None,
        total_geral: Decimal | None = None,
        cbs: Decimal | None = None,
        ibs: Decimal | None = None,
    ) -> dict:
        cbs = self._round(cbs or Decimal("0"))
        ibs = self._round(ibs or Decimal("0"))
        if total_impostos is None:
            total_impostos = self._round(iss + pis + cofins + irpj + csll + cbs + ibs)
        if total_geral is None:
            total_geral = self._round(subtotal + total_impostos)
        valor_liquido = self._round(subtotal - total_impostos)

        response = {
            "subtotal_servicos": self._round(subtotal_servicos),
            "subtotal_materiais": self._round(subtotal_materiais),
            "subtotal": self._round(subtotal),
            "iss": self._round(iss),
            "pis": self._round(pis),
            "cofins": self._round(cofins),
            "irpj": self._round(irpj),
            "csll": self._round(csll),
            "cbs": cbs,
            "ibs": ibs,
            "total_impostos": self._round(total_impostos),
            "total_geral": self._round(total_geral),
            "valor_liquido": valor_liquido,
            "aliquotas": aliquotas,
            "regime": regime,
        }
        if observacao:
            response["observacao"] = observacao
        return response


class MotorFiscalEspecialista:
    """
    Motor fiscal determinístico e auditável.

    Ele concentra as regras usadas por orçamento, OS, PDF e financeiro. O objetivo
    é deixar o ERP tomar decisões fiscais básicas sempre pelo mesmo caminho.
    """

    CODIGOS_SERVICO_SUGERIDOS = {
        "refrigeracao": "14.01",
        "refrigeração": "14.01",
        "ar condicionado": "14.01",
        "hvac": "14.01",
        "manutencao": "14.01",
        "manutenção": "14.01",
        "eletrica": "7.02",
        "elétrica": "7.02",
        "civil": "7.02",
        "obra": "7.02",
        "construcao": "7.02",
        "construção": "7.02",
    }

    SERVICOS_ISS_LOCAL_EXECUCAO = {"7.02", "7.04", "7.05", "7.10", "7.11", "7.16", "7.17", "7.19"}

    def __init__(self, calculadora: CalculadoraImpostos | None = None):
        self.calculadora = calculadora or CalculadoraImpostos()

    def calcular_operacao(
        self,
        valor_servicos: Decimal,
        valor_materiais: Decimal,
        config: ConfiguracaoFiscal,
        contexto: dict | None = None,
    ) -> dict:
        contexto = contexto or {}
        impostos = self.calculadora.calcular(valor_servicos, valor_materiais, config)
        inteligencia = self.analisar_operacao(impostos, config, contexto)
        impostos["motor_fiscal"] = inteligencia
        impostos["observacao"] = self._observacao_resumida(impostos, inteligencia)
        return impostos

    def analisar_operacao(self, impostos: dict, config: ConfiguracaoFiscal, contexto: dict | None = None) -> dict:
        contexto = contexto or {}
        valor_servicos = Decimal(str(impostos.get("subtotal_servicos", 0) or 0))
        valor_materiais = Decimal(str(impostos.get("subtotal_materiais", 0) or 0))
        subtotal = Decimal(str(impostos.get("subtotal", 0) or 0))
        tipo_servico = str(contexto.get("tipo_servico") or "").lower()
        descricao = str(contexto.get("descricao") or contexto.get("descricao_servico") or "").lower()
        texto_operacao = f"{tipo_servico} {descricao}".strip()

        alertas = []
        riscos = []
        recomendacoes = []

        tipo_nota_sugerido = self._sugerir_tipo_nota(valor_servicos, valor_materiais, config)
        codigo_sugerido = self._sugerir_codigo_servico(texto_operacao, config)
        municipio_incidencia = self._sugerir_municipio_incidencia(config, codigo_sugerido, contexto)
        iss_retido = bool(config.iss_retido_fonte)

        if config.regime_tributario != ConfiguracaoFiscal.RegimeTributario.LUCRO_PRESUMIDO:
            alertas.append(
                self._item(
                    "regime_tributario",
                    "warning",
                    "Regime tributário diferente de Lucro Presumido.",
                    "O cálculo segue o regime cadastrado, mas as validações avançadas foram calibradas para Lucro Presumido.",
                )
            )

        if not config.codigo_servico_lc116:
            riscos.append(
                self._item(
                    "codigo_servico_lc116",
                    "warning",
                    "Código LC 116/2003 não informado.",
                    f"Sugestão operacional para esta atividade: {codigo_sugerido or 'avaliar com contador/município'}.",
                )
            )
        elif codigo_sugerido and config.codigo_servico_lc116 != codigo_sugerido:
            alertas.append(
                self._item(
                    "codigo_servico_lc116",
                    "info",
                    "Código LC 116 informado difere da sugestão do motor fiscal.",
                    f"Cadastro atual: {config.codigo_servico_lc116}. Sugestão pela descrição: {codigo_sugerido}.",
                )
            )

        if valor_servicos > 0 and config.tipo_nota not in [ConfiguracaoFiscal.TipoNota.NFSE, ConfiguracaoFiscal.TipoNota.AMBAS]:
            riscos.append(
                self._item(
                    "tipo_nota",
                    "error",
                    "Prestação de serviço sem NFS-e configurada.",
                    "Para serviços, ajuste o tipo de nota para NFS-e ou Ambas.",
                )
            )

        aliquota_iss = Decimal(config.aliquota_iss or 0)
        if valor_servicos > 0 and (aliquota_iss < Decimal("2") or aliquota_iss > Decimal("5")):
            riscos.append(
                self._item(
                    "aliquota_iss",
                    "error",
                    "Alíquota de ISS fora da faixa usual legal.",
                    "Revise a alíquota municipal. Em regra, ISS fica entre 2% e 5%.",
                )
            )

        if not config.codigo_municipio_ibge or len(str(config.codigo_municipio_ibge).strip()) != 7:
            alertas.append(
                self._item(
                    "codigo_municipio_ibge",
                    "warning",
                    "Código IBGE ausente ou incompleto.",
                    "A NFS-e pode rejeitar ou escriturar município incorreto.",
                )
            )

        if config.codigo_servico_lc116 in self.SERVICOS_ISS_LOCAL_EXECUCAO:
            recomendacoes.append(
                self._item(
                    "municipio_incidencia",
                    "info",
                    "Serviço pode exigir ISS no local de execução.",
                    "Confirme endereço da obra/execução antes da emissão.",
                )
            )

        if iss_retido:
            recomendacoes.append(
                self._item(
                    "iss_retido_fonte",
                    "info",
                    "ISS será tratado como retido na fonte.",
                    "O financeiro deve considerar valor líquido menor se a retenção for confirmada pelo tomador.",
                )
            )

        carga_total = Decimal("0")
        if subtotal > 0:
            carga_total = self._round((Decimal(str(impostos.get("total_impostos", 0))) / subtotal) * Decimal("100"))

        return {
            "versao_motor": "fiscal-especialista-2026.1",
            "confianca": self._calcular_confianca(config, alertas, riscos),
            "tipo_nota_sugerido": tipo_nota_sugerido,
            "codigo_servico_sugerido": codigo_sugerido,
            "municipio_incidencia_iss": municipio_incidencia,
            "iss_retido": iss_retido,
            "valor_liquido_estimado": impostos.get("valor_liquido", 0),
            "carga_total_percentual": carga_total,
            "alertas": alertas,
            "riscos": riscos,
            "recomendacoes": recomendacoes,
            "financeiro": self._analisar_financeiro(impostos, config),
            "reforma_tributaria": self._reforma_tributaria(),
        }

    def aplicar_em_ordem(self, ordem, config: ConfiguracaoFiscal, itens=None) -> dict:
        itens = list(itens if itens is not None else ordem.itens.all())
        valor_servicos = sum(
            Decimal(item.valor_total or 0)
            for item in itens
            if getattr(item, "origem_tipo", "") != "produto"
        )
        valor_materiais = sum(
            Decimal(item.valor_total or 0)
            for item in itens
            if getattr(item, "origem_tipo", "") == "produto"
        )

        if not itens and Decimal(ordem.valor_total_orcado or 0) > 0:
            valor_servicos = Decimal(ordem.valor_servicos or ordem.valor_total_orcado or 0)
            valor_materiais = Decimal(ordem.valor_materiais or 0)

        impostos = self.calcular_operacao(
            valor_servicos=valor_servicos,
            valor_materiais=valor_materiais,
            config=config,
            contexto={
                "tipo_servico": ordem.tipo_servico,
                "descricao_servico": ordem.descricao_servico,
                "municipio_execucao": getattr(ordem.endereco_servico, "cidade", "") if ordem.endereco_servico else "",
                "uf_execucao": getattr(ordem.endereco_servico, "uf", "") if ordem.endereco_servico else "",
            },
        )
        return impostos

    def aplicar_campos_ordem(self, ordem, impostos: dict, config: ConfiguracaoFiscal):
        aliquotas = impostos.get("aliquotas") or {}
        motor = impostos.get("motor_fiscal") or {}
        total_retencoes = Decimal(str(impostos.get("iss", 0) or 0)) if config.iss_retido_fonte else Decimal("0")

        ordem.valor_servicos = Decimal(str(impostos.get("subtotal_servicos", 0) or 0))
        ordem.valor_materiais = Decimal(str(impostos.get("subtotal_materiais", 0) or 0))
        ordem.dados_impostos = self._json_safe(impostos)
        ordem.total_com_impostos = Decimal(str(impostos.get("total_geral", ordem.valor_total_orcado) or 0))
        ordem.aliquota_issqn = Decimal(str(aliquotas.get("iss", config.aliquota_iss) or 0))
        ordem.valor_issqn = Decimal(str(impostos.get("iss", 0) or 0))
        ordem.retencao_issqn = bool(config.iss_retido_fonte)
        ordem.valor_retido_issqn = total_retencoes
        ordem.aliquota_pis = Decimal(str(aliquotas.get("pis", 0) or 0))
        ordem.valor_pis = Decimal(str(impostos.get("pis", 0) or 0))
        ordem.aliquota_cofins = Decimal(str(aliquotas.get("cofins", 0) or 0))
        ordem.valor_cofins = Decimal(str(impostos.get("cofins", 0) or 0))
        ordem.aliquota_irpj = Decimal(str(aliquotas.get("irpj", 0) or 0))
        ordem.valor_irpj = Decimal(str(impostos.get("irpj", 0) or 0))
        ordem.aliquota_csll = Decimal(str(aliquotas.get("csll", 0) or 0))
        ordem.valor_csll = Decimal(str(impostos.get("csll", 0) or 0))
        ordem.aliquota_cbs = Decimal(str(aliquotas.get("cbs", 0) or 0))
        ordem.valor_cbs = Decimal(str(impostos.get("cbs", 0) or 0))
        ordem.aliquota_ibs = Decimal(str(aliquotas.get("ibs", 0) or 0))
        ordem.valor_ibs = Decimal(str(impostos.get("ibs", 0) or 0))
        ordem.valor_total_retencoes = total_retencoes
        ordem.valor_liquido_nf = Decimal(str(impostos.get("subtotal", 0) or 0)) - total_retencoes
        ordem.municipio_incidencia_issqn = motor.get("municipio_incidencia_iss") or config.municipio
        ordem.tipo_regime_tributario = "simples" if config.regime_tributario == "simples_nacional" else config.regime_tributario
        if not ordem.descricao_servico_nf:
            ordem.descricao_servico_nf = ordem.descricao_servico or ""

    def _sugerir_tipo_nota(self, valor_servicos: Decimal, valor_materiais: Decimal, config: ConfiguracaoFiscal) -> str:
        if valor_servicos > 0 and valor_materiais > 0:
            return ConfiguracaoFiscal.TipoNota.AMBAS
        if valor_servicos > 0:
            return ConfiguracaoFiscal.TipoNota.NFSE
        if valor_materiais > 0:
            return ConfiguracaoFiscal.TipoNota.NFE
        return config.tipo_nota

    def _sugerir_codigo_servico(self, texto_operacao: str, config: ConfiguracaoFiscal) -> str:
        for termo, codigo in self.CODIGOS_SERVICO_SUGERIDOS.items():
            if termo in texto_operacao:
                return codigo
        return config.codigo_servico_lc116 or ""

    def _sugerir_municipio_incidencia(self, config: ConfiguracaoFiscal, codigo_servico: str, contexto: dict) -> str:
        municipio_execucao = contexto.get("municipio_execucao")
        uf_execucao = contexto.get("uf_execucao")
        if codigo_servico in self.SERVICOS_ISS_LOCAL_EXECUCAO and municipio_execucao:
            return f"{municipio_execucao}/{uf_execucao}".strip("/")
        if config.municipio and config.uf:
            return f"{config.municipio}/{config.uf}"
        return config.municipio or ""

    def _analisar_financeiro(self, impostos: dict, config: ConfiguracaoFiscal) -> dict:
        total_retido = Decimal(str(impostos.get("iss", 0) or 0)) if config.iss_retido_fonte else Decimal("0")
        subtotal = Decimal(str(impostos.get("subtotal", 0) or 0))
        return {
            "valor_bruto_receber": impostos.get("subtotal", 0),
            "valor_retencoes": self._round(total_retido),
            "valor_liquido_receber": self._round(subtotal - total_retido),
            "criar_contas_receber_por": "valor_liquido" if config.iss_retido_fonte else "valor_bruto",
            "competencia": "data_emissao_nf",
            "conciliacao": "vincular recebimento bancario ao lancamento financeiro gerado pela OS.",
        }

    def _reforma_tributaria(self) -> dict:
        return {
            "status": "preparacao",
            "cronograma": [
                {"ano": "2026", "evento": "testes de CBS e IBS nos documentos fiscais"},
                {"ano": "2027-2032", "evento": "transicao gradual entre tributos atuais e novo modelo"},
                {"ano": "2033", "evento": "modelo completo com CBS e IBS"},
            ],
            "novos_campos": ["cbs", "ibs", "credito_financeiro", "ambiente_nacional"],
            "acao_erp": "manter calculo atual e salvar estrutura pronta para CBS/IBS em dados_impostos.",
        }

    def _calcular_confianca(self, config: ConfiguracaoFiscal, alertas: list, riscos: list) -> int:
        confianca = 95
        confianca -= len(alertas) * 8
        confianca -= len(riscos) * 15
        if not config.codigo_servico_lc116:
            confianca -= 10
        if not config.codigo_municipio_ibge:
            confianca -= 10
        return max(30, min(99, confianca))

    def _observacao_resumida(self, impostos: dict, inteligencia: dict) -> str:
        riscos = inteligencia.get("riscos") or []
        alertas = inteligencia.get("alertas") or []
        if riscos:
            return f"Motor fiscal encontrou {len(riscos)} risco(s) antes da emissão. Revise configuração fiscal."
        if alertas:
            return f"Motor fiscal encontrou {len(alertas)} alerta(s). Cálculo realizado com recomendações."
        return "Cálculo fiscal validado automaticamente pelo motor fiscal especialista."

    def _item(self, campo: str, severidade: str, titulo: str, detalhe: str) -> dict:
        return {
            "campo": campo,
            "severidade": severidade,
            "titulo": titulo,
            "detalhe": detalhe,
        }

    def _round(self, valor: Decimal) -> Decimal:
        return Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _json_safe(self, value):
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, dict):
            return {key: self._json_safe(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._json_safe(item) for item in value]
        return value
