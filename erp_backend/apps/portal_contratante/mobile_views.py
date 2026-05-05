from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.saas.models import ChamadoPlataforma, LogAuditoria, SolicitacaoAprovacao
from apps.saas.serializers import SolicitacaoAprovacaoSerializer


class MobileAprovacoesPendentesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SolicitacaoAprovacao.objects.filter(status='pendente').select_related(
            'nivel_necessario', 'solicitado_por'
        ).order_by('-data_solicitacao')
        serializer = SolicitacaoAprovacaoSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})


class MobileSwipeAprovarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            sol = SolicitacaoAprovacao.objects.get(pk=pk)
        except SolicitacaoAprovacao.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=404)
        sol.status = 'aprovado'
        sol.aprovado_por = request.user
        sol.data_resposta = timezone.now()
        sol.observacao_aprovacao = request.data.get('observacao', 'Aprovado via mobile')
        sol.ip_aprovacao = request.META.get('REMOTE_ADDR')
        sol.dispositivo_aprovacao = request.META.get('HTTP_USER_AGENT', '')[:300]
        sol.save()
        LogAuditoria.objects.create(
            usuario=request.user,
            acao='aprovou',
            objeto_tipo='solicitacao_aprovacao',
            objeto_id=sol.pk,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
        return Response({'ok': True, 'id': pk, 'status': 'aprovado'})


class MobileSwipeReprovarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            sol = SolicitacaoAprovacao.objects.get(pk=pk)
        except SolicitacaoAprovacao.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=404)
        sol.status = 'reprovado'
        sol.aprovado_por = request.user
        sol.data_resposta = timezone.now()
        sol.observacao_aprovacao = request.data.get('observacao', 'Reprovado via mobile')
        sol.ip_aprovacao = request.META.get('REMOTE_ADDR')
        sol.dispositivo_aprovacao = request.META.get('HTTP_USER_AGENT', '')[:300]
        sol.save()
        LogAuditoria.objects.create(
            usuario=request.user,
            acao='reprovou',
            objeto_tipo='solicitacao_aprovacao',
            objeto_id=sol.pk,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
        return Response({'ok': True, 'id': pk, 'status': 'reprovado'})


class MobileDashboardExecutivoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        agora = timezone.now()
        chamados = ChamadoPlataforma.objects.all()
        aprovacoes_pendentes = SolicitacaoAprovacao.objects.filter(status='pendente').count()
        valor_pendente = SolicitacaoAprovacao.objects.filter(status='pendente').aggregate(
            t=Sum('valor')
        )['t'] or 0

        return Response({
            'aprovacoes_pendentes': aprovacoes_pendentes,
            'valor_pendente_aprovacao': float(valor_pendente),
            'chamados_abertos': chamados.filter(status='aberto').count(),
            'chamados_em_execucao': chamados.filter(status='em_execucao').count(),
            'chamados_concluidos_hoje': chamados.filter(
                status='concluido',
                conclusao__date=agora.date(),
            ).count(),
            'sla_vencidos': chamados.filter(sla__status='vencido').count(),
        })
