from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum

from apps.financeiro.models import Lancamento

from .models import ConciliacaoPGDAS


class ConciliadorPGDAS:
    def gerar_conciliacao(self, *, ano: int, mes: int, receita_declarada: Decimal = Decimal("0")) -> ConciliacaoPGDAS:
        competencia = date(ano, mes, 1)
        receita_faturada = self._receita_mes(ano, mes)
        rbt12 = self._rbt12(ano, mes)
        iss_retido = self._iss_retido_mes(ano, mes)
        divergencia = self._round(receita_faturada - Decimal(receita_declarada or 0))

        conciliacao, _ = ConciliacaoPGDAS.objects.update_or_create(
            competencia=competencia,
            defaults={
                "receita_faturada": receita_faturada,
                "receita_declarada": Decimal(receita_declarada or 0),
                "rbt12_estimado": rbt12,
                "iss_retido_fonte": iss_retido,
                "divergencia": divergencia,
                "itens_auditoria": self._itens_auditoria(ano, mes),
            },
        )
        return conciliacao

    def _receita_mes(self, ano: int, mes: int) -> Decimal:
        total = Lancamento.objects.filter(
            tipo=Lancamento.Tipo.RECEITA,
            data_competencia__year=ano,
            data_competencia__month=mes,
        ).exclude(status=Lancamento.Status.CANCELADO).aggregate(total=Sum("valor"))["total"]
        return self._round(total or Decimal("0"))

    def _rbt12(self, ano: int, mes: int) -> Decimal:
        inicio_mes = date(ano, mes, 1)
        meses = []
        cursor_ano = inicio_mes.year
        cursor_mes = inicio_mes.month
        for _ in range(12):
            cursor_mes -= 1
            if cursor_mes == 0:
                cursor_mes = 12
                cursor_ano -= 1
            meses.append((cursor_ano, cursor_mes))
        total = sum(self._receita_mes(a, m) for a, m in meses)
        return self._round(total)

    def _iss_retido_mes(self, ano: int, mes: int) -> Decimal:
        lancamentos = Lancamento.objects.filter(
            tipo=Lancamento.Tipo.RECEITA,
            data_competencia__year=ano,
            data_competencia__month=mes,
            os__retencao_issqn=True,
        ).exclude(status=Lancamento.Status.CANCELADO).select_related("os")
        total = sum(Decimal(item.os.valor_retido_issqn or 0) for item in lancamentos if item.os_id)
        return self._round(total)

    def _itens_auditoria(self, ano: int, mes: int) -> list[dict]:
        lancamentos = Lancamento.objects.filter(
            tipo=Lancamento.Tipo.RECEITA,
            data_competencia__year=ano,
            data_competencia__month=mes,
        ).exclude(status=Lancamento.Status.CANCELADO).select_related("os")
        return [
            {
                "lancamento_id": item.id,
                "descricao": item.descricao,
                "valor": str(self._round(item.valor)),
                "os_id": item.os_id,
                "numero_documento": item.numero_documento,
                "iss_retido": bool(item.os.retencao_issqn) if item.os_id else False,
            }
            for item in lancamentos
        ]

    def _round(self, valor: Decimal) -> Decimal:
        return Decimal(valor or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
