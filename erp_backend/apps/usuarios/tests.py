from django.test import TestCase

from .models import Usuario


class UsuariosTests(TestCase):
    def test_permite_multiplos_usuarios_sem_cpf_e_matricula(self):
        primeiro = Usuario.objects.create_user(
            email="primeiro@example.com",
            password="senha-segura",
            first_name="Primeiro",
        )
        segundo = Usuario.objects.create_user(
            email="segundo@example.com",
            password="senha-segura",
            first_name="Segundo",
        )

        self.assertIsNone(primeiro.cpf)
        self.assertIsNone(primeiro.matricula)
        self.assertIsNone(segundo.cpf)
        self.assertIsNone(segundo.matricula)
