from io import BytesIO
from datetime import datetime, timedelta
from collections import defaultdict

from django.core.files.base import ContentFile
from django.db import transaction
from django.http import FileResponse
from django.utils import timezone
from reportlab.pdfgen import canvas
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from .models import AnexoChatOS, ChatOS, ChecklistItem, ChecklistTemplate, DespesaOS, FaturamentoAgrupado, FotoChecklist, FotoOS, ItemOrcamento, LogStatusOS, OrdemServico, RespostaChecklist
from .pdf_generator import gerar_relatorio_pdf, gerar_orcamento_pdf, salvar_relatorio_pdf, salvar_orcamento_pdf
from .services import PedidoCompraInteligente
from .serializers import (
    ChatOSSerializer,
    ChecklistItemSerializer,
    ChecklistTemplateSerializer,
    DespesaOSSerializer,
    FaturamentoAgrupadoSerializer,
    FotoChecklistSerializer,
    FotoOSSerializer,
    MudarStatusOSSerializer,
    OrdemServicoSerializer,
    ReagendarOSSerializer,
    AgendaSerializer,
    RelatorioPublicoSerializer,
    RespostaChecklistSerializer,
)


class OrdemServicoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdemServicoSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    search_fields = ["numero", "descricao_servico", "cliente__nome", "cliente__cnpj_cpf"]
    filterset_fields = ["status", "cliente", "tecnico_responsavel", "tipo_servico"]
    ordering_fields = ["criado_em", "data_agendada", "valor_total_orcado"]

    def _snapshot(self, ordem):
        return {
            k: str(v)
            for k, v in ordem.__dict__.items()
            if not k.startswith("_")
        }

    def get_queryset(self):
        queryset = (
            OrdemServico.objects.select_related(
                "cliente",
                "contato_responsavel",
                "endereco_servico",
                "tecnico_responsavel",
                "criado_por",
                "atualizado_por",
            )
            .prefetch_related("itens", "fotos", "mensagens__anexos", "despesas", "logs_status")
        )

        if getattr(self, "action", None) != "list":
            return queryset

        status_param = self.request.query_params.get("status")
        modo = self.request.query_params.get("modo")  # "orcamento" para página de orçamentos
        tecnico = self.request.query_params.get("tecnico") or self.request.query_params.get(
            "tecnico_responsavel"
        )
        tipo = self.request.query_params.get("tipo") or self.request.query_params.get("tipo_servico")
        periodo_inicio = self.request.query_params.get("periodo_inicio") or self.request.query_params.get(
            "data_inicio"
        )
        periodo_fim = self.request.query_params.get("periodo_fim") or self.request.query_params.get(
            "data_fim"
        )

        STATUSES_ORCAMENTO = [
            OrdemServico.Status.RASCUNHO,
            OrdemServico.Status.ORCAMENTO_ENVIADO,
        ]

        if status_param:
            queryset = queryset.filter(status=status_param)
        elif modo == "orcamento":
            # Página de orçamentos: mostra apenas registros que ainda são orçamentos ou foram
            # aprovados/cancelados como resultado de um orçamento
            queryset = queryset.filter(
                status__in=[
                    OrdemServico.Status.RASCUNHO,
                    OrdemServico.Status.ORCAMENTO_ENVIADO,
                    OrdemServico.Status.APROVADA,
                    OrdemServico.Status.CANCELADA,
                ]
            )
        else:
            # Página de OS: oculta rascunhos e orçamentos ainda não aprovados
            queryset = queryset.exclude(status__in=STATUSES_ORCAMENTO)

        if tecnico:
            queryset = queryset.filter(tecnico_responsavel_id=tecnico)
        if tipo:
            queryset = queryset.filter(tipo_servico=tipo)
        if periodo_inicio:
            queryset = queryset.filter(data_agendada__gte=periodo_inicio)
        if periodo_fim:
            queryset = queryset.filter(data_agendada__lte=periodo_fim)

        return queryset

    def _usuario_pode_usar_chat_facilities(self, ordem, usuario):
        if not ordem.tenant_contratante_id or not ordem.tenant_prestador_id:
            return True

        if getattr(usuario, "is_superuser", False):
            return True

        tenant_usuario_id = getattr(usuario, "tenant_id", None)
        if tenant_usuario_id is None:
            return False

        if tenant_usuario_id in {ordem.tenant_contratante_id, ordem.tenant_prestador_id}:
            return True

        return False

    def perform_create(self, serializer):
        ordem = serializer.save(criado_por=self.request.user, atualizado_por=self.request.user)
        LogAuditoria.objects.create(
            usuario=self.request.user if self.request.user.is_authenticated else None,
            acao="create",
            modelo="OrdemServico",
            objeto_id=str(ordem.pk),
            ip=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT", "")[:500],
            dados_depois=self._snapshot(ordem),
        )
        if ordem.tem_pedido_compra and ordem.pdf_pc:
            PedidoCompraInteligente().registrar_aprendizado(ordem, usuario=self.request.user)

    def perform_update(self, serializer):
        dados_antes = self._snapshot(serializer.instance)
        ordem = serializer.save(atualizado_por=self.request.user)
        LogAuditoria.objects.create(
            usuario=self.request.user if self.request.user.is_authenticated else None,
            acao="update",
            modelo="OrdemServico",
            objeto_id=str(ordem.pk),
            ip=self.request.META.get("REMOTE_ADDR"),
            user_agent=self.request.META.get("HTTP_USER_AGENT", "")[:500],
            dados_antes=dados_antes,
            dados_depois=self._snapshot(ordem),
        )
        if ordem.tem_pedido_compra and ordem.pdf_pc:
            PedidoCompraInteligente().registrar_aprendizado(ordem, usuario=self.request.user)

    @action(detail=True, methods=["post"], url_path="mudar-status")
    def mudar_status(self, request, pk=None):
        ordem = self.get_object()
        serializer = MudarStatusOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        status_anterior = ordem.status
        status_novo = serializer.validated_data["status"]

        # Guarda de transição: orçamentos só viram OS após aprovação
        STATUSES_ORCAMENTO = {
            OrdemServico.Status.RASCUNHO,
            OrdemServico.Status.ORCAMENTO_ENVIADO,
        }
        STATUSES_OS = {
            OrdemServico.Status.ABERTA,
            OrdemServico.Status.AGENDADA,
            OrdemServico.Status.EM_EXECUCAO,
            OrdemServico.Status.CONCLUIDA,
            OrdemServico.Status.FATURADA,
        }
        # Não permite pular de orçamento direto para status de OS sem passar por "aprovada"
        if status_anterior in STATUSES_ORCAMENTO and status_novo in STATUSES_OS:
            return Response(
                {"detail": "O orçamento precisa ser aprovado antes de se tornar uma Ordem de Serviço."},
                status=400,
            )
        # Não permite voltar de OS para orçamento
        if status_anterior in STATUSES_OS and status_novo in STATUSES_ORCAMENTO:
            return Response(
                {"detail": "Não é possível reverter uma Ordem de Serviço para status de orçamento."},
                status=400,
            )
        ordem.status = status_novo
        ordem.atualizado_por = request.user
        ordem.save(update_fields=["status", "atualizado_por", "atualizado_em"])
        estoque_resultado = []
        if status_novo == OrdemServico.Status.CONCLUIDA:
            from apps.estoque.services import MotorEstoqueOS

            estoque_resultado = MotorEstoqueOS().processar_conclusao_os(ordem, usuario=request.user)
        if status_novo in [OrdemServico.Status.APROVADA, OrdemServico.Status.EM_EXECUCAO, OrdemServico.Status.CONCLUIDA]:
            from apps.terceiros.services import criar_contas_pagar_terceiros

            criar_contas_pagar_terceiros(ordem, usuario=request.user)
        LogStatusOS.objects.create(
            os=ordem,
            status_anterior=status_anterior,
            status_novo=status_novo,
            alterado_por=request.user,
            observacao=serializer.validated_data.get("observacao", ""),
        )
        data = self.get_serializer(ordem).data
        data["estoque_processado"] = estoque_resultado
        return Response(data)

    @action(detail=True, methods=["post"], url_path="confirmar-faturamento")
    def confirmar_faturamento(self, request, pk=None):
        from apps.financeiro.models import CategoriaFinanceira, ContaBancaria, Lancamento
        from apps.financeiro.serializers import LancamentoSerializer

        ordem = self.get_object()

        # Regra 1: somente OS com status "concluida" podem ser faturadas
        if ordem.status != OrdemServico.Status.CONCLUIDA:
            status_label = dict(OrdemServico.Status.choices).get(ordem.status, ordem.status)
            return Response(
                {"detail": f"Somente ordens com status 'Concluída' podem ser faturadas. Status atual: {status_label}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Regra 2: se tem PC, verificar se foi preenchido ou se usuário confirmou prosseguir sem
        pc_preenchido = False
        if ordem.tem_pedido_compra:
            tem_numero = bool(ordem.numero_pc and ordem.numero_pc.strip())
            tem_valor = bool(ordem.valor_autorizado_pc and float(ordem.valor_autorizado_pc) > 0)
            tem_dados = bool(isinstance(ordem.dados_pc_extraidos, dict) and ordem.dados_pc_extraidos)
            pc_preenchido = tem_numero or tem_valor or tem_dados
            forcar = request.data.get("forcar_sem_pc", False)
            if not pc_preenchido and not forcar:
                return Response(
                    {
                        "detail": "Esta OS possui Pedido de Compra mas os dados não foram preenchidos. "
                                  "Preencha o PC na OS ou confirme para faturar sem PC.",
                        "requer_confirmacao_pc": True,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        conta_id = request.data.get("conta_bancaria")
        if conta_id:
            try:
                conta = ContaBancaria.objects.get(pk=conta_id, ativo=True)
            except ContaBancaria.DoesNotExist:
                return Response(
                    {"detail": "Conta/banco de recebimento não encontrado ou inativo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            conta, _ = ContaBancaria.objects.get_or_create(
                nome="Caixa principal",
                defaults={
                    "banco": "Caixa interno",
                    "tipo": ContaBancaria.Tipo.CAIXA,
                    "saldo_inicial": 0,
                    "ativo": True,
                },
            )

        with transaction.atomic():
            status_anterior = ordem.status
            if not ordem.valor_final_faturado:
                ordem.valor_final_faturado = ordem.total_com_impostos or ordem.valor_total_orcado
            ordem.status = OrdemServico.Status.FATURADA
            ordem.atualizado_por = request.user
            ordem.save(update_fields=["valor_final_faturado", "status", "atualizado_por", "atualizado_em"])

            if status_anterior != ordem.status:
                LogStatusOS.objects.create(
                    os=ordem,
                    status_anterior=status_anterior,
                    status_novo=ordem.status,
                    alterado_por=request.user,
                    observacao="Faturamento confirmado pela tela operacional da OS.",
                )

            categoria, _ = CategoriaFinanceira.objects.get_or_create(
                nome="Receita de servicos",
                tipo=Lancamento.Tipo.RECEITA,
                defaults={"cor": "#3B82F6"},
            )
            valor_receber = ordem.valor_final_faturado or ordem.total_com_impostos or ordem.valor_total_orcado
            motor_fiscal = ordem.dados_impostos.get("motor_fiscal", {}) if isinstance(ordem.dados_impostos, dict) else {}
            financeiro_fiscal = motor_fiscal.get("financeiro", {}) if isinstance(motor_fiscal, dict) else {}
            if financeiro_fiscal.get("criar_contas_receber_por") == "valor_liquido" and ordem.valor_liquido_nf:
                valor_receber = ordem.valor_liquido_nf
            lancamento, _ = Lancamento.objects.update_or_create(
                os=ordem,
                tipo=Lancamento.Tipo.RECEITA,
                defaults={
                    "descricao": f"Faturamento {ordem.numero}",
                    "valor": valor_receber,
                    "data_competencia": ordem.data_emissao_nf or timezone.localdate(),
                    "data_vencimento": ordem.data_vencimento or timezone.localdate(),
                    "status": Lancamento.Status.PENDENTE,
                    "conta_bancaria": conta,
                    "categoria": categoria,
                    "fornecedor_cliente": ordem.cliente.nome if ordem.cliente else "",
                    "numero_documento": ordem.numero_nf,
                    "criado_por": request.user,
                },
            )

        ordem.refresh_from_db()
        return Response(
            {
                "ordem": self.get_serializer(ordem).data,
                "lancamento": LancamentoSerializer(lancamento).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="upload-fotos")
    def upload_fotos(self, request, pk=None):
        ordem = self.get_object()
        arquivos = request.FILES.getlist("arquivos") or request.FILES.getlist("arquivo")
        if not arquivos:
            return Response(
                {"detail": "Envie ao menos um arquivo em 'arquivo' ou 'arquivos'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fotos = []
        for arquivo in arquivos:
            fotos.append(
                FotoOS.objects.create(
                    os=ordem,
                    tipo=request.data.get("tipo", FotoOS.Tipo.ANTES),
                    arquivo=arquivo,
                    legenda=request.data.get("legenda", ""),
                    ordem=request.data.get("ordem") or 0,
                    enviado_por=request.user,
                )
            )
        return Response(FotoOSSerializer(fotos, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="analisar-pedido-compra")
    def analisar_pedido_compra(self, request, pk=None):
        ordem = self.get_object()
        arquivo = request.FILES.get("arquivo")
        analisador = PedidoCompraInteligente()

        try:
            if arquivo is not None:
                analise = analisador.analisar_arquivo(arquivo, ordem=ordem)
            elif ordem.pdf_pc:
                with ordem.pdf_pc.open("rb") as pdf_salvo:
                    analise = analisador.analisar_arquivo(pdf_salvo, ordem=ordem)
            else:
                return Response(
                    {"detail": "Envie um PDF do pedido de compra para análise."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as error:
            return Response(
                {"detail": f"Não foi possível analisar o PDF do pedido de compra: {error}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if arquivo is not None:
            ordem.pdf_pc = arquivo
        ordem.dados_pc_extraidos = analise
        ordem.resumo_pc = analise.get("resumo", "")
        ordem.pc_confianca = analise.get("confianca", "0")
        ordem.pc_ultima_analise_em = timezone.now()
        if not ordem.numero_pc and analise.get("numero_pc_sugerido"):
            ordem.numero_pc = analise["numero_pc_sugerido"]
        if not ordem.validade_pc and analise.get("validade_sugerida"):
            ordem.validade_pc = datetime.fromisoformat(analise["validade_sugerida"]).date()
        if ordem.tem_pedido_compra and not ordem.valor_autorizado_pc:
            ordem.valor_autorizado_pc = ordem.valor_total_orcado
        ordem.save(
            update_fields=[
                "dados_pc_extraidos",
                "resumo_pc",
                "pc_confianca",
                "pc_ultima_analise_em",
                "pdf_pc",
                "numero_pc",
                "validade_pc",
                "valor_autorizado_pc",
                "atualizado_em",
            ]
        )
        analisador.registrar_aprendizado(ordem, usuario=request.user)

        return Response(
            {
                "analise": analise,
                "ordem": self.get_serializer(ordem).data,
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="chat")
    def chat(self, request, pk=None):
        ordem = self.get_object()
        if (
            ordem.origem_sistema == OrdemServico.OrigemSistema.FACILITIES
            and not self._usuario_pode_usar_chat_facilities(ordem, request.user)
        ):
            return Response(
                {
                    "erro": "Chat interno indisponível para usuário sem conexão com esta OS espelhada",
                    "codigo": "CHAT_SEM_CONEXAO",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.method == "GET":
            mensagens = ordem.mensagens.select_related("usuario").prefetch_related("anexos")
            return Response(ChatOSSerializer(mensagens, many=True).data)

        serializer = ChatOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mensagem = ChatOS.objects.create(
            os=ordem,
            usuario=request.user,
            mensagem=serializer.validated_data["mensagem"],
            origem=(
                "facilities"
                if ordem.origem_sistema == OrdemServico.OrigemSistema.FACILITIES
                else "erp"
            ),
        )
        return Response(ChatOSSerializer(mensagem).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="despesas")
    def despesas(self, request, pk=None):
        ordem = self.get_object()
        if request.method == "GET":
            despesas = ordem.despesas.select_related("registrado_por")
            return Response(DespesaOSSerializer(despesas, many=True).data)

        serializer = DespesaOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        despesa = DespesaOS.objects.create(
            os=ordem,
            registrado_por=request.user,
            **serializer.validated_data,
        )
        return Response(DespesaOSSerializer(despesa).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="agenda")
    def agenda(self, request):
        """
        GET /api/v1/ordens/agenda/?data_inicio=2025-04-01&data_fim=2025-04-30
        Retorna OS agrupadas por técnico dentro do período especificado
        """
        data_inicio = request.query_params.get("data_inicio")
        data_fim = request.query_params.get("data_fim")
        tecnico_id = request.query_params.get("tecnico")
        tipo_servico = request.query_params.get("tipo_servico")

        queryset = self.get_queryset().exclude(data_agendada__isnull=True).filter(
            status__in=[OrdemServico.Status.AGENDADA, OrdemServico.Status.EM_EXECUCAO]
        )

        if data_inicio:
            queryset = queryset.filter(data_agendada__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data_agendada__lte=data_fim)
        if tecnico_id:
            queryset = queryset.filter(tecnico_responsavel_id=tecnico_id)
        if tipo_servico:
            queryset = queryset.filter(tipo_servico=tipo_servico)

        # Agrupar por data e depois por técnico
        agenda_por_data = defaultdict(lambda: defaultdict(list))

        for ordem in queryset.order_by("data_agendada", "tecnico_responsavel__nome_completo", "hora_inicio"):
            data = ordem.data_agendada
            tecnico = ordem.tecnico_responsavel
            agenda_por_data[data][tecnico].append(ordem)

        resultado = []
        for data in sorted(agenda_por_data.keys()):
            tecnicos_data = []
            for tecnico, ordens in agenda_por_data[data].items():
                if tecnico:
                    tecnicos_data.append({
                        "id": tecnico.id,
                        "nome_completo": tecnico.nome_completo,
                        "username": tecnico.username,
                        "total_os": len(ordens),
                        "ordens": OrdemServicoSerializer(ordens, many=True).data,
                    })
                else:
                    # OS sem técnico atribuído
                    tecnicos_data.append({
                        "id": None,
                        "nome_completo": "Não atribuído",
                        "username": "nao_atribuido",
                        "total_os": len(ordens),
                        "ordens": OrdemServicoSerializer(ordens, many=True).data,
                    })

            resultado.append({
                "data": data,
                "tecnicos": tecnicos_data,
            })

        return Response(resultado)

    @action(detail=False, methods=["get"], url_path="agenda/hoje")
    def agenda_hoje(self, request):
        """
        GET /api/v1/ordens/agenda/hoje/
        Retorna OS agendadas para hoje, filtradas por técnico se for técnico
        """
        hoje = timezone.localdate()
        queryset = self.get_queryset().filter(data_agendada=hoje).filter(
            status__in=[OrdemServico.Status.AGENDADA, OrdemServico.Status.EM_EXECUCAO]
        )

        if getattr(request.user, "role", None) == "tecnico":
            queryset = queryset.filter(tecnico_responsavel=request.user)

        # Ordenar por hora de início
        ordens = queryset.order_by("hora_inicio")
        return Response(self.get_serializer(ordens, many=True).data)

    @action(detail=True, methods=["patch"], url_path="reagendar")
    def reagendar(self, request, pk=None):
        """
        PATCH /api/v1/ordens/{id}/reagendar/
        Altera data_agendada e/ou hora_inicio, notifica técnico
        """
        ordem = self.get_object()
        serializer = ReagendarOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Dados antigos para log
        data_anterior = ordem.data_agendada
        tecnico_anterior = ordem.tecnico_responsavel
        hora_anterior = ordem.hora_inicio

        # Atualizar dados
        ordem.data_agendada = serializer.validated_data["data_agendada"]
        if "hora_inicio" in serializer.validated_data:
            ordem.hora_inicio = serializer.validated_data["hora_inicio"]
        if "tecnico_responsavel" in serializer.validated_data:
            ordem.tecnico_responsavel_id = serializer.validated_data["tecnico_responsavel"]

        ordem.atualizado_por = request.user
        ordem.save()

        # Log de alteração
        observacao = f"Reagendada de {data_anterior} para {ordem.data_agendada}"
        if tecnico_anterior != ordem.tecnico_responsavel:
            observacao += f" | Técnico alterado"
        LogStatusOS.objects.create(
            os=ordem,
            status_anterior=ordem.status,
            status_novo=ordem.status,
            alterado_por=request.user,
            observacao=observacao,
        )

        return Response(self.get_serializer(ordem).data)

    @action(detail=True, methods=["post"], url_path="gerar-pdf-relatorio")
    def gerar_pdf_relatorio(self, request, pk=None):
        ordem = self.get_object()
        pdf_bytes = gerar_relatorio_pdf(ordem.pk)
        if pdf_bytes:
            return FileResponse(
                BytesIO(pdf_bytes),
                as_attachment=True,
                filename=f"relatorio_{ordem.numero}.pdf",
                content_type="application/pdf",
            )
        return Response(
            {"detail": "Erro ao gerar PDF de relatório"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="gerar-pdf-orcamento")
    def gerar_pdf_orcamento(self, request, pk=None):
        ordem = self.get_object()
        pdf_bytes = gerar_orcamento_pdf(ordem.pk)
        if pdf_bytes:
            filename = f"orcamento_{ordem.numero}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            ordem.pdf_orcamento.save(filename, ContentFile(pdf_bytes), save=True)
            return FileResponse(
                BytesIO(pdf_bytes),
                as_attachment=True,
                filename=f"orcamento_{ordem.numero}.pdf",
                content_type="application/pdf",
            )
        return Response(
            {"detail": "Erro ao gerar PDF de orçamento"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="salvar-relatorio-pdf")
    def salvar_relatorio_pdf_action(self, request, pk=None):
        ordem = self.get_object()
        if salvar_relatorio_pdf(ordem.pk):
            return Response({"detail": "PDF de relatório salvo com sucesso"})
        return Response(
            {"detail": "Erro ao salvar PDF de relatório"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="salvar-orcamento-pdf")
    def salvar_orcamento_pdf_action(self, request, pk=None):
        ordem = self.get_object()
        if salvar_orcamento_pdf(ordem.pk):
            return Response({"detail": "PDF de orçamento salvo com sucesso"})
        return Response(
            {"detail": "Erro ao salvar PDF de orçamento"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["get", "post"], url_path="checklist")
    def checklist(self, request, pk=None):
        """GET retorna respostas existentes; POST salva/atualiza uma resposta."""
        ordem = self.get_object()
        if request.method == "GET":
            respostas = ordem.respostas_checklist.select_related("item").prefetch_related("fotos")
            return Response(RespostaChecklistSerializer(respostas, many=True, context={"request": request}).data)

        item_id = request.data.get("item")
        if not item_id:
            return Response({"detail": "Campo 'item' obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        resposta, _ = RespostaChecklist.objects.get_or_create(
            os=ordem,
            item_id=item_id,
            defaults={"respondido_por": request.user},
        )
        resposta.respondido_por = request.user
        if "valor_bool" in request.data:
            v = request.data["valor_bool"]
            if isinstance(v, str):
                resposta.valor_bool = v.lower() in ("true", "1", "sim", "yes")
            else:
                resposta.valor_bool = bool(v)
        if "valor_texto" in request.data:
            resposta.valor_texto = request.data["valor_texto"]
        if "valor_numero" in request.data:
            resposta.valor_numero = request.data["valor_numero"] or None
        resposta.save()
        return Response(RespostaChecklistSerializer(resposta, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="checklist/(?P<resposta_id>[0-9]+)/foto",
            parser_classes=[MultiPartParser, FormParser])
    def checklist_foto(self, request, pk=None, resposta_id=None):
        """Upload de foto para uma resposta do checklist."""
        ordem = self.get_object()
        try:
            resposta = RespostaChecklist.objects.get(pk=resposta_id, os=ordem)
        except RespostaChecklist.DoesNotExist:
            return Response({"detail": "Resposta não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        arquivo = request.FILES.get("arquivo")
        if not arquivo:
            return Response({"detail": "Envie o arquivo em 'arquivo'."}, status=status.HTTP_400_BAD_REQUEST)

        foto = FotoChecklist.objects.create(
            resposta=resposta,
            arquivo=arquivo,
            legenda=request.data.get("legenda", ""),
            enviado_por=request.user,
        )
        return Response(FotoChecklistSerializer(foto, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="gerar-relatorio-tecnico")
    def gerar_relatorio_tecnico(self, request, pk=None):
        """Gera PDF do relatório técnico de execução com checklist e fotos."""
        from .pdf_generator import gerar_relatorio_tecnico_pdf, salvar_relatorio_tecnico_pdf
        ordem = self.get_object()
        try:
            pdf_bytes = gerar_relatorio_tecnico_pdf(ordem.pk)
            if not pdf_bytes:
                return Response({"detail": "Não foi possível gerar o relatório técnico."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            salvar_relatorio_tecnico_pdf(ordem, pdf_bytes)
            nome = f"relatorio_tecnico_{ordem.numero or ordem.pk}.pdf"
            response = FileResponse(
                BytesIO(pdf_bytes),
                as_attachment=True,
                filename=nome,
                content_type="application/pdf",
            )
            return response
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="pendentes-faturamento")
    def pendentes_faturamento(self, request):
        """Lista OS concluídas (prontas para faturamento) que ainda não foram faturadas."""
        qs = (
            OrdemServico.objects
            .filter(status=OrdemServico.Status.CONCLUIDA)
            .select_related("cliente")
            .order_by("-criado_em")
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class FaturamentoAgrupadoViewSet(viewsets.ModelViewSet):
    queryset = FaturamentoAgrupado.objects.prefetch_related("ordens").select_related("criado_por").all()
    serializer_class = FaturamentoAgrupadoSerializer

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=True, methods=["post"], url_path="adicionar-ordens")
    def adicionar_ordens(self, request, pk=None):
        """Recebe lista de IDs de OS e as vincula ao faturamento agrupado."""
        faturamento = self.get_object()
        ids = request.data.get("ids", [])
        if not isinstance(ids, list) or not ids:
            return Response(
                {"detail": "Envie uma lista de IDs em 'ids'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ordens = OrdemServico.objects.filter(pk__in=ids)
        if not ordens.exists():
            return Response(
                {"detail": "Nenhuma OS encontrada com os IDs fornecidos."},
                status=status.HTTP_404_NOT_FOUND,
            )
        faturamento.ordens.add(*ordens)
        faturamento.recalcular_totais()
        return Response(FaturamentoAgrupadoSerializer(faturamento).data)


class ChecklistTemplateViewSet(viewsets.ModelViewSet):
    """CRUD de templates de checklist (gerenciado em Configurações)."""
    queryset = ChecklistTemplate.objects.prefetch_related("itens").all()
    serializer_class = ChecklistTemplateSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        tipo = self.request.query_params.get("tipo_servico")
        ativo = self.request.query_params.get("ativo")
        if tipo:
            qs = qs.filter(tipo_servico=tipo)
        if ativo is not None:
            qs = qs.filter(ativo=ativo.lower() in ("true", "1"))
        return qs

    @action(detail=True, methods=["post", "put", "patch", "delete"], url_path="itens/(?P<item_id>[0-9]+)")
    def gerenciar_item(self, request, pk=None, item_id=None):
        """Atualizar ou deletar um item do template."""
        template = self.get_object()
        try:
            item = ChecklistItem.objects.get(pk=item_id, template=template)
        except ChecklistItem.DoesNotExist:
            return Response({"detail": "Item não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if request.method == "DELETE":
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = ChecklistItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="itens")
    def adicionar_item(self, request, pk=None):
        """Adicionar um novo item ao template."""
        template = self.get_object()
        serializer = ChecklistItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(template=template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RelatorioPublicoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            ordem = OrdemServico.objects.select_related(
                "cliente",
                "tecnico_responsavel",
                "contato_responsavel",
                "endereco_servico"
            ).prefetch_related("fotos", "assinatura_cliente").get(
                token_relatorio=token
            )
            return Response(RelatorioPublicoSerializer(ordem, context={"request": request}).data)
        except OrdemServico.DoesNotExist:
            return Response(
                {"detail": "Relatório não encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )


class RelatorioPublicoPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        ordem = OrdemServico.objects.select_related("cliente", "tecnico_responsavel").prefetch_related("fotos").get(token_relatorio=token)
        pdf_bytes = gerar_relatorio_pdf(ordem.pk)
        if pdf_bytes:
            return FileResponse(
                BytesIO(pdf_bytes),
                as_attachment=False,
                filename=f"relatorio_{ordem.numero}.pdf",
                content_type="application/pdf",
            )
        return Response(
            {"detail": "Erro ao gerar PDF de relatório"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
