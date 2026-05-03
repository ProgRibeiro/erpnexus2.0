from django.test import TestCase
from django.contrib.auth.hashers import check_password
from django.core.signing import Signer
from rest_framework.test import APITestCase
from rest_framework import status
from apps.clientes.models import Cliente
from apps.ordens.models import OrdemServico
from .models import UsuarioPortal

signer = Signer(salt="portal-cliente")


class UsuarioPortalModelTest(TestCase):
    """Testes do modelo UsuarioPortal"""

    def setUp(self):
        self.cliente = Cliente.objects.create(
            tipo_pessoa="juridica",
            nome="Empresa Teste",
            cnpj="12.345.678/0001-90",
            email="empresa@teste.com",
            telefone="1133334444"
        )

    def test_criar_usuario_portal(self):
        """Testa criação de usuário do portal"""
        usuario = UsuarioPortal.objects.create(
            cliente=self.cliente,
            email="contato@teste.com",
            senha="senha123"
        )
        self.assertEqual(usuario.email, "contato@teste.com")
        self.assertTrue(usuario.ativo)
        self.assertTrue(usuario.check_password("senha123"))

    def test_set_password(self):
        """Testa hash de senha com set_password"""
        usuario = UsuarioPortal(
            cliente=self.cliente,
            email="contato@teste.com"
        )
        usuario.set_password("senha123")
        self.assertTrue(usuario.check_password("senha123"))
        self.assertFalse(usuario.check_password("outra_senha"))

    def test_senha_automaticamente_hasheada_ao_salvar(self):
        """Testa se senha é hasheada automaticamente ao salvar"""
        usuario = UsuarioPortal.objects.create(
            cliente=self.cliente,
            email="contato@teste.com",
            senha="senha123"
        )
        usuario.refresh_from_db()
        self.assertTrue(usuario.check_password("senha123"))

    def test_usuario_portal_str(self):
        """Testa representação em string"""
        usuario = UsuarioPortal.objects.create(
            cliente=self.cliente,
            email="contato@teste.com",
            senha="senha123"
        )
        self.assertEqual(str(usuario), "contato@teste.com")


class PortalLoginAPITest(APITestCase):
    """Testes da API de login do portal"""

    def setUp(self):
        self.cliente = Cliente.objects.create(
            tipo_pessoa="juridica",
            nome="Empresa Teste",
            cnpj="12.345.678/0001-90",
            email="empresa@teste.com",
            telefone="1133334444"
        )
        self.usuario = UsuarioPortal.objects.create(
            cliente=self.cliente,
            email="contato@teste.com",
            senha="senha123"
        )

    def test_login_com_credenciais_validas(self):
        """Testa login com email e senha corretos"""
        response = self.client.post('/api/v1/portal/auth/login/', {
            'email': 'contato@teste.com',
            'senha': 'senha123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('cliente_id', response.data)
        self.assertEqual(response.data['cliente_id'], self.cliente.id)

    def test_login_com_senha_incorreta(self):
        """Testa login com senha incorreta"""
        response = self.client.post('/api/v1/portal/auth/login/', {
            'email': 'contato@teste.com',
            'senha': 'senha_errada'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_com_email_inexistente(self):
        """Testa login com email que não existe"""
        response = self.client.post('/api/v1/portal/auth/login/', {
            'email': 'naoexiste@teste.com',
            'senha': 'senha123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_com_usuario_inativo(self):
        """Testa login com usuário inativo"""
        self.usuario.ativo = False
        self.usuario.save()
        response = self.client.post('/api/v1/portal/auth/login/', {
            'email': 'contato@teste.com',
            'senha': 'senha123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PortalMinhasOSAPITest(APITestCase):
    """Testes da API de OS do portal"""

    def setUp(self):
        self.cliente = Cliente.objects.create(
            tipo_pessoa="juridica",
            nome="Empresa Teste",
            cnpj="12.345.678/0001-90",
            email="empresa@teste.com",
            telefone="1133334444"
        )
        self.usuario = UsuarioPortal.objects.create(
            cliente=self.cliente,
            email="contato@teste.com",
            senha="senha123"
        )
        self.token = signer.sign(self.usuario.id)

        # Cria uma OS para teste
        self.ordem = OrdemServico.objects.create(
            numero="OS-2025-0001",
            cliente=self.cliente,
            status=OrdemServico.Status.ABERTA,
            descricao_servico="Teste"
        )

    def test_listar_minhas_os_com_token_valido(self):
        """Testa listagem de OS com token válido"""
        response = self.client.get(
            '/api/v1/portal/minhas-os/',
            HTTP_X_PORTAL_TOKEN=self.token
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numero'], 'OS-2025-0001')

    def test_listar_minhas_os_sem_token(self):
        """Testa listagem de OS sem token"""
        response = self.client.get('/api/v1/portal/minhas-os/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_listar_minhas_os_com_token_invalido(self):
        """Testa listagem de OS com token inválido"""
        response = self.client.get(
            '/api/v1/portal/minhas-os/',
            HTTP_X_PORTAL_TOKEN='token_invalido'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_detalhes_da_os(self):
        """Testa obtenção de detalhes de uma OS"""
        response = self.client.get(
            f'/api/v1/portal/minhas-os/{self.ordem.id}/',
            HTTP_X_PORTAL_TOKEN=self.token
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['numero'], 'OS-2025-0001')

    def test_detalhes_de_os_inexistente(self):
        """Testa obtenção de detalhes de OS que não existe"""
        response = self.client.get(
            '/api/v1/portal/minhas-os/9999/',
            HTTP_X_PORTAL_TOKEN=self.token
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PortalPermissionsTest(TestCase):
    """Testes de segurança e permissões"""

    def setUp(self):
        self.cliente1 = Cliente.objects.create(
            tipo_pessoa="juridica",
            nome="Empresa 1",
            cnpj="12.345.678/0001-90",
            email="empresa1@teste.com",
            telefone="1133334444"
        )
        self.cliente2 = Cliente.objects.create(
            tipo_pessoa="juridica",
            nome="Empresa 2",
            cnpj="98.765.432/0001-10",
            email="empresa2@teste.com",
            telefone="1144445555"
        )
        self.usuario1 = UsuarioPortal.objects.create(
            cliente=self.cliente1,
            email="contato1@teste.com",
            senha="senha123"
        )
        self.usuario2 = UsuarioPortal.objects.create(
            cliente=self.cliente2,
            email="contato2@teste.com",
            senha="senha456"
        )

        # Cria OS para cada cliente
        self.ordem1 = OrdemServico.objects.create(
            numero="OS-2025-0001",
            cliente=self.cliente1,
            status=OrdemServico.Status.ABERTA,
            descricao_servico="Teste cliente 1"
        )
        self.ordem2 = OrdemServico.objects.create(
            numero="OS-2025-0002",
            cliente=self.cliente2,
            status=OrdemServico.Status.ABERTA,
            descricao_servico="Teste cliente 2"
        )

    def test_usuario_nao_pode_ver_os_de_outro_cliente(self):
        """Testa que usuário de um cliente não pode ver OS de outro cliente"""
        token1 = signer.sign(self.usuario1.id)
        client = APITestCase()
        client.client = self.client

        # Tenta acessar OS do cliente 2 com token do cliente 1
        response = self.client.get(
            f'/api/v1/portal/minhas-os/{self.ordem2.id}/',
            HTTP_X_PORTAL_TOKEN=token1
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
