"""
Helper para inicializar o módulo de notificações.
Execute este script após clonar ou atualizar o repositório.
"""
import os
import django

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.notificacoes.email import inicializar_templates
from apps.notificacoes.models import ConfiguracaoNotificacao
from django.contrib.auth import get_user_model

Usuario = get_user_model()


def inicializar_notificacoes():
    """Inicializa o sistema de notificações."""
    print("=" * 60)
    print("INICIALIZANDO SISTEMA DE NOTIFICAÇÕES")
    print("=" * 60)

    # Criar templates
    print("\n1. Criando templates de email...")
    try:
        inicializar_templates()
        print("   ✓ Templates criados com sucesso!")
    except Exception as e:
        print(f"   ✗ Erro ao criar templates: {e}")
        return False

    # Criar configurações padrão para usuários
    print("\n2. Criando configurações padrão...")
    try:
        usuarios = Usuario.objects.all()
        criadas = 0
        for usuario in usuarios:
            config, created = ConfiguracaoNotificacao.objects.get_or_create(usuario=usuario)
            if created:
                criadas += 1
        print(f"   ✓ {criadas} configurações criadas (usuários sem config)")
    except Exception as e:
        print(f"   ✗ Erro ao criar configurações: {e}")
        return False

    print("\n" + "=" * 60)
    print("INICIALIZAÇÃO CONCLUÍDA COM SUCESSO!")
    print("=" * 60)
    print("\nPróximas etapas:")
    print("1. Configurar variáveis de ambiente no .env:")
    print("   - EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD")
    print("   - ADMIN_EMAIL, FINANCEIRO_EMAIL, ESTOQUE_EMAIL")
    print("2. Executar migrações: python manage.py migrate")
    print("3. Iniciar Celery Beat: celery -A config beat -l info")
    print("4. Iniciar Celery Worker: celery -A config worker -l info")
    print("\nPara testar notificações, acesse: /api/v1/notificacoes/")
    return True


if __name__ == "__main__":
    inicializar_notificacoes()
