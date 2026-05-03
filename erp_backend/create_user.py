import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.usuarios.models import Usuario

try:
    usuario = Usuario.objects.get(email='lucas@test.com')
    print('Usuario ja existe:', usuario.email)
except Usuario.DoesNotExist:
    usuario = Usuario.objects.create_user(
        email='lucas@test.com',
        password='senha123',
        first_name='Lucas',
        last_name='Test',
    )
    usuario.is_staff = True
    usuario.is_active = True
    usuario.save()
    print('Usuario criado:', usuario.email)
