"""
Middleware de Auditoria automática do SaaS Facilities.
Registra mudanças em modelos críticos no LogAuditoria.
"""
import json
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

MODELOS_AUDITADOS = {
    "chamadoplataforma": "Chamado de Plataforma",
    "solicitacaoaprovacao": "Solicitação de Aprovação",
    "budgetanual": "Budget Anual",
    "budgetmensal": "Budget Mensal",
    "contratosaas": "Contrato SaaS",
    "tenant": "Tenant",
    "empresa": "Empresa",
    "unidade": "Unidade",
}


class AuditoriaSaaSMiddleware(MiddlewareMixin):
    """
    Middleware leve que captura metadados da requisição (IP, user-agent)
    e os injeta no request para que as views possam usar ao criar LogAuditoria.
    
    A criação efetiva do log é feita nas views (approach mais simples e seguro
    do que signals/post_save que podem causar loops ou problemas de schema no
    ambiente multi-tenant).
    """

    def process_request(self, request):
        request.audit_ip = self._get_client_ip(request)
        request.audit_user_agent = request.META.get("HTTP_USER_AGENT", "")
        return None

    @staticmethod
    def _get_client_ip(request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")


def registrar_log(request, tenant, acao, objeto_tipo, objeto_id,
                  valores_antes=None, valores_depois=None, observacao=""):
    """
    Função auxiliar para registrar log de auditoria nas views.
    Importar e chamar diretamente nas views que precisam de auditoria.
    
    Exemplo:
        from apps.saas.middleware import registrar_log
        registrar_log(request, tenant, "aprovou", "chamadoplataforma", chamado.id,
                      valores_antes={"status": "aguardando_aprovacao"},
                      valores_depois={"status": "em_execucao"})
    """
    try:
        from apps.saas.models import LogAuditoria
        LogAuditoria.objects.create(
            tenant=tenant,
            usuario=request.user if request.user.is_authenticated else None,
            acao=acao,
            objeto_tipo=objeto_tipo,
            objeto_id=objeto_id,
            valores_antes=valores_antes or {},
            valores_depois=valores_depois or {},
            ip_address=getattr(request, "audit_ip", ""),
            user_agent=getattr(request, "audit_user_agent", ""),
        )
    except Exception as e:
        logger.warning(f"Falha ao registrar log de auditoria: {e}")
