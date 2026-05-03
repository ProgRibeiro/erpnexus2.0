import os
from datetime import datetime
from io import BytesIO
from pathlib import Path
from decimal import Decimal

from django.conf import settings
from django.db.utils import OperationalError, ProgrammingError
from django.template.loader import render_to_string

from apps.configuracoes.models import ConfiguracaoEmpresa, ConfiguracaoOS
from apps.fiscal.models import ConfiguracaoFiscal
from apps.fiscal.services import CalculadoraImpostos
from apps.ordens.models import OrdemServico


def _to_file_uri(file_field):
    if not file_field:
        return ""
    try:
        if getattr(file_field, "path", None):
            return Path(file_field.path).as_uri()
    except Exception:
        return ""
    return ""


def _format_brl_trailing(value):
    valor = Decimal(str(value or 0))
    inteiro, decimal = f"{valor:.2f}".split(".")
    grupos = []
    while inteiro:
        grupos.insert(0, inteiro[-3:])
        inteiro = inteiro[:-3]
    return f"{'.'.join(grupos)},{decimal}R$"


def _gerar_relatorio_pdf_reportlab(os_obj, context):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="HeaderTitle", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=18, textColor=colors.HexColor("#1B4F8A"), spaceAfter=6))
    styles.add(ParagraphStyle(name="Muted", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#5A6070"), leading=12))
    styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading4"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.white, backColor=colors.HexColor("#1B4F8A"), spaceBefore=12, spaceAfter=6, leftIndent=0, borderPadding=6))

    story = []
    empresa = context["empresa"]
    logo_path = context.get("logo_path")
    if logo_path and os.path.exists(logo_path):
        try:
            story.append(RLImage(logo_path, width=28 * mm, height=28 * mm))
        except Exception:
            pass
    story.append(Paragraph(empresa.razao_social or empresa.nome, styles["HeaderTitle"]))
    empresa_linhas = [linha for linha in [
        f"CNPJ: {empresa.cnpj}" if empresa.cnpj else "",
        empresa.endereco or "",
        f"Telefone: {empresa.telefone}" if empresa.telefone else "",
        f"Email: {empresa.email}" if empresa.email else "",
    ] if linha]
    story.append(Paragraph("<br/>".join(empresa_linhas) or empresa.nome, styles["Muted"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Relatório de Serviço - {os_obj.numero}", styles["HeaderTitle"]))
    story.append(Paragraph(f"Emitido em {context['data_emissao']}", styles["Muted"]))
    story.append(Spacer(1, 10))

    tabela_dados = Table(
        [
            ["Cliente", os_obj.cliente.nome, "Técnico", context["tecnico"]],
            ["Contato", context["contato"], "Tipo de serviço", os_obj.get_tipo_servico_display()],
            ["Endereço", context["endereco"], "Status", os_obj.get_status_display()],
            ["Horário", f"{context['hora_inicio']} às {context['hora_conclusao']}", "Data execução", context["data_execucao"]],
        ],
        colWidths=[28 * mm, 67 * mm, 28 * mm, 58 * mm],
    )
    tabela_dados.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDE5EF")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(tabela_dados)
    story.append(Spacer(1, 12))

    if os_obj.descricao_servico:
        story.append(Paragraph("Descrição do Serviço", styles["SectionTitle"]))
        story.append(Paragraph(os_obj.descricao_servico.replace("\n", "<br/>"), styles["Muted"]))

    if os_obj.observacoes_tecnicas:
        story.append(Paragraph("Observações Técnicas", styles["SectionTitle"]))
        story.append(Paragraph(os_obj.observacoes_tecnicas.replace("\n", "<br/>"), styles["Muted"]))

    fotos = context.get("fotos_antes", []) + context.get("fotos_depois", [])
    if fotos:
        story.append(Paragraph("Registro Fotográfico", styles["SectionTitle"]))
        for foto in fotos[:6]:
            foto_path = foto.get("arquivo_path")
            if foto_path and os.path.exists(foto_path):
                try:
                    story.append(RLImage(foto_path, width=80 * mm, height=55 * mm))
                    story.append(Paragraph(foto.get("legenda") or "Foto", styles["Muted"]))
                    story.append(Spacer(1, 6))
                except Exception:
                    continue

    doc.build(story)
    return buffer.getvalue()


def _gerar_orcamento_pdf_reportlab(os_obj, context):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="HeaderTitle", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, textColor=colors.HexColor("#1B4F8A"), spaceAfter=6))
    styles.add(ParagraphStyle(name="Muted", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#5A6070"), leading=12))
    styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading4"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#6B7C91"), spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name="HeroTitle", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=16, textColor=colors.HexColor("#10233C"), spaceAfter=6))

    story = []
    empresa = context["empresa"]
    logo_path = context.get("logo_path")
    if logo_path and os.path.exists(logo_path):
        try:
            story.append(RLImage(logo_path, width=28 * mm, height=28 * mm))
            story.append(Spacer(1, 6))
        except Exception:
            pass
    story.append(Paragraph(empresa.razao_social or empresa.nome, styles["HeaderTitle"]))
    company_lines = []
    if empresa.cnpj:
      company_lines.append(f"CNPJ: {empresa.cnpj}")
    if empresa.endereco:
      company_lines.append(empresa.endereco)
    if empresa.telefone:
      company_lines.append(f"Telefone: {empresa.telefone}")
    if empresa.email:
      company_lines.append(f"Email: {empresa.email}")
    story.append(Paragraph("<br/>".join(company_lines) or empresa.nome, styles["Muted"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Orçamento {os_obj.numero}", styles["HeroTitle"]))
    story.append(Paragraph(f"Emitido em {context['data_proposta']} | Validade {context['validade_orcamento']}", styles["Muted"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Orçamento para {os_obj.cliente.nome}", styles["HeroTitle"]))
    story.append(Paragraph(os_obj.descricao_servico or "Proposta comercial referente aos serviços e materiais descritos abaixo.", styles["Muted"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Empresa e Cliente", styles["SectionTitle"]))
    info_table = Table(
        [
            ["Empresa", empresa.razao_social or empresa.nome, "Cliente", os_obj.cliente.nome],
            ["Contato", context["contato"], "Telefone", context["telefone"] or "-"],
            ["Regime tributário", str(context["regime_tributario"]).replace("_", " "), "Condição de pagamento", os_obj.condicao_pagamento or "-"],
        ],
        colWidths=[30 * mm, 60 * mm, 35 * mm, 55 * mm],
    )
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDE5EF")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#142133")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Itens do Orçamento", styles["SectionTitle"]))
    item_rows = [["Descrição", "Origem", "Qtd", "Un.", "Unitário", "Total"]]
    for item in context["itens"]:
        item_rows.append([
            f"{item['descricao']}\n{item['codigo_referencia'] or '-'}",
            item["origem_tipo"],
            item["quantidade"],
            item["unidade_referencia"],
            item["valor_unitario_fmt"],
            item["valor_total_fmt"],
        ])
    items_table = Table(item_rows, colWidths=[68 * mm, 22 * mm, 15 * mm, 18 * mm, 28 * mm, 28 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F8FC")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#6B7C91")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6EDF5")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (2, 1), (-1, -1), "CENTER"),
        ("ALIGN", (4, 1), (5, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Resumo Financeiro", styles["SectionTitle"]))
    total_rows = [
        ["Subtotal serviços", context["subtotal_servicos_fmt"]],
        ["Subtotal materiais", context["subtotal_materiais_fmt"]],
        ["Subtotal orçamento", context["total_fmt"]],
        ["Impostos estimados", context["total_impostos_fmt"]],
        ["Total com impostos", context["total_geral_fmt"]],
    ]
    totals_table = Table(total_rows, colWidths=[90 * mm, 40 * mm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDE5EF")),
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#1B4F8A")),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 12))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Observação Fiscal", styles["SectionTitle"]))
    story.append(Paragraph(
        f"Este orçamento apresenta apenas impostos estimados para fins informativos. Estimativa atual: {context['total_impostos_fmt']}.",
        styles["Muted"],
    ))

    if os_obj.observacoes_tecnicas:
        story.append(Spacer(1, 12))
        story.append(Paragraph("Observações e Termos", styles["SectionTitle"]))
        story.append(Paragraph(os_obj.observacoes_tecnicas.replace("\n", "<br/>"), styles["Muted"]))

    doc.build(story)
    return buffer.getvalue()


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
    empresa, _ = ConfiguracaoEmpresa.objects.get_or_create(nome="ERP Servicos")
    try:
        config_os, _ = ConfiguracaoOS.objects.get_or_create()
    except (OperationalError, ProgrammingError):
        config_os = None
    fotos_antes = []
    fotos_depois = []

    for foto in os_obj.fotos.all():
        foto_data = {
            'legenda': foto.legenda or f'Foto {foto.tipo}',
            'arquivo_url': foto.arquivo.url if foto.arquivo else '',
            'arquivo_path': foto.arquivo.path if foto.arquivo else '',
            'arquivo_uri': _to_file_uri(foto.arquivo),
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
            'imagem_uri': _to_file_uri(assinatura.imagem_assinatura),
        }
        nome_signatario = assinatura.nome_signatario

    tecnico = (
        getattr(os_obj.tecnico_responsavel, "nome_completo", "")
        or getattr(os_obj.tecnico_responsavel, "username", "")
        or getattr(os_obj.tecnico_responsavel, "email", "")
        or "Não definido"
    ) if os_obj.tecnico_responsavel else 'Não definido'
    contato = os_obj.contato_responsavel.nome if os_obj.contato_responsavel else os_obj.cliente.nome
    endereco = str(os_obj.endereco_servico) if os_obj.endereco_servico else 'Não definido'

    context = {
        'os': os_obj,
        'empresa': empresa,
        'config_os': config_os,
        'logo_uri': _to_file_uri(empresa.logo),
        'logo_path': empresa.logo.path if empresa.logo else '',
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
    empresa, _ = ConfiguracaoEmpresa.objects.get_or_create(nome="ERP Servicos")
    try:
        config_os, _ = ConfiguracaoOS.objects.get_or_create()
    except (OperationalError, ProgrammingError):
        config_os = None
    itens = []
    subtotal = Decimal("0")

    for item in os_obj.itens.all():
        valor_unitario = Decimal(item.valor_unitario or 0)
        valor_total = Decimal(item.valor_total or 0)
        item_data = {
            'descricao': item.descricao,
            'origem_tipo': item.get_origem_tipo_display(),
            'codigo_referencia': item.codigo_referencia or (
                item.produto.codigo if item.produto_id and item.produto else (
                    item.servico.codigo if item.servico_id and item.servico else ""
                )
            ),
            'unidade_referencia': item.unidade_referencia or "-",
            'quantidade': f'{Decimal(item.quantidade or 0):.2f}'.replace('.', ',').rstrip('0').rstrip(','),
            'valor_unitario': f'{valor_unitario:.2f}',
            'valor_total': f'{valor_total:.2f}',
            'valor_unitario_fmt': _format_brl_trailing(valor_unitario),
            'valor_total_fmt': _format_brl_trailing(valor_total),
        }
        itens.append(item_data)
        subtotal += valor_total

    subtotal_servicos_itens = sum(
        Decimal(item.valor_total or 0)
        for item in os_obj.itens.all()
        if item.origem_tipo != "produto"
    )
    subtotal_materiais_itens = sum(
        Decimal(item.valor_total or 0)
        for item in os_obj.itens.all()
        if item.origem_tipo == "produto"
    )

    impostos = os_obj.dados_impostos or {}
    should_recalculate = (
        not impostos
        or Decimal(str(impostos.get("total_geral", 0) or 0)) <= 0
        or Decimal(str(impostos.get("total_impostos", 0) or 0)) <= 0
    ) and subtotal > 0

    if should_recalculate:
        fiscal_config, _ = ConfiguracaoFiscal.objects.get_or_create(
            empresa=empresa,
            defaults={
                "cnpj": empresa.cnpj,
                "razao_social": empresa.razao_social or empresa.nome,
            },
        )
        impostos = CalculadoraImpostos().calcular(
            valor_servicos=subtotal_servicos_itens,
            valor_materiais=subtotal_materiais_itens,
            config=fiscal_config,
        )

    subtotal_servicos = Decimal(str(impostos.get("subtotal_servicos", subtotal_servicos_itens or os_obj.valor_servicos or 0) or 0))
    subtotal_materiais = Decimal(str(impostos.get("subtotal_materiais", subtotal_materiais_itens or os_obj.valor_materiais or 0) or 0))
    total_impostos = Decimal(str(impostos.get("total_impostos", 0) or 0))
    total_geral = Decimal(str(impostos.get("total_geral", (Decimal(os_obj.valor_total_orcado or subtotal) + total_impostos)) or 0))
    descontos = max(subtotal - Decimal(os_obj.valor_total_orcado or subtotal), Decimal("0"))

    contato = os_obj.contato_responsavel.nome if os_obj.contato_responsavel else os_obj.cliente.nome
    endereco = str(os_obj.endereco_servico) if os_obj.endereco_servico else 'A definir'
    telefone = os_obj.cliente.telefone if hasattr(os_obj.cliente, 'telefone') else 'A definir'
    cliente_email = os_obj.cliente.email if hasattr(os_obj.cliente, "email") else ""
    aliq = impostos.get("aliquotas") or {}

    impostos_detalhados = [
        {"nome": "ISS", "aliquota": aliq.get("iss", 0), "valor": impostos.get("iss", 0)},
        {"nome": "PIS", "aliquota": aliq.get("pis", 0), "valor": impostos.get("pis", 0)},
        {"nome": "COFINS", "aliquota": aliq.get("cofins", 0), "valor": impostos.get("cofins", 0)},
        {"nome": "IRPJ", "aliquota": aliq.get("irpj", 0), "valor": impostos.get("irpj", 0)},
        {"nome": "CSLL", "aliquota": aliq.get("csll", 0), "valor": impostos.get("csll", 0)},
    ]

    if "das" in aliq:
        impostos_detalhados.insert(
            0,
            {"nome": "DAS", "aliquota": aliq.get("das", 0), "valor": impostos.get("total_impostos", 0)},
        )

    context = {
        'os': os_obj,
        'empresa': empresa,
        'config_os': config_os,
        'logo_uri': _to_file_uri(empresa.logo),
        'logo_path': empresa.logo.path if empresa.logo else '',
        'data_proposta': datetime.now().strftime('%d/%m/%Y'),
        'validade_orcamento': os_obj.validade_orcamento.strftime('%d/%m/%Y') if os_obj.validade_orcamento else 'A combinar',
        'itens': itens,
        'subtotal': f'{subtotal:.2f}',
        'subtotal_fmt': _format_brl_trailing(subtotal),
        'subtotal_servicos': f'{subtotal_servicos:.2f}',
        'subtotal_servicos_fmt': _format_brl_trailing(subtotal_servicos),
        'subtotal_materiais': f'{subtotal_materiais:.2f}',
        'subtotal_materiais_fmt': _format_brl_trailing(subtotal_materiais),
        'descontos': f'{descontos:.2f}',
        'total_impostos': f'{total_impostos:.2f}',
        'total_impostos_fmt': _format_brl_trailing(total_impostos),
        'total': f'{Decimal(os_obj.valor_total_orcado or subtotal):.2f}',
        'total_fmt': _format_brl_trailing(Decimal(os_obj.valor_total_orcado or subtotal)),
        'total_geral': f'{total_geral:.2f}',
        'total_geral_fmt': _format_brl_trailing(total_geral),
        'contato': contato,
        'endereco': endereco,
        'telefone': telefone,
        'cliente_email': cliente_email,
        'impostos': impostos_detalhados,
        'regime_tributario': impostos.get("regime", "-"),
        'observacao_impostos': impostos.get("observacao", ""),
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
        os_obj = OrdemServico.objects.get(pk=os_id)
    except OrdemServico.DoesNotExist:
        return None

    context = None
    try:
        context = _prepare_relatorio_context(os_obj)
        from weasyprint import HTML

        html_string = render_to_string('pdfs/relatorio_servico.html', context)

        pdf_bytes = HTML(
            string=html_string,
            base_url=str(settings.BASE_DIR),
        ).write_pdf()

        return pdf_bytes

    except Exception as e:
        print(f"WeasyPrint indisponível para relatório {os_id}, usando fallback ReportLab: {str(e)}")
        try:
            if context is None:
                context = _prepare_relatorio_context(os_obj)
            return _gerar_relatorio_pdf_reportlab(os_obj, context)
        except Exception as fallback_error:
            print(f"Erro ao gerar PDF de relatório para OS {os_id}: {str(fallback_error)}")
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
        os_obj = OrdemServico.objects.get(pk=os_id)
    except OrdemServico.DoesNotExist:
        return None

    context = _prepare_orcamento_context(os_obj)

    try:
        from weasyprint import HTML

        html_string = render_to_string('pdfs/orcamento.html', context)

        pdf_bytes = HTML(
            string=html_string,
            base_url=str(settings.BASE_DIR),
        ).write_pdf()

        return pdf_bytes

    except Exception as e:
        print(f"WeasyPrint indisponível para orçamento {os_id}, usando fallback ReportLab: {str(e)}")
        try:
            return _gerar_orcamento_pdf_reportlab(os_obj, context)
        except Exception as fallback_error:
            print(f"Erro ao gerar PDF de orçamento para OS {os_id}: {str(fallback_error)}")
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
