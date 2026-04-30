from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "role",
        "departamento",
        "status",
        "is_staff",
    )
    search_fields = ("email", "username", "first_name", "last_name", "cpf", "matricula")
    readonly_fields = ("last_login", "ultimo_login_em", "criado_em", "atualizado_em")

    fieldsets = (
        ("Acesso", {"fields": ("email", "username", "password")}),
        (
            "Dados pessoais",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "cpf",
                    "rg",
                    "data_nascimento",
                    "telefone",
                    "whatsapp",
                    "avatar",
                )
            },
        ),
        (
            "Dados profissionais",
            {
                "fields": (
                    "role",
                    "cargo",
                    "departamento",
                    "tipo_contratacao",
                    "status",
                    "matricula",
                    "data_admissao",
                    "data_desligamento",
                    "salario",
                )
            },
        ),
        (
            "Endereco",
            {
                "fields": (
                    "cep",
                    "logradouro",
                    "numero",
                    "complemento",
                    "bairro",
                    "cidade",
                    "estado",
                )
            },
        ),
        (
            "Emergencia e observacoes",
            {
                "fields": (
                    "contato_emergencia_nome",
                    "contato_emergencia_telefone",
                    "observacoes",
                )
            },
        ),
        ("Permissoes", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Auditoria", {"fields": ("last_login", "ultimo_login_em", "ultimo_ip", "criado_em", "atualizado_em")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "first_name", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )
