"""
Tarefas Celery para envio automático de notificações.
"""
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

from apps.estoque.models import Produto
from apps.financeiro.models import Lancamento
from apps.ordens.models import OrdemServico

from .models import LogNotificacao, ConfiguracaoNotificacao
from .email import EmailNotificacao, inicializar_templates
from .whatsapp import WhatsAppNotificacao, MensagensWhatsApp


def registrar_notificacao(tipo, destinatario, conteudo, canal=LogNotificacao.Canal.EMAIL, usuario=None,
                         ordem_servico_id=None, dados_adicionais=None):
    """
    Registra uma notificação no banco de dados.

    Args:
        tipo (str): Tipo de notificação
        destinatario (str): Email ou número de telefone
        conteudo (str): Conteúdo da notificação
        canal (str): Canal de envio (email ou whatsapp)
        usuario (Usuario): Usuário relacionado
        ordem_servico_id (int): ID da OS relacionada
        dados_adicionais (dict): Dados adicionais em JSON
    """
    log = LogNotificacao.objects.create(
        tipo=tipo,
        destinatario=destinatario or "nao-configurado@example.com",
        canal=canal,
        usuario=usuario,
        conteudo=conteudo,
        ordem_servico_id=ordem_servico_id,
        dados_adicionais=dados_adicionais or {},
    )
    return log


# ======================== TAREFAS DE EMAIL ========================


@shared_task
def enviar_email_os_atribuida(os_id):
    """
    Envia email quando uma OS é atribuída a um técnico.
    """
    try:
        os = OrdemServico.objects.select_related(
            "tecnico_responsavel", "cliente"
        ).get(id=os_id)

        if not os.tecnico_responsavel or not os.tecnico_responsavel.email:
            return False

        contexto = {
            "tecnico": os.tecnico_responsavel.get_full_name() or os.tecnico_responsavel.username,
            "numero_os": os.numero,
            "cliente": os.cliente.nome_razao_social,
            "descricao": os.descricao or "N/A",
            "data_agendada": os.data_agendada.strftime("%d/%m/%Y") if os.data_agendada else "Não definida",
            "prioridade": os.get_prioridade_display(),
            "link_os": f"{settings.BASE_URL}/os/{os.id}",
            "mensagem": f"OS {os.numero} atribuída a você.",
        }

        email = EmailNotificacao(
            assunto=f"Nova Ordem de Serviço #{os.numero} Atribuída",
            destinatarios=os.tecnico_responsavel.email,
            template_name="os_atribuida",
            contexto=contexto,
        )

        if email.enviar():
            registrar_notificacao(
                tipo=LogNotificacao.Tipo.OS_ATRIBUIDA,
                destinatario=os.tecnico_responsavel.email,
                conteudo=contexto["mensagem"],
                canal=LogNotificacao.Canal.EMAIL,
                usuario=os.tecnico_responsavel,
                ordem_servico_id=os_id,
                dados_adicionais=contexto,
            ).marcar_enviado()
            return True
        return False
    except Exception as e:
        print(f"Erro ao enviar email OS atribuída: {e}")
        return False


@shared_task
def enviar_email_os_aprovada(os_id, responsavel_email=None):
    """
    Envia email quando uma OS é aprovada para o responsável interno.
    """
    try:
        os = OrdemServico.objects.select_related(
            "cliente", "tecnico_responsavel"
        ).get(id=os_id)

        email_destino = responsavel_email or getattr(settings, "ADMIN_EMAIL", "admin@example.com")

        if not os.valor_total:
            valor_str = "Aguardando orçamento"
        else:
            valor_str = f"R$ {os.valor_total:,.2f}"

        contexto = {
            "responsavel": "Gerente",
            "numero_os": os.numero,
            "cliente": os.cliente.nome_razao_social,
            "valor": valor_str,
            "data_agendada": os.data_agendada.strftime("%d/%m/%Y") if os.data_agendada else "Não definida",
            "tecnico": os.tecnico_responsavel.get_full_name() if os.tecnico_responsavel else "Não atribuído",
            "link_os": f"{settings.BASE_URL}/os/{os.id}",
            "mensagem": f"OS {os.numero} foi aprovada.",
        }

        email = EmailNotificacao(
            assunto=f"Ordem de Serviço #{os.numero} Aprovada",
            destinatarios=email_destino,
            template_name="os_aprovada",
            contexto=contexto,
        )

        if email.enviar():
            registrar_notificacao(
                tipo=LogNotificacao.Tipo.OS_APROVADA,
                destinatario=email_destino,
                conteudo=contexto["mensagem"],
                canal=LogNotificacao.Canal.EMAIL,
                ordem_servico_id=os_id,
                dados_adicionais=contexto,
            ).marcar_enviado()
            return True
        return False
    except Exception as e:
        print(f"Erro ao enviar email OS aprovada: {e}")
        return False


@shared_task
def enviar_lembranca_agendamento():
    """
    Tarefa agendada diariamente às 18h para enviar lembranças de OS agendadas para o dia seguinte.
    Deve ser configurada no django-celery-beat.
    """
    ids_sucesso = []
    ids_erro = []

    try:
        amanha = timezone.localdate() + timedelta(days=1)
        oss_amanha = OrdemServico.objects.filter(
            data_agendada=amanha,
            status__in=["agendada", "em_execucao"]
        ).select_related("tecnico_responsavel", "cliente")

        for os in oss_amanha:
            if not os.tecnico_responsavel or not os.tecnico_responsavel.email:
                continue

            contexto = {
                "tecnico": os.tecnico_responsavel.get_full_name() or os.tecnico_responsavel.username,
                "numero_os": os.numero,
                "cliente": os.cliente.nome_razao_social,
                "endereco": os.cliente.endereco_padrao or "Não informado",
                "descricao": os.descricao or "N/A",
                "horario": os.horario_agendado or "Não definido",
                "link_os": f"{settings.BASE_URL}/os/{os.id}",
                "mensagem": f"Lembrança: OS {os.numero} agendada para amanhã.",
            }

            email = EmailNotificacao(
                assunto=f"Lembrança: Ordem de Serviço #{os.numero} Amanhã",
                destinatarios=os.tecnico_responsavel.email,
                template_name="os_agendada_amanha",
                contexto=contexto,
            )

            if email.enviar():
                registrar_notificacao(
                    tipo=LogNotificacao.Tipo.OS_AGENDADA_AMANHA,
                    destinatario=os.tecnico_responsavel.email,
                    conteudo=contexto["mensagem"],
                    canal=LogNotificacao.Canal.EMAIL,
                    usuario=os.tecnico_responsavel,
                    ordem_servico_id=os.id,
                    dados_adicionais=contexto,
                ).marcar_enviado()
                ids_sucesso.append(os.id)
            else:
                ids_erro.append(os.id)

        print(f"Lembrança agendamento: {len(ids_sucesso)} enviados, {len(ids_erro)} erros")
        return {"sucesso": ids_sucesso, "erro": ids_erro}

    except Exception as e:
        print(f"Erro ao enviar lembrança agendamento: {e}")
        return {"sucesso": ids_sucesso, "erro": ids_erro}


@shared_task
def enviar_email_os_finalizada(os_id, admin_email=None):
    """
    Envia email quando uma OS é finalizada para o departamento administrativo.
    """
    try:
        os = OrdemServico.objects.select_related(
            "cliente", "tecnico_responsavel"
        ).get(id=os_id)

        email_destino = admin_email or getattr(settings, "ADMIN_EMAIL", "admin@example.com")
        tempo_gasto = getattr(os, "tempo_gasto", 0) or 0

        contexto = {
            "numero_os": os.numero,
            "cliente": os.cliente.nome_razao_social,
            "tecnico": os.tecnico_responsavel.get_full_name() if os.tecnico_responsavel else "N/A",
            "data_conclusao": timezone.now().strftime("%d/%m/%Y %H:%M"),
            "tempo_gasto": f"{tempo_gasto:.1f}",
            "link_relatorio": f"{settings.BASE_URL}/os/{os.id}/relatorio",
            "mensagem": f"OS {os.numero} foi finalizada e está pronta para faturamento.",
        }

        email = EmailNotificacao(
            assunto=f"Ordem de Serviço #{os.numero} Finalizada",
            destinatarios=email_destino,
            template_name="os_finalizada",
            contexto=contexto,
        )

        if email.enviar():
            registrar_notificacao(
                tipo=LogNotificacao.Tipo.OS_FINALIZADA,
                destinatario=email_destino,
                conteudo=contexto["mensagem"],
                canal=LogNotificacao.Canal.EMAIL,
                ordem_servico_id=os_id,
                dados_adicionais=contexto,
            ).marcar_enviado()
            return True
        return False
    except Exception as e:
        print(f"Erro ao enviar email OS finalizada: {e}")
        return False


