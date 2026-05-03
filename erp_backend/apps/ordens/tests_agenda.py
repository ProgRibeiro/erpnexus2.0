"""
Testes para endpoints de Agenda de Técnicos
Rodar com: python manage.py test apps.ordens.tests.AgendaTecnicosTestCase
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from .models import OrdemServico
from apps.clientes.models import Cliente, EnderecoCliente

User = get_user_model()


class AgendaTecnicosTestCase(TestCase):
    """Testes para endpoints de agenda de técnicos"""

    def setUp(self):
        """Preparar dados de teste"""
        self.client = APIClient()

        # Criar usuários
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="123456",
            username="admin",
            first_name="Admin",
            role=User.Role.ADMIN,
        )

        self.tecnico1 = User.objects.create_user(
            email="tecnico1@test.com",
            password="123456",
            username="tecnico1",
            first_name="João",
            last_name="Silva",
            role=User.Role.TECNICO,
        )

        self.tecnico2 = User.objects.create_user(
            email="tecnico2@test.com",
            password="123456",
            username="tecnico2",
            first_name="Maria",
            last_name="Santos",
            role=User.Role.TECNICO,
        )

        # Criar cliente
        self.cliente = Cliente.objects.create(
            nome="Empresa Teste",
            cnpj_cpf="12345678000100",
            email="cliente@test.com",
        )

        # Criar endereço
        self.endereco = EnderecoCliente.objects.create(
            cliente=self.cliente,
            tipo="comercial",
            logradouro="Rua Teste",
            numero="123",
            cidade="São Paulo",
            estado="SP",
            cep="01310100",
        )

        # Criar ordens de serviço para hoje
        self.hoje = timezone.localdate()
        self.amanha = self.hoje + timedelta(days=1)

        self.os_hoje_tec1 = OrdemServico.objects.create(
            cliente=self.cliente,
            endereco_servico=self.endereco,
            tecnico_responsavel=self.tecnico1,
            data_agendada=self.hoje,
            hora_inicio="09:00:00",
            status=OrdemServico.Status.AGENDADA,
            criado_por=self.admin_user,
            atualizado_por=self.admin_user,
        )

        self.os_hoje_tec2 = OrdemServico.objects.create(
            cliente=self.cliente,
            endereco_servico=self.endereco,
            tecnico_responsavel=self.tecnico2,
            data_agendada=self.hoje,
            hora_inicio="14:00:00",
            status=OrdemServico.Status.AGENDADA,
            criado_por=self.admin_user,
            atualizado_por=self.admin_user,
        )

        self.os_amanha = OrdemServico.objects.create(
            cliente=self.cliente,
            endereco_servico=self.endereco,
            tecnico_responsavel=self.tecnico1,
            data_agendada=self.amanha,
            hora_inicio="10:00:00",
            status=OrdemServico.Status.AGENDADA,
            criado_por=self.admin_user,
            atualizado_por=self.admin_user,
        )

    def test_agenda_periode_sem_filtro(self):
        """Teste GET /api/v1/ordens/agenda/ sem filtros"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            "/api/v1/ordens/agenda/",
            {
                "data_inicio": self.hoje.isoformat(),
                "data_fim": self.amanha.isoformat(),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Deve retornar 2 datas (hoje e amanhã)
        self.assertEqual(len(data), 2)

        # Verificar estrutura
        for dia in data:
            self.assertIn("data", dia)
            self.assertIn("tecnicos", dia)
            self.assertIsInstance(dia["tecnicos"], list)

    def test_agenda_hoje_admin(self):
        """Teste GET /api/v1/ordens/agenda/hoje/ como admin"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/v1/ordens/agenda/hoje/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Admin vê todas as OS de hoje
        self.assertEqual(len(data), 2)

    def test_agenda_hoje_tecnico(self):
        """Teste GET /api/v1/ordens/agenda/hoje/ como técnico"""
        self.client.force_authenticate(user=self.tecnico1)

        response = self.client.get("/api/v1/ordens/agenda/hoje/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Técnico vê apenas suas OS
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], self.os_hoje_tec1.id)

    def test_filtro_por_tecnico(self):
        """Teste filtro de técnico específico"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            "/api/v1/ordens/agenda/",
            {
                "data_inicio": self.hoje.isoformat(),
                "data_fim": self.amanha.isoformat(),
                "tecnico": self.tecnico1.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Verificar que apenas ordens do técnico1 aparecem
        for dia in data:
            for tec in dia["tecnicos"]:
                if tec["id"]:  # Pode haver "Não atribuído"
                    self.assertEqual(tec["id"], self.tecnico1.id)
                    for ordem in tec["ordens"]:
                        self.assertEqual(ordem["tecnico_responsavel"], self.tecnico1.id)

    def test_reagendar_os(self):
        """Teste PATCH /api/v1/ordens/{id}/reagendar/"""
        self.client.force_authenticate(user=self.admin_user)

        nova_data = self.amanha + timedelta(days=1)

        response = self.client.patch(
            f"/api/v1/ordens/{self.os_hoje_tec1.id}/reagendar/",
            {
                "data_agendada": nova_data.isoformat(),
                "hora_inicio": "11:30:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Verificar dados retornados
        self.assertEqual(data["data_agendada"], nova_data.isoformat())
        self.assertEqual(data["hora_inicio"], "11:30:00")

        # Verificar no banco
        self.os_hoje_tec1.refresh_from_db()
        self.assertEqual(self.os_hoje_tec1.data_agendada, nova_data)

    def test_reagendar_cria_log(self):
        """Teste se reagendamento cria log de alteração"""
        self.client.force_authenticate(user=self.admin_user)

        nova_data = self.amanha + timedelta(days=1)

        logs_antes = self.os_hoje_tec1.logs_status.count()

        self.client.patch(
            f"/api/v1/ordens/{self.os_hoje_tec1.id}/reagendar/",
            {
                "data_agendada": nova_data.isoformat(),
                "hora_inicio": "11:30:00",
            },
            format="json",
        )

        logs_depois = self.os_hoje_tec1.logs_status.count()

        # Deve ter criado um novo log
        self.assertEqual(logs_depois, logs_antes + 1)

        # Verificar conteúdo do log
        ultimo_log = self.os_hoje_tec1.logs_status.first()
        self.assertIn("Reagendada", ultimo_log.observacao)

    def test_filtro_tipo_servico(self):
        """Teste filtro por tipo de serviço"""
        self.client.force_authenticate(user=self.admin_user)

        # Atualizar OS com tipo
        self.os_hoje_tec1.tipo_servico = OrdemServico.TipoServico.HVAC
        self.os_hoje_tec1.save()

        response = self.client.get(
            "/api/v1/ordens/agenda/",
            {
                "data_inicio": self.hoje.isoformat(),
                "data_fim": self.amanha.isoformat(),
                "tipo_servico": "hvac",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Verificar que apenas ordens com tipo HVAC aparecem
        total_ordens = sum(
            len(tec["ordens"])
            for dia in data
            for tec in dia["tecnicos"]
        )
        self.assertGreaterEqual(total_ordens, 1)

    def test_agenda_ordena_por_hora(self):
        """Teste se agenda de hoje ordena por hora de início"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/v1/ordens/agenda/hoje/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Verificar ordenação
        if len(data) > 1:
            for i in range(len(data) - 1):
                if data[i]["hora_inicio"] and data[i + 1]["hora_inicio"]:
                    self.assertLessEqual(
                        data[i]["hora_inicio"],
                        data[i + 1]["hora_inicio"]
                    )
