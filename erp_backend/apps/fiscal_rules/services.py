from __future__ import annotations

from datetime import date

from django.db.models import Q

from .models import TabelaTributaria


class RepositorioRegrasFiscais:
    """Consulta regras fiscais por vigência, sem espalhar filtros pelo sistema."""

    def buscar_regra(
        self,
        *,
        codigo_tributo: str,
        data_operacao: date,
        ncm_ou_servico: str = "GERAL",
        uf_municipio: str = "",
        regime_tributario: str = "",
    ) -> TabelaTributaria | None:
        filtros = TabelaTributaria.objects.filter(
            ativo=True,
            codigo_tributo=codigo_tributo,
            vigencia_inicio__lte=data_operacao,
        ).filter(Q(vigencia_fim__isnull=True) | Q(vigencia_fim__gte=data_operacao))

        candidatos = [
            {
                "ncm_ou_servico": ncm_ou_servico,
                "uf_municipio": uf_municipio,
                "regime_tributario": regime_tributario,
            },
            {
                "ncm_ou_servico": ncm_ou_servico,
                "uf_municipio": "",
                "regime_tributario": regime_tributario,
            },
            {
                "ncm_ou_servico": "GERAL",
                "uf_municipio": uf_municipio,
                "regime_tributario": regime_tributario,
            },
            {
                "ncm_ou_servico": "GERAL",
                "uf_municipio": "",
                "regime_tributario": regime_tributario,
            },
            {
                "ncm_ou_servico": "GERAL",
                "uf_municipio": "",
                "regime_tributario": "",
            },
        ]

        for candidato in candidatos:
            regra = filtros.filter(**candidato).order_by("-vigencia_inicio", "-id").first()
            if regra:
                return regra
        return None
