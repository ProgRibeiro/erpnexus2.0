from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.clientes.models import Cliente

from .models import ContratoPreventiva, EscopoTecnico, EscopoUnidade, UnidadeContrato
from .services import GeradorCronograma, GeradorFatura
from .views import ContratoPreventivaViewSet


class ContratosPreventivaTest(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email="teste@erp.com", password="123456")
        self.cliente = Cliente.objects.create(nome="Cliente Contrato", email="cliente@erp.com")
        self.escopo = EscopoTecnico.objects.create(nome="Ar Condicionado", codigo="HVAC", ordem=1)

    def test_gera_cronograma_e_fatura(self):
        contrato = ContratoPreventiva.objects.create(
            cliente=self.cliente,
            titulo="Contrato Preventiva",
            objeto_contrato="Manutenção preventiva mensal",
            vigencia_meses=12,
            data_inicio=date(2026, 1, 1),
            criado_por=self.user,
            responsavel_tecnico=self.user,
        )
        unidade = UnidadeContrato.objects.create(
            contrato=contrato,
            nome_unidade="Loja Teste",
            endereco_completo="Rua A, 100",
            cidade="São Paulo",
            estado="SP",
            valor_mensal=1000,
        )
        EscopoUnidade.objects.create(
            unidade_contrato=unidade,
            escopo=self.escopo,
            periodicidade="trimestral",
            valor_alocado=250,
        )

        contrato.status = ContratoPreventiva.Status.ATIVO
        contrato.save()
        geradas = GeradorCronograma().gerar_para_contrato(contrato, criar_os_principal=False)
        self.assertEqual(len(geradas), 4)

        fatura = GeradorFatura().gerar_fatura_mensal(contrato, 1, 2026)
        self.assertEqual(fatura.valor_base, contrato.valor_total_mensal)
        self.assertEqual(fatura.status, "a_emitir")

    def _payload_com_unidades(self, unidades):
        return {
            "contrato": {
                "cliente": self.cliente.id,
                "titulo": "Contrato Preventiva Multiunidade",
                "objeto_contrato": "Manutenção preventiva mensal em múltiplas unidades",
                "vigencia_meses": 12,
                "data_inicio": "2026-01-01",
                "tipo_faturamento": "mensal_fixo",
                "dia_vencimento_fatura": 10,
                "forma_pagamento": "boleto",
            },
            "unidades": [
                {
                    "nome_unidade": nome,
                    "endereco_completo": endereco,
                    "cidade": "São Paulo",
                    "estado": "SP",
                    "valor_mensal": valor,
                    "escopos": [
                        {
                            "escopo": self.escopo.id,
                            "periodicidade": "mensal",
                            "equipamentos_quantidade": 1,
                            "valor_alocado": valor,
                        }
                    ],
                }
                for nome, endereco, valor in unidades
            ],
        }

    def test_criar_completo_salva_multiplas_unidades_e_calcula_totais(self):
        factory = APIRequestFactory()
        payload = self._payload_com_unidades([
            ("Loja Centro", "Rua A, 100", 1000),
            ("Loja Norte", "Rua B, 200", 1500),
            ("Loja Sul", "Rua C, 300", 500),
        ])
        request = factory.post("/contratos/criar-completo/", payload, format="json")
        force_authenticate(request, user=self.user)

        response = ContratoPreventivaViewSet.as_view({"post": "criar_completo"})(request)

        self.assertEqual(response.status_code, 201)
        contrato = ContratoPreventiva.objects.get(pk=response.data["id"])
        self.assertEqual(contrato.unidades.count(), 3)
        self.assertEqual(contrato.valor_total_mensal, Decimal("3000.00"))
        self.assertEqual(contrato.valor_total_contrato, Decimal("36000.00"))

    def test_salvar_completo_atualiza_rascunho_com_multiplas_unidades_e_gera_pdf(self):
        contrato = ContratoPreventiva.objects.create(
            cliente=self.cliente,
            titulo="Rascunho inicial",
            objeto_contrato="Manutenção preventiva",
            vigencia_meses=12,
            data_inicio=date(2026, 1, 1),
            criado_por=self.user,
        )
        UnidadeContrato.objects.create(
            contrato=contrato,
            nome_unidade="Loja Antiga",
            endereco_completo="Rua Antiga, 1",
            cidade="São Paulo",
            estado="SP",
            valor_mensal=100,
        )

        factory = APIRequestFactory()
        payload = self._payload_com_unidades([
            ("Loja Centro", "Rua A, 100", 1000),
            ("Loja Norte", "Rua B, 200", 1500),
        ])
        payload["gerar_pdf"] = True
        request = factory.post(f"/contratos/{contrato.id}/salvar-completo/", payload, format="json")
        force_authenticate(request, user=self.user)

        with patch("apps.contratos.views.GeradorPDFContrato.gerar") as gerar_pdf:
            response = ContratoPreventivaViewSet.as_view({"post": "salvar_completo"})(request, pk=contrato.id)

        self.assertEqual(response.status_code, 200)
        contrato.refresh_from_db()
        self.assertEqual(contrato.unidades.count(), 2)
        self.assertFalse(contrato.unidades.filter(nome_unidade="Loja Antiga").exists())
        self.assertEqual(contrato.valor_total_mensal, Decimal("2500.00"))
        self.assertEqual(contrato.valor_total_contrato, Decimal("30000.00"))
        gerar_pdf.assert_called_once()
