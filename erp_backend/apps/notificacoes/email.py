"""
Módulo de envio de emails com templates HTML.
"""
import os
from pathlib import Path
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings


TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


class EmailNotificacao:
    """Classe responsável pelo envio de emails com templates HTML."""

    def __init__(self, assunto, destinatarios, template_name, contexto):
        """
        Inicializa o email.

        Args:
            assunto (str): Assunto do email
            destinatarios (list|str): Email ou lista de emails
            template_name (str): Nome do template (sem extensão)
            contexto (dict): Contexto a ser passado ao template
        """
        self.assunto = assunto
        self.destinatarios = [destinatarios] if isinstance(destinatarios, str) else destinatarios
        self.template_name = template_name
        self.contexto = contexto
        self.from_email = settings.DEFAULT_FROM_EMAIL

    def get_template_path(self):
        """Retorna o caminho completo do template."""
        return os.path.join(TEMPLATES_DIR, f"{self.template_name}.html")

    def render_html(self):
        """Renderiza o template HTML."""
        try:
            return render_to_string(self.get_template_path(), self.contexto)
        except Exception as e:
            # Se o template não existir, retorna um HTML simples
            return f"<p>{self.contexto.get('mensagem', 'Notificação automática do ERP')}</p>"

    def enviar(self):
        """Envia o email com HTML."""
        html_content = self.render_html()

        email = EmailMultiAlternatives(
            subject=self.assunto,
            body=self.contexto.get("mensagem", ""),  # Texto simples como fallback
            from_email=self.from_email,
            to=self.destinatarios,
        )
        email.attach_alternative(html_content, "text/html")

        try:
            email.send(fail_silently=False)
            return True
        except Exception as e:
            print(f"Erro ao enviar email: {e}")
            return False


