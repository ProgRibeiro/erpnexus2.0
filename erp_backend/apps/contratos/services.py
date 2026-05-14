import io
import os
from calendar import monthrange
from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.core.files.base import ContentFile
from django.db import models, transaction
from django.utils import timezone
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.configuracoes.models import get_empresa_configurada
from apps.ordens.models import ItemOrcamento, OrdemServico

from .models import EscopoTecnico, FaturaContrato, ItemChecklistContrato, ItemChecklistPadrao, OSContratoPreventiva


TIPO_OS_POR_ESCOPO = {
    "HVAC": OrdemServico.TipoServico.HVAC,
    "REF": OrdemServico.TipoServico.REFRIGERACAO,
    "ELE": OrdemServico.TipoServico.ELETRICA,
    "CIV": OrdemServico.TipoServico.CIVIL,
}

OBJETIVO_PREVENTIVA_PADRAO = (
    "Executar manutenção preventiva periódica em sistemas e instalações prediais, "
    "visando garantir segurança, eficiência operacional, conservação dos equipamentos, "
    "redução de falhas corretivas, aumento da vida útil dos ativos e conformidade com "
    "boas práticas técnicas."
)

CHECKLIST_GERAL_PREVENTIVA = [
    "Equipamento/local identificado corretamente",
    "Acesso ao equipamento seguro",
    "Área limpa e organizada",
    "Equipamento sem danos visíveis",
    "Equipamento operando normalmente",
    "Ausência de ruídos anormais",
    "Ausência de vibração excessiva",
    "Ausência de vazamentos",
    "Fixações em bom estado",
    "Segurança operacional verificada",
    "Limpeza executada",
    "Teste funcional executado",
    "Medições registradas",
    "Fotos anexadas, quando necessário",
    "Anomalias registradas",
    "Cliente/responsável informado",
    "OS finalizada com observações técnicas",
]

STATUS_CHECKLIST_PREVENTIVA = [
    {"valor": "conforme", "label": "Conforme"},
    {"valor": "nao_conforme", "label": "Não conforme"},
    {"valor": "nao_aplicavel", "label": "Não aplicável"},
    {"valor": "corrigido_durante_visita", "label": "Corrigido durante a visita"},
    {"valor": "requer_orcamento", "label": "Requer orçamento"},
    {"valor": "requer_retorno_tecnico", "label": "Requer retorno técnico"},
    {"valor": "equipamento_parado", "label": "Equipamento parado"},
    {"valor": "operando_com_restricao", "label": "Equipamento operando com restrição"},
]

PERIODICIDADE_SUGERIDA = {
    "HVAC": ["Mensal", "Trimestral"],
    "REF": ["Mensal", "Quinzenal em sistemas críticos"],
    "ELE": ["Mensal", "Trimestral"],
    "CIV": ["Trimestral", "Semestral"],
    "PEN": ["Mensal", "Trimestral"],
    "HID": ["Mensal", "Trimestral"],
    "INC": ["Mensal", "Semestral"],
    "CFTV": ["Mensal", "Trimestral"],
}

EQUIPAMENTOS_ATENDIDOS = {
    "HVAC": [
        "Split hi-wall", "Split piso teto", "Cassete", "Duto", "Self contained",
        "Fan coil", "Chiller", "VRF / VRV", "Exaustores", "Ventiladores",
        "Cortinas de ar", "Casas de máquinas de ar-condicionado",
    ],
    "REF": [
        "Câmaras frias", "Balcões refrigerados", "Freezers", "Geladeiras comerciais",
        "Expositores refrigerados", "Unidades condensadoras", "Unidades evaporadoras",
        "Túneis de congelamento", "Sistemas frigoríficos comerciais ou industriais",
    ],
    "ELE": [
        "Quadros elétricos", "Disjuntores", "Barramentos", "Cabos e conexões",
        "Tomadas", "Interruptores", "Iluminação", "Circuitos de força",
        "Circuitos de comando", "Aterramento", "DR / DPS", "Motores elétricos",
        "Sistemas de proteção",
    ],
    "CIV": [
        "Paredes", "Pisos", "Forros", "Telhados", "Calhas", "Rufos", "Portas",
        "Janelas", "Fechaduras", "Pintura", "Alvenaria", "Estruturas metálicas simples",
        "Áreas técnicas", "Casas de máquinas", "Áreas externas", "Bases de equipamentos",
    ],
    "PEN": [
        "Porta de enrolar manual", "Porta de enrolar automática", "Porta de aço",
        "Porta transvision", "Porta industrial", "Motorredutor", "Central de comando",
        "Controle remoto", "Botoeira", "Guias laterais", "Molas e eixo",
    ],
}

