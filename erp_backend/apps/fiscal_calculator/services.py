from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from apps.fiscal_rules.models import CodigoTributo, RegimeTributario
from apps.fiscal_rules.services import RepositorioRegrasFiscais


DATA_TESTE_REGIME_NORMAL = date(2026, 1, 1)
DATA_OBRIGATORIEDADE_PRODUCAO_REGIME_NORMAL = date(2026, 8, 3)
DATA_OBRIGATORIEDADE_SIMPLES_MEI = date(2027, 1, 4)
DATA_COBRANCA_EFETIVA_CBS = date(2027, 1, 1)


@dataclass(frozen=True)
class OperacaoInput:
    valor_servicos: Decimal = Decimal("0")
    valor_materiais: Decimal = Decimal("0")
    data_emissao: date = field(default_factory=timezone.localdate)
    regime_emitente: str = RegimeTributario.SIMPLES_NACIONAL
    regime_destinatario: str = ""
    ncm_ou_servico: str = "GERAL"
    uf_origem: str = ""
    uf_destino: str = ""
    municipio_execucao: str = ""
    codigo_municipio: str = ""
    cclasstrib: str = ""

    @property
    def base_total(self) -> Decimal:
        return Decimal(self.valor_servicos or 0) + Decimal(self.valor_materiais or 0)


def normalizar_regime(regime: str) -> str:
    mapa = {
        "simples": RegimeTributario.SIMPLES_NACIONAL,
        "simples_nacional": RegimeTributario.SIMPLES_NACIONAL,
        "SN": RegimeTributario.SIMPLES_NACIONAL,
        "mei": RegimeTributario.MEI,
        "MEI": RegimeTributario.MEI,
        "lucro_presumido": RegimeTributario.LUCRO_PRESUMIDO,
        "LP": RegimeTributario.LUCRO_PRESUMIDO,
        "lucro_real": RegimeTributario.LUCRO_REAL,
        "LR": RegimeTributario.LUCRO_REAL,
    }
    return mapa.get(str(regime or "").strip(), regime)


def deve_destacar_ibs_cbs(regime: str, data_emissao: date) -> bool:
    regime = normalizar_regime(regime)
    if regime in (RegimeTributario.SIMPLES_NACIONAL, RegimeTributario.MEI):
        return data_emissao >= DATA_OBRIGATORIEDADE_SIMPLES_MEI
    return data_emissao >= DATA_TESTE_REGIME_NORMAL


def obrigatorio_em_producao_ibs_cbs(regime: str, data_emissao: date) -> bool:
    regime = normalizar_regime(regime)
    if regime in (RegimeTributario.SIMPLES_NACIONAL, RegimeTributario.MEI):
        return data_emissao >= DATA_OBRIGATORIEDADE_SIMPLES_MEI
    return data_emissao >= DATA_OBRIGATORIEDADE_PRODUCAO_REGIME_NORMAL


def carater_informativo_ibs_cbs(regime: str, data_emissao: date) -> bool:
    regime = normalizar_regime(regime)
    if regime in (RegimeTributario.SIMPLES_NACIONAL, RegimeTributario.MEI):
        return data_emissao < DATA_OBRIGATORIEDADE_SIMPLES_MEI
    return data_emissao < DATA_COBRANCA_EFETIVA_CBS


class CalculadoraTributariaReforma:
    """Calculadora fiscal por camadas: regras versionadas + transição IBS/CBS."""

    VERSAO = "reforma-tributaria-2026.1"

    def __init__(self, repositorio: RepositorioRegrasFiscais | None = None):
        self.repositorio = repositorio or RepositorioRegrasFiscais()

    def calcular_tributos(self, operacao: OperacaoInput) -> dict:
        tabelas_aplicadas = []
        tributos = {}

        for codigo in (CodigoTributo.ICMS, CodigoTributo.ISS, CodigoTributo.PIS, CodigoTributo.COFINS):
            item, regra = self._calcular_por_regra(codigo, operacao)
            tributos[codigo] = item
            if regra:
                tabelas_aplicadas.append(regra)

        destacar_reforma = deve_destacar_ibs_cbs(operacao.regime_emitente, operacao.data_emissao)
        if destacar_reforma:
            for codigo in (CodigoTributo.CBS, CodigoTributo.IBS, CodigoTributo.IS):
                item, regra = self._calcular_por_regra(codigo, operacao)
                tributos[codigo] = item
                if regra:
                    tabelas_aplicadas.append(regra)
        else:
            for codigo in (CodigoTributo.CBS, CodigoTributo.IBS, CodigoTributo.IS):
                tributos[codigo] = self._tributo_vazio(codigo, "Não destacado pela data/regime da operação.")

        total = self._round(sum(Decimal(str(item["valor"])) for item in tributos.values()))
        return {
            "versao_motor": self.VERSAO,
            "data_emissao": operacao.data_emissao.isoformat(),
            "regime_emitente": normalizar_regime(operacao.regime_emitente),
            "base_calculo": self._money(operacao.base_total),
            "total_tributos": self._money(total),
            "total_operacao_com_tributos": self._money(operacao.base_total + total),
            "ibs_cbs": {
                "destacar": destacar_reforma,
                "obrigatorio_em_producao": obrigatorio_em_producao_ibs_cbs(operacao.regime_emitente, operacao.data_emissao),
                "carater_informativo": carater_informativo_ibs_cbs(operacao.regime_emitente, operacao.data_emissao),
            },
            "tributos": tributos,
            "tabelas_aplicadas_ids": [regra.id for regra in tabelas_aplicadas if regra.id],
        }

    def _calcular_por_regra(self, codigo: str, operacao: OperacaoInput) -> tuple[dict, object | None]:
        regra = self.repositorio.buscar_regra(
            codigo_tributo=codigo,
            data_operacao=operacao.data_emissao,
            ncm_ou_servico=operacao.ncm_ou_servico or "GERAL",
            uf_municipio=operacao.codigo_municipio or operacao.uf_destino or "",
            regime_tributario=normalizar_regime(operacao.regime_emitente),
        )
        if not regra:
            return self._tributo_vazio(codigo, "Sem regra vigente cadastrada."), None

        base = operacao.base_total
        if codigo == CodigoTributo.ISS:
            base = Decimal(operacao.valor_servicos or 0)
        if codigo == CodigoTributo.ICMS:
            base = Decimal(operacao.valor_materiais or 0)

        reducao = Decimal(regra.reducao_base or 0)
        base_reduzida = base * (Decimal("1") - (reducao / Decimal("100")))
        valor = self._round((base_reduzida * Decimal(regra.aliquota or 0)) / Decimal("100"))

        return {
            "codigo": self._codigo(codigo),
            "base": self._money(base_reduzida),
            "aliquota": str(regra.aliquota),
            "valor": self._money(valor),
            "cclasstrib": regra.cclasstrib,
            "fonte_normativa": regra.fonte_normativa,
            "regra_id": regra.id,
        }, regra

    def _tributo_vazio(self, codigo: str, observacao: str) -> dict:
        return {
            "codigo": self._codigo(codigo),
            "base": "0.00",
            "aliquota": "0.0000",
            "valor": "0.00",
            "observacao": observacao,
        }

    def _round(self, valor: Decimal) -> Decimal:
        return Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _money(self, valor: Decimal) -> str:
        return str(self._round(Decimal(valor or 0)))

    def _codigo(self, codigo: str) -> str:
        return getattr(codigo, "value", str(codigo))
