"""
Testes unitários para o módulo de notificações.

Para executar:
    python manage.py test apps.notificacoes
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from apps.notificacoes.models import LogNotificacao, ConfiguracaoNotificacao
from apps.notificacoes.email import EmailNotificacao
from apps.notificacoes.whatsapp import WhatsAppNotificacao, MensagensWhatsApp
from apps.notificacoes.tasks import (
    registrar_notificacao,
    enviar_email_os_atribuida,
    enviar_lembranca_agendamento,
)

Usuario = get_user_model()


class LogNotificacaoTestCase(TestCase):
    """Testes para o modelo LogNotificacao."""

    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="tecnico",
            email="tecnico@test.com",
            password="senha123",
        )

    def test_criar_log_notificacao(self):
        """Testa criação de log de notificação."""
        log = LogNotificacao.objects.create(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="tecnico@test.com",
            canal=LogNotificacao.Canal.EMAIL,
            usuario=self.user,
            conteudo="Teste de notificação",
        )
        self.assertEqual(log.status, LogNotificacao.Status.PENDENTE)
        self.assertEqual(log.destinatario, "tecnico@test.com")

    def test_marcar_notificacao_enviada(self):
        """Testa marcação de notificação como enviada."""
        log = LogNotificacao.objects.create(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="tecnico@test.com",
            conteudo="Teste",
        )
        log.marcar_enviado()
        log.refresh_from_db()
        self.assertEqual(log.status, LogNotificacao.Status.ENVIADO)
        self.assertIsNotNone(log.enviado_em)

    def test_registrar_erro_notificacao(self):
        """Testa registro de erro em notificação."""
        log = LogNotificacao.objects.create(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="tecnico@test.com",
            conteudo="Teste",
        )
        log.registrar_erro("Email inválido")
        log.refresh_from_db()
        self.assertEqual(log.status, LogNotificacao.Status.ERRO)
        self.assertEqual(log.tentativas, 1)
        self.assertIn("Email inválido", log.erro)

    def test_tentativas_maximas(self):
        """Testa limite de tentativas."""
        log = LogNotificacao.objects.create(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="tecnico@test.com",
            conteudo="Teste",
            tentativas=3,
        )
        log.registrar_erro("Falha 4")
        log.refresh_from_db()
        # Após 3 tentativas, proxima_tentativa deve ser None
        self.assertIsNone(log.proxima_tentativa)


class ConfiguracaoNotificacaoTestCase(TestCase):
    """Testes para o modelo ConfiguracaoNotificacao."""

    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="usuario",
            email="usuario@test.com",
            password="senha123",
        )

    def test_criar_configuracao(self):
        """Testa criação de configuração de notificação."""
        config = ConfiguracaoNotificacao.objects.create(
            usuario=self.user,
            enviar_email=True,
            enviar_whatsapp=False,
        )
        self.assertEqual(config.usuario, self.user)
        self.assertTrue(config.enviar_email)

    def test_frequencia_padrao(self):
        """Testa frequências padrão."""
        config = ConfiguracaoNotificacao.objects.create(usuario=self.user)
        self.assertEqual(config.os_atribuida, ConfiguracaoNotificacao.Frequencia.INSTANTANEA)
        self.assertEqual(config.pagamento_atrasado, ConfiguracaoNotificacao.Frequencia.DIARIA)
        self.assertEqual(config.estoque_baixo, ConfiguracaoNotificacao.Frequencia.SEMANAL)


class EmailNotificacaoTestCase(TestCase):
    """Testes para envio de email."""

    def test_inicializar_email_notificacao(self):
        """Testa inicialização de EmailNotificacao."""
        email = EmailNotificacao(
            assunto="Teste",
            destinatarios="teste@example.com",
            template_name="os_atribuida",
            contexto={"numero_os": "001", "cliente": "Teste"},
        )
        self.assertEqual(email.assunto, "Teste")
        self.assertEqual(email.destinatarios, ["teste@example.com"])

    def test_multiplos_destinatarios(self):
        """Testa email com múltiplos destinatários."""
        email = EmailNotificacao(
            assunto="Teste",
            destinatarios=["teste1@example.com", "teste2@example.com"],
            template_name="os_atribuida",
            contexto={"numero_os": "001"},
        )
        self.assertEqual(len(email.destinatarios), 2)

    def test_render_html(self):
        """Testa renderização de template HTML."""
        email = EmailNotificacao(
            assunto="Teste",
            destinatarios="teste@example.com",
            template_name="os_atribuida",
            contexto={
                "numero_os": "001",
                "cliente": "Acme Corp",
                "mensagem": "Teste",
            },
        )
        html = email.render_html()
        # Verificar se é HTML válido
        self.assertIn("<html", html.lower())
        self.assertIn("</html>", html.lower())


class WhatsAppNotificacaoTestCase(TestCase):
    """Testes para WhatsApp."""

    def test_formatar_numero(self):
        """Testa formatação de número de telefone."""
        # Sem código país
        numero = WhatsAppNotificacao.formatar_numero("11999999999")
        self.assertEqual(numero, "5511999999999")

        # Com código país
        numero = WhatsAppNotificacao.formatar_numero("5511999999999")
        self.assertEqual(numero, "5511999999999")

        # Com caracteres especiais
        numero = WhatsAppNotificacao.formatar_numero("(11) 99999-9999")
        self.assertEqual(numero, "5511999999999")

    def test_mensagens_whatsapp(self):
        """Testa mensagens pré-formatadas."""
        msg = MensagensWhatsApp.os_atribuida("001", "Acme", "15/05/2025")
        self.assertIn("OS", msg)
        self.assertIn("001", msg)

        msg = MensagensWhatsApp.os_aprovada("001", "Acme", "1000.00")
        self.assertIn("Aprovada", msg)

    def test_inicializar_whatsapp(self):
        """Testa inicialização de WhatsAppNotificacao."""
        whatsapp = WhatsAppNotificacao(
            numero="5511999999999",
            mensagem="Teste",
            provedor="callmebot",
        )
        self.assertEqual(whatsapp.numero, "5511999999999")
        self.assertEqual(whatsapp.mensagem, "Teste")


class TasksTestCase(TestCase):
    """Testes para tarefas Celery."""

    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="tecnico",
            email="tecnico@test.com",
            password="senha123",
        )

    def test_registrar_notificacao(self):
        """Testa função registrar_notificacao."""
        log = registrar_notificacao(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="tecnico@test.com",
            conteudo="Teste",
            usuario=self.user,
            ordem_servico_id=1,
        )
        self.assertIsNotNone(log)
        self.assertEqual(log.tipo, LogNotificacao.Tipo.OS_ATRIBUIDA)
        self.assertEqual(log.ordem_servico_id, 1)


class APIEndpointsTestCase(TestCase):
    """Testes para endpoints da API."""

    def setUp(self):
        self.client = Client()
        self.admin_user = Usuario.objects.create_superuser(
            username="admin",
            email="admin@test.com",
            password="admin123",
        )
        self.client.login(username="admin", password="admin123")

    def test_resumo_notificacoes(self):
        """Testa endpoint de resumo."""
        response = self.client.get("/api/v1/notificacoes/logs/resumo/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_pendentes", data)
        self.assertIn("total_erros", data)
        self.assertIn("ultimas_24h", data)

    def test_listar_logs(self):
        """Testa listagem de logs."""
        LogNotificacao.objects.create(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="teste@test.com",
            conteudo="Teste",
        )
        response = self.client.get("/api/v1/notificacoes/logs/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(len(data["results"]), 0)

    def test_configuracao_usuario(self):
        """Testa obtenção de configuração do usuário."""
        response = self.client.get("/api/v1/notificacoes/configuracoes/minha_configuracao/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("usuario", data)


class IntegracaoTestCase(TestCase):
    """Testes de integração entre componentes."""

    def setUp(self):
        self.user = Usuario.objects.create_user(
            username="tecnico",
            email="tecnico@test.com",
            password="senha123",
        )

    def test_fluxo_notificacao_completo(self):
        """Testa fluxo completo de uma notificação."""
        # 1. Registrar notificação
        log = registrar_notificacao(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="tecnico@test.com",
            conteudo="OS 001 atribuída",
            usuario=self.user,
        )
        self.assertEqual(log.status, LogNotificacao.Status.PENDENTE)

        # 2. Simular envio
        log.marcar_enviado()
        self.assertEqual(log.status, LogNotificacao.Status.ENVIADO)

        # 3. Verificar resultado
        log_recuperado = LogNotificacao.objects.get(id=log.id)
        self.assertEqual(log_recuperado.status, LogNotificacao.Status.ENVIADO)
        self.assertIsNotNone(log_recuperado.enviado_em)

    def test_fluxo_com_erro_e_retry(self):
        """Testa fluxo com erro e retry."""
        log = registrar_notificacao(
            tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
            destinatario="invalido@test.com",
            conteudo="Teste",
        )

        # Simular erro
        log.registrar_erro("Email inválido")
        self.assertEqual(log.tentativas, 1)
        self.assertEqual(log.status, LogNotificacao.Status.ERRO)

        # Simular retry bem-sucedido
        log.marcar_enviado()
        log.refresh_from_db()
        self.assertEqual(log.status, LogNotificacao.Status.ENVIADO)
        self.assertEqual(log.tentativas, 0)


if __name__ == "__main__":
    import django
    from django.conf import settings
    from django.test.utils import get_runner

    if not settings.configured:
        django.setup()

    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["apps.notificacoes"])
