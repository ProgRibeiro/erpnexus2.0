from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

Usuario = get_user_model()


class LogNotificacao(models.Model):
    class Tipo(models.TextChoices):
        OS_ATRIBUIDA = "os_atribuida", "OS atribuida"
        OS_APROVADA = "os_aprovada", "OS aprovada"
        OS_AGENDADA_AMANHA = "os_agendada_amanha", "OS agendada amanha"
        OS_FINALIZADA = "os_finalizada", "OS finalizada"
        PAGAMENTO_ATRASADO = "pagamento_atrasado", "Pagamento atrasado"
        ESTOQUE_BAIXO = "estoque_baixo", "Estoque baixo"
        RELATORIO_FINALIZADO = "relatorio_finalizado", "Relatorio finalizado"

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        ENVIADO = "enviado", "Enviado"
        ERRO = "erro", "Erro"

    class Canal(models.TextChoices):
        EMAIL = "email", "Email"
        WHATSAPP = "whatsapp", "WhatsApp"
        INTERNO = "interno", "Notificação Interna"

    tipo = models.CharField(max_length=40, choices=Tipo.choices)
    destinatario = models.EmailField()
    canal = models.CharField(max_length=20, choices=Canal.choices, default=Canal.EMAIL)
    usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="notificacoes"
    )
    conteudo = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    enviado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    tentativas = models.IntegerField(default=0)
    proxima_tentativa = models.DateTimeField(null=True, blank=True)
    erro = models.TextField(blank=True)
    ordem_servico_id = models.IntegerField(null=True, blank=True, help_text="ID da OS relacionada")
    dados_adicionais = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Log de notificacao"
        verbose_name_plural = "Logs de notificacao"
        indexes = [
            models.Index(fields=["-criado_em"]),
            models.Index(fields=["status"]),
            models.Index(fields=["tipo"]),
        ]

    def marcar_enviado(self):
        """Marca notificação como enviada."""
        self.status = self.Status.ENVIADO
        self.enviado_em = timezone.now()
        self.tentativas = 0
        self.save(update_fields=["status", "enviado_em", "tentativas"])

    def registrar_erro(self, mensagem_erro):
        """Registra erro na tentativa de envio."""
        self.status = self.Status.ERRO
        self.erro = mensagem_erro
        self.tentativas += 1

        # Retentar em 5 minutos se for a primeira tentativa
        if self.tentativas < 3:
            self.proxima_tentativa = timezone.now() + timezone.timedelta(minutes=5 * self.tentativas)

        self.save(
            update_fields=["status", "erro", "tentativas", "proxima_tentativa"]
        )

    def __str__(self):
        return f"{self.tipo} - {self.destinatario} ({self.status})"


class ConfiguracaoNotificacao(models.Model):
    """Configurações de notificações por usuário ou global."""

    class Frequencia(models.TextChoices):
        INSTANTANEA = "instantanea", "Instantânea"
        DIARIA = "diaria", "Diária"
        SEMANAL = "semanal", "Semanal"
        DESATIVADA = "desativada", "Desativada"

    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="config_notificacoes", null=True, blank=True
    )
    # Frequências para cada tipo
    os_atribuida = models.CharField(max_length=20, choices=Frequencia.choices, default=Frequencia.INSTANTANEA)
    os_aprovada = models.CharField(max_length=20, choices=Frequencia.choices, default=Frequencia.INSTANTANEA)
    lembranca_agendamento = models.CharField(
        max_length=20, choices=Frequencia.choices, default=Frequencia.INSTANTANEA
    )
    os_finalizada = models.CharField(max_length=20, choices=Frequencia.choices, default=Frequencia.INSTANTANEA)
    pagamento_atrasado = models.CharField(max_length=20, choices=Frequencia.choices, default=Frequencia.DIARIA)
    estoque_baixo = models.CharField(max_length=20, choices=Frequencia.choices, default=Frequencia.SEMANAL)
    relatorio_pronto = models.CharField(max_length=20, choices=Frequencia.choices, default=Frequencia.INSTANTANEA)

    # Canais
    enviar_email = models.BooleanField(default=True)
    enviar_whatsapp = models.BooleanField(default=False)
    numero_whatsapp = models.CharField(max_length=20, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração de notificação"
        verbose_name_plural = "Configurações de notificação"

    def __str__(self):
        return f"Config: {self.usuario or 'Global'}"