CLASSIFICACAO_ANOMALIAS = [
    {"classificacao": "Baixa", "descricao": "Não compromete a operação imediata"},
    {"classificacao": "Média", "descricao": "Pode gerar falha futura"},
    {"classificacao": "Alta", "descricao": "Pode comprometer a operação"},
    {"classificacao": "Crítica", "descricao": "Risco de parada, acidente ou dano grave"},
]

CAMPOS_OS_PREVENTIVA = [
    "Cliente", "Unidade", "Setor", "Área técnica", "Equipamento", "TAG do equipamento",
    "Localização", "Fabricante", "Modelo", "Número de série", "Periodicidade",
    "Tipo de manutenção", "Técnico responsável", "Data programada", "Data de execução",
    "Horário de início", "Horário de término", "Status da OS", "Prioridade",
    "Observações técnicas", "Fotos antes", "Fotos depois", "Assinatura do cliente",
]


class GeradorCronograma:
    def gerar_para_contrato(self, contrato, criar_os_principal=True):
        criadas = []
        with transaction.atomic():
            contrato.os_contrato.all().delete()
            for unidade in contrato.unidades.filter(ativo=True).prefetch_related("escopos__escopo"):
                for escopo_un in unidade.escopos.filter(ativo=True).select_related("escopo"):
                    meses_intervalo = self._calcular_intervalo(escopo_un.periodicidade)
                    data_atual = contrato.data_inicio
                    visita = 1
                    while data_atual <= contrato.data_fim:
                        ordem = None
                        if criar_os_principal:
                            ordem = self._criar_ordem_servico(contrato, unidade, escopo_un, data_atual)
                        os_contrato = OSContratoPreventiva.objects.create(
                            contrato=contrato,
                            unidade_contrato=unidade,
                            escopo_unidade=escopo_un,
                            ordem_servico=ordem,
                            numero_visita=visita,
                            data_prevista=data_atual,
                            status=OSContratoPreventiva.Status.PROGRAMADA,
                            tecnico_responsavel=contrato.responsavel_tecnico,
                        )
                        criadas.append(os_contrato)
                        data_atual = data_atual + relativedelta(months=meses_intervalo)
                        visita += 1
        return criadas

    def _calcular_intervalo(self, periodicidade):
        return {
            "mensal": 1,
            "bimestral": 2,
            "trimestral": 3,
            "quadrimestral": 4,
            "semestral": 6,
            "anual": 12,
        }[periodicidade]

    def _criar_ordem_servico(self, contrato, unidade, escopo_un, data_prevista):
        escopo = escopo_un.escopo
        descricao = (
            f"Preventiva contratual {escopo.nome} - {unidade.nome_unidade}. "
            f"Contrato {contrato.numero}. Equipamentos: {escopo_un.equipamentos_descricao or escopo_un.equipamentos_quantidade}."
        )
        ordem = OrdemServico.objects.create(
            cliente=contrato.cliente,
            status=OrdemServico.Status.AGENDADA,
            tipo_servico=TIPO_OS_POR_ESCOPO.get(escopo.codigo, OrdemServico.TipoServico.MANUTENCAO),
            prioridade=OrdemServico.Prioridade.MEDIA,
            origem_referencia_tipo="contrato_preventiva",
            origem_referencia_id=contrato.id,
            descricao_servico=descricao,
            data_agendada=data_prevista,
            tecnico_responsavel=contrato.responsavel_tecnico,
            observacoes_tecnicas=f"OS gerada automaticamente pelo contrato {contrato.numero}.",
            criado_por=contrato.criado_por,
            atualizado_por=contrato.criado_por,
        )
        ItemOrcamento.objects.create(
            os=ordem,
            origem_tipo=ItemOrcamento.OrigemTipo.AVULSO,
            descricao=f"Visita preventiva {escopo.nome} - {unidade.nome_unidade}",
            quantidade=1,
            unidade_referencia="visita",
            valor_unitario=escopo_un.valor_alocado or 0,
            codigo_referencia=contrato.numero,
        )
        return ordem


class GeradorChecklistContrato:
    def criar_padrao_para_escopo_unidade(self, escopo_unidade, checklist_ids=None):
        itens = []
        ItemChecklistContrato.objects.filter(escopo_unidade=escopo_unidade).delete()
        queryset = escopo_unidade.escopo.checklist_padrao.filter(ativo=True)
        if checklist_ids:
            queryset = queryset.filter(id__in=checklist_ids)
        for item in queryset:
            itens.append(ItemChecklistContrato.objects.create(
                escopo_unidade=escopo_unidade,
                item_padrao=item,
                obrigatorio=item.obrigatorio,
                requer_foto=item.requer_foto,
                requer_medicao=item.requer_medicao,
                unidade_medicao=item.unidade_medicao,
                ordem=item.ordem,
            ))
        return itens


