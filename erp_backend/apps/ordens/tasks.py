from celery import shared_task
from django.core.mail import send_mail

from .pdf_generator import salvar_relatorio_pdf, salvar_orcamento_pdf


@shared_task
def enviar_email_os(destinatario: str, assunto: str, mensagem: str) -> int:
    return send_mail(assunto, mensagem, None, [destinatario], fail_silently=False)


@shared_task
def gerar_relatorio_async(os_id: int) -> bool:
    """Gera e salva PDF de relatório em background."""
    try:
        return salvar_relatorio_pdf(os_id)
    except Exception as e:
        print(f"Erro ao gerar relatório PDF da OS {os_id}: {str(e)}")
        return False


@shared_task
def gerar_orcamento_async(os_id: int) -> bool:
    """Gera e salva PDF de orçamento em background."""
    try:
        return salvar_orcamento_pdf(os_id)
    except Exception as e:
        print(f"Erro ao gerar orçamento PDF da OS {os_id}: {str(e)}")
        return False
