from django.db import models
from django.utils import timezone


class LogNotificacao(models.Model):
    class Tipo(models.TextChoices):
        OS_ATRIBUIDA = "os_atribuida", "OS atribuida"
        OS_AGENDADA_AMANHA = "os_agendada_amanha", "OS agendada amanha"
        OS_FINALIZADA = "os_finalizada", "OS finalizada"
        PAGAMENTO_ATRASADO = "pagamento_atrasado", "Pagamento atrasado"
        ESTOQUE_BAIXO = "estoque_baixo", "Estoque baixo"
        RELATORIO_FINALIZADO = "relatorio_finalizado", "Relatorio finalizado"

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        ENVIADO = "enviado", "Enviado"
        ERRO = "erro", "Erro"

    tipo = models.CharField(max_length=40, choices=Tipo.choices)
    destinatario = models.EmailField()
    conteudo = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDENTE)
    enviado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Log de notificacao"
        verbose_name_plural = "Logs de notificacao"

    def marcar_enviado(self):
        self.status = self.Status.ENVIADO
        self.enviado_em = timezone.now()
        self.save(update_fields=["status", "enviado_em"])

    def __str__(self):
        return f"{self.tipo} - {self.destinatario}"