@shared_task
def enviar_notificacao_pagamentos_atrasados():
    """
    Tarefa agendada diariamente para verificar e notificar pagamentos em atraso.
    Deve ser configurada no django-celery-beat.
    """
    ids_notificados = []

    try:
        lancamentos_atrasados = Lancamento.objects.filter(
            status=Lancamento.Status.ATRASADO
        )

        if not lancamentos_atrasados.exists():
            return {"total": 0, "notificados": []}

        email_destino = getattr(settings, "FINANCEIRO_EMAIL", "financeiro@example.com")

        # Constrói HTML com lista de pagamentos
        pagamentos_html = "<ul style='list-style-type: none; padding: 0;'>"
        for lancamento in lancamentos_atrasados:
            dias_atraso = (timezone.now().date() - lancamento.data_vencimento).days
            pagamentos_html += (
                f"<li style='padding: 5px 0; border-bottom: 1px solid #ddd;'>"
                f"<strong>{lancamento.descricao}</strong><br>"
                f"Valor: R$ {lancamento.valor:,.2f} | "
                f"Vencimento: {lancamento.data_vencimento.strftime('%d/%m/%Y')} | "
                f"Atraso: {dias_atraso} dias"
                f"</li>"
            )
        pagamentos_html += "</ul>"

        contexto = {
            "quantidade": lancamentos_atrasados.count(),
            "pagamentos_html": pagamentos_html,
            "link_financeiro": f"{settings.BASE_URL}/financeiro",
            "data_envio": timezone.now().strftime("%d/%m/%Y %H:%M"),
            "mensagem": f"{lancamentos_atrasados.count()} pagamentos em atraso.",
        }

        email = EmailNotificacao(
            assunto="Relatório Diário: Pagamentos em Atraso",
            destinatarios=email_destino,
            template_name="pagamento_atrasado",
            contexto=contexto,
        )

        if email.enviar():
            registrar_notificacao(
                tipo=LogNotificacao.Tipo.PAGAMENTO_ATRASADO,
                destinatario=email_destino,
                conteudo=contexto["mensagem"],
                canal=LogNotificacao.Canal.EMAIL,
                dados_adicionais=contexto,
            ).marcar_enviado()
            ids_notificados.append("geral")

        print(f"Notificação pagamentos atrasados enviada para {email_destino}")
        return {"total": lancamentos_atrasados.count(), "notificados": ids_notificados}

    except Exception as e:
        print(f"Erro ao notificar pagamentos atrasados: {e}")
        return {"total": 0, "notificados": [], "erro": str(e)}


@shared_task
def enviar_notificacao_estoque_baixo():
    """
    Tarefa agendada toda segunda-feira para verificar e notificar estoque baixo.
    Deve ser configurada no django-celery-beat.
    """
    ids_notificados = []

    try:
        produtos_baixos = [p for p in Produto.objects.all() if p.estoque_atual < p.estoque_minimo]

        if not produtos_baixos:
            return {"total": 0, "notificados": []}

        email_destino = getattr(settings, "ESTOQUE_EMAIL", "estoque@example.com")

        # Constrói HTML com lista de produtos
        produtos_html = "<ul style='list-style-type: none; padding: 0;'>"
        for produto in produtos_baixos:
            diferenca = produto.estoque_minimo - produto.estoque_atual
            produtos_html += (
                f"<li style='padding: 5px 0; border-bottom: 1px solid #ddd;'>"
                f"<strong>{produto.nome}</strong><br>"
                f"Atual: {produto.estoque_atual} un. | "
                f"Mínimo: {produto.estoque_minimo} un. | "
                f"Déficit: {diferenca} un."
                f"</li>"
            )
        produtos_html += "</ul>"

        contexto = {
            "quantidade": len(produtos_baixos),
            "produtos_html": produtos_html,
            "link_estoque": f"{settings.BASE_URL}/estoque",
            "mensagem": f"{len(produtos_baixos)} produtos com estoque baixo.",
        }

        email = EmailNotificacao(
            assunto="Relatório Semanal: Produtos com Estoque Baixo",
            destinatarios=email_destino,
            template_name="estoque_baixo",
            contexto=contexto,
        )

        if email.enviar():
            registrar_notificacao(
                tipo=LogNotificacao.Tipo.ESTOQUE_BAIXO,
                destinatario=email_destino,
                conteudo=contexto["mensagem"],
                canal=LogNotificacao.Canal.EMAIL,
                dados_adicionais=contexto,
            ).marcar_enviado()
            ids_notificados.append("geral")

        print(f"Notificação estoque baixo enviada para {email_destino}")
        return {"total": len(produtos_baixos), "notificados": ids_notificados}

    except Exception as e:
        print(f"Erro ao notificar estoque baixo: {e}")
        return {"total": 0, "notificados": [], "erro": str(e)}


