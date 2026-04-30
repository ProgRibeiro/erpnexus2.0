from io import BytesIO

from celery import shared_task
from reportlab.pdfgen import canvas


@shared_task
def gerar_pdf_simples(titulo: str) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(100, 750, titulo)
    pdf.save()
    return buffer.getvalue()
