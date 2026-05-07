import io
from calendar import monthrange
from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from django.core.files.base import ContentFile
from django.db import models, transaction
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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
        styles = getSampleStyleSheet()
        story = []

        titulos = {
            "contrato": "Contrato de Manutenção Preventiva",
            "proposta": "Proposta Comercial de Preventiva",
            "cronograma": "Cronograma Anual de Visitas Preventivas",
            "boletim": "Boletim de Medição Mensal",
        }
        story.append(Paragraph(f"<b>{titulos.get(tipo, 'Documento')}</b>", styles["Title"]))
        story.append(Paragraph(f"{contrato.numero} - {contrato.titulo}", styles["Heading2"]))
        story.append(Paragraph(f"Cliente: {contrato.cliente}", styles["Normal"]))
        story.append(Paragraph(f"Vigência: {contrato.data_inicio:%d/%m/%Y} a {contrato.data_fim:%d/%m/%Y}", styles["Normal"]))
        story.append(Spacer(1, 0.35 * cm))

        if tipo == "cronograma":
            self._montar_cronograma(story, contrato)
        elif tipo == "proposta":
            self._montar_proposta(story, contrato, styles)
        else:
            self._montar_contrato(story, contrato, styles)

        doc.build(story)
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

    def _montar_proposta(self, story, contrato, styles):
        story.append(Paragraph("Apresentamos proposta para manutenção preventiva multi-loja com checklists técnicos, evidências fotográficas e cronograma recorrente.", styles["Normal"]))
        story.append(Spacer(1, 0.25 * cm))
        self._tabela_unidades(story, contrato)
        story.append(Paragraph(f"<b>Total mensal:</b> R$ {contrato.valor_total_mensal:.2f}", styles["Heading2"]))
        story.append(Paragraph(f"<b>Total do contrato:</b> R$ {contrato.valor_total_contrato:.2f}", styles["Heading2"]))

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

    def _tabela_unidades(self, story, contrato):
        data = [["Unidade", "Cidade/UF", "Valor mensal"]]
        for unidade in contrato.unidades.filter(ativo=True):
            data.append([unidade.nome_unidade, f"{unidade.cidade}/{unidade.estado}", f"R$ {unidade.valor_mensal:.2f}"])
        tabela = Table(data, hAlign="LEFT")
        tabela.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(tabela)
        story.append(Spacer(1, 0.35 * cm))
