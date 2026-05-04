import os
from datetime import datetime
from io import BytesIO
from pathlib import Path
from decimal import Decimal

from django.conf import settings
from django.db.utils import OperationalError, ProgrammingError
from django.template.loader import render_to_string

from apps.configuracoes.models import ConfiguracaoOS, get_empresa_configurada
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
    from html import escape

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
    styles.add(ParagraphStyle(name="HeaderTitle", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, textColor=colors.HexColor("#3B82F6"), spaceAfter=6))
    styles.add(ParagraphStyle(name="Muted", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#5A6070"), leading=12))
    styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading4"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#6B7C91"), spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name="HeroTitle", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=16, textColor=colors.HexColor("#10233C"), spaceAfter=6))
    styles.add(ParagraphStyle(name="HeaderWhite", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=13, textColor=colors.white, leading=16))
    styles.add(ParagraphStyle(name="HeaderMuted", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#CBD5E1"), leading=11))
    styles.add(ParagraphStyle(name="SmallLabel", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#64748B"), leading=10))
    styles.add(ParagraphStyle(name="SmallValue", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#0F172A"), leading=10))

    def p(value):
        return escape(str(value or "-")).replace("\n", "<br/>")

    story = []
    empresa = context["empresa"]
    logo_path = context.get("logo_path")
    company_lines = [
        f"CNPJ: {empresa.cnpj}" if empresa.cnpj else "",
        empresa.endereco or "",
        f"Telefone: {empresa.telefone}" if empresa.telefone else "",
        f"Email: {empresa.email}" if empresa.email else "",
        empresa.site or "",
    ]
    company_info = "<br/>".join(p(line) for line in company_lines if line)

    if logo_path and os.path.exists(logo_path):
        try:
            logo_cell = RLImage(logo_path, width=22 * mm, height=22 * mm)
        except Exception:
            logo_cell = Paragraph(p((empresa.razao_social or empresa.nome or "EN")[:2]).upper(), styles["HeaderWhite"])
    else:
        logo_cell = Paragraph(p((empresa.razao_social or empresa.nome or "EN")[:2]).upper(), styles["HeaderWhite"])

    company_header = Table(
        [[logo_cell, [
            Paragraph(p(empresa.razao_social or empresa.nome), styles["HeaderWhite"]),
            Paragraph(company_info or p(empresa.nome), styles["HeaderMuted"]),
        ]]],
        colWidths=[28 * mm, 88 * mm],
    )
    company_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    doc_header = Table(
        [[
            company_header,
            [
                Paragraph("ORÇAMENTO", styles["HeaderMuted"]),
                Paragraph(p(os_obj.numero), styles["HeaderWhite"]),
                Paragraph(f"Emitido em {p(context['data_proposta'])}<br/>Válido até {p(context['validade_orcamento'])}", styles["HeaderMuted"]),
            ],
        ]],
        colWidths=[122 * mm, 55 * mm],
    )
    doc_header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
        ("BOX", (0, 0), (-1, -1), 0, colors.HexColor("#0F172A")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(doc_header)
    story.append(Spacer(1, 12))

    story.append(Paragraph(f"Orçamento para {p(os_obj.cliente.nome)}", styles["HeroTitle"]))
    story.append(Paragraph(p(os_obj.descricao_servico or "Proposta comercial referente aos serviços e materiais descritos abaixo."), styles["Muted"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Empresa e Cliente", styles["SectionTitle"]))
    info_table = Table(
        [
            [Paragraph("Empresa", styles["SmallLabel"]), Paragraph(p(empresa.razao_social or empresa.nome), styles["SmallValue"]), Paragraph("Cliente", styles["SmallLabel"]), Paragraph(p(os_obj.cliente.nome), styles["SmallValue"])],
            [Paragraph("Contato", styles["SmallLabel"]), Paragraph(p(context["contato"]), styles["SmallValue"]), Paragraph("Telefone", styles["SmallLabel"]), Paragraph(p(context["telefone"] or "-"), styles["SmallValue"])],
            [Paragraph("Email", styles["SmallLabel"]), Paragraph(p(context.get("cliente_email") or "-"), styles["SmallValue"]), Paragraph("Endereço", styles["SmallLabel"]), Paragraph(p(context["endereco"]), styles["SmallValue"])],
            [Paragraph("Regime tributário", styles["SmallLabel"]), Paragraph(p(str(context["regime_tributario"]).replace("_", " ")), styles["SmallValue"]), Paragraph("Condição de pagamento", styles["SmallLabel"]), Paragraph(p(os_obj.condicao_pagamento or "-"), styles["SmallValue"])],
        ],
        colWidths=[30 * mm, 58 * mm, 34 * mm, 58 * mm],
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
            Paragraph(f"<b>{p(item['descricao'])}</b><br/><font color='#94A3B8'>Cód: {p(item['codigo_referencia'] or '-')}</font>", styles["SmallValue"]),
            Paragraph(p(item["origem_tipo"]), styles["SmallValue"]),
            Paragraph(p(item["quantidade"]), styles["SmallValue"]),
            Paragraph(p(item["unidade_referencia"]), styles["SmallValue"]),
            Paragraph(p(item["valor_unitario_fmt"]), styles["SmallValue"]),
            Paragraph(p(item["valor_total_fmt"]), styles["SmallValue"]),
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
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#3B82F6")),
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

    # Seção "Empresas que confiam em nós"
    try:
        from apps.configuracoes.models import LogoClienteReferencia
        logos_ativos = list(LogoClienteReferencia.objects.filter(ativo=True).order_by("ordem", "criado_em"))
        if logos_ativos:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Empresas que confiam em nós", styles["SectionTitle"]))
            logo_cells = []
            for logo_obj in logos_ativos[:10]:
                try:
                    logo_path = logo_obj.logo.path if logo_obj.logo else None
                    if logo_path and os.path.exists(logo_path):
                        logo_cells.append(RLImage(logo_path, width=22 * mm, height=12 * mm))
                    else:
                        logo_cells.append(Paragraph(logo_obj.nome, styles["Muted"]))
                except Exception:
                    logo_cells.append(Paragraph(logo_obj.nome, styles["Muted"]))
            col_count = min(len(logo_cells), 5)
            rows = [logo_cells[i:i + col_count] for i in range(0, len(logo_cells), col_count)]
            if rows[-1] and len(rows[-1]) < col_count:
                rows[-1] += [Paragraph("", styles["Muted"])] * (col_count - len(rows[-1]))
            col_w = (181 * mm) / col_count
            logos_table = Table(rows, colWidths=[col_w] * col_count)
            logos_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(logos_table)
    except Exception:
        pass

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
    empresa = get_empresa_configurada()
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
    empresa = get_empresa_configurada()
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


def _gerar_relatorio_tecnico_reportlab(os_obj):
    """Gera PDF profissional de relatório técnico de execução com checklist e fotos."""
    from html import escape

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        HRFlowable, Image as RLImage, Paragraph,
        SimpleDocTemplate, Spacer, Table, TableStyle
    )

    context = _prepare_relatorio_context(os_obj)
    empresa = context["empresa"]

    cor_empresa = (empresa.cor_principal or "#3B82F6").strip()
    if cor_empresa.upper() == "#1B4F8A" or not cor_empresa.startswith("#") or len(cor_empresa) != 7:
        cor_empresa = "#3B82F6"

    PRIMARY = colors.HexColor("#0F172A")
    BRAND = colors.HexColor(cor_empresa)
    ACCENT = colors.HexColor("#3B82F6")
    LIGHT = colors.HexColor("#F8FAFC")
    BORDER = colors.HexColor("#DDE5EF")
    MUTED = colors.HexColor("#64748B")
    DARK_MUTED = colors.HexColor("#334155")
    GREEN = colors.HexColor("#10B981")
    RED = colors.HexColor("#EF4444")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="DocLabel", fontName="Helvetica-Bold", fontSize=8,
                               textColor=colors.HexColor("#BFDBFE"), spaceAfter=4,
                               uppercase=True))
    styles.add(ParagraphStyle(name="DocTitle", fontName="Helvetica-Bold", fontSize=17,
                               textColor=colors.white, leading=20, spaceAfter=3))
    styles.add(ParagraphStyle(name="DocSubtitle", fontName="Helvetica", fontSize=10,
                               textColor=colors.HexColor("#CBD5E1"), spaceAfter=0))
    styles.add(ParagraphStyle(name="EmpresaNome", fontName="Helvetica-Bold", fontSize=15,
                               textColor=PRIMARY, leading=18, spaceAfter=3))
    styles.add(ParagraphStyle(name="EmpresaInfo", fontName="Helvetica", fontSize=8,
                               textColor=MUTED, leading=11))
    styles.add(ParagraphStyle(name="SecTitle", fontName="Helvetica-Bold", fontSize=9,
                               textColor=DARK_MUTED, spaceAfter=6, spaceBefore=14,
                               textTransform="uppercase"))
    styles.add(ParagraphStyle(name="CardTitle", fontName="Helvetica-Bold", fontSize=10,
                               textColor=PRIMARY, leading=13, spaceAfter=4))
    styles.add(ParagraphStyle(name="Body", fontName="Helvetica", fontSize=9,
                               textColor=PRIMARY, leading=13))
    styles.add(ParagraphStyle(name="BodyMuted", fontName="Helvetica", fontSize=9,
                               textColor=MUTED, leading=13))
    styles.add(ParagraphStyle(name="PerguntaTexto", fontName="Helvetica-Bold", fontSize=9,
                               textColor=PRIMARY, leading=13, spaceBefore=8))
    styles.add(ParagraphStyle(name="RespostaTexto", fontName="Helvetica", fontSize=9,
                               textColor=MUTED, leading=13, leftIndent=12))
    styles.add(ParagraphStyle(name="FooterText", fontName="Helvetica", fontSize=8,
                               textColor=MUTED))

    story = []

    def p(value):
        return escape(str(value or "-")).replace("\n", "<br/>")

    def compact_lines(lines):
        return "<br/>".join(p(line) for line in lines if line)

    # ── CAPA / CABEÇALHO CORPORATIVO ─────────────────────────────────────────
    logo_elem = None
    logo_path = context.get("logo_path")
    if logo_path and os.path.exists(logo_path):
        try:
            logo_elem = RLImage(logo_path, width=26 * mm, height=20 * mm)
        except Exception:
            logo_elem = None

    empresa_nome = empresa.razao_social or empresa.nome or "Empresa"
    empresa_site = getattr(empresa, "site", "") or ""
    empresa_info_lines = [
        f"CNPJ: {empresa.cnpj}" if empresa.cnpj else "",
        empresa.endereco or "",
        f"Tel: {empresa.telefone}" if empresa.telefone else "",
        f"E-mail: {empresa.email}" if empresa.email else "",
        empresa_site,
    ]
    empresa_info = compact_lines(empresa_info_lines)

    tipo_label = os_obj.get_tipo_servico_display() if os_obj.tipo_servico else "Serviço"
    doc_title = f"Relatório Técnico<br/>{p(tipo_label)}"
    doc_subtitle = f"{p(os_obj.numero)}  |  Emitido em {p(context['data_emissao'])}"

    if logo_elem:
        header_left = Table(
            [[logo_elem, Table([[Paragraph(p(empresa_nome), styles["EmpresaNome"])],
                                 [Paragraph(empresa_info, styles["EmpresaInfo"])]],
                                colWidths=[82 * mm], style=[
                                    ("LEFTPADDING", (0,0),(-1,-1), 8),
                                    ("VALIGN", (0,0),(-1,-1), "MIDDLE"),
                                ])]],
            colWidths=[30 * mm, 86 * mm],
        )
    else:
        header_left = Table(
            [[Paragraph(p(empresa_nome), styles["EmpresaNome"])],
             [Paragraph(empresa_info, styles["EmpresaInfo"])]],
            colWidths=[116 * mm],
        )

    header_right = Table(
        [[Paragraph("DOCUMENTO TECNICO", styles["DocLabel"])],
         [Paragraph(doc_title, styles["DocTitle"])],
         [Paragraph(doc_subtitle, styles["DocSubtitle"])]],
        colWidths=[64 * mm],
    )
    header_table = Table(
        [[header_left, header_right]],
        colWidths=[116 * mm, 64 * mm],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.white),
        ("BACKGROUND", (1, 0), (1, 0), PRIMARY),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("LINEBEFORE", (1, 0), (1, 0), 4, BRAND),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, -1), 12),
        ("RIGHTPADDING", (0, 0), (0, -1), 12),
        ("LEFTPADDING", (1, 0), (1, -1), 12),
        ("RIGHTPADDING", (1, 0), (1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 12))

    cliente = os_obj.cliente
    cliente_info = compact_lines([
        cliente.nome,
        f"Documento: {cliente.cnpj_cpf}" if getattr(cliente, "cnpj_cpf", "") else "",
        f"Telefone: {cliente.telefone}" if getattr(cliente, "telefone", "") else "",
        f"WhatsApp: {cliente.whatsapp}" if getattr(cliente, "whatsapp", "") else "",
        f"E-mail: {cliente.email}" if getattr(cliente, "email", "") else "",
        f"Endereço do serviço: {context['endereco']}" if context.get("endereco") else "",
    ])
    empresa_card = Table(
        [[
            Paragraph("Empresa responsável", styles["CardTitle"]),
            Paragraph("Cliente contratante", styles["CardTitle"]),
        ], [
            Paragraph(empresa_info or p(empresa_nome), styles["BodyMuted"]),
            Paragraph(cliente_info, styles["BodyMuted"]),
        ]],
        colWidths=[90 * mm, 90 * mm],
    )
    empresa_card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(empresa_card)

    resumo_rows = [[
        Paragraph(f"<b>{p(os_obj.numero)}</b><br/><font color='#64748B'>Ordem de serviço</font>", styles["Body"]),
        Paragraph(f"<b>{p(os_obj.get_status_display())}</b><br/><font color='#64748B'>Status</font>", styles["Body"]),
        Paragraph(f"<b>{p(context['tecnico'])}</b><br/><font color='#64748B'>Técnico</font>", styles["Body"]),
        Paragraph(f"<b>{p(context['data_execucao'])}</b><br/><font color='#64748B'>Execução</font>", styles["Body"]),
    ]]
    resumo_table = Table(resumo_rows, colWidths=[45 * mm] * 4)
    resumo_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#BFDBFE")),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#BFDBFE")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(Spacer(1, 10))
    story.append(resumo_table)
    story.append(Spacer(1, 10))

    apresentacao = (
        "Este relatório técnico consolida as evidências do atendimento, "
        "condições encontradas, checklist executado, registros fotográficos "
        "e informações de rastreabilidade da ordem de serviço. O documento "
        "foi emitido para análise operacional, validação do contratante e "
        "histórico técnico da manutenção."
    )
    apresentacao_table = Table(
        [[Paragraph("Apresentação do relatório", styles["CardTitle"])],
         [Paragraph(apresentacao, styles["BodyMuted"])]],
        colWidths=[180 * mm],
    )
    apresentacao_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(apresentacao_table)

    # ── DADOS DA OS ──────────────────────────────────────────────────────────
    story.append(Paragraph("Dados da Ordem de Serviço", styles["SecTitle"]))
    dados_rows = [
        ["Nº OS", os_obj.numero or "-", "Status", os_obj.get_status_display()],
        ["Cliente", os_obj.cliente.nome, "Técnico", context["tecnico"]],
        ["Endereço", context["endereco"], "Contato", context["contato"]],
        ["Data execução", context["data_execucao"], "Horário",
         f"{context['hora_inicio']} às {context['hora_conclusao']}"],
        ["Tipo de serviço", tipo_label, "Prioridade", os_obj.get_prioridade_display()],
    ]
    if os_obj.equipamento_marca or os_obj.equipamento_modelo:
        dados_rows.append([
            "Equipamento",
            f"{os_obj.equipamento_marca or ''} {os_obj.equipamento_modelo or ''}".strip(),
            "Nº de série",
            os_obj.equipamento_serie or "-",
        ])

    dados_table = Table(dados_rows, colWidths=[30 * mm, 60 * mm, 30 * mm, 60 * mm])
    dados_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
        ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT]),
    ]))
    story.append(dados_table)

    # ── DESCRIÇÃO DO SERVIÇO ──────────────────────────────────────────────────
    if os_obj.descricao_servico:
        story.append(Paragraph("Descrição do Serviço", styles["SecTitle"]))
        story.append(Paragraph(p(os_obj.descricao_servico), styles["Body"]))

    # ── CHECKLIST TÉCNICO ──────────────────────────────────────────────────────
    respostas = list(
        os_obj.respostas_checklist
        .select_related("item__template")
        .prefetch_related("fotos")
        .order_by("item__template_id", "item__ordem")
    )

    if respostas:
        story.append(Paragraph("Checklist Técnico", styles["SecTitle"]))
        story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=6))

        template_atual = None
        for resp in respostas:
            if resp.item.template_id != template_atual:
                template_atual = resp.item.template_id
                story.append(Paragraph(resp.item.template.nome, styles["PerguntaTexto"]))
                story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=4))

            story.append(Paragraph(f"• {resp.item.texto}", styles["PerguntaTexto"]))

            if resp.item.tipo_resposta == "sim_nao":
                if resp.valor_bool is True:
                    val_str = "✓ Sim"
                    val_color = GREEN
                elif resp.valor_bool is False:
                    val_str = "✗ Não"
                    val_color = RED
                else:
                    val_str = "— Não respondido"
                    val_color = MUTED
                story.append(Paragraph(
                    f'<font color="{val_color.hexval()}">{val_str}</font>',
                    styles["RespostaTexto"],
                ))
            elif resp.item.tipo_resposta in ("texto", "numero", "multiplo"):
                partes = []
                if resp.valor_bool is not None:
                    partes.append("Sim" if resp.valor_bool else "Não")
                if resp.valor_texto:
                    partes.append(resp.valor_texto)
                if resp.valor_numero is not None:
                    partes.append(str(resp.valor_numero))
                story.append(Paragraph(
                    " | ".join(partes) if partes else "— Sem resposta",
                    styles["RespostaTexto"],
                ))

            fotos_resp = list(resp.fotos.all())
            if fotos_resp:
                foto_row = []
                for foto in fotos_resp[:3]:
                    try:
                        fpath = foto.arquivo.path
                        if os.path.exists(fpath):
                            foto_img = RLImage(fpath, width=40 * mm, height=28 * mm)
                            foto_row.append(Table(
                                [[foto_img], [Paragraph(foto.legenda or "", styles["BodyMuted"])]],
                                style=[("ALIGN", (0,0),(-1,-1), "CENTER")]
                            ))
                    except Exception:
                        pass
                if foto_row:
                    while len(foto_row) < 3:
                        foto_row.append(Paragraph("", styles["Body"]))
                    f_table = Table([foto_row], colWidths=[60 * mm, 60 * mm, 60 * mm])
                    f_table.setStyle(TableStyle([
                        ("VALIGN", (0,0),(-1,-1), "TOP"),
                        ("LEFTPADDING", (0,0),(0,-1), 12),
                    ]))
                    story.append(f_table)

            story.append(Spacer(1, 4))

    # ── OBSERVAÇÕES TÉCNICAS ──────────────────────────────────────────────────
    if os_obj.observacoes_tecnicas:
        story.append(Paragraph("Observações Técnicas", styles["SecTitle"]))
        story.append(Paragraph(os_obj.observacoes_tecnicas.replace("\n", "<br/>"), styles["Body"]))

    # ── GALERIA DE FOTOS ──────────────────────────────────────────────────────
    fotos_antes = context.get("fotos_antes", [])
    fotos_depois = context.get("fotos_depois", [])
    todas_fotos = fotos_antes + fotos_depois
    if todas_fotos:
        story.append(Paragraph("Registro Fotográfico", styles["SecTitle"]))
        foto_rows = []
        current_row = []
        for f_data in todas_fotos[:12]:
            fp = f_data.get("arquivo_path")
            if fp and os.path.exists(fp):
                try:
                    img_cell = Table(
                        [[RLImage(fp, width=55 * mm, height=38 * mm)],
                         [Paragraph(f_data.get("legenda") or "", styles["BodyMuted"])]],
                        style=[("ALIGN", (0,0),(-1,-1), "CENTER")]
                    )
                    current_row.append(img_cell)
                except Exception:
                    continue
            if len(current_row) == 3:
                foto_rows.append(current_row)
                current_row = []
        if current_row:
            while len(current_row) < 3:
                current_row.append(Paragraph("", styles["Body"]))
            foto_rows.append(current_row)
        if foto_rows:
            gallery = Table(foto_rows, colWidths=[62 * mm, 62 * mm, 62 * mm])
            gallery.setStyle(TableStyle([
                ("VALIGN", (0,0),(-1,-1), "TOP"),
                ("BOTTOMPADDING", (0,0),(-1,-1), 8),
            ]))
            story.append(gallery)

    # ── ASSINATURA ────────────────────────────────────────────────────────────
    assinatura = context.get("assinatura")
    if assinatura:
        story.append(Paragraph("Assinatura do Cliente", styles["SecTitle"]))
        ass_path = assinatura.get("imagem_uri", "").replace("file:///", "")
        if ass_path and os.path.exists(ass_path):
            try:
                story.append(RLImage(ass_path, width=60 * mm, height=25 * mm))
            except Exception:
                pass
        nome_sig = context.get("nome_signatario")
        if nome_sig:
            story.append(Paragraph(nome_sig, styles["Body"]))
    else:
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width=80 * mm, thickness=0.8, color=MUTED))
        story.append(Paragraph("Assinatura do cliente / responsável", styles["FooterText"]))

    # ── LOGOS PARCEIROS ───────────────────────────────────────────────────────
    try:
        from apps.configuracoes.models import LogoClienteReferencia
        logos_ativos = list(LogoClienteReferencia.objects.filter(ativo=True).order_by("ordem", "criado_em"))
        if logos_ativos:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Empresas que confiam em nós", styles["SecTitle"]))
            logo_cells = []
            for logo_obj in logos_ativos[:8]:
                try:
                    lpath = logo_obj.logo.path if logo_obj.logo else None
                    if lpath and os.path.exists(lpath):
                        logo_cells.append(RLImage(lpath, width=20 * mm, height=11 * mm))
                    else:
                        logo_cells.append(Paragraph(logo_obj.nome, styles["BodyMuted"]))
                except Exception:
                    logo_cells.append(Paragraph(logo_obj.nome, styles["BodyMuted"]))
            col_count = min(len(logo_cells), 4)
            rows = [logo_cells[i:i+col_count] for i in range(0, len(logo_cells), col_count)]
            if rows and rows[-1] and len(rows[-1]) < col_count:
                rows[-1] += [Paragraph("", styles["BodyMuted"])] * (col_count - len(rows[-1]))
            col_w = (181 * mm) / col_count
            logos_t = Table(rows, colWidths=[col_w] * col_count)
            logos_t.setStyle(TableStyle([
                ("ALIGN", (0,0),(-1,-1), "CENTER"),
                ("VALIGN", (0,0),(-1,-1), "MIDDLE"),
                ("GRID", (0,0),(-1,-1), 0.3, BORDER),
                ("PADDING", (0,0),(-1,-1), 6),
            ]))
            story.append(logos_t)
    except Exception:
        pass

    # ── RODAPÉ ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 16))
    rodape_rows = [[
        Paragraph(empresa_nome, styles["FooterText"]),
        Paragraph(f"Relatório gerado em {context['data_emissao']}", styles["FooterText"]),
        Paragraph(os_obj.numero or "", styles["FooterText"]),
    ]]
    rodape_t = Table(rodape_rows, colWidths=[65 * mm, 65 * mm, 51 * mm])
    rodape_t.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), LIGHT),
        ("TOPPADDING", (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING", (0,0),(0,-1), 8),
        ("RIGHTPADDING", (-1,0),(-1,-1), 8),
        ("ALIGN", (1,0),(1,-1), "CENTER"),
        ("ALIGN", (2,0),(2,-1), "RIGHT"),
        ("FONTSIZE", (0,0),(-1,-1), 7),
    ]))
    story.append(rodape_t)

    doc.build(story)
    return buffer.getvalue()


def gerar_relatorio_tecnico_pdf(os_id):
    """Gera PDF do relatório técnico de execução e retorna bytes."""
    try:
        os_obj = OrdemServico.objects.select_related(
            "cliente", "tecnico_responsavel", "contato_responsavel",
            "endereco_servico",
        ).prefetch_related(
            "fotos",
            "respostas_checklist__item__template",
            "respostas_checklist__fotos",
        ).get(pk=os_id)
    except OrdemServico.DoesNotExist:
        return None
    return _gerar_relatorio_tecnico_reportlab(os_obj)


def salvar_relatorio_tecnico_pdf(os_obj, pdf_bytes):
    """Salva os bytes do PDF no campo pdf_relatorio da OS."""
    from django.core.files.base import ContentFile
    nome = f"relatorio_tecnico_{os_obj.numero or os_obj.pk}.pdf"
    os_obj.pdf_relatorio.save(nome, ContentFile(pdf_bytes), save=True)


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