class GeradorEscopoPreventiva:
    def gerar(self, escopo_ids_ou_codigos):
        escopos = self._buscar_escopos(escopo_ids_ou_codigos)
        areas = [escopo.nome for escopo in escopos]
        checklist_por_area = []

        for escopo in escopos:
            itens = ItemChecklistPadrao.objects.filter(escopo=escopo, ativo=True).order_by("ordem", "descricao")
            checklist_por_area.append({
                "escopo_id": escopo.id,
                "codigo": escopo.codigo,
                "area": escopo.nome,
                "norma_tecnica": escopo.norma_tecnica,
                "cor": escopo.cor,
                "periodicidade_sugerida": PERIODICIDADE_SUGERIDA.get(escopo.codigo, ["Mensal", "Trimestral"]),
                "equipamentos_atendidos": EQUIPAMENTOS_ATENDIDOS.get(escopo.codigo, []),
                "itens": [
                    {
                        "id": item.id,
                        "descricao": item.descricao,
                        "categoria": item.categoria,
                        "obrigatorio": item.obrigatorio,
                        "requer_foto": item.requer_foto,
                        "requer_medicao": item.requer_medicao,
                        "unidade_medicao": item.unidade_medicao,
                    }
                    for item in itens
                ],
            })

        objeto_contrato = self._montar_objeto_contrato(areas, checklist_por_area)
        return {
            "titulo": f"Escopo Padrão de Manutenção Preventiva - {', '.join(areas)}" if areas else "Escopo Padrão de Manutenção Preventiva",
            "objetivo": OBJETIVO_PREVENTIVA_PADRAO,
            "areas_atendidas": areas,
            "objeto_contrato": objeto_contrato,
            "checklist_geral": [{"ordem": idx, "descricao": item} for idx, item in enumerate(CHECKLIST_GERAL_PREVENTIVA, start=1)],
            "checklist_por_area": checklist_por_area,
            "status_checklist": STATUS_CHECKLIST_PREVENTIVA,
            "classificacao_anomalias": CLASSIFICACAO_ANOMALIAS,
            "campos_os": CAMPOS_OS_PREVENTIVA,
            "observacao_tecnica_final": (
                "Manutenção preventiva realizada conforme checklist técnico da área correspondente. "
                "Foram executadas inspeções visuais, testes funcionais, verificações operacionais, "
                "medições técnicas quando aplicável, limpeza básica dos componentes e avaliação geral "
                "das condições de funcionamento. As não conformidades encontradas foram registradas "
                "nesta ordem de serviço, podendo exigir orçamento corretivo, retorno técnico, "
                "substituição de peças ou acompanhamento em próxima visita preventiva."
            ),
        }

    def _buscar_escopos(self, escopo_ids_ou_codigos):
        ids = []
        codigos = []
        for valor in escopo_ids_ou_codigos or []:
            if isinstance(valor, int) or (isinstance(valor, str) and valor.isdigit()):
                ids.append(int(valor))
            elif isinstance(valor, str) and valor.strip():
                codigos.append(valor.strip().upper())
        qs = EscopoTecnico.objects.filter(ativo=True)
        if ids and codigos:
            qs = qs.filter(models.Q(id__in=ids) | models.Q(codigo__in=codigos))
        elif ids:
            qs = qs.filter(id__in=ids)
        elif codigos:
            qs = qs.filter(codigo__in=codigos)
        else:
            return []
        return list(qs.order_by("ordem", "nome"))

    def _montar_objeto_contrato(self, areas, checklist_por_area):
        if not areas:
            return OBJETIVO_PREVENTIVA_PADRAO
        linhas = [
            OBJETIVO_PREVENTIVA_PADRAO,
            "",
            f"Áreas atendidas: {', '.join(areas)}.",
            "",
            "Escopo técnico por área:",
        ]
        for area in checklist_por_area:
            linhas.append(f"- {area['area']}: inspeções, testes funcionais, medições quando aplicável, registros fotográficos e apontamento de anomalias.")
            if area["equipamentos_atendidos"]:
                linhas.append(f"  Equipamentos atendidos: {', '.join(area['equipamentos_atendidos'])}.")
        linhas.extend([
            "",
            "Checklist geral obrigatório: identificação do equipamento/local, acesso seguro, área limpa, operação normal, ausência de ruídos/vibrações/vazamentos, fixações, limpeza, testes funcionais, medições, fotos quando necessário, registro de anomalias e ciência do responsável local.",
            "",
            "Ao finalizar cada preventiva, o sistema deve registrar checklist preenchido, medições realizadas, fotos antes/depois quando aplicável, anomalias, recomendações técnicas, assinatura do técnico e assinatura do cliente.",
        ])
        return "\n".join(linhas)


