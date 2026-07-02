from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.fiscal_rules.models import CodigoTributo, RegimeTributario, TabelaTributaria


class Command(BaseCommand):
    help = "Cria regras fiscais iniciais versionadas para teste da Reforma Tributária 2026."

    def handle(self, *args, **options):
        regras = [
            {
                "codigo_tributo": CodigoTributo.CBS,
                "aliquota": Decimal("0.9000"),
                "fonte_normativa": "Reforma Tributária 2026 - alíquota teste CBS",
                "vigencia_inicio": "2026-01-01",
                "regime_tributario": RegimeTributario.LUCRO_PRESUMIDO,
            },
            {
                "codigo_tributo": CodigoTributo.IBS,
                "aliquota": Decimal("0.1000"),
                "fonte_normativa": "Reforma Tributária 2026 - alíquota teste IBS",
                "vigencia_inicio": "2026-01-01",
                "regime_tributario": RegimeTributario.LUCRO_PRESUMIDO,
            },
            {
                "codigo_tributo": CodigoTributo.CBS,
                "aliquota": Decimal("0.9000"),
                "fonte_normativa": "Reforma Tributária 2027 - destaque Simples/MEI",
                "vigencia_inicio": "2027-01-04",
                "regime_tributario": RegimeTributario.SIMPLES_NACIONAL,
            },
            {
                "codigo_tributo": CodigoTributo.IBS,
                "aliquota": Decimal("0.1000"),
                "fonte_normativa": "Reforma Tributária 2027 - destaque Simples/MEI",
                "vigencia_inicio": "2027-01-04",
                "regime_tributario": RegimeTributario.SIMPLES_NACIONAL,
            },
            {
                "codigo_tributo": CodigoTributo.CBS,
                "aliquota": Decimal("0.9000"),
                "fonte_normativa": "Reforma Tributária 2027 - destaque Simples/MEI",
                "vigencia_inicio": "2027-01-04",
                "regime_tributario": RegimeTributario.MEI,
            },
            {
                "codigo_tributo": CodigoTributo.IBS,
                "aliquota": Decimal("0.1000"),
                "fonte_normativa": "Reforma Tributária 2027 - destaque Simples/MEI",
                "vigencia_inicio": "2027-01-04",
                "regime_tributario": RegimeTributario.MEI,
            },
            {
                "codigo_tributo": CodigoTributo.ISS,
                "aliquota": Decimal("5.0000"),
                "fonte_normativa": "Regra operacional padrão ERP Nexus - revisar por município",
                "vigencia_inicio": "2026-01-01",
                "regime_tributario": "",
            },
            {
                "codigo_tributo": CodigoTributo.ICMS,
                "aliquota": Decimal("0.0000"),
                "fonte_normativa": "Regra operacional padrão ERP Nexus - materiais sem ICMS destacado por padrão",
                "vigencia_inicio": "2026-01-01",
                "regime_tributario": "",
            },
        ]

        criadas = 0
        for regra in regras:
            _, created = TabelaTributaria.objects.get_or_create(
                codigo_tributo=regra["codigo_tributo"],
                ncm_ou_servico="GERAL",
                uf_municipio="",
                regime_tributario=regra["regime_tributario"],
                vigencia_inicio=regra["vigencia_inicio"],
                defaults={
                    "aliquota": regra["aliquota"],
                    "fonte_normativa": regra["fonte_normativa"],
                    "ativo": True,
                },
            )
            criadas += int(created)

        self.stdout.write(self.style.SUCCESS(f"Regras iniciais verificadas. Criadas: {criadas}"))
