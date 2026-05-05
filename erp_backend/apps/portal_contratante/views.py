from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.saas.models import (
    BudgetAnual, ChamadoPlataforma, LogAuditoria, NivelAprovacao,
    SolicitacaoAprovacao, Unidade,
)
from apps.saas.serializers import (
    ChamadoPlataformaSerializer, LogAuditoriaSerializer,
    SolicitacaoAprovacaoSerializer, UnidadeSerializer,
)


class DashboardContratanteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        agora = timezone.now()
        chamados_qs = ChamadoPlataforma.objects.all()

        total_abertos = chamados_qs.filter(status='aberto').count()
        em_execucao = chamados_qs.filter(status='em_execucao').count()
        sla_vencendo = chamados_qs.filter(
            status__in=['aberto', 'em_execucao'],
            sla__prazo_conclusao__lte=agora + timedelta(hours=4),
            sla__status='no_prazo',
        ).count()
        concluidos_mes = chamados_qs.filter(
            status='concluido',
            conclusao__month=agora.month,
            conclusao__year=agora.year,
        ).count()

        budget_consumo = 0
        budget_qs = BudgetAnual.objects.filter(ano=agora.year, status__in=['aprovado', 'executando'])
        if budget_qs.exists():
            total_aprovado = budget_qs.aggregate(t=Sum('valor_total_aprovado'))['t'] or 0
            total_realizado = sum(float(b.valor_total_realizado) for b in budget_qs)
            if total_aprovado > 0:
                budget_consumo = round((total_realizado / float(total_aprovado)) * 100, 1)

        unidades_ativas = Unidade.objects.filter(ativo=True).count()
        aprovacoes_pendentes = SolicitacaoAprovacao.objects.filter(status='pendente').count()

        return Response({
            'chamados_abertos': total_abertos,
            'chamados_em_execucao': em_execucao,
            'sla_vencendo': sla_vencendo,
            'concluidos_mes': concluidos_mes,
            'budget_consumo_pct': budget_consumo,
            'unidades_ativas': unidades_ativas,
            'aprovacoes_pendentes': aprovacoes_pendentes,
        })


class UnidadesContratanteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unidades = Unidade.objects.filter(ativo=True).select_related('empresa')
        serializer = UnidadeSerializer(unidades, many=True)
        return Response(serializer.data)


class ChamadosContratanteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filtro = request.query_params.get('status')
        prioridade_filtro = request.query_params.get('prioridade')
        qs = ChamadoPlataforma.objects.select_related('unidade', 'tenant_contratante')
        if status_filtro:
            qs = qs.filter(status=status_filtro)
        if prioridade_filtro:
            qs = qs.filter(prioridade=prioridade_filtro)
        serializer = ChamadoPlataformaSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ChamadoPlataformaSerializer(data=request.data)
        if serializer.is_valid():
            chamado = serializer.save(aberto_por=request.user)
            return Response(ChamadoPlataformaSerializer(chamado).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AprovarOrcamentoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            chamado = ChamadoPlataforma.objects.get(pk=pk)
        except ChamadoPlataforma.DoesNotExist:
            return Response({'erro': 'Chamado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        chamado.status = 'em_execucao'
        chamado.save()
        LogAuditoria.objects.create(
            usuario=request.user,
            acao='aprovou',
            objeto_tipo='chamado',
            objeto_id=chamado.pk,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response({'ok': True, 'status': chamado.status})


class RecusarOrcamentoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            chamado = ChamadoPlataforma.objects.get(pk=pk)
        except ChamadoPlataforma.DoesNotExist:
            return Response({'erro': 'Chamado não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        chamado.status = 'cancelado'
        chamado.save()
        LogAuditoria.objects.create(
            usuario=request.user,
            acao='reprovou',
            objeto_tipo='chamado',
            objeto_id=chamado.pk,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response({'ok': True, 'status': chamado.status})


class BudgetContratanteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ano = int(request.query_params.get('ano', timezone.now().year))
        budgets = BudgetAnual.objects.filter(ano=ano).select_related('empresa', 'centro_custo')
        data = []
        for b in budgets:
            data.append({
                'id': b.pk,
                'empresa': b.empresa.nome,
                'ano': b.ano,
                'status': b.status,
                'valor_aprovado': float(b.valor_total_aprovado),
                'valor_realizado': float(b.valor_total_realizado),
                'percentual_consumo': round(
                    (float(b.valor_total_realizado) / float(b.valor_total_aprovado) * 100)
                    if b.valor_total_aprovado else 0, 1
                ),
            })
        return Response(data)


class AprovacoesPendentesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SolicitacaoAprovacao.objects.filter(status='pendente').select_related(
            'nivel_necessario', 'solicitado_por', 'centro_custo'
        )
        serializer = SolicitacaoAprovacaoSerializer(qs, many=True)
        return Response(serializer.data)


class AprovarSolicitacaoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            sol = SolicitacaoAprovacao.objects.get(pk=pk)
        except SolicitacaoAprovacao.DoesNotExist:
            return Response({'erro': 'Solicitação não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        sol.status = 'aprovado'
        sol.aprovado_por = request.user
        sol.data_resposta = timezone.now()
        sol.observacao_aprovacao = request.data.get('observacao', '')
        sol.ip_aprovacao = request.META.get('REMOTE_ADDR')
        sol.dispositivo_aprovacao = request.META.get('HTTP_USER_AGENT', '')[:300]
        sol.save()
        return Response({'ok': True, 'status': 'aprovado'})


class ReprovarSolicitacaoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            sol = SolicitacaoAprovacao.objects.get(pk=pk)
        except SolicitacaoAprovacao.DoesNotExist:
            return Response({'erro': 'Solicitação não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        sol.status = 'reprovado'
        sol.aprovado_por = request.user
        sol.data_resposta = timezone.now()
        sol.observacao_aprovacao = request.data.get('observacao', '')
        sol.ip_aprovacao = request.META.get('REMOTE_ADDR')
        sol.dispositivo_aprovacao = request.META.get('HTTP_USER_AGENT', '')[:300]
        sol.save()
        return Response({'ok': True, 'status': 'reprovado'})


class RelatorioSLAView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.saas.models import SLAChamado
        total = SLAChamado.objects.count()
        no_prazo = SLAChamado.objects.filter(status='no_prazo').count()
        alerta = SLAChamado.objects.filter(status='alerta').count()
        vencido = SLAChamado.objects.filter(status='vencido').count()
        return Response({
            'total': total,
            'no_prazo': no_prazo,
            'alerta': alerta,
            'vencido': vencido,
            'percentual_cumprimento': round((no_prazo / total * 100) if total else 0, 1),
        })


class RelatorioCustoUnidadeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unidades = Unidade.objects.filter(ativo=True).annotate(
            total_chamados=Count('chamados'),
            valor_total=Sum('chamados__valor_executado'),
        ).values('id', 'nome', 'codigo_interno', 'total_chamados', 'valor_total')
        return Response(list(unidades))


class RelatorioAuditoriaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = LogAuditoria.objects.select_related('usuario', 'tenant').order_by('-timestamp')[:100]
        serializer = LogAuditoriaSerializer(qs, many=True)
        return Response(serializer.data)


class BIVisaoGeralView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total = ChamadoPlataforma.objects.count()
        por_status = dict(
            ChamadoPlataforma.objects.values('status').annotate(c=Count('id')).values_list('status', 'c')
        )
        por_prioridade = dict(
            ChamadoPlataforma.objects.values('prioridade').annotate(c=Count('id')).values_list('prioridade', 'c')
        )
        ticket_medio = ChamadoPlataforma.objects.filter(
            valor_executado__isnull=False
        ).aggregate(m=Sum('valor_executado'))
        return Response({
            'total_chamados': total,
            'por_status': por_status,
            'por_prioridade': por_prioridade,
            'ticket_medio': float(ticket_medio['m'] or 0) / max(total, 1),
        })


class BIEvolucaoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        agora = timezone.now()
        resultado = []
        for i in range(11, -1, -1):
            mes_ref = agora - timedelta(days=30 * i)
            total_mes = ChamadoPlataforma.objects.filter(
                conclusao__year=mes_ref.year,
                conclusao__month=mes_ref.month,
            ).aggregate(v=Sum('valor_executado'))['v'] or 0
            resultado.append({
                'mes': f"{mes_ref.year}-{str(mes_ref.month).zfill(2)}",
                'valor': float(total_mes),
            })
        return Response(resultado)


class BIHeatmapUnidadesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unidades = Unidade.objects.filter(ativo=True).annotate(
            qtd_chamados=Count('chamados'),
            qtd_abertos=Count('chamados', filter=Q(chamados__status='aberto')),
        ).values('id', 'nome', 'codigo_interno', 'cidade', 'estado', 'qtd_chamados', 'qtd_abertos')
        return Response(list(unidades))


class BICurvaABCPrestadoresView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.saas.models import Tenant
        prestadores = Tenant.objects.filter(
            tipo__in=['prestador', 'ambos']
        ).annotate(
            total_chamados=Count('chamados_recebidos'),
            valor_total=Sum('chamados_recebidos__valor_executado'),
        ).order_by('-valor_total').values('id', 'nome', 'total_chamados', 'valor_total')
        return Response(list(prestadores))


class BIComparativoRegionaisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.saas.models import Empresa
        regionais = Empresa.objects.filter(tipo='regional').annotate(
            total_chamados=Count('unidades__chamados'),
            valor_total=Sum('unidades__chamados__valor_executado'),
        ).values('id', 'nome', 'total_chamados', 'valor_total')
        return Response(list(regionais))
