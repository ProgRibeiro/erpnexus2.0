from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone


class UsuarioManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("O email e obrigatorio.")

        email = self.normalize_email(email)
        username = extra_fields.get("username") or email.split("@")[0]
        extra_fields["username"] = username.lower()

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("status", Usuario.Status.ATIVO)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Usuario.Role.ADMIN)
        extra_fields.setdefault("status", Usuario.Status.ATIVO)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser deve possuir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser deve possuir is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrador"
        GESTOR = "gestor", "Gestor"
        FINANCEIRO = "financeiro", "Financeiro"
        COMERCIAL = "comercial", "Comercial"
        TECNICO = "tecnico", "Tecnico"
        ESTOQUISTA = "estoquista", "Estoquista"
        SUPORTE = "suporte", "Suporte"
        VENDEDOR_LOJA = "vendedor_loja", "Vendedor loja"
        GERENTE_LOJA = "gerente_loja", "Gerente loja"

    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        INATIVO = "inativo", "Inativo"
        BLOQUEADO = "bloqueado", "Bloqueado"
        FERIAS = "ferias", "Ferias"
        AFASTADO = "afastado", "Afastado"

    class TipoContratacao(models.TextChoices):
        CLT = "clt", "CLT"
        PJ = "pj", "PJ"
        ESTAGIARIO = "estagiario", "Estagiario"
        TERCEIRIZADO = "terceirizado", "Terceirizado"
        FREELANCER = "freelancer", "Freelancer"

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True)
    cpf = models.CharField(max_length=14, unique=True, blank=True, null=True)
    rg = models.CharField(max_length=20, blank=True)
    data_nascimento = models.DateField(null=True, blank=True)

    telefone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="usuarios/avatar/", blank=True, null=True)

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TECNICO)
    cargo = models.CharField(max_length=120, blank=True)
    departamento = models.CharField(max_length=120, blank=True)
    tipo_contratacao = models.CharField(
        max_length=20,
        choices=TipoContratacao.choices,
        default=TipoContratacao.CLT,
    )
    class Modulo(models.TextChoices):
        ERP = "erp", "ERP Nexus (Prestador)"
        FACILITIES = "facilities", "Facilities Platform (Contratante)"
        AMBOS = "ambos", "Ambos os produtos"

    modulo = models.CharField(
        max_length=20,
        choices=Modulo.choices,
        default=Modulo.ERP,
        help_text="Define para qual produto este usuário tem acesso"
    )

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ATIVO)
    matricula = models.CharField(max_length=30, unique=True, blank=True, null=True)
    data_admissao = models.DateField(null=True, blank=True)
    data_desligamento = models.DateField(null=True, blank=True)
    salario = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    cep = models.CharField(max_length=10, blank=True)
    logradouro = models.CharField(max_length=255, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=120, blank=True)
    bairro = models.CharField(max_length=120, blank=True)
    cidade = models.CharField(max_length=120, blank=True)
    estado = models.CharField(max_length=2, blank=True)

    contato_emergencia_nome = models.CharField(max_length=150, blank=True)
    contato_emergencia_telefone = models.CharField(max_length=20, blank=True)
    observacoes = models.TextField(blank=True)

    ultimo_ip = models.GenericIPAddressField(null=True, blank=True)
    ultimo_login_em = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name"]

    class Meta:
        ordering = ["first_name", "last_name", "email"]
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return self.nome_completo or self.email

    def save(self, *args, **kwargs):
        self.cpf = self.cpf or None
        self.matricula = self.matricula or None
        super().save(*args, **kwargs)

    @property
    def nome_completo(self):
        return f"{self.first_name} {self.last_name}".strip()

    def registrar_login(self, ip=None):
        self.last_login = timezone.now()
        self.ultimo_login_em = self.last_login
        if ip:
            self.ultimo_ip = ip
        self.save(update_fields=["last_login", "ultimo_login_em", "ultimo_ip"])
