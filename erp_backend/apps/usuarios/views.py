from django.utils.crypto import get_random_string
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status

from .models import Usuario
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    PerfilUpdateSerializer,
    UsuarioSerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.registrar_login(ip=self._get_client_ip(request))
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UsuarioSerializer(user).data,
            }
        )

    @staticmethod
    def _get_client_ip(request):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class PerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)

    def patch(self, request):
        serializer = PerfilUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UsuarioSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Logout realizado com sucesso."})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def listar_usuarios(request):
    """Lista todos os usuários ou cria um novo usuário"""
    if request.method == "POST":
        # Criar novo usuário
        data = request.data.copy()

        # Gerar senha temporária se não fornecida
        if "password" not in data or not data["password"]:
            data["password"] = get_random_string(12)

        # Validar dados obrigatórios
        if "email" not in data or "first_name" not in data:
            return Response(
                {"error": "Email e primeiro nome são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar se usuário já existe
        if Usuario.objects.filter(email=data["email"]).exists():
            return Response(
                {"error": "Usuário com este email já existe"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Criar usuário
        usuario = Usuario.objects.create_user(
            email=data["email"],
            password=data["password"],
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            role=data.get("role", Usuario.Role.TECNICO),
        )

        # Atualizar outros campos se fornecidos
        if "telefone" in data:
            usuario.telefone = data["telefone"]
        if "cargo" in data:
            usuario.cargo = data["cargo"]
        if "departamento" in data:
            usuario.departamento = data["departamento"]

        usuario.save()

        return Response(
            {
                "usuario": UsuarioSerializer(usuario).data,
                "senha_temporaria": data["password"]
            },
            status=status.HTTP_201_CREATED
        )

    # GET: Listar usuários
    usuarios = Usuario.objects.all()
    return Response(UsuarioSerializer(usuarios, many=True).data)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser])
def gerenciar_usuario(request, usuario_id):
    """Atualiza ou desativa um usuário"""
    try:
        usuario = Usuario.objects.get(id=usuario_id)
    except Usuario.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "DELETE":
        # Desativar usuário
        usuario.status = Usuario.Status.INATIVO
        usuario.is_active = False
        usuario.save()
        return Response({"detail": "Usuário desativado"})

    if request.method == "PATCH":
        # Atualizar usuário
        serializer = PerfilUpdateSerializer(usuario, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # Atualizar campos adicionais se fornecidos
            if "role" in request.data and request.user.is_superuser:
                usuario.role = request.data["role"]
            if "first_name" in request.data:
                usuario.first_name = request.data["first_name"]
            if "last_name" in request.data:
                usuario.last_name = request.data["last_name"]
            if "cargo" in request.data:
                usuario.cargo = request.data["cargo"]
            if "departamento" in request.data:
                usuario.departamento = request.data["departamento"]

            usuario.save()
            return Response(UsuarioSerializer(usuario).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def resetar_senha_usuario(request, usuario_id):
    """Reseta a senha de um usuário para uma senha temporária"""
    try:
        usuario = Usuario.objects.get(id=usuario_id)
    except Usuario.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Gerar nova senha temporária
    nova_senha = get_random_string(12)
    usuario.set_password(nova_senha)
    usuario.save()

    return Response({
        "detail": "Senha resetada com sucesso",
        "nova_senha_temporaria": nova_senha
    })
