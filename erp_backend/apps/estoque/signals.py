from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings

from apps.ordens.models import DespesaOS
from apps.financeiro.services import GeradorLancamentoFinanceiro

from .models import MovimentacaoEstoque, Produto, AlertaEstoque


@receiver(post_save, sender=MovimentacaoEstoque)
def gerar_alerta_estoque_baixo(sender, instance, created, **kwargs):
    """
    Gera alerta quando o estoque fica abaixo do mínimo após uma movimentação.
    """
    if not created:
        return

    produto = instance.produto
    estoque_atual = produto.estoque_atual

    # Se estoque está em alerta, cria ou recupera alerta
    if estoque_atual <= produto.estoque_minimo:
        if estoque_atual == 0:
            tipo_alerta = AlertaEstoque.TipoAlerta.SEM_ESTOQUE
            descricao = f"Produto {produto.nome} (código: {produto.codigo}) está SEM ESTOQUE"
        else:
            tipo_alerta = AlertaEstoque.TipoAlerta.ESTOQUE_BAIXO
            descricao = f"Produto {produto.nome} (código: {produto.codigo}) está abaixo do mínimo. Estoque atual: {estoque_atual} {produto.unidade_medida}"

        AlertaEstoque.objects.create(
            produto=produto,
            tipo=tipo_alerta,
            descricao=descricao
        )

        # Envia email de notificação (opcional, configurável)
        if getattr(settings, "NOTIFICAR_ESTOQUE_BAIXO", True):
            enviar_notificacao_estoque_baixo(produto, estoque_atual, tipo_alerta)


@receiver(post_save, sender=MovimentacaoEstoque)
def notificar_movimentacao_registrada(sender, instance, created, **kwargs):
    """
    Notifica quando uma movimentação de estoque é registrada (especialmente de material em OS).
    """
    if not created or instance.motivo != MovimentacaoEstoque.Motivo.USO_OS:
        return

    if instance.os:
        # Aqui poderia enviar notificação para o financeiro/administrativo
        pass


@receiver(post_save, sender=MovimentacaoEstoque)
def gerar_lancamento_entrada(sender, instance, created, **kwargs):
    """
    Automatically creates DESPESA Lancamento when product enters inventory (ENTRADA).
    Integrates inventory movements with financial module.
    """
    if not created or instance.tipo != MovimentacaoEstoque.Tipo.ENTRADA:
        return

    try:
        gerador = GeradorLancamentoFinanceiro()
        # Check if "já foi pago" is indicated in observações
        ja_foi_pago = "já foi pago" in (instance.observacoes or "").lower()
        gerador.criar_despesa_entrada(instance, ja_foi_pago=ja_foi_pago)
    except Exception as e:
        print(f"Erro ao gerar Lancamento para MovimentacaoEstoque #{instance.id}: {str(e)}")


@receiver(post_save, sender=DespesaOS)
def perguntar_baixa_estoque_material(sender, instance, created, **kwargs):
    """
    Ao lançar despesa de material em uma OS, verifica se deve baixar automaticamente do estoque.
    Procura no descricao por "baixar_estoque=sim" para fazer a baixa automática.
    """
    if not created or instance.tipo != DespesaOS.Tipo.MATERIAL:
        return

    descricao_lower = instance.descricao.lower()

    # Verifica se a despesa deve gerar baixa automática no estoque
    if "baixar_estoque=sim" not in descricao_lower:
        return

    # Tenta encontrar o produto pelo nome na descrição
    produto = Produto.objects.filter(nome__icontains=instance.descricao.split(":")[0].strip()).first()

    if produto:
        # Cria movimentação automática de saída
        MovimentacaoEstoque.objects.create(
            produto=produto,
            tipo=MovimentacaoEstoque.Tipo.SAIDA,
            quantidade=1,
            valor_unitario=instance.valor,
            motivo=MovimentacaoEstoque.Motivo.USO_OS,
            os=instance.os,
            observacoes=f"Baixa automática gerada pela despesa #{instance.id}.",
            realizado_por=instance.registrado_por,
        )


def enviar_notificacao_estoque_baixo(produto, estoque_atual, tipo_alerta):
    """
    Envia email de notificação de estoque baixo para o administrativo.
    """
    try:
        destinatario = getattr(settings, "EMAIL_NOTIFICACAO_ESTOQUE", None)
        if not destinatario:
            return

        assunto = f"ALERTA: Estoque baixo - {produto.nome}"

        if tipo_alerta == AlertaEstoque.TipoAlerta.SEM_ESTOQUE:
            mensagem = f"""
            <html>
                <body>
                    <h2>ALERTA DE ESTOQUE - SEM ESTOQUE</h2>
                    <p>O produto <strong>{produto.nome}</strong> (código: <strong>{produto.codigo}</strong>) está <strong>SEM ESTOQUE</strong>.</p>
                    <p>Estoque mínimo configurado: {produto.estoque_minimo} {produto.unidade_medida}</p>
                    <p>Localização: {produto.localizacao or 'Não informada'}</p>
                    <p>Por favor, verifique e reabastece o estoque.</p>
                </body>
            </html>
            """
        else:
            mensagem = f"""
            <html>
                <body>
                    <h2>ALERTA DE ESTOQUE BAIXO</h2>
                    <p>O produto <strong>{produto.nome}</strong> (código: <strong>{produto.codigo}</strong>) está abaixo do estoque mínimo.</p>
                    <p>Estoque atual: {estoque_atual} {produto.unidade_medida}</p>
                    <p>Estoque mínimo: {produto.estoque_minimo} {produto.unidade_medida}</p>
                    <p>Localização: {produto.localizacao or 'Não informada'}</p>
                    <p>Preço de custo: R$ {produto.preco_custo}</p>
                    <p>Por favor, verifique e reabastece o estoque conforme necessário.</p>
                </body>
            </html>
            """

        send_mail(
            assunto,
            "",
            settings.DEFAULT_FROM_EMAIL,
            [destinatario],
            html_message=mensagem,
            fail_silently=True,
        )
    except Exception as e:
        print(f"Erro ao enviar notificação de estoque baixo: {str(e)}")

