from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.clientes.models import Cliente

from .models import ContratoPreventiva, EscopoTecnico, EscopoUnidade, UnidadeContrato
from .services import GeradorCronograma, GeradorFatura


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
