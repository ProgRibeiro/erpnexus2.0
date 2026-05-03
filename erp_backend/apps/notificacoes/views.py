"""
Views para API de notificações.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from datetime import timedelta

from .models import LogNotificacao, ConfiguracaoNotificacao
from .serializers import (
    LogNotificacaoSerializer,
    ConfiguracaoNotificacaoSerializer,
    ResumoPendenciasSerializer,
    EnviarNotificacaoTestSerializer,
)
from .email import EmailNotificacao
from .tasks import (
    enviar_email_os_atribuida,
    enviar_email_os_aprovada,
    enviar_email_os_finalizada,
    enviar_notificacao_pagamentos_atrasados,
    enviar_notificacao_estoque_baixo,
)


class LogNotificacaoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gerenciar logs de notificações."""

    queryset = LogNotificacao.objects.all()
    serializer_class = LogNotificacaoSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ("status", "tipo", "canal", "criado_em")
    search_fields = ("destinatario", "conteudo")
    ordering = ["-criado_em"]

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        """Retorna resumo de notificações pendentes e com erro."""
        agora = timezone.now()
        ontem = agora - timedelta(days=1)

        total_pendentes = LogNotificacao.objects.filter(status=LogNotificacao.Status.PENDENTE).count()
        total_erros = LogNotificacao.objects.filter(status=LogNotificacao.Status.ERRO).count()
        ultimas_24h = LogNotificacao.objects.filter(criado_em__gte=ontem).count()

        # Contar por tipo
        por_tipo = (
            LogNotificacao.objects.values("tipo")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Contar por status
        por_status = (
            LogNotificacao.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        data = {
            "total_pendentes": total_pendentes,
            "total_erros": total_erros,
            "ultimas_24h": ultimas_24h,
            "por_tipo": {item["tipo"]: item["count"] for item in por_tipo},
            "por_status": {item["status"]: item["count"] for item in por_status},
        }

        serializer = ResumoPendenciasSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pendentes(self, request):
        """Retorna notificações pendentes de envio."""
        queryset = LogNotificacao.objects.filter(status=LogNotificacao.Status.PENDENTE).order_by("criado_em")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def com_erro(self, request):
        """Retorna notificações com erro de envio."""
        queryset = LogNotificacao.objects.filter(status=LogNotificacao.Status.ERRO).order_by("-criado_em")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def minhas_notificacoes(self, request):
        """Retorna notificações do usuário autenticado."""
        queryset = LogNotificacao.objects.filter(usuario=request.user).order_by("-criado_em")[:20]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def testar_notificacao(self, request):
        """Testa envio de uma notificação."""
        if not request.user.is_staff:
            return Response(
                {"error": "Apenas administradores podem testar notificações"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EnviarNotificacaoTestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        dados = serializer.validated_data
        canal = dados.get("canal", LogNotificacao.Canal.EMAIL)

        try:
            if canal == LogNotificacao.Canal.EMAIL:
                email = EmailNotificacao(
                    assunto=f"[TESTE] Notificação ERP - {dados['tipo']}",
                    destinatarios=dados["destinatario"],
                    template_name="os_atribuida",  # Template genérico
                    contexto={
                        "mensagem": dados["conteudo"],
                        "numero_os": "TEST-001",
                        "cliente": "Teste",
                        "descricao": dados["conteudo"],
                    },
                )
                sucesso = email.enviar()
            else:
                sucesso = False  # WhatsApp teste seria aqui

            if sucesso:
                return Response(
                    {
                        "status": "sucesso",
                        "message": f"Notificação de teste enviada via {canal}",
                    }
                )
            else:
                return Response(
                    {"status": "erro", "message": "Falha ao enviar notificação de teste"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            return Response(
                {"status": "erro", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["post"])
    def disparar_notificacao(self, request):
        """
        Dispara uma tarefa de notificação específica.
        Útil para testar integrações com Celery.
        """
        if not request.user.is_staff:
            return Response(
                {"error": "Apenas administradores podem disparar notificações"},
                status=status.HTTP_403_FORBIDDEN,
            )

        tipo = request.data.get("tipo")
        os_id = request.data.get("os_id")

        try:
            if tipo == "os_atribuida" and os_id:
                resultado = enviar_email_os_atribuida.delay(os_id)
                return Response(
                    {"status": "sucesso", "task_id": resultado.id, "message": "Tarefa disparada"}
                )
            elif tipo == "os_aprovada" and os_id:
                resultado = enviar_email_os_aprovada.delay(os_id)
                return Response(
                    {"status": "sucesso", "task_id": resultado.id, "message": "Tarefa disparada"}
                )
            elif tipo == "os_finalizada" and os_id:
                resultado = enviar_email_os_finalizada.delay(os_id)
                return Response(
                    {"status": "sucesso", "task_id": resultado.id, "message": "Tarefa disparada"}
                )
            elif tipo == "pagamentos_atrasados":
                resultado = enviar_notificacao_pagamentos_atrasados.delay()
                return Response(
                    {"status": "sucesso", "task_id": resultado.id, "message": "Tarefa disparada"}
                )
            elif tipo == "estoque_baixo":
                resultado = enviar_notificacao_estoque_baixo.delay()
                return Response(
                    {"status": "sucesso", "task_id": resultado.id, "message": "Tarefa disparada"}
                )
            else:
                return Response(
                    {"error": "Tipo de notificação ou parâmetros inválidos"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ConfiguracaoNotificacaoViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar configurações de notificações."""

    serializer_class = ConfiguracaoNotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Retorna apenas as configurações do usuário autenticado ou todas se for admin."""
        if self.request.user.is_staff:
            return ConfiguracaoNotificacao.objects.all()
        return ConfiguracaoNotificacao.objects.filter(usuario=self.request.user)

    @action(detail=False, methods=["get"])
    def minha_configuracao(self, request):
        """Retorna a configuração de notificações do usuário autenticado."""
        try:
            config = ConfiguracaoNotificacao.objects.get(usuario=request.user)
        except ConfiguracaoNotificacao.DoesNotExist:
            # Criar configuração padrão se não existir
            config = ConfiguracaoNotificacao.objects.create(usuario=request.user)

        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=["put", "patch"])
    def atualizar_minha_configuracao(self, request):
        """Atualiza a configuração de notificações do usuário autenticado."""
        try:
            config = ConfiguracaoNotificacao.objects.get(usuario=request.user)
        except ConfiguracaoNotificacao.DoesNotExist:
            config = ConfiguracaoNotificacao.objects.create(usuario=request.user)

        serializer = self.get_serializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