class GeradorFatura:
    def gerar_fatura_mensal(self, contrato, mes, ano):
        competencia = date(ano, mes, 1)
        vencimento = contrato.data_vencimento_competencia(mes, ano)
        valor_base = contrato.valor_total_mensal
        os_mes = OSContratoPreventiva.objects.filter(
            contrato=contrato,
            data_prevista__month=mes,
            data_prevista__year=ano,
        )
        os_total = os_mes.count()
        os_executadas = os_mes.filter(status=OSContratoPreventiva.Status.CONCLUIDA).count()

        glosa = Decimal("0")
        if os_total > 0 and os_executadas < os_total:
            percentual_executado = Decimal(os_executadas) / Decimal(os_total)
            glosa = valor_base * (Decimal("1") - percentual_executado)

        fatura, _ = FaturaContrato.objects.update_or_create(
            contrato=contrato,
            mes_referencia=mes,
            ano_referencia=ano,
            defaults={
                "competencia": competencia,
                "vencimento": vencimento,
                "valor_base": valor_base,
                "valor_extras": Decimal("0"),
                "valor_glosa": glosa,
                "valor_total": valor_base - glosa,
                "status": FaturaContrato.Status.A_EMITIR,
            },
        )
        return fatura


class GeradorPDFContrato:
    def gerar(self, contrato, tipo):
        buffer = io.BytesIO()
        pagesize = landscape(A4) if tipo == "cronograma" else A4
        doc = SimpleDocTemplate(buffer, pagesize=pagesize, rightMargin=1.4 * cm, leftMargin=1.4 * cm, topMargin=1.2 * cm, bottomMargin=1.2 * cm)
        styles = self._styles()
        story = []
        empresa = get_empresa_configurada()

        titulos = {
            "contrato": "Contrato de Manutenção Preventiva",
            "proposta": "Proposta Comercial de Preventiva",
            "cronograma": "Cronograma Anual de Visitas Preventivas",
            "boletim": "Boletim de Medição Mensal",
        }
        if tipo == "proposta":
            self._cabecalho_proposta(story, contrato, empresa, titulos[tipo], styles)
        else:
            story.append(Paragraph(f"<b>{titulos.get(tipo, 'Documento')}</b>", styles["Title"]))
            story.append(Paragraph(f"{contrato.numero} - {contrato.titulo}", styles["Heading2"]))
            story.append(Paragraph(f"Cliente: {contrato.cliente}", styles["Normal"]))
            story.append(Paragraph(f"Vigência: {contrato.data_inicio:%d/%m/%Y} a {contrato.data_fim:%d/%m/%Y}", styles["Normal"]))
            story.append(Spacer(1, 0.35 * cm))

        if tipo == "cronograma":
            self._montar_cronograma(story, contrato)
        elif tipo == "proposta":
            self._montar_proposta(story, contrato, empresa, styles)
        else:
            self._montar_contrato(story, contrato, styles)

        rodape = lambda canvas, doc_ref: self._rodape_pdf(canvas, doc_ref, empresa)
        doc.build(story, onFirstPage=rodape, onLaterPages=rodape)
        buffer.seek(0)
        nome = f"{tipo}_{contrato.numero}.pdf".replace("/", "-")
        content = ContentFile(buffer.read(), name=nome)
        campo = {
            "contrato": "pdf_contrato",
            "proposta": "pdf_proposta",
            "cronograma": "pdf_cronograma",
        }.get(tipo, "pdf_contrato")
        getattr(contrato, campo).save(nome, content, save=True)
        return getattr(contrato, campo)

    def _styles(self):
        fonte_normal, fonte_bold = self._fontes_pdf()
        styles = getSampleStyleSheet()
        for style_name in ("Normal", "Title", "Heading1", "Heading2", "Heading3", "BodyText"):
            if style_name in styles:
                styles[style_name].fontName = fonte_normal
        for style_name in ("Title", "Heading1", "Heading2", "Heading3"):
            if style_name in styles:
                styles[style_name].fontName = fonte_bold

        styles.add(ParagraphStyle(
            name="DocTitle",
            parent=styles["Title"],
            fontName=fonte_bold,
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#111827"),
            spaceAfter=8,
        ))
        styles.add(ParagraphStyle(
            name="CompanyName",
            parent=styles["Normal"],
            fontName=fonte_bold,
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#111827"),
        ))
        styles.add(ParagraphStyle(
            name="Eyebrow",
            parent=styles["Normal"],
            fontName=fonte_bold,
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#3B82F6"),
            uppercase=True,
        ))
        styles.add(ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontName=fonte_bold,
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceBefore=10,
            spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            name="Small",
            parent=styles["Normal"],
            fontName=fonte_normal,
            fontSize=8.2,
            leading=10.6,
            textColor=colors.HexColor("#475569"),
        ))
        styles.add(ParagraphStyle(
            name="Muted",
            parent=styles["Normal"],
            fontName=fonte_normal,
            fontSize=9,
            leading=12.2,
            textColor=colors.HexColor("#64748B"),
        ))
        styles.add(ParagraphStyle(
            name="ValueCard",
            parent=styles["Normal"],
            fontName=fonte_bold,
            fontSize=16,
            leading=19,
            alignment=TA_RIGHT,
            textColor=colors.HexColor("#059669"),
        ))
        styles.add(ParagraphStyle(
            name="CenterSmall",
            parent=styles["Small"],
            alignment=TA_CENTER,
        ))
        return styles

    def _fontes_pdf(self):
        normal = "Helvetica"
        bold = "Helvetica-Bold"
        arial = r"C:\Windows\Fonts\arial.ttf"
        arial_bold = r"C:\Windows\Fonts\arialbd.ttf"
        if os.path.exists(arial) and os.path.exists(arial_bold):
            try:
                if "ERPArial" not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont("ERPArial", arial))
                if "ERPArial-Bold" not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont("ERPArial-Bold", arial_bold))
                pdfmetrics.registerFontFamily(
                    "ERPArial",
                    normal="ERPArial",
                    bold="ERPArial-Bold",
                    italic="ERPArial",
                    boldItalic="ERPArial-Bold",
                )
                normal = "ERPArial"
                bold = "ERPArial-Bold"
            except Exception:
                normal = "Helvetica"
                bold = "Helvetica-Bold"
        return normal, bold

    def _rodape_pdf(self, canvas, doc, empresa):
        fonte_normal, _ = self._fontes_pdf()
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#E2E8F0"))
        canvas.line(doc.leftMargin, 1.0 * cm, doc.pagesize[0] - doc.rightMargin, 1.0 * cm)
        canvas.setFont(fonte_normal, 7)
        canvas.setFillColor(colors.HexColor("#64748B"))
        empresa_nome = self._canvas_texto(empresa.razao_social or empresa.nome or "Empresa")
        canvas.drawString(doc.leftMargin, 0.62 * cm, f"{empresa_nome} - proposta gerada pelo ERP")
        canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 0.62 * cm, f"Página {doc.page}")
        canvas.restoreState()

    def _cabecalho_proposta(self, story, contrato, empresa, titulo, styles):
        nome_empresa = empresa.nome or empresa.razao_social or "Empresa"
        razao_social = empresa.razao_social if empresa.razao_social and empresa.razao_social != nome_empresa else ""
        empresa_linhas = [
            f"<font color='#3B82F6'><b>CONTRATADA</b></font>",
            f"<b>{self._texto(nome_empresa)}</b>",
            self._texto(razao_social),
            self._texto(f"CNPJ: {empresa.cnpj}") if empresa.cnpj else "",
            self._texto(empresa.endereco) if empresa.endereco else "",
            " | ".join(filter(None, [self._texto(empresa.telefone), self._texto(empresa.email), self._texto(empresa.site)])),
        ]
        empresa_texto = "<br/>".join([linha for linha in empresa_linhas if linha])

        logo = self._logo_empresa(empresa)
        marca = logo if logo else Paragraph(f"<b>{self._texto(nome_empresa[:2].upper())}</b>", styles["DocTitle"])
        header = Table(
            [[marca, Paragraph(empresa_texto or "Dados da empresa não configurados", styles["Small"])]],
            colWidths=[3.7 * cm, 13.4 * cm],
        )
        header.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("ALIGN", (0, 0), (0, 0), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(header)
        story.append(Spacer(1, 0.3 * cm))

        story.append(Paragraph(titulo, styles["DocTitle"]))
        story.append(Paragraph(self._texto(contrato.titulo), styles["Muted"]))
        story.append(Spacer(1, 0.25 * cm))

        resumo = Table(
            [[
                Paragraph(f"<b>Número</b><br/>{self._texto(contrato.numero)}", styles["Small"]),
                Paragraph(f"<b>Emissão</b><br/>{timezone.localdate():%d/%m/%Y}", styles["Small"]),
                Paragraph(f"<b>Vigência</b><br/>{contrato.data_inicio:%d/%m/%Y} a {contrato.data_fim:%d/%m/%Y}", styles["Small"]),
                Paragraph(f"<b>Status</b><br/>{self._texto(contrato.get_status_display())}", styles["Small"]),
            ]],
            colWidths=[4.25 * cm, 3.4 * cm, 6.0 * cm, 3.45 * cm],
        )
        resumo.setStyle(self._card_table_style())
        story.append(resumo)
        story.append(Spacer(1, 0.22 * cm))

    def _logo_empresa(self, empresa):
        if not getattr(empresa, "logo", None):
            return None
        try:
            if empresa.logo and empresa.logo.path:
                imagem = Image(empresa.logo.path, width=3.0 * cm, height=1.35 * cm, kind="proportional")
                imagem.hAlign = "CENTER"
                return imagem
        except (OSError, ValueError):
            return None
        return None

    def _montar_contrato(self, story, contrato, styles):
        clausulas = [
            ("1. OBJETO", contrato.objeto_contrato),
            ("2. PRAZO E VIGÊNCIA", f"Vigência de {contrato.vigencia_meses} meses."),
            ("3. VALOR E FORMA DE PAGAMENTO", f"Valor mensal: R$ {contrato.valor_total_mensal:.2f}. Forma: {contrato.forma_pagamento}."),
            ("4. REAJUSTE", f"Reajuste anual: {'Sim' if contrato.reajuste_anual else 'Não'} - {contrato.indice_reajuste}."),
            ("5. OBRIGAÇÕES DA CONTRATADA", "Executar as visitas preventivas, registrar evidências técnicas e emitir relatórios."),
            ("6. OBRIGAÇÕES DA CONTRATANTE", "Permitir acesso às unidades e informar impedimentos operacionais."),
            ("7. PERIODICIDADE DAS VISITAS", "Conforme cronograma e escopos definidos por unidade."),
            ("8. CHECKLIST TÉCNICO", "Os checklists ABNT/NBR aplicáveis compõem anexo técnico deste contrato."),
            ("9. RESCISÃO", f"Aviso prévio de {contrato.prazo_aviso_rescisao_dias} dias."),
            ("10. MULTAS", f"Multa por atraso de {contrato.multa_atraso_percentual}% e juros de {contrato.juros_dia_percentual}% ao dia."),
            ("11. FORO", "Fica eleito o foro da comarca competente para dirimir controvérsias."),
        ]
        for titulo, texto in clausulas:
            story.append(Paragraph(f"<b>{titulo}</b>", styles["Heading3"]))
            story.append(Paragraph(texto, styles["Normal"]))
            story.append(Spacer(1, 0.18 * cm))
        self._tabela_unidades(story, contrato)

    def _montar_proposta(self, story, contrato, empresa, styles):
        self._bloco_cliente(story, contrato, styles)

        story.append(Paragraph("Apresentação da proposta", styles["SectionTitle"]))
        story.append(Paragraph(
            "Esta proposta contempla manutenção preventiva recorrente, com visitas programadas por unidade, "
            "checklists técnicos por área, registro de medições quando aplicável, evidências fotográficas, "
            "apontamento de anomalias e relatórios operacionais para acompanhamento do cliente.",
            styles["Normal"],
        ))
        story.append(Spacer(1, 0.12 * cm))

        self._bloco_escopos(story, contrato, styles)
        self._tabela_unidades(story, contrato, styles=styles, detalhada=True)
        self._tabela_escopos_unidade(story, contrato, styles)
        self._resumo_valores(story, contrato, styles)
        self._condicoes_comerciais(story, contrato, empresa, styles)
        self._assinaturas_proposta(story, contrato, empresa, styles)

    def _bloco_cliente(self, story, contrato, styles):
        cliente = contrato.cliente
        endereco = cliente.enderecos.filter(principal=True).first() or cliente.enderecos.first()
        endereco_texto = self._formatar_endereco_cliente(endereco)
        dados = [
            [
                Paragraph("<b>Contratante</b>", styles["Small"]),
                Paragraph(self._texto(cliente.razao_social or cliente.nome), styles["Small"]),
            ],
            [
                Paragraph("<b>Nome fantasia</b>", styles["Small"]),
                Paragraph(self._texto(cliente.nome_fantasia or cliente.nome), styles["Small"]),
            ],
            [
                Paragraph("<b>CNPJ/CPF</b>", styles["Small"]),
                Paragraph(self._texto(cliente.cnpj_cpf or "Não informado"), styles["Small"]),
            ],
            [
                Paragraph("<b>Contato</b>", styles["Small"]),
                Paragraph(self._texto(" | ".join(filter(None, [cliente.telefone, cliente.email])) or "Não informado"), styles["Small"]),
            ],
            [
                Paragraph("<b>Endereço</b>", styles["Small"]),
                Paragraph(self._texto(endereco_texto or "Não informado"), styles["Small"]),
            ],
        ]
        story.append(Paragraph("Dados do cliente", styles["SectionTitle"]))
        tabela = Table(dados, colWidths=[3.8 * cm, 13.3 * cm])
        tabela.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8FAFC")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(tabela)
        story.append(Spacer(1, 0.15 * cm))

    def _bloco_escopos(self, story, contrato, styles):
        escopos = list(contrato.escopos_contrato.filter(ativo=True).select_related("escopo").order_by("escopo__ordem"))
        if not escopos:
            return
        story.append(Paragraph("Escopos técnicos incluídos", styles["SectionTitle"]))
        linhas = [["Área técnica", "Norma/referência", "Descrição"]]
        for relacao in escopos:
            escopo = relacao.escopo
            linhas.append([
                Paragraph(f"<b>{self._texto(escopo.nome)}</b>", styles["Small"]),
                Paragraph(self._texto(escopo.norma_tecnica or "Boas práticas técnicas"), styles["Small"]),
                Paragraph(self._texto(escopo.descricao or "Inspeções, testes funcionais, medições e checklist técnico."), styles["Small"]),
            ])
        tabela = Table(linhas, colWidths=[4.2 * cm, 4.1 * cm, 8.8 * cm], repeatRows=1)
        tabela.setStyle(self._table_style())
        story.append(tabela)
        story.append(Spacer(1, 0.15 * cm))

    def _montar_cronograma(self, story, contrato):
        meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        data = [["Unidade / Escopo"] + meses]
        os_list = contrato.os_contrato.select_related("unidade_contrato", "escopo_unidade__escopo")
        linhas = {}
        for os_item in os_list:
            chave = f"{os_item.unidade_contrato.nome_unidade} - {os_item.escopo_unidade.escopo.nome}"
            linhas.setdefault(chave, [""] * 12)
            linhas[chave][os_item.data_prevista.month - 1] = "X"
        for chave, marcas in linhas.items():
            data.append([chave] + marcas)
        tabela = Table(data, repeatRows=1)
        tabela.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3B82F6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ]))
        story.append(tabela)

    def _tabela_unidades(self, story, contrato, styles=None, detalhada=False):
        if styles:
            story.append(Paragraph("Unidades atendidas e valores", styles["SectionTitle"]))
        data = [["Unidade", "Cidade/UF", "Responsável local", "Valor mensal"]] if detalhada else [["Unidade", "Cidade/UF", "Valor mensal"]]
        for unidade in contrato.unidades.filter(ativo=True):
            if detalhada:
                data.append([
                    unidade.nome_unidade,
                    f"{unidade.cidade}/{unidade.estado}",
                    unidade.responsavel_local or "Não informado",
                    self._brl(unidade.valor_mensal),
                ])
            else:
                data.append([unidade.nome_unidade, f"{unidade.cidade}/{unidade.estado}", self._brl(unidade.valor_mensal)])
        col_widths = [5.1 * cm, 3.5 * cm, 4.7 * cm, 3.8 * cm] if detalhada else None
        tabela = Table(data, hAlign="LEFT", colWidths=col_widths, repeatRows=1)
        tabela.setStyle(self._table_style())
        story.append(tabela)
        story.append(Spacer(1, 0.18 * cm))

    def _tabela_escopos_unidade(self, story, contrato, styles):
        linhas = [["Unidade", "Escopos inclusos", "Periodicidade", "Valor mensal da unidade"]]
        unidades = []
        for unidade in contrato.unidades.filter(ativo=True).prefetch_related("escopos__escopo"):
            escopos_ativos = list(unidade.escopos.filter(ativo=True).select_related("escopo"))
            if not escopos_ativos:
                continue
            unidades.append(unidade)
            escopos = ", ".join(escopo_unidade.escopo.nome for escopo_unidade in escopos_ativos)
            periodicidades = sorted({escopo_unidade.get_periodicidade_display() for escopo_unidade in escopos_ativos})
            linhas.append([
                Paragraph(self._texto(unidade.nome_unidade), styles["Small"]),
                Paragraph(self._texto(escopos), styles["Small"]),
                Paragraph(self._texto(", ".join(periodicidades)), styles["Small"]),
                self._brl(unidade.valor_mensal),
            ])
        if not unidades:
            return
        story.append(Paragraph("Composição técnica e valor por unidade", styles["SectionTitle"]))
        tabela = Table(linhas, colWidths=[4.1 * cm, 6.0 * cm, 3.2 * cm, 3.8 * cm], repeatRows=1)
        tabela.setStyle(self._table_style())
        story.append(tabela)
        story.append(Spacer(1, 0.18 * cm))

    def _resumo_valores(self, story, contrato, styles):
        story.append(Paragraph("Resumo financeiro", styles["SectionTitle"]))
        data = [[
            Paragraph("<b>Valor mensal recorrente</b><br/>Cobrança mensal do contrato", styles["Small"]),
            Paragraph(self._brl(contrato.valor_total_mensal), styles["ValueCard"]),
            Paragraph("<b>Valor total da vigência</b><br/>Soma prevista do período contratado", styles["Small"]),
            Paragraph(self._brl(contrato.valor_total_contrato), styles["ValueCard"]),
        ]]
        tabela = Table(data, colWidths=[4.6 * cm, 3.9 * cm, 4.6 * cm, 4.0 * cm])
        tabela.setStyle(self._card_table_style())
        story.append(tabela)
        story.append(Spacer(1, 0.15 * cm))

    def _condicoes_comerciais(self, story, contrato, empresa, styles):
        story.append(Paragraph("Condições comerciais", styles["SectionTitle"]))
        reajuste = "Não aplicável"
        if contrato.reajuste_anual:
            reajuste = contrato.get_indice_reajuste_display()
            if contrato.indice_reajuste == contrato.IndiceReajuste.FIXO_PERCENTUAL:
                reajuste = f"Fixo de {contrato.valor_reajuste_fixo}% ao ano"
        dados = [
            ["Tipo de faturamento", contrato.get_tipo_faturamento_display()],
            ["Forma de pagamento", contrato.get_forma_pagamento_display()],
            ["Dia de vencimento", f"Todo dia {contrato.dia_vencimento_fatura}"],
            ["Vigência", f"{contrato.vigencia_meses} meses"],
            ["Reajuste", reajuste],
            ["Multa e juros", f"Multa de {contrato.multa_atraso_percentual}% e juros de {contrato.juros_dia_percentual}% ao dia"],
            ["ART/Responsável técnico", self._responsavel_tecnico_texto(contrato)],
            ["Validade da proposta", "30 dias a partir da emissão, salvo negociação comercial expressa."],
        ]
        tabela = Table([[Paragraph(f"<b>{self._texto(k)}</b>", styles["Small"]), Paragraph(self._texto(v), styles["Small"])] for k, v in dados], colWidths=[4.7 * cm, 12.4 * cm])
        tabela.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8FAFC")),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(tabela)
        story.append(Spacer(1, 0.15 * cm))

        diferenciais = [
            "OS preventivas geradas automaticamente conforme periodicidade contratada.",
            "Checklist técnico por escopo com status por item, medições e fotos quando aplicável.",
            "Registro de anomalias e recomendações para corretivas ou retorno técnico.",
            "Relatório técnico e histórico por unidade para acompanhamento operacional.",
        ]
        story.append(Paragraph("Diferenciais da entrega", styles["SectionTitle"]))
        for item in diferenciais:
            story.append(Paragraph(f"- {self._texto(item)}", styles["Normal"]))
        if contrato.observacoes:
            story.append(Spacer(1, 0.08 * cm))
            story.append(Paragraph("<b>Observações comerciais:</b>", styles["Normal"]))
            story.append(Paragraph(self._texto(contrato.observacoes), styles["Normal"]))
        story.append(Spacer(1, 0.18 * cm))

    def _assinaturas_proposta(self, story, contrato, empresa, styles):
        story.append(Paragraph("Aceite da proposta", styles["SectionTitle"]))
        story.append(Paragraph(
            "A aprovação desta proposta autoriza a abertura do contrato de manutenção preventiva, "
            "a geração do cronograma recorrente e a programação das visitas técnicas conforme escopo contratado.",
            styles["Normal"],
        ))
        story.append(Spacer(1, 0.55 * cm))
        assinaturas = Table(
            [[
                Paragraph("____________________________________<br/>Contratada<br/>" + self._texto(empresa.nome or "Empresa"), styles["CenterSmall"]),
                Paragraph("____________________________________<br/>Contratante<br/>" + self._texto(str(contrato.cliente)), styles["CenterSmall"]),
            ]],
            colWidths=[8.3 * cm, 8.3 * cm],
        )
        assinaturas.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(assinaturas)

    def _table_style(self):
        return TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])

    def _card_table_style(self):
        return TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])

    def _formatar_endereco_cliente(self, endereco):
        if not endereco:
            return ""
        partes = [
            endereco.logradouro,
            endereco.numero,
            endereco.complemento,
            endereco.bairro,
            f"{endereco.cidade}/{endereco.estado}",
            f"CEP {endereco.cep}" if endereco.cep else "",
        ]
        return ", ".join([str(parte) for parte in partes if parte])

    def _responsavel_tecnico_texto(self, contrato):
        responsavel = contrato.responsavel_tecnico.get_full_name() if contrato.responsavel_tecnico else ""
        responsavel = responsavel or (str(contrato.responsavel_tecnico) if contrato.responsavel_tecnico else "A definir")
        crea = f" - CREA {contrato.responsavel_tecnico_crea}" if contrato.responsavel_tecnico_crea else ""
        art = f" - ART {contrato.numero_art}" if contrato.numero_art else ""
        return f"{responsavel}{crea}{art}"

    def _brl(self, valor):
        numero = Decimal(valor or 0)
        texto = f"{numero:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {texto}"

    def _texto(self, valor):
        texto = str(valor or "")
        return (
            texto.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\n", "<br/>")
        )

    def _canvas_texto(self, valor):
        texto = str(valor or "")
        return texto.replace("\n", " ").replace("\r", " ")
