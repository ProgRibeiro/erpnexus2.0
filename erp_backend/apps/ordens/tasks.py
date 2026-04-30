from celery import shared_task
from django.core.mail import send_mail


@shared_task
def enviar_email_os(destinatario: str, assunto: str, mensagem: str) -> int:
    return send_mail(assunto, mensagem, None, [destinatario], fail_silently=False)
