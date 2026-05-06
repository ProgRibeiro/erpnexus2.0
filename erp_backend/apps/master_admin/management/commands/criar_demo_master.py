from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.master_admin.models import (
    PlanoCatalogo, ClienteSaaS, AssinaturaSaaS, PagamentoMensalidade
)


class Command(BaseCommand):
    help = "Cria dados de demonstração para o Master Admin (seguro de rodar múltiplas vezes)"

    def handle(self, *args, **options):
        hoje = timezone.localdate()

        # ── Planos ────────────────────────────────────────────────────────────
        plano_basico, _ = PlanoCatalogo.objects.get_or_create(
            nome="ERP Básico",
            sistema="erp",
            defaults={
                "descricao": "Plano de entrada para pequenas empresas",
                "valor_mensal": 2000,
                "limite_usuarios": 5,
                "limite_registros": 500,
                "recursos": ["financeiro", "clientes", "ordens"],
                "ativo": True,
            },
        )

        plano_pro, _ = PlanoCatalogo.objects.get_or_create(
            nome="ERP Profissional",
            sistema="erp",
            defaults={
                "descricao": "Plano completo para médias empresas",
                "valor_mensal": 8000,
                "limite_usuarios": 25,
                "limite_registros": 5000,
                "recursos": ["financeiro", "clientes", "ordens", "crm", "estoque", "relatorios"],
                "destaque": True,
                "ativo": True,
            },
        )

        plano_facilities, _ = PlanoCatalogo.objects.get_or_create(
            nome="Facilities Enterprise",
            sistema="facilities",
            defaults={
                "descricao": "Plano enterprise para gestão de facilities",
                "valor_mensal": 25000,
                "limite_usuarios": 100,
                "limite_registros": 50000,
                "recursos": ["financeiro", "clientes", "ordens", "crm", "estoque", "relatorios", "portal", "bi"],
                "destaque": True,
                "ativo": True,
            },
        )

        self.stdout.write(self.style.SUCCESS("✔ Planos criados"))

        # ── Clientes ──────────────────────────────────────────────────────────

        # 1. Hering Brasil — ativo, ERP Profissional, 6 meses pagos
        hering, _ = ClienteSaaS.objects.get_or_create(
            login_admin="admin@hering.com.br",
            defaults={
                "nome_empresa": "Hering Brasil S.A.",
                "razao_social": "CIA HERING S.A.",
                "cnpj": "78.977.938/0001-34",
                "nome_responsavel": "Fabio Hering",
                "email_responsavel": "fabio.hering@hering.com.br",
                "telefone": "(47) 3331-1100",
                "status": "ativo",
            },
        )
        ass_hering, _ = AssinaturaSaaS.objects.get_or_create(
            cliente=hering,
            plano=plano_pro,
            defaults={
                "status": "ativo",
                "data_inicio": hoje - timedelta(days=180),
                "valor_negociado": 8000,
                "desconto_percentual": 0,
            },
        )
        for i in range(6, 0, -1):
            ref_date = (hoje.replace(day=1) - timedelta(days=(i - 1) * 28)).replace(day=1)
            ref_str = ref_date.strftime("%Y-%m")
            venc = ref_date.replace(day=10)
            pgto_date = ref_date.replace(day=8)
            PagamentoMensalidade.objects.get_or_create(
                assinatura=ass_hering,
                referencia=ref_str,
                defaults={
                    "valor_cobrado": 8000,
                    "status": "pago",
                    "data_vencimento": venc,
                    "data_pagamento": pgto_date,
                    "forma_pagamento": "pix",
                },
            )

        # 2. Grupo Soma Varejo — ativo, Facilities Enterprise, 4 meses pagos
        soma, _ = ClienteSaaS.objects.get_or_create(
            login_admin="admin@gruposoma.com.br",
            defaults={
                "nome_empresa": "Grupo Soma Varejo",
                "razao_social": "GRUPO SOMA S/A",
                "cnpj": "29.820.575/0001-02",
                "nome_responsavel": "Eduardo Silveira",
                "email_responsavel": "eduardo@gruposoma.com.br",
                "telefone": "(11) 3030-2200",
                "status": "ativo",
            },
        )
        ass_soma, _ = AssinaturaSaaS.objects.get_or_create(
            cliente=soma,
            plano=plano_facilities,
            defaults={
                "status": "ativo",
                "data_inicio": hoje - timedelta(days=120),
                "valor_negociado": 25000,
                "desconto_percentual": 0,
            },
        )
        for i in range(4, 0, -1):
            ref_date = (hoje.replace(day=1) - timedelta(days=(i - 1) * 28)).replace(day=1)
            ref_str = ref_date.strftime("%Y-%m")
            venc = ref_date.replace(day=15)
            pgto_date = ref_date.replace(day=13)
            PagamentoMensalidade.objects.get_or_create(
                assinatura=ass_soma,
                referencia=ref_str,
                defaults={
                    "valor_cobrado": 25000,
                    "status": "pago",
                    "data_vencimento": venc,
                    "data_pagamento": pgto_date,
                    "forma_pagamento": "transferencia",
                },
            )

        # 3. TechCo Soluções — trial, ERP Básico, 1 pendente
        techco, _ = ClienteSaaS.objects.get_or_create(
            login_admin="admin@techco.com.br",
            defaults={
                "nome_empresa": "TechCo Soluções LTDA",
                "razao_social": "TECHCO SOLUCOES LTDA",
                "cnpj": "12.345.678/0001-90",
                "nome_responsavel": "Ricardo Costa",
                "email_responsavel": "ricardo@techco.com.br",
                "telefone": "(21) 9999-0001",
                "status": "trial",
            },
        )
        ass_techco, _ = AssinaturaSaaS.objects.get_or_create(
            cliente=techco,
            plano=plano_basico,
            defaults={
                "status": "trial",
                "data_inicio": hoje - timedelta(days=15),
                "valor_negociado": 2000,
                "desconto_percentual": 0,
            },
        )
        ref_techco = hoje.strftime("%Y-%m")
        PagamentoMensalidade.objects.get_or_create(
            assinatura=ass_techco,
            referencia=ref_techco,
            defaults={
                "valor_cobrado": 2000,
                "status": "pendente",
                "data_vencimento": hoje + timedelta(days=10),
            },
        )

        # 4. Mercado Bom Preço — ativo, ERP Profissional, 3 pagos + 1 vencido
        mercado, _ = ClienteSaaS.objects.get_or_create(
            login_admin="admin@mercadobompreco.com.br",
            defaults={
                "nome_empresa": "Mercado Bom Preço",
                "razao_social": "BOM PRECO COMERCIO LTDA",
                "cnpj": "55.123.456/0001-77",
                "nome_responsavel": "Claudia Ferreira",
                "email_responsavel": "claudia@mercadobompreco.com.br",
                "telefone": "(31) 3344-5566",
                "status": "ativo",
            },
        )
        ass_mercado, _ = AssinaturaSaaS.objects.get_or_create(
            cliente=mercado,
            plano=plano_pro,
            defaults={
                "status": "ativo",
                "data_inicio": hoje - timedelta(days=120),
                "valor_negociado": 8000,
                "desconto_percentual": 10,
                "motivo_desconto": "Desconto de fidelidade 10%",
            },
        )
        for i in range(3, 0, -1):
            ref_date = (hoje.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
            ref_str = ref_date.strftime("%Y-%m")
            venc = ref_date.replace(day=10)
            pgto_date = ref_date.replace(day=9)
            PagamentoMensalidade.objects.get_or_create(
                assinatura=ass_mercado,
                referencia=ref_str,
                defaults={
                    "valor_cobrado": 7200,
                    "status": "pago",
                    "data_vencimento": venc,
                    "data_pagamento": pgto_date,
                    "forma_pagamento": "boleto",
                },
            )
        ref_vencido = hoje.replace(day=1).strftime("%Y-%m")
        PagamentoMensalidade.objects.get_or_create(
            assinatura=ass_mercado,
            referencia=ref_vencido,
            defaults={
                "valor_cobrado": 7200,
                "status": "vencido",
                "data_vencimento": hoje - timedelta(days=15),
            },
        )

        # 5. Construtora Vega — suspenso, ERP Básico, 2 vencidos
        vega, _ = ClienteSaaS.objects.get_or_create(
            login_admin="admin@construtoravega.com.br",
            defaults={
                "nome_empresa": "Construtora Vega",
                "razao_social": "VEGA CONSTRUCOES LTDA",
                "cnpj": "98.765.432/0001-11",
                "nome_responsavel": "Paulo Vega",
                "email_responsavel": "paulo@construtoravega.com.br",
                "telefone": "(41) 3321-0099",
                "status": "suspenso",
            },
        )
        ass_vega, _ = AssinaturaSaaS.objects.get_or_create(
            cliente=vega,
            plano=plano_basico,
            defaults={
                "status": "suspenso",
                "data_inicio": hoje - timedelta(days=90),
                "valor_negociado": 2000,
                "desconto_percentual": 0,
            },
        )
        for i in range(2, 0, -1):
            ref_date = (hoje.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
            ref_str = ref_date.strftime("%Y-%m")
            venc = ref_date.replace(day=5)
            PagamentoMensalidade.objects.get_or_create(
                assinatura=ass_vega,
                referencia=ref_str,
                defaults={
                    "valor_cobrado": 2000,
                    "status": "vencido",
                    "data_vencimento": venc,
                },
            )

        self.stdout.write(self.style.SUCCESS("✔ Clientes criados"))
        self.stdout.write(self.style.SUCCESS("✔ Assinaturas criadas"))
        self.stdout.write(self.style.SUCCESS("✔ Pagamentos criados"))
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(self.style.SUCCESS("Demo Master Admin criado com sucesso!"))
        self.stdout.write(self.style.SUCCESS(f"  Planos: 3"))
        self.stdout.write(self.style.SUCCESS(f"  Clientes: 5"))
        self.stdout.write(self.style.SUCCESS("=" * 50))
