from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from types import SimpleNamespace

import requests
from django.utils import timezone

from .models import ApuracaoSimplesNacional, ConfiguracaoFiscal, FaturamentoMensalSimples, TabelaImpostoLucroPresumido


CENTAVOS = Decimal("0.01")


class SimplesNacionalService:
    SUBLIMITE = Decimal("3600000.00")
    TETO = Decimal("4800000.00")
    TABELAS = {
        ConfiguracaoFiscal.AnexoSimples.ANEXO_III: [
            (Decimal("0.00"), Decimal("180000.00"), Decimal("0.0600"), Decimal("0.00")),
            (Decimal("180000.01"), Decimal("360000.00"), Decimal("0.1120"), Decimal("9360.00")),
            (Decimal("360000.01"), Decimal("720000.00"), Decimal("0.1350"), Decimal("17640.00")),
            (Decimal("720000.01"), Decimal("1800000.00"), Decimal("0.1600"), Decimal("35640.00")),
            (Decimal("1800000.01"), Decimal("3600000.00"), Decimal("0.2100"), Decimal("125640.00")),
            (Decimal("3600000.01"), Decimal("4800000.00"), Decimal("0.3300"), Decimal("648000.00")),
        ],
        ConfiguracaoFiscal.AnexoSimples.ANEXO_IV: [
            (Decimal("0.00"), Decimal("180000.00"), Decimal("0.0450"), Decimal("0.00")),
            (Decimal("180000.01"), Decimal("360000.00"), Decimal("0.0900"), Decimal("8100.00")),
            (Decimal("360000.01"), Decimal("720000.00"), Decimal("0.1020"), Decimal("12420.00")),
            (Decimal("720000.01"), Decimal("1800000.00"), Decimal("0.1400"), Decimal("39780.00")),
            (Decimal("1800000.01"), Decimal("3600000.00"), Decimal("0.2200"), Decimal("183780.00")),
            (Decimal("3600000.01"), Decimal("4800000.00"), Decimal("0.3300"), Decimal("828000.00")),
        ],
    }

    def calcular(self, configuracao: ConfiguracaoFiscal, competencia=None, salvar=True) -> dict:
        competencia = self._normalizar_competencia(competencia)
        empresa = configuracao.empresa
        receita_mes = self._receita_mes(empresa, competencia)
        meses_atividade = self._meses_atividade(configuracao.data_abertura_simples, competencia)
        receitas = self._receitas_ordenadas(empresa, competencia)

        if meses_atividade < 12:
            rba = sum((item.receita_bruta for item in receitas), Decimal("0.00"))
            rbt12 = (rba / Decimal(meses_atividade)) * Decimal("12")
            proporcionalizado = True
            meses_base = meses_atividade
        else:
            ultimos_12 = list(receitas[:12])
            rba = sum((item.receita_bruta for item in ultimos_12), Decimal("0.00"))
            rbt12 = rba
            proporcionalizado = False
            meses_base = len(ultimos_12)

        faixa, aliquota_nominal, parcela_deduzir = self.buscar_faixa(rbt12, configuracao.anexo_simples)
        aliquota_efetiva = ((rbt12 * aliquota_nominal - parcela_deduzir) / rbt12) if rbt12 > 0 else Decimal("0.00")
        if aliquota_efetiva < 0:
            aliquota_efetiva = Decimal("0.00")
        das_estimado = receita_mes * aliquota_efetiva
        percentual_sublimite = (rbt12 / self.SUBLIMITE) * Decimal("100") if self.SUBLIMITE else Decimal("0.00")
        percentual_teto = (rbt12 / self.TETO) * Decimal("100") if self.TETO else Decimal("0.00")
        alerta = self._alerta(rbt12)

        payload = {
            "empresa": empresa.id,
            "competencia": competencia.isoformat(),
            "anexo": configuracao.anexo_simples,
            "receita_mes": self._money(receita_mes),
            "rbt12": self._money(rbt12),
            "meses_atividade": meses_atividade,
            "meses_base": meses_base,
            "proporcionalizado": proporcionalizado,
            "faixa": faixa,
            "aliquota_nominal": self._percent(aliquota_nominal),
            "parcela_deduzir": self._money(parcela_deduzir),
            "aliquota_efetiva": self._percent(aliquota_efetiva),
            "das_estimado": self._money(das_estimado),
            "percentual_sublimite": self._percent(percentual_sublimite / Decimal("100")),
            "percentual_teto": self._percent(percentual_teto / Decimal("100")),
            "alerta": alerta,
            "sublimite": self._money(self.SUBLIMITE),
            "teto": self._money(self.TETO),
            "memoria_calculo": {
                "formula_rbt12": "(receita acumulada / meses de atividade) x 12" if proporcionalizado else "soma dos últimos 12 meses reais",
                "formula_aliquota_efetiva": "(RBT12 x alíquota nominal - parcela a deduzir) / RBT12",
                "formula_das": "receita bruta do mês x alíquota efetiva",
                "data_abertura": configuracao.data_abertura_simples.isoformat(),
                "receita_acumulada_base": str(self._money(rba)),
            },
        }

        if salvar:
            ApuracaoSimplesNacional.objects.update_or_create(
                empresa=empresa,
                competencia=competencia,
                defaults={
                    "anexo": configuracao.anexo_simples,
                    "receita_mes": payload["receita_mes"],
                    "rbt12": payload["rbt12"],
                    "meses_atividade": meses_atividade,
                    "proporcionalizado": proporcionalizado,
                    "faixa": faixa,
                    "aliquota_nominal": payload["aliquota_nominal"],
                    "parcela_deduzir": payload["parcela_deduzir"],
                    "aliquota_efetiva": payload["aliquota_efetiva"],
                    "das_estimado": payload["das_estimado"],
                    "percentual_sublimite": payload["percentual_sublimite"],
                    "percentual_teto": payload["percentual_teto"],
                    "alerta": alerta,
                    "memoria_calculo": payload["memoria_calculo"],
                },
            )

        return payload

    def buscar_faixa(self, rbt12: Decimal, anexo: str):
        tabela = self.TABELAS.get(anexo) or self.TABELAS[ConfiguracaoFiscal.AnexoSimples.ANEXO_III]
        for indice, (de, ate, aliquota, parcela_deduzir) in enumerate(tabela, start=1):
            if de <= rbt12 <= ate:
                return indice, aliquota, parcela_deduzir
        ultima = tabela[-1]
        return len(tabela), ultima[2], ultima[3]

    def registrar_receita(self, configuracao: ConfiguracaoFiscal, competencia, receita_bruta, origem="manual", observacoes="") -> dict:
        competencia = self._normalizar_competencia(competencia)
        FaturamentoMensalSimples.objects.update_or_create(
            empresa=configuracao.empresa,
            competencia=competencia,
            defaults={
                "receita_bruta": self._decimal(receita_bruta),
                "origem": origem or FaturamentoMensalSimples.Origem.MANUAL,
                "observacoes": observacoes or "",
            },
        )
        return self.calcular(configuracao, competencia=competencia, salvar=True)

    def prever(self, configuracao: ConfiguracaoFiscal, meses=6, crescimento_mensal=Decimal("0.00")) -> list[dict]:
        meses = max(1, min(int(meses or 6), 24))
        crescimento_mensal = self._decimal(crescimento_mensal) / Decimal("100")
        hoje = timezone.localdate().replace(day=1)
        receitas_reais = {
            item.competencia: self._decimal(item.receita_bruta)
            for item in FaturamentoMensalSimples.objects.filter(empresa=configuracao.empresa).order_by("competencia")
        }
        ultimas = list(receitas_reais.values())[-3:]
        media_base = (sum(ultimas, Decimal("0.00")) / Decimal(len(ultimas))) if ultimas else Decimal("0.00")
        receitas_virtual = dict(receitas_reais)
        previsoes = []

        for indice in range(1, meses + 1):
            competencia = self._somar_meses(hoje, indice)
            receita_prevista = media_base * ((Decimal("1.00") + crescimento_mensal) ** indice)
            receitas_virtual[competencia] = receita_prevista
            previsoes.append(self._calcular_com_receitas(configuracao, competencia, receitas_virtual, receita_prevista))

        return previsoes

    def estimar_para_receita(self, configuracao: ConfiguracaoFiscal, receita_mes, competencia=None) -> dict | None:
        empresa = getattr(configuracao, "empresa", None)
        data_abertura = getattr(configuracao, "data_abertura_simples", None)
        if not empresa or not data_abertura:
            return None

        competencia = self._normalizar_competencia(competencia)
        receita_mes = self._decimal(receita_mes)
        receitas = {
            item.competencia: self._decimal(item.receita_bruta)
            for item in FaturamentoMensalSimples.objects.filter(
                empresa=empresa,
                competencia__lte=competencia,
            ).order_by("competencia")
        }
        receitas[competencia] = receita_mes
        resultado = self._calcular_com_receitas(
            configuracao,
            competencia,
            receitas,
            receita_mes,
        )
        resultado["receita_mes"] = self._money(receita_mes)
        return resultado

    def _calcular_com_receitas(self, configuracao: ConfiguracaoFiscal, competencia, receitas_por_mes: dict, receita_mes: Decimal) -> dict:
        meses_atividade = self._meses_atividade(configuracao.data_abertura_simples, competencia)
        abertura = self._normalizar_competencia(configuracao.data_abertura_simples)
        meses_considerados = self._periodo_mensal(abertura, competencia)

        if meses_atividade < 12:
            rba = sum((receitas_por_mes.get(mes, Decimal("0.00")) for mes in meses_considerados), Decimal("0.00"))
            rbt12 = (rba / Decimal(meses_atividade)) * Decimal("12")
            proporcionalizado = True
        else:
            ultimos_12 = meses_considerados[-12:]
            rba = sum((receitas_por_mes.get(mes, Decimal("0.00")) for mes in ultimos_12), Decimal("0.00"))
            rbt12 = rba
            proporcionalizado = False

        faixa, aliquota_nominal, parcela_deduzir = self.buscar_faixa(rbt12, configuracao.anexo_simples)
        aliquota_efetiva = ((rbt12 * aliquota_nominal - parcela_deduzir) / rbt12) if rbt12 > 0 else Decimal("0.00")
        if aliquota_efetiva < 0:
            aliquota_efetiva = Decimal("0.00")

        return {
            "competencia": competencia.isoformat(),
            "receita_prevista": self._money(receita_mes),
            "rbt12": self._money(rbt12),
            "meses_atividade": meses_atividade,
            "proporcionalizado": proporcionalizado,
            "faixa": faixa,
            "aliquota_nominal": self._percent(aliquota_nominal),
            "aliquota_efetiva": self._percent(aliquota_efetiva),
            "das_estimado": self._money(receita_mes * aliquota_efetiva),
            "percentual_sublimite": self._percent((rbt12 / self.SUBLIMITE) if self.SUBLIMITE else 0),
            "percentual_teto": self._percent((rbt12 / self.TETO) if self.TETO else 0),
            "alerta": self._alerta(rbt12),
        }

    def _receita_mes(self, empresa, competencia) -> Decimal:
        faturamento = FaturamentoMensalSimples.objects.filter(empresa=empresa, competencia=competencia).first()
        return self._decimal(faturamento.receita_bruta if faturamento else 0)

    def _receitas_ordenadas(self, empresa, competencia):
        return FaturamentoMensalSimples.objects.filter(
            empresa=empresa,
            competencia__lte=competencia,
        ).order_by("-competencia")

    def _meses_atividade(self, data_abertura, competencia) -> int:
        abertura = self._normalizar_competencia(data_abertura)
        return max(1, (competencia.year - abertura.year) * 12 + competencia.month - abertura.month + 1)

    def _alerta(self, rbt12: Decimal) -> str:
        if rbt12 >= self.TETO:
            return ApuracaoSimplesNacional.Alerta.ACIMA_TETO
        if rbt12 >= self.TETO * Decimal("0.80"):
            return ApuracaoSimplesNacional.Alerta.PERTO_TETO
        if rbt12 >= self.SUBLIMITE:
            return ApuracaoSimplesNacional.Alerta.ACIMA_SUBLIMITE
        if rbt12 >= self.SUBLIMITE * Decimal("0.80"):
            return ApuracaoSimplesNacional.Alerta.PERTO_SUBLIMITE
        return ApuracaoSimplesNacional.Alerta.OK

    def _normalizar_competencia(self, competencia):
        if competencia is None:
            hoje = timezone.localdate()
            return hoje.replace(day=1)
        if isinstance(competencia, str):
            ano, mes, *_ = [int(parte) for parte in competencia.split("-")]
            return date(ano, mes, 1)
        return competencia.replace(day=1)

    def _somar_meses(self, competencia, meses):
        mes_total = competencia.month - 1 + int(meses)
        ano = competencia.year + mes_total // 12
        mes = mes_total % 12 + 1
        return date(ano, mes, 1)

    def _periodo_mensal(self, inicio, fim):
        meses = []
        atual = inicio
        while atual <= fim:
            meses.append(atual)
            atual = self._somar_meses(atual, 1)
        return meses

    def _decimal(self, valor) -> Decimal:
        return Decimal(str(valor or 0))

    def _money(self, valor) -> Decimal:
        return self._decimal(valor).quantize(CENTAVOS, rounding=ROUND_HALF_UP)

    def _percent(self, valor) -> Decimal:
        return self._decimal(valor).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


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
            "nome_fantasia": data.get("nome_fantasia") or "",
            "municipio": data.get("municipio") or "",
            "uf": data.get("uf") or "",
            "codigo_municipio": str(data.get("codigo_municipio_ibge") or ""),
            "codigo_municipio_ibge": str(data.get("codigo_municipio_ibge") or ""),
            "cep": data.get("cep") or "",
            "logradouro": data.get("logradouro") or "",
            "numero": data.get("numero") or "",
            "complemento": data.get("complemento") or "",
            "bairro": data.get("bairro") or "",
            "email": data.get("email") or "",
            "telefone": data.get("ddd_telefone_1") or data.get("ddd_telefone_2") or "",
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

    PERFIS_REGIME = {
        ConfiguracaoFiscal.RegimeTributario.MEI: {
            "codigo": "mei",
            "nome": "MEI",
            "modelo_apuracao": "DAS fixo mensal",
            "calculo_nota": "Sem destaque de ISS/PIS/COFINS/IRPJ/CSLL por nota no ERP.",
            "destaca_tributos_federais": False,
            "usa_das": True,
            "usa_presuncao_irpj_csll": False,
            "observacao": "MEI possui DAS fixo mensal. A nota não deve receber cálculo de Lucro Presumido.",
        },
        ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL: {
            "codigo": "simples_nacional",
            "nome": "Simples Nacional",
            "modelo_apuracao": "DAS unificado",
            "calculo_nota": "Calcula estimativa de DAS; não destaca IRPJ/CSLL/PIS/COFINS como Lucro Presumido.",
            "destaca_tributos_federais": False,
            "usa_das": True,
            "usa_presuncao_irpj_csll": False,
            "observacao": "Simples Nacional usa DAS unificado. O motor não aplica presunção de Lucro Presumido.",
        },
        ConfiguracaoFiscal.RegimeTributario.LUCRO_PRESUMIDO: {
            "codigo": "lucro_presumido",
            "nome": "Lucro Presumido",
            "modelo_apuracao": "PIS/COFINS + IRPJ/CSLL por presunção",
            "calculo_nota": "Aplica tabela de Lucro Presumido e ISS municipal.",
            "destaca_tributos_federais": True,
            "usa_das": False,
            "usa_presuncao_irpj_csll": True,
            "observacao": "Lucro Presumido aplica PIS, COFINS, IRPJ e CSLL por tabela operacional.",
        },
        ConfiguracaoFiscal.RegimeTributario.LUCRO_REAL: {
            "codigo": "lucro_real",
            "nome": "Lucro Real",
            "modelo_apuracao": "Apuração contábil efetiva",
            "calculo_nota": "Calcula ISS/PIS/COFINS operacional; IRPJ/CSLL dependem do lucro contábil.",
            "destaca_tributos_federais": True,
            "usa_das": False,
            "usa_presuncao_irpj_csll": False,
            "observacao": "Lucro Real não usa presunção de IRPJ/CSLL; esses valores dependem da apuração contábil.",
        },
    }

    def calcular(self, valor_servicos: Decimal, valor_materiais: Decimal, config: ConfiguracaoFiscal) -> dict:
        valor_servicos = Decimal(valor_servicos or 0)
        valor_materiais = Decimal(valor_materiais or 0)
        subtotal = valor_servicos + valor_materiais
        perfil = self._perfil_regime(config.regime_tributario)

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
                observacao=perfil["observacao"],
                aliquotas={"iss": Decimal("0"), "pis": Decimal("0"), "cofins": Decimal("0"), "irpj": Decimal("0"), "csll": Decimal("0")},
                perfil_regime=perfil,
            )

        if config.regime_tributario == ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL:
            apuracao_simples = getattr(config, "apuracao_simples", None) or {}
            if apuracao_simples:
                aliquota_das = self._round(
                    Decimal(str(apuracao_simples.get("aliquota_efetiva", 0) or 0))
                    * Decimal("100")
                )
                total_das = self._round(apuracao_simples.get("das_estimado", 0))
            else:
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
                observacao=perfil["observacao"],
                aliquotas={"iss": Decimal("0"), "pis": Decimal("0"), "cofins": Decimal("0"), "irpj": Decimal("0"), "csll": Decimal("0"), "das": aliquota_das},
                total_impostos=total_das,
                total_geral=subtotal + total_das,
                perfil_regime=perfil,
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
        if config.regime_tributario == ConfiguracaoFiscal.RegimeTributario.LUCRO_REAL:
            irpj = Decimal("0")
            csll = Decimal("0")
            observacao = perfil["observacao"]
            aliquotas_irpj_csll = {"irpj": Decimal("0"), "csll": Decimal("0")}
        else:
            irpj = self._percentual(valor_servicos, tabela.irpj_servicos)
            csll = self._percentual(valor_servicos, tabela.csll_servicos)
            observacao = perfil["observacao"]
            aliquotas_irpj_csll = {"irpj": tabela.irpj_servicos, "csll": tabela.csll_servicos}

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
                **aliquotas_irpj_csll,
            },
            perfil_regime=perfil,
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
        perfil_regime: dict | None = None,
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
            "perfil_regime": perfil_regime or self._perfil_regime(regime),
        }
        if observacao:
            response["observacao"] = observacao
        return response

    def _perfil_regime(self, regime: str) -> dict:
        return self.PERFIS_REGIME.get(
            regime,
            {
                "codigo": regime or "nao_configurado",
                "nome": regime or "Não configurado",
                "modelo_apuracao": "Não definido",
                "calculo_nota": "Configure o regime tributário da empresa.",
                "destaca_tributos_federais": False,
                "usa_das": False,
                "usa_presuncao_irpj_csll": False,
                "observacao": "Regime tributário não configurado.",
            },
        )


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
        config_efetiva, automacoes = self._resolver_configuracao_efetiva(
            valor_servicos=Decimal(valor_servicos or 0),
            valor_materiais=Decimal(valor_materiais or 0),
            config=config,
            contexto=contexto,
        )
        impostos = self.calculadora.calcular(valor_servicos, valor_materiais, config_efetiva)
        inteligencia = self.analisar_operacao(impostos, config_efetiva, contexto)
        inteligencia["automacoes_aplicadas"] = automacoes
        inteligencia["configuracao_original"] = {
            "regime_tributario": config.regime_tributario,
            "tipo_nota": config.tipo_nota,
            "codigo_servico_lc116": config.codigo_servico_lc116,
            "aliquota_iss": config.aliquota_iss,
        }
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

        perfil_regime = impostos.get("perfil_regime") or self.calculadora._perfil_regime(config.regime_tributario)
        recomendacoes.append(
            self._item(
                "regime_tributario",
                "success",
                f"Motor fiscal operando como {perfil_regime.get('nome')}.",
                perfil_regime.get("calculo_nota") or "Regime aplicado conforme cadastro fiscal da empresa.",
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
            "reforma_tributaria": self._reforma_tributaria(config),
            "perfil_regime": perfil_regime,
            "simples_apuracao": getattr(config, "apuracao_simples", None),
        }

    def _resolver_configuracao_efetiva(
        self,
        valor_servicos: Decimal,
        valor_materiais: Decimal,
        config: ConfiguracaoFiscal,
        contexto: dict,
    ):
        texto_operacao = (
            f"{contexto.get('tipo_servico', '')} {contexto.get('descricao_servico', '')} {contexto.get('descricao', '')}"
        ).lower()
        codigo_sugerido = self._sugerir_codigo_servico(texto_operacao, config)
        automacoes = []
        apuracao_simples = None

        regime = config.regime_tributario

        if regime == ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL:
            apuracao_simples = SimplesNacionalService().estimar_para_receita(
                config,
                valor_servicos + valor_materiais,
            )
            if apuracao_simples:
                automacoes.append(
                    self._item(
                        "simples_nacional_rbt12",
                        "success",
                        "Alíquota do Simples calculada pelo RBT12 vigente.",
                        f"Faixa {apuracao_simples.get('faixa')} com alíquota efetiva de {Decimal(str(apuracao_simples.get('aliquota_efetiva', 0))) * Decimal('100'):.2f}%.",
                    )
                )

        tipo_nota = config.tipo_nota
        tipo_sugerido = self._sugerir_tipo_nota(valor_servicos, valor_materiais, config)
        if tipo_sugerido and tipo_sugerido != tipo_nota:
            tipo_nota = tipo_sugerido
            automacoes.append(
                self._item(
                    "tipo_nota",
                    "success",
                    f"Tipo de nota ajustado para {tipo_sugerido.upper()}.",
                    "O motor fiscal aplicou a natureza da operação pelos itens do orçamento.",
                )
            )

        codigo_servico = config.codigo_servico_lc116 or codigo_sugerido
        if codigo_sugerido and not config.codigo_servico_lc116:
            automacoes.append(
                self._item(
                    "codigo_servico_lc116",
                    "success",
                    f"Código LC 116 {codigo_sugerido} aplicado automaticamente.",
                    "A classificação foi sugerida pela descrição/tipo de serviço.",
                )
            )

        aliquota_iss = Decimal(config.aliquota_iss or 0)
        if valor_servicos > 0 and (aliquota_iss < Decimal("2") or aliquota_iss > Decimal("5")):
            aliquota_iss = Decimal("5.00")
            automacoes.append(
                self._item(
                    "aliquota_iss",
                    "success",
                    "ISS ajustado automaticamente para 5,00%.",
                    "Use a alíquota municipal correta em Configurações quando houver regra específica.",
                )
            )

        config_efetiva = SimpleNamespace(
            regime_tributario=regime,
            tipo_nota=tipo_nota,
            anexo_simples=getattr(config, "anexo_simples", ConfiguracaoFiscal.AnexoSimples.ANEXO_III),
            data_abertura_simples=getattr(config, "data_abertura_simples", None),
            empresa=getattr(config, "empresa", None),
            apuracao_simples=apuracao_simples,
            cnpj=config.cnpj,
            razao_social=config.razao_social,
            municipio=config.municipio,
            codigo_municipio_ibge=config.codigo_municipio_ibge,
            uf=config.uf,
            aliquota_iss=aliquota_iss,
            iss_retido_fonte=config.iss_retido_fonte,
            codigo_servico_lc116=codigo_servico,
            ativo=config.ativo,
        )
        contexto["automacoes_aplicadas"] = automacoes
        return config_efetiva, automacoes

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

    def _reforma_tributaria(self, config: ConfiguracaoFiscal) -> dict:
        perfil = self.calculadora._perfil_regime(config.regime_tributario)
        return {
            "status": "preparacao",
            "regime_integrado": perfil.get("codigo"),
            "modelo_apuracao": perfil.get("modelo_apuracao"),
            "cronograma": [
                {"ano": "2026", "evento": "testes de CBS e IBS nos documentos fiscais"},
                {"ano": "2027-2032", "evento": "transicao gradual entre tributos atuais e novo modelo"},
                {"ano": "2033", "evento": "modelo completo com CBS e IBS"},
            ],
            "novos_campos": ["cbs", "ibs", "credito_financeiro", "ambiente_nacional"],
            "acao_erp": f"manter cálculo do regime {perfil.get('nome')} e salvar estrutura pronta para CBS/IBS em dados_impostos.",
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
