"""
Testes para Financeiro - Integração com Ordens de Serviço.

Testa todos os signals e tarefas Celery da integração OS ↔ Financeiro.
"""

from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.clientes.models import Cliente
from apps.ordens.models import OrdemServico, DespesaOS

from .models import Lancamento, ContaBancaria, CategoriaFinanceira
from .tasks import atualizar_lancamentos_vencidos, recalcular_saldo_conta

User = get_user_model()


class FinanceiroSignalTests(TestCase):
    """Testes para os signals da integração OS → Financeiro."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Criar usuário
        self.usuario = User.objects.create_user(
            username="teste@test.com",
            password="senha123"
        )

        # Criar cliente
        self.cliente = Cliente.objects.create(
            nome="Cliente Teste",
            cnpj="12.345.678/0001-00",
            email="cliente@test.com",
        )

        # Criar conta bancária padrão
        self.conta = ContaBancaria.objects.create(
            nome="Caixa principal",
            banco="Caixa interno",
            tipo=ContaBancaria.Tipo.CAIXA,
            saldo_inicial=Decimal("1000.00"),
            ativo=True,
        )

        # Criar categorias
        self.categoria_receita = CategoriaFinanceira.objects.create(
            nome="Receita de servicos",
            tipo=CategoriaFinanceira.Tipo.RECEITA,
            cor="#1677ff",
        )

        self.categoria_despesa = CategoriaFinanceira.objects.create(
            nome="Despesas de OS",
            tipo=CategoriaFinanceira.Tipo.DESPESA,
            cor="#cf1322",
        )

        # Criar OS
        self.os = OrdemServico.objects.create(
            cliente=self.cliente,
            status=OrdemServico.Status.ABERTA,
            tipo_servico=OrdemServico.TipoServico.MANUTENCAO,
            prioridade=OrdemServico.Prioridade.MEDIA,
            valor_total_orcado=Decimal("5000.00"),
            valor_final_faturado=Decimal("5000.00"),
            data_vencimento=timezone.localdate(),
            criado_por=self.usuario,
        )

    def test_sinal_faturamento_cria_lancamento_receita(self):
        """
        Test: Quando OS muda para "faturado" → cria Lancamento receita automático.
        """
        # Verificar que não há lançamentos inicialmente
        self.assertEqual(Lancamento.objects.filter(os=self.os).count(), 0)

        # Mudar OS para faturada
        self.os.status = OrdemServico.Status.FATURADA
        self.os.numero_nf = "NF-001"
        self.os.data_emissao_nf = timezone.localdate()
        self.os.save()

        # Verificar que lançamento foi criado
        lancamentos = Lancamento.objects.filter(os=self.os, tipo=Lancamento.Tipo.RECEITA)
        self.assertEqual(lancamentos.count(), 1)

        lancamento = lancamentos.first()
        self.assertEqual(lancamento.descricao, f"Faturamento {self.os.numero}")
        self.assertEqual(lancamento.valor, Decimal("5000.00"))
        self.assertEqual(lancamento.status, Lancamento.Status.PENDENTE)
        self.assertEqual(lancamento.tipo, Lancamento.Tipo.RECEITA)

    def test_sinal_os_cancelada_cancela_lancamentos(self):
        """
        Test: Quando OS é cancelada → cancela Lancamento vinculado.
        """
        # Criar lançamento receita
        self.os.status = OrdemServico.Status.FATURADA
        self.os.numero_nf = "NF-001"
        self.os.data_emissao_nf = timezone.localdate()
        self.os.save()

        lancamento = Lancamento.objects.filter(os=self.os).first()
        self.assertEqual(lancamento.status, Lancamento.Status.PENDENTE)

        # Cancelar OS
        self.os.status = OrdemServico.Status.CANCELADA
        self.os.save()

        # Verificar que lançamento foi cancelado
        lancamento.refresh_from_db()
        self.assertEqual(lancamento.status, Lancamento.Status.CANCELADO)

    def test_sinal_lancamento_pago_atualiza_os(self):
        """
        Test: Quando Lancamento status muda para "pago" → atualiza OS.status_pagamento
        """
        # Criar OS faturada
        self.os.status = OrdemServico.Status.FATURADA
        self.os.numero_nf = "NF-001"
        self.os.data_emissao_nf = timezone.localdate()
        self.os.save()

        # Verificar status inicial
        self.os.refresh_from_db()
        self.assertEqual(self.os.status_pagamento, OrdemServico.StatusPagamento.PENDENTE)

        # Marcar lançamento como pago
        lancamento = Lancamento.objects.filter(os=self.os).first()
        lancamento.status = Lancamento.Status.PAGO
        lancamento.data_pagamento = timezone.localdate()
        lancamento.save()

        # Verificar que OS foi atualizada
        self.os.refresh_from_db()
        self.assertEqual(self.os.status_pagamento, OrdemServico.StatusPagamento.PAGO)
        self.assertEqual(self.os.data_recebimento, timezone.localdate())

    def test_sinal_lancamento_atrasado_atualiza_os(self):
        """
        Test: Quando Lancamento status muda para "atrasado" → atualiza OS.status_pagamento
        """
        # Criar OS faturada
        self.os.status = OrdemServico.Status.FATURADA
        self.os.numero_nf = "NF-001"
        self.os.data_emissao_nf = timezone.localdate()
        self.os.save()

        # Marcar lançamento como atrasado
        lancamento = Lancamento.objects.filter(os=self.os).first()
        lancamento.status = Lancamento.Status.ATRASADO
        lancamento.save()

        # Verificar que OS foi atualizada
        self.os.refresh_from_db()
        self.assertEqual(self.os.status_pagamento, OrdemServico.StatusPagamento.VENCIDO)

    def test_sinal_despesa_os_cria_lancamento_despesa(self):
        """
        Test: Quando DespesaOS é lançada → cria Lancamento despesa automático.
        """
        # Criar despesa na OS
        despesa = DespesaOS.objects.create(
            os=self.os,
            descricao="Material de instalação",
            valor=Decimal("500.00"),
            tipo=DespesaOS.Tipo.MATERIAL,
            data_despesa=timezone.localdate(),
            registrado_por=self.usuario,
        )

        # Verificar que lançamento foi criado
        lancamentos = Lancamento.objects.filter(
            os=self.os,
            tipo=Lancamento.Tipo.DESPESA,
        )
        self.assertEqual(lancamentos.count(), 1)

        lancamento = lancamentos.first()
        self.assertEqual(lancamento.valor, Decimal("500.00"))
        self.assertEqual(lancamento.status, Lancamento.Status.PAGO)
        self.assertEqual(lancamento.data_pagamento, timezone.localdate())

    def test_sinal_lancamento_cancelado_atualiza_os(self):
        """
        Test: Quando Lancamento é cancelado → atualiza OS.status_pagamento para CANCELADO.
        """
        # Criar OS faturada
        self.os.status = OrdemServico.Status.FATURADA
        self.os.numero_nf = "NF-001"
        self.os.data_emissao_nf = timezone.localdate()
        self.os.save()

        # Cancelar lançamento
        lancamento = Lancamento.objects.filter(os=self.os).first()
        lancamento.status = Lancamento.Status.CANCELADO
        lancamento.save()

        # Verificar que OS foi atualizada
        self.os.refresh_from_db()
        self.assertEqual(self.os.status_pagamento, OrdemServico.StatusPagamento.CANCELADO)


class FinanceiroCeleryTests(TestCase):
    """Testes para as tarefas Celery da integração OS → Financeiro."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.usuario = User.objects.create_user(
            username="teste@test.com",
            password="senha123"
        )

        self.conta = ContaBancaria.objects.create(
            nome="Caixa Teste",
            banco="Banco Teste",
            tipo=ContaBancaria.Tipo.CORRENTE,
            saldo_inicial=Decimal("1000.00"),
            ativo=True,
        )

        self.categoria_receita = CategoriaFinanceira.objects.create(
            nome="Receita Teste",
            tipo=CategoriaFinanceira.Tipo.RECEITA,
            cor="#1677ff",
        )

        self.categoria_despesa = CategoriaFinanceira.objects.create(
            nome="Despesa Teste",
            tipo=CategoriaFinanceira.Tipo.DESPESA,
            cor="#cf1322",
        )

    def test_tarefa_recalcular_saldo_conta(self):
        """
        Test: recalcular_saldo_conta() calcula corretamente o saldo.
        """
        # Criar lançamentos
        hoje = timezone.localdate()

        # Receita paga
        Lancamento.objects.create(
            tipo=Lancamento.Tipo.RECEITA,
            descricao="Receita teste",
            valor=Decimal("500.00"),
            data_competencia=hoje,
            data_vencimento=hoje,
            data_pagamento=hoje,
            status=Lancamento.Status.PAGO,
            conta_bancaria=self.conta,
            categoria=self.categoria_receita,
            criado_por=self.usuario,
        )

        # Despesa paga
        Lancamento.objects.create(
            tipo=Lancamento.Tipo.DESPESA,
            descricao="Despesa teste",
            valor=Decimal("100.00"),
            data_competencia=hoje,
            data_vencimento=hoje,
            data_pagamento=hoje,
            status=Lancamento.Status.PAGO,
            conta_bancaria=self.conta,
            categoria=self.categoria_despesa,
            criado_por=self.usuario,
        )

        # Executar função
        resultado = recalcular_saldo_conta(self.conta.id)

        # Verificar cálculo: 1000 (inicial) + 500 (receita) - 100 (despesa) = 1400
        expected_saldo = Decimal("1400.00")
        self.assertEqual(Decimal(str(resultado["saldo_calculado"])), expected_saldo)
        self.assertEqual(resultado["receitas"], 500.00)
        self.assertEqual(resultado["despesas"], 100.00)

    def test_tarefa_atualizar_lancamentos_vencidos(self):
        """
        Test: atualizar_lancamentos_vencidos() marca pendentes vencidos como atrasados.
        """
        # Criar lançamentos vencidos
        ontem = timezone.localdate() - timezone.timedelta(days=1)

        lancamento_vencido = Lancamento.objects.create(
            tipo=Lancamento.Tipo.RECEITA,
            descricao="Lancamento vencido",
            valor=Decimal("1000.00"),
            data_competencia=ontem,
            data_vencimento=ontem,
            status=Lancamento.Status.PENDENTE,
            conta_bancaria=self.conta,
            categoria=self.categoria_receita,
            criado_por=self.usuario,
        )

        # Criar lançamento não vencido
        lancamento_futuro = Lancamento.objects.create(
            tipo=Lancamento.Tipo.RECEITA,
            descricao="Lancamento futuro",
            valor=Decimal("1000.00"),
            data_competencia=timezone.localdate(),
            data_vencimento=timezone.localdate() + timezone.timedelta(days=10),
            status=Lancamento.Status.PENDENTE,
            conta_bancaria=self.conta,
            categoria=self.categoria_receita,
            criado_por=self.usuario,
        )

        # Executar tarefa
        resultado = atualizar_lancamentos_vencidos()

        # Verificar que apenas o vencido foi atualizado
        lancamento_vencido.refresh_from_db()
        lancamento_futuro.refresh_from_db()

        self.assertEqual(lancamento_vencido.status, Lancamento.Status.ATRASADO)
        self.assertEqual(lancamento_futuro.status, Lancamento.Status.PENDENTE)
        self.assertEqual(resultado["lancamentos_atualizados"], 1)

    def test_saldo_nunca_confia_sem_recalcular(self):
        """
        Test: Confirma que saldo deve sempre ser recalculado (nunca confiar no saldo_atual).
        """
        # Simular inconsistência: criar lançamentos mas não atualizar conta manualmente
        hoje = timezone.localdate()

        Lancamento.objects.create(
            tipo=Lancamento.Tipo.RECEITA,
            descricao="Receita 1",
            valor=Decimal("300.00"),
            data_competencia=hoje,
            data_vencimento=hoje,
            data_pagamento=hoje,
            status=Lancamento.Status.PAGO,
            conta_bancaria=self.conta,
            categoria=self.categoria_receita,
            criado_por=self.usuario,
        )

        Lancamento.objects.create(
            tipo=Lancamento.Tipo.DESPESA,
            descricao="Despesa 1",
            valor=Decimal("50.00"),
            data_competencia=hoje,
            data_vencimento=hoje,
            data_pagamento=hoje,
            status=Lancamento.Status.PAGO,
            conta_bancaria=self.conta,
            categoria=self.categoria_despesa,
            criado_por=self.usuario,
        )

        # Se confiássemos no saldo_inicial (1000), seria errado
        # Saldo correto = 1000 + 300 - 50 = 1250
        resultado = recalcular_saldo_conta(self.conta.id)

        self.assertEqual(Decimal(str(resultado["saldo_calculado"])), Decimal("1250.00"))
        self.assertNotEqual(resultado["saldo_calculado"], self.conta.saldo_inicial)
