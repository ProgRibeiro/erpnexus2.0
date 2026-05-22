from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from uuid import uuid4
from .models import Tenant, Empresa, Unidade
from .models_licitacao import Licitacao, PropostaLicitacao

Usuario = get_user_model()

class PropostaLicitacaoTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(nome="Tenant Teste", tipo="contratante")
        self.empresa = Empresa.objects.create(tenant=self.tenant, nome="Empresa Teste")
        self.unidade = Unidade.objects.create(empresa=self.empresa, nome="Unidade Teste", codigo_interno="UNT-001")
        self.user = Usuario.objects.create_user(email="test@example.com", password="password", tenant=self.tenant)
        self.client.force_authenticate(user=self.user)
        
        self.licitacao = Licitacao.objects.create(
            tenant_contratante=self.tenant,
            unidade=self.unidade,
            titulo="Licitação Teste",
            descricao="Descrição Teste",
            tipo_servico="Manutenção",
            valor_maximo=Decimal("1000.00"),
            prazo_execucao_max_dias=30,
            data_encerramento=timezone.now() + timezone.timedelta(days=1),
            status='publicada'
        )

    def test_enviar_proposta_sucesso(self):
        data = {
            "valor_total": "500.00",
            "prazo_execucao": 15,
            "condicao": "30 dias",
            "validade": "2025-12-31",
            "observacoes": "Observação teste",
            "itens": [
                {
                    "descricao": "Item 1",
                    "quantidade": 1,
                    "unidade": "un",
                    "valor_unitario": 500.00,
                    "valor_total": 500.00,
                    "ordem": 0
                }
            ]
        }
        idempotency_key = str(uuid4())
        response = self.client.post(
            f"/api/v1/saas/licitacoes/{self.licitacao.id}/proposta/",
            data,
            format='json',
            HTTP_X_IDEMPOTENCY_KEY=idempotency_key
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PropostaLicitacao.objects.count(), 1)
        
    def test_enviar_proposta_duplicada(self):
        # ... Implement duplicate test if needed ...
        pass
