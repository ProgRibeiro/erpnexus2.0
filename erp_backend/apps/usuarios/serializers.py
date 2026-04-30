from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Usuario


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get("email") or attrs.get("username")
        if not identifier:
            raise serializers.ValidationError("Informe email ou username.")

        user = authenticate(
            username=identifier,
            password=attrs.get("password"),
        )
        if not user:
            raise serializers.ValidationError("Credenciais inválidas.")
        attrs["user"] = user
        return attrs


class UsuarioSerializer(serializers.ModelSerializer):
    nome_completo = serializers.CharField(read_only=True)

    class Meta:
        model = Usuario
        exclude = (
            "password",
            "groups",
            "user_permissions",
        )

        read_only_fields = (
            "id",
            "email",
            "username",
            "role",
            "status",
            "matricula",
            "salario",
            "ultimo_ip",
            "ultimo_login_em",
            "last_login",
            "is_active",
            "is_staff",
            "is_superuser",
            "criado_em",
            "atualizado_em",
        )


class PerfilUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = (
            "first_name",
            "last_name",
            "telefone",
            "whatsapp",
            "avatar",
            "data_nascimento",
            "cep",
            "logradouro",
            "numero",
            "complemento",
            "bairro",
            "cidade",
            "estado",
            "contato_emergencia_nome",
            "contato_emergencia_telefone",
            "observacoes",
        )


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def save(self, **kwargs):
        try:
            token = RefreshToken(self.validated_data["refresh"])
            token.blacklist()
        except Exception as exc:
            raise serializers.ValidationError("Refresh token invalido.") from exc
