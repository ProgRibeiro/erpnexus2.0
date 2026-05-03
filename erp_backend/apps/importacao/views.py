import io
from datetime import date
from decimal import Decimal

import openpyxl
from openpyxl.styles import Font
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clientes.models import Cliente
from apps.estoque.models import Produto, Servico
from apps.financeiro.models import Lancamento
from apps.ordens.models import OrdemServico


def _xlsx_response(workbook, filename):
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    response = HttpResponse(
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _bold_header(ws, headers):
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)


def _normalizar_header(value):
    return str(value or "").strip().lower().replace(" ", "_")


def _bool(value, default=True):
    if value in (None, ""):
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "sim", "s", "yes", "ativo"}


def _resultado(criados=0, atualizados=0, ignorados=0, erros=None):
    erros = erros or []
    return Response(
        {
            "criados": criados,
            "atualizados": atualizados,
            "ignorados": ignorados,
            "erros": erros,
            "sucesso": criados + atualizados,
            "falhas": len(erros),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_clientes(request):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Clientes"
    _bold_header(ws, ["id", "nome", "cnpj_cpf", "email", "telefone", "status", "segmento", "criado_em"])
    for c in Cliente.objects.all().order_by("nome"):
        ws.append([
            c.pk,
            c.nome,
            c.cnpj_cpf,
            c.email,
            c.telefone,
            c.status,
            c.segmento,
            c.criado_em.strftime("%Y-%m-%d %H:%M") if c.criado_em else "",
        ])
    return _xlsx_response(wb, f"clientes_{date.today()}.xlsx")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def importar_clientes(request):
    arquivo = request.FILES.get("arquivo")
    if not arquivo:
        return Response({"erro": "Arquivo não enviado."}, status=400)

    criados = 0
    ignorados = 0
    erros = []

    try:
        wb = openpyxl.load_workbook(arquivo, read_only=True)
        ws = wb.active
        headers = [_normalizar_header(cell.value) for cell in next(ws.iter_rows(min_row=1, max_row=1))]

        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                data = dict(zip(headers, row))
                nome = str(data.get("nome") or "").strip()
                if not nome:
                    ignorados += 1
                    continue
                cnpj_cpf = str(data.get("cnpj_cpf") or "").strip()
                if cnpj_cpf and Cliente.objects.filter(cnpj_cpf=cnpj_cpf).exists():
                    ignorados += 1
                    continue
                Cliente.objects.create(
                    nome=nome,
                    cnpj_cpf=cnpj_cpf,
                    email=str(data.get("email") or "").strip(),
                    telefone=str(data.get("telefone") or "").strip(),
                )
                criados += 1
            except Exception as e:
                erros.append(f"Linha {row_num}: {e}")
    except Exception as e:
        return Response({"erro": f"Erro ao processar arquivo: {e}"}, status=400)

    return _resultado(criados=criados, ignorados=ignorados, erros=erros)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_produtos(request):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Produtos"
    _bold_header(ws, ["id", "codigo", "nome", "descricao", "unidade_medida", "preco_custo", "preco_venda", "estoque_minimo", "ativo"])
    for p in Produto.objects.all().order_by("nome"):
        ws.append([
            p.pk,
            p.codigo or "",
            p.nome,
            p.descricao,
            p.unidade_medida,
            float(p.preco_custo),
            float(p.preco_venda),
            float(p.estoque_minimo),
            p.ativo,
        ])
    return _xlsx_response(wb, f"produtos_{date.today()}.xlsx")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def importar_produtos(request):
    arquivo = request.FILES.get("arquivo")
    if not arquivo:
        return Response({"erro": "Arquivo não enviado."}, status=400)

    criados = 0
    atualizados = 0
    erros = []

    try:
        wb = openpyxl.load_workbook(arquivo, read_only=True)
        ws = wb.active
        headers = [_normalizar_header(cell.value) for cell in next(ws.iter_rows(min_row=1, max_row=1))]

        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                data = dict(zip(headers, row))
                nome = str(data.get("nome") or "").strip()
                codigo = str(data.get("codigo") or "").strip() or None
                if not nome:
                    continue
                defaults = {
                    "nome": nome,
                    "descricao": str(data.get("descricao") or "").strip(),
                    "unidade_medida": str(data.get("unidade_medida") or "un").strip() or "un",
                    "preco_custo": Decimal(str(data.get("preco_custo") or 0)),
                    "preco_venda": Decimal(str(data.get("preco_venda") or 0)),
                    "estoque_minimo": Decimal(str(data.get("estoque_minimo") or 0)),
                    "ativo": _bool(data.get("ativo"), True),
                }
                if codigo:
                    _, created = Produto.objects.update_or_create(codigo=codigo, defaults=defaults)
                    if created:
                        criados += 1
                    else:
                        atualizados += 1
                else:
                    Produto.objects.create(**defaults)
                    criados += 1
            except Exception as e:
                erros.append(f"Linha {row_num}: {e}")
    except Exception as e:
        return Response({"erro": f"Erro ao processar arquivo: {e}"}, status=400)

    return _resultado(criados=criados, atualizados=atualizados, erros=erros)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_servicos(request):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Servicos"
    _bold_header(ws, ["id", "codigo", "nome", "descricao", "categoria", "unidade_medida", "preco_padrao", "tributacao", "codigo_lc116", "ativo"])
    for s in Servico.objects.all().order_by("categoria", "nome"):
        ws.append([
            s.pk,
            s.codigo or "",
            s.nome,
            s.descricao,
            s.categoria,
            s.unidade_medida,
            float(s.preco_padrao),
            s.tributacao,
            s.codigo_lc116,
            s.ativo,
        ])
    return _xlsx_response(wb, f"servicos_{date.today()}.xlsx")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def importar_servicos(request):
    arquivo = request.FILES.get("arquivo")
    if not arquivo:
        return Response({"erro": "Arquivo não enviado."}, status=400)

    criados = 0
    atualizados = 0
    erros = []

    try:
        wb = openpyxl.load_workbook(arquivo, read_only=True)
        ws = wb.active
        headers = [_normalizar_header(cell.value) for cell in next(ws.iter_rows(min_row=1, max_row=1))]

        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                data = dict(zip(headers, row))
                nome = str(data.get("nome") or "").strip()
                codigo = str(data.get("codigo") or "").strip() or None
                if not nome:
                    continue
                defaults = {
                    "nome": nome,
                    "descricao": str(data.get("descricao") or "").strip(),
                    "categoria": str(data.get("categoria") or Servico.Categoria.HVAC).strip() or Servico.Categoria.HVAC,
                    "unidade_medida": str(data.get("unidade_medida") or Servico.UnidadeMedida.UNI).strip() or Servico.UnidadeMedida.UNI,
                    "preco_padrao": Decimal(str(data.get("preco_padrao") or data.get("preco") or 0)),
                    "tributacao": str(data.get("tributacao") or Servico.Tributacao.ISS).strip() or Servico.Tributacao.ISS,
                    "codigo_lc116": str(data.get("codigo_lc116") or "").strip(),
                    "ativo": _bool(data.get("ativo"), True),
                }
                if codigo:
                    _, created = Servico.objects.update_or_create(codigo=codigo, defaults=defaults)
                    criados += 1 if created else 0
                    atualizados += 0 if created else 1
                else:
                    Servico.objects.create(**defaults)
                    criados += 1
            except Exception as e:
                erros.append(f"Linha {row_num}: {e}")
    except Exception as e:
        return Response({"erro": f"Erro ao processar arquivo: {e}"}, status=400)

    return _resultado(criados=criados, atualizados=atualizados, erros=erros)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_ordens(request):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Ordens de Servico"
    _bold_header(ws, ["numero", "status", "cliente", "tipo_servico", "prioridade", "valor_total_orcado", "valor_final_faturado", "tecnico", "data_agendada", "criado_em"])
    for o in OrdemServico.objects.select_related("cliente", "tecnico_responsavel").order_by("-criado_em")[:5000]:
        ws.append([
            o.numero or "",
            o.status,
            str(o.cliente) if o.cliente else "",
            o.tipo_servico,
            o.prioridade,
            float(o.valor_total_orcado or 0),
            float(o.valor_final_faturado or 0),
            str(o.tecnico_responsavel) if o.tecnico_responsavel else "",
            str(o.data_agendada) if o.data_agendada else "",
            o.criado_em.strftime("%Y-%m-%d %H:%M") if o.criado_em else "",
        ])
    return _xlsx_response(wb, f"ordens_{date.today()}.xlsx")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_financeiro(request):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Lancamentos"
    _bold_header(ws, ["id", "tipo", "descricao", "valor", "data_competencia", "data_vencimento", "data_pagamento", "status", "categoria", "conta", "fornecedor_cliente"])
    for l in Lancamento.objects.select_related("categoria", "conta_bancaria").order_by("-data_vencimento")[:10000]:
        ws.append([
            l.pk,
            l.tipo,
            l.descricao,
            float(l.valor),
            str(l.data_competencia),
            str(l.data_vencimento),
            str(l.data_pagamento) if l.data_pagamento else "",
            l.status,
            str(l.categoria) if l.categoria else "",
            str(l.conta_bancaria) if l.conta_bancaria else "",
            l.fornecedor_cliente,
        ])
    return _xlsx_response(wb, f"financeiro_{date.today()}.xlsx")
