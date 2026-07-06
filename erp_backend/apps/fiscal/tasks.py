from datetime import date

import requests
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django_tenants.utils import get_tenant_model, schema_context

from apps.configuracoes.models import ConfiguracaoEmpresa, get_empresa_configurada

from .models import ApuracaoSimplesNacional, ConfiguracaoFiscal
from .services import SimplesNacionalService


def _competencia_mes_anterior():
    hoje = timezone.localdate()
    primeiro_mes_atual = hoje.replace(day=1)
    ano = primeiro_mes_atual.year
    mes = primeiro_mes_atual.month - 1
    if mes == 0:
        ano -= 1
        mes = 12
    return date(ano, mes, 1)


def _destinatarios_alerta():
    destinatarios = {
        getattr(settings, "ADMIN_EMAIL", ""),
        getattr(settings, "FINANCEIRO_EMAIL", ""),
        getattr(settings, "DEFAULT_FROM_EMAIL", ""),
    }
    return [email for email in destinatarios if email and "example.com" not in email]


def _enviar_alerta(resultado: dict):
    if resultado.get("alerta") == ApuracaoSimplesNacional.Alerta.OK:
        return

    assunto = f"ERP Nexus: alerta Simples Nacional {resultado['competencia']}"
    mensagem = (
        "Alerta fiscal do Simples Nacional\n\n"
        f"Competência: {resultado['competencia']}\n"
        f"RBT12: R$ {resultado['rbt12']}\n"
        f"Faixa: {resultado['faixa']}\n"
        f"Alíquota efetiva: {resultado['aliquota_efetiva']}\n"
        f"DAS estimado: R$ {resultado['das_estimado']}\n"
        f"Status: {resultado['alerta']}\n\n"
        "Revise a apuração com o contador antes de transmitir o PGDAS-D."
    )

    destinatarios = _destinatarios_alerta()
    if destinatarios:
        send_mail(
            subject=assunto,
            message=mensagem,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=destinatarios,
            fail_silently=True,
        )

    webhook = getattr(settings, "WHATSAPP_ALERT_WEBHOOK", "")
    if webhook:
        try:
            requests.post(webhook, json={"assunto": assunto, "mensagem": mensagem, "resultado": resultado}, timeout=10)
        except requests.RequestException:
            pass


@shared_task(name="apps.fiscal.tasks.apurar_simples_mensal")
def apurar_simples_mensal(competencia=None):
    service = SimplesNacionalService()
    competencia = competencia or _competencia_mes_anterior()
    resultados = []

    tenants = get_tenant_model().objects.exclude(schema_name="public")
    for tenant in tenants:
        with schema_context(tenant.schema_name):
            empresas = ConfiguracaoEmpresa.objects.filter(configuracao_fiscal__regime_tributario=ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL)
            if not empresas.exists():
                empresas = ConfiguracaoEmpresa.objects.filter(pk=get_empresa_configurada().pk)

            for empresa in empresas:
                configuracao, _ = ConfiguracaoFiscal.objects.get_or_create(
                    empresa=empresa,
                    defaults={
                        "cnpj": empresa.cnpj,
                        "razao_social": empresa.razao_social or empresa.nome,
                        "regime_tributario": empresa.regime_tributario or ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL,
                        "aliquota_iss": empresa.aliquota_issqn_padrao,
                    },
                )
                if configuracao.regime_tributario != ConfiguracaoFiscal.RegimeTributario.SIMPLES_NACIONAL:
                    continue
                resultado = service.calcular(configuracao, competencia=competencia, salvar=True)
                resultado["schema"] = tenant.schema_name
                _enviar_alerta(resultado)
                resultados.append(resultado)

    return resultados