@shared_task
def enviar_email_relatorio_pronto(os_id, link_relatorio=None):
    """
    Envia email ao cliente quando relatório é gerado.
    """
    try:
        os = OrdemServico.objects.select_related("cliente").get(id=os_id)

        if not os.cliente or not os.cliente.email:
            return False

        contexto = {
            "cliente": os.cliente.nome_razao_social,
            "numero_os": os.numero,
            "data_servico": os.data_agendada.strftime("%d/%m/%Y") if os.data_agendada else "N/A",
            "tipo_relatorio": os.get_tipo_relatorio_display() if hasattr(os, "tipo_relatorio") else "Padrão",
            "link_relatorio": link_relatorio or f"{settings.BASE_URL}/os/{os.id}/relatorio",
            "dias_disponibilidade": "30",
            "mensagem": f"Relatório da OS {os.numero} pronto para download.",
        }

        email = EmailNotificacao(
            assunto=f"Seu Relatório #{os.numero} Está Pronto",
            destinatarios=os.cliente.email,
            template_name="relatorio_finalizado",
            contexto=contexto,
        )

        if email.enviar():
            registrar_notificacao(
                tipo=LogNotificacao.Tipo.RELATORIO_FINALIZADO,
                destinatario=os.cliente.email,
                conteudo=contexto["mensagem"],
                canal=LogNotificacao.Canal.EMAIL,
                ordem_servico_id=os_id,
                dados_adicionais=contexto,
            ).marcar_enviado()
            return True
        return False
    except Exception as e:
        print(f"Erro ao enviar email relatório pronto: {e}")
        return False


# ======================== TAREFAS DE RETRY ========================


@shared_task
def reenviar_notificacoes_falhadas():
    """
    Tarefa agendada a cada 30 minutos para tentar reenviar notificações que falharam.
    """
    notificacoes_pendentes = LogNotificacao.objects.filter(
        status=LogNotificacao.Status.ERRO,
        tentativas__lt=3,
        proxima_tentativa__lte=timezone.now(),
    )

    reenviadas = 0
    for notif in notificacoes_pendentes:
        if notif.canal == LogNotificacao.Canal.EMAIL:
            # Reenviar email
            try:
                email = EmailNotificacao(
                    assunto=f"[Reenvio] Notificação",
                    destinatarios=notif.destinatario,
                    template_name="os_atribuida",  # Template genérico
                    contexto={"mensagem": notif.conteudo, **notif.dados_adicionais},
                )
                if email.enviar():
                    notif.marcar_enviado()
                    reenviadas += 1
                else:
                    notif.registrar_erro("Falha ao reenviar")
            except Exception as e:
                notif.registrar_erro(str(e))

    print(f"Notificações reenviadas: {reenviadas}")
    return {"reenviadas": reenviadas}


# ======================== INICIALIZAÇÃO ========================


@shared_task
def inicializar_sistema_notificacoes():
    """
    Inicializa o sistema de notificações criando templates e configurações padrão.
    Deve ser executada uma vez ao iniciar a aplicação.
    """
    try:
        inicializar_templates()
        print("Templates de email inicializados com sucesso")
        return {"status": "success", "message": "Notificações inicializadas"}
    except Exception as e:
        print(f"Erro ao inicializar notificações: {e}")
        return {"status": "error", "message": str(e)}
