from django.contrib.auth.hashers import check_password, make_password
from django.db import models

from apps.clientes.models import Cliente


class UsuarioPortal(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name="usuarios_portal")
    email = models.EmailField(unique=True)
    senha = models.CharField(max_length=128)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["email"]
        verbose_name = "Usuario do portal"
        verbose_name_plural = "Usuarios do portal"

    def set_password(self, raw_password):
        self.senha = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.senha)

    def save(self, *args, **kwargs):
        if self.senha and not self.senha.startswith(("pbkdf2_", "argon2$", "bcrypt")):
            self.senha = make_password(self.senha)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email
