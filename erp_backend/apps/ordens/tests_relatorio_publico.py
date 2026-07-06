from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clientes.models import Cliente, EnderecoCliente

from .models import OrdemServico


class RelatorioPublicoTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cliente = Cliente.objects.create(
            nome="Cliente Relatorio",
            cnpj_cpf="12345678000100",
            email="cliente@teste.com",
            telefone="11999999999",
        )
        self.endereco = EnderecoCliente.objects.create(
            cliente=self.cliente,
            tipo="comercial",
            logradouro="Rua Teste",
            numero="123",
            cidade="Sao Paulo",
            estado="SP",
            cep="01310100",
        )
        self.ordem = OrdemServico.objects.create(
            cliente=self.cliente,
            endereco_servico=self.endereco,
            descricao_servico="Manutencao preventiva concluida.",
            observacoes_tecnicas="Equipamento operando normalmente.",
            valor_total_orcado="1500.00",
            valor_final_faturado="1400.00",
            status_pagamento=OrdemServico.StatusPagamento.PAGO,
        )

    def test_relatorio_publico_nao_expoe_campos_financeiros(self):
        url = reverse("publico-relatorio", kwargs={"token": self.ordem.token_relatorio})

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["cliente_nome"], self.cliente.nome)
        self.assertIn("endereco_servico_texto", response.data)
        self.assertNotIn("cliente", response.data)
        self.assertNotIn("tecnico_responsavel", response.data)
        self.assertNotIn("valor_total_orcado", response.data)
        self.assertNotIn("valor_final_faturado", response.data)
        self.assertNotIn("status_pagamento", response.data)
        self.assertNotIn("condicao_pagamento", response.data)
