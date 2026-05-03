"""
Integração com APIs WhatsApp (CallMeBot e Z-API).
"""
import requests
from django.conf import settings
from django.utils import timezone


class WhatsAppNotificacao:
    """Classe para envio de mensagens WhatsApp."""

    # Provedores suportados
    CALLMEBOT = "callmebot"
    ZAPI = "zapi"

    def __init__(self, numero, mensagem, provedor=None):
        """
        Inicializa a notificação WhatsApp.

        Args:
            numero (str): Número do WhatsApp com código país (ex: 5511999999999)
            mensagem (str): Mensagem a enviar
            provedor (str): Provedor de API (callmebot ou zapi)
        """
        self.numero = numero
        self.mensagem = mensagem
        self.provedor = provedor or getattr(settings, "WHATSAPP_PROVEDOR", "callmebot")

    def enviar_callmebot(self):
        """
        Envia mensagem via CallMeBot.
        Requer: CALLMEBOT_APIKEY configurada em settings.py
        """
        apikey = getattr(settings, "CALLMEBOT_APIKEY", "")

        if not apikey:
            print("CALLMEBOT_APIKEY não configurada")
            return False

        url = f"https://api.callmebot.com/whatsapp.php"
        params = {
            "phone": self.numero,
            "text": self.mensagem,
            "apikey": apikey,
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"Erro ao enviar WhatsApp via CallMeBot: {e}")
            return False

    def enviar_zapi(self):
        """
        Envia mensagem via Z-API.
        Requer: ZAPI_INSTANCIA e ZAPI_TOKEN configurados em settings.py
        """
        instancia = getattr(settings, "ZAPI_INSTANCIA", "")
        token = getattr(settings, "ZAPI_TOKEN", "")

        if not instancia or not token:
            print("ZAPI_INSTANCIA ou ZAPI_TOKEN não configurados")
            return False

        url = f"https://api.z-api.io/instances/{instancia}/token/{token}/send-message"
        headers = {"Content-Type": "application/json"}
        payload = {
            "phone": self.numero,
            "message": self.mensagem,
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            return response.status_code in [200, 201]
        except Exception as e:
            print(f"Erro ao enviar WhatsApp via Z-API: {e}")
            return False

    def enviar(self):
        """
        Envia a mensagem usando o provedor configurado.
        """
        if self.provedor == self.ZAPI:
            return self.enviar_zapi()
        else:  # callmebot como padrão
            return self.enviar_callmebot()

    @staticmethod
    def formatar_numero(numero):
        """
        Formata número de telefone para o padrão internacional.

        Args:
            numero (str): Número em qualquer formato

        Returns:
            str: Número formatado (ex: 5511999999999)
        """
        # Remove caracteres não numéricos
        apenas_numeros = "".join(filter(str.isdigit, numero))

        # Se não tiver código país, adiciona 55 (Brasil)
        if len(apenas_numeros) == 11:
            apenas_numeros = f"55{apenas_numeros}"

        return apenas_numeros


class MensagensWhatsApp:
    """Templates de mensagens WhatsApp pré-formatadas."""

    @staticmethod
    def os_atribuida(numero_os, cliente, data_agendada):
        """Mensagem de OS atribuída."""
        return (
            f"🔧 *Nova Ordem de Serviço*\n\n"
            f"OS: *{numero_os}*\n"
            f"Cliente: {cliente}\n"
            f"Data: {data_agendada}\n\n"
            f"Acesse o sistema para mais detalhes."
        )

    @staticmethod
    def os_aprovada(numero_os, cliente, valor):
        """Mensagem de OS aprovada."""
        return (
            f"✅ *Ordem de Serviço Aprovada*\n\n"
            f"OS: *{numero_os}*\n"
            f"Cliente: {cliente}\n"
            f"Valor: R$ {valor}\n\n"
            f"A ordem já pode ser agendada."
        )

    @staticmethod
    def lembrança_agendamento(numero_os, cliente):
        """Mensagem de lembrança de agendamento."""
        return (
            f"⏰ *Lembrança: Agendamento para Amanhã*\n\n"
            f"OS: *{numero_os}*\n"
            f"Cliente: {cliente}\n\n"
            f"Confirme seu comparecimento no sistema."
        )

    @staticmethod
    def os_finalizada(numero_os, cliente):
        """Mensagem de OS finalizada."""
        return (
            f"✓ *Ordem de Serviço Finalizada*\n\n"
            f"OS: *{numero_os}*\n"
            f"Cliente: {cliente}\n\n"
            f"Relatório disponível para download."
        )

    @staticmethod
    def pagamento_atrasado(descricao, valor, dias_atraso):
        """Mensagem de pagamento atrasado."""
        return (
            f"💳 *Pagamento Atrasado*\n\n"
            f"Descrição: {descricao}\n"
            f"Valor: R$ {valor}\n"
            f"Dias em Atraso: {dias_atraso}\n\n"
            f"Quitar o pagamento no sistema."
        )

    @staticmethod
    def estoque_baixo(produto, quantidade_atual, quantidade_minima):
        """Mensagem de estoque baixo."""
        return (
            f"📦 *Produto com Estoque Baixo*\n\n"
            f"Produto: {produto}\n"
            f"Quantidade Atual: {quantidade_atual} un.\n"
            f"Quantidade Mínima: {quantidade_minima} un.\n\n"
            f"Considere fazer um novo pedido."
        )

    @staticmethod
    def relatorio_pronto(numero_os, cliente):
        """Mensagem de relatório pronto."""
        return (
            f"📄 *Seu Relatório Está Pronto*\n\n"
            f"OS: *{numero_os}*\n"
            f"Cliente: {cliente}\n\n"
            f"Acesse o portal para fazer o download."
        )
