import os
from datetime import datetime
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string

from apps.ordens.models import OrdemServico


def fetch_url(url):
    """Custom URL fetcher for WeasyPrint to handle local files."""
    from weasyprint import default_url_fetcher

    if url.startswith('file://'):
        path = url[7:]
        with open(path, 'rb') as f:
            return {'string': f.read()}
    return default_url_fetcher(url)


def _prepare_relatorio_context(os_obj):
    """Prepara contexto para template relatorio_servico.html"""
    fotos_antes = []
    fotos_depois = []

    for foto in os_obj.fotos.all():
        foto_data = {
            'legenda': foto.legenda or f'Foto {foto.tipo}',
            'arquivo_url': foto.arquivo.url if foto.arquivo else '',
        }
        if foto.tipo == 'antes':
            fotos_antes.append(foto_data)
        else:
            fotos_depois.append(foto_data)

    assinatura = getattr(os_obj, 'assinatura_cliente', None)
    assinatura_data = None
    nome_signatario = ''
    if assinatura:
        assinatura_data = {
            'imagem_url': assinatura.imagem_assinatura.url if assinatura.imagem_assinatura else '',
        }
        nome_signatario = assinatura.nome_signatario

    tecnico = os_obj.tecnico_responsavel.nome if os_obj.tecnico_responsavel else 'Não definido'
    contato = os_obj.contato_responsavel.nome if os_obj.contato_responsavel else os_obj.cliente.nome
    endereco = str(os_obj.endereco_servico) if os_obj.endereco_servico else 'Não definido'

    context = {
        'os': os_obj,
        'data_execucao': os_obj.data_agendada.strftime('%d/%m/%Y') if os_obj.data_agendada else datetime.now().strftime('%d/%m/%Y'),
        'data_emissao': datetime.now().strftime('%d/%m/%Y %H:%M'),
        'tecnico': tecnico,
        'contato': contato,
        'endereco': endereco,
        'hora_inicio': os_obj.hora_inicio.strftime('%H:%M') if os_obj.hora_inicio else '---',
        'hora_conclusao': os_obj.hora_conclusao.strftime('%H:%M') if os_obj.hora_conclusao else '---',
        'fotos_antes': fotos_antes,
        'fotos_depois': fotos_depois,
        'assinatura': assinatura_data,
        'nome_signatario': nome_signatario,
    }
    return context


def _prepare_orcamento_context(os_obj):
    """Prepara contexto para template orcamento.html"""
    itens = []
    subtotal = 0

    for item in os_obj.itens.all():
        item_data = {
            'descricao': item.descricao,
            'quantidade': f'{item.quantidade:.2f}'.rstrip('0').rstrip(','),
            'valor_unitario': f'{float(item.valor_unitario):.2f}',
            'valor_total': f'{float(item.valor_total):.2f}',
        }
        itens.append(item_data)
        subtotal += float(item.valor_total)

    descontos = 0
    total = subtotal - descontos

    contato = os_obj.contato_responsavel.nome if os_obj.contato_responsavel else os_obj.cliente.nome
    endereco = str(os_obj.endereco_servico) if os_obj.endereco_servico else 'A definir'
    telefone = os_obj.cliente.telefone if hasattr(os_obj.cliente, 'telefone') else 'A definir'

    context = {
        'os': os_obj,
        'data_proposta': datetime.now().strftime('%d/%m/%Y'),
        'validade_orcamento': os_obj.validade_orcamento.strftime('%d/%m/%Y') if os_obj.validade_orcamento else 'A combinar',
        'itens': itens,
        'subtotal': f'{subtotal:.2f}',
        'descontos': f'{descontos:.2f}',
        'total': f'{total:.2f}',
        'contato': contato,
        'endereco': endereco,
        'telefone': telefone,
    }
    return context


def gerar_relatorio_pdf(os_id):
    """
    Gera PDF de relatório de serviço e retorna bytes.

    Args:
        os_id: ID da OrdemServico

    Returns:
        bytes do PDF ou None em caso de erro
    """
    try:
        from weasyprint import WeasyPrint
    except ImportError:
        print("WeasyPrint não está instalado ou suas dependências não estão disponíveis")
        return None

    try:
        os_obj = OrdemServico.objects.get(pk=os_id)
    except OrdemServico.DoesNotExist:
        return None

    try:
        context = _prepare_relatorio_context(os_obj)

        html_string = render_to_string('pdfs/relatorio_servico.html', context)

        pdf_bytes = WeasyPrint(
            string=html_string,
            base_url=str(settings.BASE_DIR),
            url_fetcher=fetch_url,
        ).write_pdf()

        return pdf_bytes

    except Exception as e:
        print(f"Erro ao gerar PDF de relatório para OS {os_id}: {str(e)}")
        return None


def gerar_orcamento_pdf(os_id):
    """
    Gera PDF de orçamento/proposta comercial e retorna bytes.

    Args:
        os_id: ID da OrdemServico

    Returns:
        bytes do PDF ou None em caso de erro
    """
    try:
        from weasyprint import WeasyPrint
    except ImportError:
        print("WeasyPrint não está instalado ou suas dependências não estão disponíveis")
        return None

    try:
        os_obj = OrdemServico.objects.get(pk=os_id)
    except OrdemServico.DoesNotExist:
        return None

    try:
        context = _prepare_orcamento_context(os_obj)

        html_string = render_to_string('pdfs/orcamento.html', context)

        pdf_bytes = WeasyPrint(
            string=html_string,
            base_url=str(settings.BASE_DIR),
            url_fetcher=fetch_url,
        ).write_pdf()

        return pdf_bytes

    except Exception as e:
        print(f"Erro ao gerar PDF de orçamento para OS {os_id}: {str(e)}")
        return None


def salvar_relatorio_pdf(os_id):
    """
    Gera e salva PDF de relatório no campo pdf_relatorio da OS.

    Returns:
        True se salvo com sucesso, False caso contrário
    """
    try:
        os_obj = OrdemServico.objects.get(pk=os_id)
        pdf_bytes = gerar_relatorio_pdf(os_id)

        if pdf_bytes:
            from django.core.files.base import ContentFile
            filename = f"relatorio_{os_obj.numero}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            os_obj.pdf_relatorio.save(filename, ContentFile(pdf_bytes))
            return True
        return False

    except Exception as e:
        print(f"Erro ao salvar PDF de relatório para OS {os_id}: {str(e)}")
        return False


def salvar_orcamento_pdf(os_id):
    """
    Gera e salva PDF de orçamento no campo pdf_orcamento da OS.

    Returns:
        True se salvo com sucesso, False caso contrário
    """
    try:
        os_obj = OrdemServico.objects.get(pk=os_id)
        pdf_bytes = gerar_orcamento_pdf(os_id)

        if pdf_bytes:
            from django.core.files.base import ContentFile
            filename = f"orcamento_{os_obj.numero}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            os_obj.pdf_orcamento.save(filename, ContentFile(pdf_bytes))
            return True
        return False

    except Exception as e:
        print(f"Erro ao salvar PDF de orçamento para OS {os_id}: {str(e)}")
        return False