# Templates padrão para cada tipo de notificação
TEMPLATES_HTML = {
    "os_atribuida": """
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px;">
                    Nova Ordem de Serviço Atribuída
                </h2>
                <p style="color: #666; font-size: 16px;">Olá <strong>{{ tecnico }}</strong>,</p>
                <p style="color: #666; font-size: 16px;">
                    Uma nova ordem de serviço foi atribuída a você:
                </p>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                    <p><strong>Número da OS:</strong> {{ numero_os }}</p>
                    <p><strong>Cliente:</strong> {{ cliente }}</p>
                    <p><strong>Descrição:</strong> {{ descricao }}</p>
                    <p><strong>Data Agendada:</strong> {{ data_agendada }}</p>
                    <p><strong>Prioridade:</strong> <span style="background-color: #ffc107; padding: 5px 10px; border-radius: 3px;">{{ prioridade }}</span></p>
                </div>
                <p style="color: #666; font-size: 16px;">
                    <a href="{{ link_os }}" style="background-color: #007bff; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                        Acessar Ordem de Serviço
                    </a>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Este é um email automático do sistema ERP. Não responda este email.
                </p>
            </div>
        </body>
    </html>
    """,

    "os_aprovada": """
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 3px solid #28a745; padding-bottom: 10px;">
                    Ordem de Serviço Aprovada
                </h2>
                <p style="color: #666; font-size: 16px;">Olá <strong>{{ responsavel }}</strong>,</p>
                <p style="color: #666; font-size: 16px;">
                    A seguinte ordem de serviço foi <strong style="color: #28a745;">APROVADA</strong>:
                </p>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                    <p><strong>Número da OS:</strong> {{ numero_os }}</p>
                    <p><strong>Cliente:</strong> {{ cliente }}</p>
                    <p><strong>Valor:</strong> R$ {{ valor }}</p>
                    <p><strong>Data Agendada:</strong> {{ data_agendada }}</p>
                    <p><strong>Técnico Responsável:</strong> {{ tecnico }}</p>
                </div>
                <p style="color: #666; font-size: 16px;">
                    <a href="{{ link_os }}" style="background-color: #28a745; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                        Ver Detalhes
                    </a>
                </p>
            </div>
        </body>
    </html>
    """,

    "os_agendada_amanha": """
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 3px solid #ff9800; padding-bottom: 10px;">
                    Lembrança: Ordem de Serviço Agendada para Amanhã
                </h2>
                <p style="color: #666; font-size: 16px;">Olá <strong>{{ tecnico }}</strong>,</p>
                <p style="color: #666; font-size: 16px;">
                    <strong>⏰ Lembrança:</strong> Você possui uma ordem de serviço agendada para <strong>amanhã às {{ horario }}</strong>:
                </p>
                <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
                    <p><strong>Número da OS:</strong> {{ numero_os }}</p>
                    <p><strong>Cliente:</strong> {{ cliente }}</p>
                    <p><strong>Local:</strong> {{ endereco }}</p>
                    <p><strong>Descrição:</strong> {{ descricao }}</p>
                </div>
                <p style="color: #d32f2f; font-weight: bold;">
                    ⚠️ Confirme seu comparecimento no sistema.
                </p>
                <p style="color: #666; font-size: 16px;">
                    <a href="{{ link_os }}" style="background-color: #ff9800; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                        Confirmar Presença
                    </a>
                </p>
            </div>
        </body>
    </html>
    """,

    "os_finalizada": """
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 3px solid #28a745; padding-bottom: 10px;">
                    Ordem de Serviço Finalizada ✓
                </h2>
                <p style="color: #666; font-size: 16px;">Olá,</p>
                <p style="color: #666; font-size: 16px;">
                    A seguinte ordem de serviço foi <strong style="color: #28a745;">FINALIZADA</strong> com sucesso:
                </p>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                    <p><strong>Número da OS:</strong> {{ numero_os }}</p>
                    <p><strong>Cliente:</strong> {{ cliente }}</p>
                    <p><strong>Técnico:</strong> {{ tecnico }}</p>
                    <p><strong>Data Conclusão:</strong> {{ data_conclusao }}</p>
                    <p><strong>Tempo Gasto:</strong> {{ tempo_gasto }} horas</p>
                </div>
                <p style="color: #666; font-size: 16px;">
                    <a href="{{ link_relatorio }}" style="background-color: #28a745; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                        Acessar Relatório
                    </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    A ordem está pronta para faturamento.
                </p>
            </div>
        </body>
    </html>
    """,

    "pagamento_atrasado": """
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d32f2f; border-bottom: 3px solid #d32f2f; padding-bottom: 10px;">
                    ⚠️ Pagamentos Atrasados
                </h2>
                <p style="color: #666; font-size: 16px;">Olá,</p>
                <p style="color: #666; font-size: 16px;">
                    Existem <strong>{{ quantidade }} pagamento(s) em atraso</strong> que requerem sua atenção:
                </p>
                <div style="background-color: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
                    {{ pagamentos_html }}
                </div>
                <p style="color: #666; font-size: 16px;">
                    <a href="{{ link_financeiro }}" style="background-color: #d32f2f; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                        Acessar Financeiro
                    </a>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    Relatório automático enviado em {{ data_envio }}
                </p>
            </div>
        </body>
    </html>
    """,

    "estoque_baixo": """
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ff9800; border-bottom: 3px solid #ff9800; padding-bottom: 10px;">
                    📦 Produtos com Estoque Baixo
                </h2>
                <p style="color: #666; font-size: 16px;">Olá,</p>
                <p style="color: #666; font-size: 16px;">
                    <strong>{{ quantidade }} produto(s)</strong> estão com estoque abaixo do mínimo:
                </p>
                <div style="background-color: #fff8e1; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
                    {{ produtos_html }}
                </div>
                <p style="color: #666; font-size: 16px;">
                    <a href="{{ link_estoque }}" style="background-color: #ff9800; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                        Acessar Estoque
                    </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    Considere fazer uma nova compra para estes itens.
                </p>
            </div>
        </body>
    </html>
    """,

    "relatorio_finalizado": """
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px;">
                    Seu Relatório está Pronto ✓
                </h2>
                <p style="color: #666; font-size: 16px;">Olá <strong>{{ cliente }}</strong>,</p>
                <p style="color: #666; font-size: 16px;">
                    O relatório da sua ordem de serviço está pronto para download:
                </p>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                    <p><strong>Número da OS:</strong> {{ numero_os }}</p>
                    <p><strong>Data do Serviço:</strong> {{ data_servico }}</p>
                    <p><strong>Tipo de Relatório:</strong> {{ tipo_relatorio }}</p>
                </div>
                <p style="color: #666; font-size: 16px;">
                    <a href="{{ link_relatorio }}" style="background-color: #007bff; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                        📥 Baixar Relatório
                    </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    O relatório estará disponível por {{ dias_disponibilidade }} dias.
                </p>
            </div>
        </body>
    </html>
    """,
}


def criar_template_arquivo(nome, conteudo):
    """
    Cria arquivo de template se não existir.
    """
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    caminho = TEMPLATES_DIR / f"{nome}.html"

    if not caminho.exists():
        with open(caminho, "w", encoding="utf-8") as f:
            f.write(conteudo)


def inicializar_templates():
    """Inicializa todos os templates de email."""
    for nome, conteudo in TEMPLATES_HTML.items():
        criar_template_arquivo(nome, conteudo)
