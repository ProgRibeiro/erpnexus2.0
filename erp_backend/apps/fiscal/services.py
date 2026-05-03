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

