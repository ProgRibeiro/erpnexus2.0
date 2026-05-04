import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CalendarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileSearchOutlined,
  DollarOutlined,
  EyeOutlined,
  FilePdfOutlined,
  MessageOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  SendOutlined,
  ToolOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: 24,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
};

const primaryButtonStyle = {
  background: "#3B82F6",
  borderColor: "#3B82F6",
  color: "#FFFFFF",
  height: 40,
  paddingInline: 20,
  fontWeight: 600,
  borderRadius: 10,
};

const subtleButtonStyle = {
  height: 40,
  paddingInline: 20,
  borderRadius: 10,
  fontWeight: 500,
};

const sectionCardStyle = {
  ...panelStyle,
  boxShadow: "none",
};

const stageOrder = ["lead", "orcamento", "aprovado", "execucao", "faturamento", "receita"];
const stageStatusMap = {
  lead: "aberta",
  orcamento: "orcamento_enviado",
  aprovado: "aprovada",
  execucao: "em_execucao",
  faturamento: "faturada",
};
const stageTabMap = {
  lead: "dados-gerais",
  orcamento: "dados-gerais",
  aprovado: "dados-gerais",
  execucao: "execucao",
  faturamento: "faturamento",
  receita: "faturamento",
};

const stageMeta = {
  lead: { label: "Lead", doneBg: "#E8F3D6", activeBg: "#DDEECC", activeColor: "#507B17" },
  orcamento: { label: "Orçamento", doneBg: "#E8F3D6", activeBg: "#DDEECC", activeColor: "#507B17" },
  aprovado: { label: "Aprovado", doneBg: "#E8F3D6", activeBg: "#DDEECC", activeColor: "#507B17" },
  execucao: { label: "Em execução", doneBg: "#DCEAFE", activeBg: "#DCEAFE", activeColor: "#1D4ED8" },
  faturamento: { label: "Faturamento", doneBg: "#F7F2E7", activeBg: "#F7F2E7", activeColor: "#8A5A14" },
  receita: { label: "Receita", doneBg: "#DCFCE7", activeBg: "#DCFCE7", activeColor: "#15803D" },
};

const statusMeta = {
  rascunho: { label: "Rascunho", color: "#6B7280", background: "#F3F4F6" },
  aberta: { label: "Lead", color: "#6B7280", background: "#EEF2F7" },
  orcamento_enviado: { label: "Orçamento", color: "#9A6700", background: "#FEF3C7" },
  aprovada: { label: "Aprovada", color: "#1D4ED8", background: "#DBEAFE" },
  agendada: { label: "Agendada", color: "#1D4ED8", background: "#DBEAFE" },
  em_execucao: { label: "Em execução", color: "#1D4ED8", background: "#DBEAFE" },
  concluida: { label: "Concluída", color: "#065F46", background: "#D1FAE5" },
  faturada: { label: "Faturada", color: "#065F46", background: "#D1FAE5" },
  cancelada: { label: "Cancelada", color: "#B91C1C", background: "#FEE2E2" },
};

const serviceTypeLabels = {
  hvac: "HVAC",
  refrigeracao: "Refrigeração",
  eletrica: "Elétrica",
  civil: "Civil",
  manutencao: "Manutenção preventiva",
  instalacao: "Instalação",
  outro: "Outro",
};

const priorityLabels = {
  baixa: "Baixa",
  media: "Normal",
  alta: "Urgente",
  urgente: "Emergência",
};

const leadSourceLabels = {
  indicacao: "Indicação",
  site: "Site",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "Email",
  outro: "Outro",
};

const paymentStatusLabels = {
  pendente: "Aguardando",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Atrasado",
  cancelado: "Cancelado",
};

const formaCobrancaOptions = [
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

const priorityOptions = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Normal" },
  { value: "alta", label: "Urgente" },
  { value: "urgente", label: "Emergência" },
];

const serviceOptions = [
  { value: "hvac", label: "HVAC" },
  { value: "refrigeracao", label: "Refrigeração" },
  { value: "eletrica", label: "Elétrica" },
  { value: "civil", label: "Civil" },
  { value: "manutencao", label: "Manutenção preventiva" },
  { value: "instalacao", label: "Instalação" },
  { value: "outro", label: "Outro" },
];

const leadSourceOptions = [
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "indicacao", label: "Indicação" },
  { value: "email", label: "Email" },
  { value: "outro", label: "Outro" },
];

const reportTypeOptions = [
  { value: "simples", label: "Corretivo" },
  { value: "tecnico", label: "Preventivo" },
  { value: "fotografico", label: "Visita técnica" },
];

const expenseTypeOptions = [
  { value: "material", label: "Material comprado" },
  { value: "deslocamento", label: "Combustível" },
  { value: "alimentacao", label: "Alimentação / almoço" },
  { value: "terceiro", label: "Mão de obra terceirizada" },
  { value: "outro", label: "Outros custos" },
];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function getStatusVisual(status) {
  return statusMeta[String(status || "").toLowerCase()] || statusMeta.aberta;
}

function getStageKey(ordem) {
  const status = String(ordem?.status || "").toLowerCase();
  const paymentStatus = String(ordem?.status_pagamento || "").toLowerCase();

  if (paymentStatus === "pago") return "receita";
  if (status === "faturada") return "faturamento";
  if (["em_execucao", "concluida"].includes(status)) return "execucao";
  if (["aprovada", "agendada"].includes(status)) return "aprovado";
  if (status === "orcamento_enviado") return "orcamento";
  return "lead";
}

function getClientDocument(cliente) {
  return firstDefined(cliente?.cnpj_cpf, cliente?.cnpj, cliente?.cpf, "-");
}

function getClientPhone(cliente) {
  return firstDefined(cliente?.celular, cliente?.telefone, "-");
}

function buildHistory(ordem) {
  const eventos = [];

  if (ordem?.criado_em) {
    eventos.push({
      key: `criado-${ordem.id}`,
      color: "blue",
      title: "OS criada",
      description: `${dayjs(ordem.criado_em).format("DD/MM/YYYY HH:mm")} por ${ordem?.criado_por_nome || "sistema"}`,
    });
  }

  (ordem?.logs_status || []).forEach((log) => {
    eventos.push({
      key: `log-${log.id}`,
      color: log.status_novo === "cancelada" ? "red" : "green",
      title: `${getStatusVisual(log.status_novo).label}`,
      description: `${dayjs(log.alterado_em).format("DD/MM/YYYY HH:mm")} por ${log.alterado_por_nome || "sistema"}${log.observacao ? ` • ${log.observacao}` : ""}`,
    });
  });

  if (ordem?.atualizado_em) {
    eventos.push({
      key: `alteracao-${ordem.id}`,
      color: "gray",
      title: "Última alteração",
      description: `${dayjs(ordem.atualizado_em).format("DD/MM/YYYY HH:mm")} por ${ordem?.atualizado_por_nome || "sistema"}`,
    });
  }

  return eventos.sort((a, b) => dayjs(b.description?.slice(0, 16), "DD/MM/YYYY HH:mm").valueOf() - dayjs(a.description?.slice(0, 16), "DD/MM/YYYY HH:mm").valueOf());
}

function makeInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("") || "OS";
}

function getExpenseBreakdown(despesas) {
  const source = Array.isArray(despesas) ? despesas : [];
  const sums = {
    material: 0,
    deslocamento: 0,
    alimentacao: 0,
    terceiro: 0,
    outro: 0,
  };

  source.forEach((despesa) => {
    const tipo = String(despesa.tipo || "outro").toLowerCase();
    sums[tipo] = Number(sums[tipo] || 0) + Number(despesa.valor || 0);
  });

  return {
    ...sums,
    total: Object.values(sums).reduce((acc, value) => acc + Number(value || 0), 0),
  };
}

function createUploadValue(file) {
  return file ? [{ uid: String(file.uid || Date.now()), name: file.name, status: "done", originFileObj: file }] : [];
}

export default function OSDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingBilling, setSendingBilling] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [ordem, setOrdem] = useState(null);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [contasRecebimento, setContasRecebimento] = useState([]);
  const [activeTab, setActiveTab] = useState("dados-gerais");
  const [chatMessage, setChatMessage] = useState("");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm] = Form.useForm();
  const [photoModal, setPhotoModal] = useState({ open: false, tipo: "antes", arquivos: [] });
  const [pcAnalyzing, setPcAnalyzing] = useState(false);
  const [pcAnalysis, setPcAnalysis] = useState(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [orcamentoItens, setOrcamentoItens] = useState([]);
  const [itemForm] = Form.useForm();
  const [checklistTemplate, setChecklistTemplate] = useState(null);
  const [checklistRespostas, setChecklistRespostas] = useState({});
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [gerandoRelatorioTecnico, setGerandoRelatorioTecnico] = useState(false);
  const [checklistFotoModal, setChecklistFotoModal] = useState({ open: false, respostaId: null, itemId: null, arquivos: [] });
  const [tributacao, setTributacao] = useState({
    regime: "simples_nacional",
    issqn_aliquota: 0,
    issqn_retencao: false,
    pis_aliquota: 0,
    cofins_aliquota: 0,
    irpj_aliquota: 0,
    csll_aliquota: 0,
    ibs_aliquota: 0,
    cbs_aliquota: 0,
  });
  const [autoCalcLoading, setAutoCalcLoading] = useState(false);
  const [regimeEmpresa, setRegimeEmpresa] = useState("simples_nacional");

  const watchedClient = Form.useWatch("cliente", form);
  const watchedHasPc = Form.useWatch("tem_pedido_compra", form);
  const watchedValorFaturado = Form.useWatch("valor_final_faturado", form);
  const watchedValorOrcado = Form.useWatch("valor_total_orcado", form);

  const isFinanceAdmin = ["admin", "gestor", "financeiro"].includes(String(user?.role || "").toLowerCase());
  const statusVisual = getStatusVisual(ordem?.status);
  const currentStage = getStageKey(ordem);
  const currentStageIndex = stageOrder.indexOf(currentStage);
  const selectedClient = useMemo(
    () => clients.find((cliente) => String(cliente.id) === String(watchedClient)),
    [clients, watchedClient]
  );
  const expenseSummary = useMemo(() => getExpenseBreakdown(ordem?.despesas), [ordem?.despesas]);
  const valorFaturadoAtual = Number(watchedValorFaturado ?? ordem?.valor_final_faturado ?? ordem?.total_com_impostos ?? ordem?.valor_total_orcado ?? 0);
  const margemAtual = valorFaturadoAtual - Number(expenseSummary.total || 0);
  const historyItems = useMemo(() => buildHistory(ordem), [ordem]);
  const totalOrcamentoEditavel = useMemo(
    () => orcamentoItens.reduce((acc, item) => acc + Number(item.valor_total || 0), 0),
    [orcamentoItens]
  );

  const beforePhotos = useMemo(
    () => (ordem?.fotos || []).filter((foto) => String(foto.tipo) === "antes"),
    [ordem?.fotos]
  );
  const afterPhotos = useMemo(
    () => (ordem?.fotos || []).filter((foto) => String(foto.tipo) === "depois"),
    [ordem?.fotos]
  );

  useEffect(() => {
    carregarTela();
  }, [id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!watchedHasPc) return;
    const valorAtual = form.getFieldValue("valor_autorizado_pc");
    if (valorAtual === undefined || valorAtual === null || Number(valorAtual) === 0) {
      form.setFieldValue(
        "valor_autorizado_pc",
        Number(watchedValorOrcado || ordem?.valor_total_orcado || 0)
      );
    }
  }, [form, ordem?.valor_total_orcado, watchedHasPc, watchedValorOrcado]);

  useEffect(() => {
    const valorFinalAtual = form.getFieldValue("valor_final_faturado");
    const valorOrcado = Number(watchedValorOrcado || ordem?.valor_total_orcado || 0);
    if (valorOrcado > 0 && (!valorFinalAtual || Number(valorFinalAtual) === 0)) {
      form.setFieldValue("valor_final_faturado", valorOrcado);
    }
  }, [form, ordem?.valor_total_orcado, watchedValorOrcado]);

  useEffect(() => {
    if (activeTab === "execucao" && ordem?.tipo_servico) {
      carregarChecklist(ordem.tipo_servico);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ordem?.tipo_servico]);

  const preencherFormulario = (ordemAtual) => {
    form.setFieldsValue({
      numero: ordemAtual?.numero,
      status: ordemAtual?.status,
      cliente: ordemAtual?.cliente,
      contato_responsavel: ordemAtual?.contato_responsavel,
      endereco_servico: ordemAtual?.endereco_servico,
      tipo_servico: ordemAtual?.tipo_servico || "manutencao",
      prioridade: ordemAtual?.prioridade || "media",
      origem_lead: ordemAtual?.origem_lead || "telefone",
      tem_pedido_compra: Boolean(ordemAtual?.tem_pedido_compra),
      numero_pc: ordemAtual?.numero_pc || "",
      valor_autorizado_pc: Number(ordemAtual?.valor_autorizado_pc || 0),
      validade_pc: ordemAtual?.validade_pc ? dayjs(ordemAtual.validade_pc) : null,
      descricao_servico: ordemAtual?.descricao_servico || "",
      valor_total_orcado: Number(ordemAtual?.valor_total_orcado || 0),
      condicao_pagamento: ordemAtual?.condicao_pagamento || "",
      validade_orcamento: ordemAtual?.validade_orcamento ? dayjs(ordemAtual.validade_orcamento) : null,
      tecnico_responsavel: ordemAtual?.tecnico_responsavel || null,
      data_agendada: ordemAtual?.data_agendada ? dayjs(ordemAtual.data_agendada) : null,
      hora_inicio: ordemAtual?.hora_inicio ? dayjs(ordemAtual.hora_inicio, "HH:mm:ss") : null,
      hora_conclusao: ordemAtual?.hora_conclusao ? dayjs(ordemAtual.hora_conclusao, "HH:mm:ss") : null,
      observacoes_tecnicas: ordemAtual?.observacoes_tecnicas || "",
      equipamento_marca: ordemAtual?.equipamento_marca || "",
      equipamento_modelo: ordemAtual?.equipamento_modelo || "",
      equipamento_serie: ordemAtual?.equipamento_serie || "",
      tipo_relatorio: ordemAtual?.tipo_relatorio || undefined,
      valor_final_faturado: Number(ordemAtual?.valor_final_faturado || ordemAtual?.valor_total_orcado || 0),
      numero_nf: ordemAtual?.numero_nf || "",
      data_emissao_nf: ordemAtual?.data_emissao_nf ? dayjs(ordemAtual.data_emissao_nf) : null,
      data_vencimento: ordemAtual?.data_vencimento ? dayjs(ordemAtual.data_vencimento) : null,
      data_recebimento: ordemAtual?.data_recebimento ? dayjs(ordemAtual.data_recebimento) : null,
      forma_cobranca: ordemAtual?.forma_cobranca || undefined,
      observacoes_internas: "",
      pdf_pc_upload: [],
      pdf_nf_upload: [],
      descricao_servico_nf: ordemAtual?.descricao_servico_nf || "",
      municipio_issqn: ordemAtual?.municipio_issqn || "",
      situacao_tributaria_pis_cofins: ordemAtual?.situacao_tributaria_pis_cofins || "",
    });
    if (ordemAtual?.dados_impostos && typeof ordemAtual.dados_impostos === "object") {
      setTributacao((prev) => ({ ...prev, ...ordemAtual.dados_impostos }));
    }
  };

  const carregarTela = async () => {
    try {
      setLoading(true);
      const [ordemResponse, clientsResponse, techniciansResponse, empresaResponse, contasResponse] = await Promise.allSettled([
        api.get(`/ordens/${id}/`),
        api.get("/clientes/"),
        api.get("/auth/"),
        api.get("/configuracoes/empresa/"),
        api.get("/financeiro/contas-bancarias/", { params: { ativo: true } }),
      ]);

      if (ordemResponse.status !== "fulfilled") {
        throw ordemResponse.reason;
      }

      if (clientsResponse.status !== "fulfilled") {
        throw clientsResponse.reason;
      }

      const ordemAtual = ordemResponse.value.data;
      const clientes = normalizeList(clientsResponse.value.data);
      const tecnicos =
        techniciansResponse.status === "fulfilled"
          ? normalizeList(techniciansResponse.value.data)
              .filter((tecnico) => String(tecnico.role || "").toLowerCase() === "tecnico")
              .map((tecnico) => ({
                label: tecnico.nome_completo || tecnico.username || tecnico.email,
                value: tecnico.id,
              }))
          : [];

      setClients(clientes);
      setTechnicians(tecnicos);
      if (contasResponse.status === "fulfilled") {
        let contas = normalizeList(contasResponse.value.data);
        if (!contas.length) {
          const novaConta = await api.post("/financeiro/contas-bancarias/", {
            nome: "Caixa principal",
            banco: "Caixa interno",
            tipo: "caixa",
            saldo_inicial: 0,
            ativo: true,
          });
          contas = [novaConta.data];
        }
        setContasRecebimento(contas);
        form.setFieldValue("conta_recebimento", contas[0].id);
      }
      setOrdem(ordemAtual);
      setOrcamentoItens(
        (ordemAtual?.itens || []).map((item, index) => ({
          ...item,
          ordem: item.ordem ?? index,
          quantidade: Number(item.quantidade || 0),
          valor_unitario: Number(item.valor_unitario || 0),
          valor_total: Number(item.valor_total || 0),
        }))
      );
      setPcAnalysis(ordemAtual?.dados_pc_extraidos || null);
      preencherFormulario(ordemAtual);
      if (empresaResponse.status === "fulfilled") {
        const regime = empresaResponse.value.data?.regime_tributario || "simples_nacional";
        setRegimeEmpresa(regime);
        setTributacao((prev) => ({ ...prev, regime }));
      }

      if (techniciansResponse.status !== "fulfilled") {
        message.warning("Não foi possível carregar a lista de técnicos agora. A OS foi aberta mesmo assim.");
      }
    } catch (error) {
      console.error("Erro ao carregar OS:", error);
      message.error("Não foi possível carregar a ordem de serviço.");
    } finally {
      setLoading(false);
    }
  };

  const montarPayload = (values) => ({
    cliente: values.cliente,
    contato_responsavel: values.contato_responsavel || null,
    endereco_servico: values.endereco_servico || null,
    tipo_servico: values.tipo_servico,
    prioridade: values.prioridade,
    origem_lead: values.origem_lead || "",
    tem_pedido_compra: Boolean(values.tem_pedido_compra),
    numero_pc: values.tem_pedido_compra ? values.numero_pc || "" : "",
    valor_autorizado_pc: values.tem_pedido_compra ? Number(values.valor_autorizado_pc || 0) : 0,
    validade_pc: values.tem_pedido_compra && values.validade_pc ? values.validade_pc.format("YYYY-MM-DD") : null,
    descricao_servico: values.descricao_servico || "",
    condicao_pagamento: values.condicao_pagamento || "",
    validade_orcamento: values.validade_orcamento ? values.validade_orcamento.format("YYYY-MM-DD") : null,
    tecnico_responsavel: values.tecnico_responsavel || null,
    data_agendada: values.data_agendada ? values.data_agendada.format("YYYY-MM-DD") : null,
    hora_inicio: values.hora_inicio ? values.hora_inicio.format("HH:mm:ss") : null,
    hora_conclusao: values.hora_conclusao ? values.hora_conclusao.format("HH:mm:ss") : null,
    observacoes_tecnicas: values.observacoes_tecnicas || "",
    equipamento_marca: values.equipamento_marca || "",
    equipamento_modelo: values.equipamento_modelo || "",
    equipamento_serie: values.equipamento_serie || "",
    tipo_relatorio: values.tipo_relatorio || "",
    valor_final_faturado: Number(values.valor_final_faturado || 0),
    numero_nf: values.numero_nf || "",
    data_emissao_nf: values.data_emissao_nf ? values.data_emissao_nf.format("YYYY-MM-DD") : null,
    data_vencimento: values.data_vencimento ? values.data_vencimento.format("YYYY-MM-DD") : null,
    data_recebimento: values.data_recebimento ? values.data_recebimento.format("YYYY-MM-DD") : null,
    forma_cobranca: values.forma_cobranca || "",
    descricao_servico_nf: values.descricao_servico_nf || "",
    municipio_issqn: values.municipio_issqn || "",
    situacao_tributaria_pis_cofins: values.situacao_tributaria_pis_cofins || "",
    dados_impostos: tributacao,
    itens: orcamentoItens.map((item, index) => ({
      id: item.id,
      origem_tipo: item.origem_tipo || "avulso",
      produto: item.produto || null,
      servico: item.servico || null,
      codigo_referencia: item.codigo_referencia || "",
      unidade_referencia: item.unidade_referencia || "",
      descricao: item.descricao || "",
      quantidade: Number(item.quantidade || 0),
      valor_unitario: Number(item.valor_unitario || 0),
      ordem: index,
    })),
  });

  const salvarOS = async (extra = {}) => {
    const values = await form.validateFields();
    const payload = montarPayload(values);
    const pdfPcFile = values.pdf_pc_upload?.[0]?.originFileObj;
    const pdfNfFile = values.pdf_nf_upload?.[0]?.originFileObj;
    const precisaMultipart = Boolean(pdfPcFile || pdfNfFile);

    setSaving(true);
    try {
      let response;

      if (precisaMultipart) {
        const formData = new FormData();
        Object.entries({ ...payload, ...extra }).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            formData.append(key, "");
          } else {
            formData.append(key, value);
          }
        });
        if (pdfPcFile) formData.append("pdf_pc", pdfPcFile);
        if (pdfNfFile) formData.append("pdf_nf", pdfNfFile);
        response = await api.patch(`/ordens/${id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await api.patch(`/ordens/${id}/`, { ...payload, ...extra });
      }

      setOrdem(response.data);
      setOrcamentoItens(
        (response.data?.itens || []).map((item, index) => ({
          ...item,
          ordem: item.ordem ?? index,
          quantidade: Number(item.quantidade || 0),
          valor_unitario: Number(item.valor_unitario || 0),
          valor_total: Number(item.valor_total || 0),
        }))
      );
      preencherFormulario(response.data);
      message.success("Ordem de serviço salva.");
      return response.data;
    } finally {
      setSaving(false);
    }
  };

  const analisarPedidoCompra = async (arquivo = null) => {
    try {
      setPcAnalyzing(true);
      const formData = new FormData();
      if (arquivo) {
        formData.append("arquivo", arquivo);
      }
      const response = await api.post(`/ordens/${id}/analisar-pedido-compra/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const analise = response.data?.analise || null;
      const ordemAtualizada = response.data?.ordem || null;

      setPcAnalysis(analise);
      if (ordemAtualizada) {
        setOrdem(ordemAtualizada);
        preencherFormulario(ordemAtualizada);
      }
      message.success("Pedido de compra analisado.");
    } catch (error) {
      console.error("Erro ao analisar pedido de compra:", error);
      message.error("Não foi possível analisar o pedido de compra.");
    } finally {
      setPcAnalyzing(false);
    }
  };

  const aplicarSugestaoPedidoCompra = () => {
    if (!pcAnalysis) return;
    form.setFieldsValue({
      numero_pc: pcAnalysis.numero_pc_sugerido || form.getFieldValue("numero_pc"),
      validade_pc: pcAnalysis.validade_sugerida
        ? dayjs(pcAnalysis.validade_sugerida)
        : form.getFieldValue("validade_pc"),
      descricao_servico:
        pcAnalysis.descricao_sugerida || form.getFieldValue("descricao_servico"),
    });
    message.success("Sugestões do pedido de compra aplicadas na OS.");
  };

  const handlePcUploadChange = ({ fileList }) => {
    form.setFieldValue("pdf_pc_upload", fileList);
    const selectedFile = fileList?.[0]?.originFileObj;
    if (watchedHasPc && selectedFile) {
      analisarPedidoCompra(selectedFile);
    }
  };

  const autoCalcImpostos = async () => {
    const valorFaturado = form.getFieldValue("valor_final_faturado") || Number(ordem?.valor_total_orcado || 0);
    if (!valorFaturado) return;
    setAutoCalcLoading(true);
    try {
      const response = await api.post("/fiscal/calcular-impostos/", {
        valor_servicos: valorFaturado,
        valor_materiais: 0,
      });
      const dados = response.data;
      const aliquotas = dados.aliquotas || {};
      setTributacao((prev) => ({
        ...prev,
        regime: dados.regime || regimeEmpresa || prev.regime,
        issqn_aliquota: Number(aliquotas.iss ?? prev.issqn_aliquota),
        pis_aliquota: Number(aliquotas.pis ?? prev.pis_aliquota),
        cofins_aliquota: Number(aliquotas.cofins ?? prev.cofins_aliquota),
        irpj_aliquota: Number(aliquotas.irpj ?? prev.irpj_aliquota),
        csll_aliquota: Number(aliquotas.csll ?? prev.csll_aliquota),
      }));
      message.success("Impostos calculados automaticamente.");
    } catch {
      message.warning("Não foi possível calcular os impostos automaticamente.");
    } finally {
      setAutoCalcLoading(false);
    }
  };

  const abrirNovoItem = () => {
    setEditingItemIndex(null);
    itemForm.setFieldsValue({
      descricao: "",
      quantidade: 1,
      valor_unitario: 0,
      codigo_referencia: "",
      unidade_referencia: "un",
      origem_tipo: "avulso",
    });
    setItemModalOpen(true);
  };

  const editarItem = (item, index) => {
    setEditingItemIndex(index);
    itemForm.setFieldsValue({
      descricao: item.descricao,
      quantidade: Number(item.quantidade || 0),
      valor_unitario: Number(item.valor_unitario || 0),
      codigo_referencia: item.codigo_referencia || "",
      unidade_referencia: item.unidade_referencia || "un",
      origem_tipo: item.origem_tipo || "avulso",
    });
    setItemModalOpen(true);
  };

  const salvarItemOrcamento = async () => {
    const values = await itemForm.validateFields();
    const quantidade = Number(values.quantidade || 0);
    const valorUnitario = Number(values.valor_unitario || 0);
    const itemNormalizado = {
      ...(editingItemIndex !== null ? orcamentoItens[editingItemIndex] : {}),
      descricao: values.descricao,
      quantidade,
      valor_unitario: valorUnitario,
      valor_total: quantidade * valorUnitario,
      codigo_referencia: values.codigo_referencia || "",
      unidade_referencia: values.unidade_referencia || "",
      origem_tipo: values.origem_tipo || "avulso",
    };

    setOrcamentoItens((current) => {
      if (editingItemIndex === null) {
        return [...current, { ...itemNormalizado, ordem: current.length }];
      }
      return current.map((item, index) => (index === editingItemIndex ? itemNormalizado : item));
    });

    setItemModalOpen(false);
    itemForm.resetFields();
    message.success(editingItemIndex === null ? "Item adicionado ao orçamento." : "Item atualizado.");
  };

  const removerItem = (index) => {
    setOrcamentoItens((current) => current.filter((_, itemIndex) => itemIndex !== index));
    message.success("Item removido do orçamento.");
  };

  useEffect(() => {
    form.setFieldValue("valor_total_orcado", Number(totalOrcamentoEditavel || 0));
  }, [form, totalOrcamentoEditavel]);

  const gerarRelatorio = async () => {
    try {
      setReportLoading(true);
      const response = await api.post(`/ordens/${id}/gerar-pdf-relatorio/`, {}, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio_${ordem?.numero || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Relatório gerado com sucesso.");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      message.error("Não foi possível gerar o relatório.");
    } finally {
      setReportLoading(false);
    }
  };

  const enviarMensagem = async () => {
    if (!chatMessage.trim()) {
      message.warning("Digite uma mensagem para enviar ao chat interno.");
      return;
    }

    try {
      const response = await api.post(`/ordens/${id}/chat/`, { mensagem: chatMessage.trim() });
      setOrdem((current) => ({
        ...current,
        mensagens: [...(current?.mensagens || []), response.data],
      }));
      setChatMessage("");
      message.success("Mensagem enviada.");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      message.error("Não foi possível enviar a mensagem.");
    }
  };

  const adicionarDespesa = async () => {
    try {
      const values = await expenseForm.validateFields();
      const response = await api.post(`/ordens/${id}/despesas/`, {
        descricao: values.descricao,
        tipo: values.tipo,
        valor: Number(values.valor || 0),
        data_despesa: values.data_despesa?.format("YYYY-MM-DD"),
      });

      setOrdem((current) => ({
        ...current,
        despesas: [response.data, ...(current?.despesas || [])],
      }));
      setExpenseModalOpen(false);
      expenseForm.resetFields();
      message.success("Despesa adicionada.");
    } catch (error) {
      console.error("Erro ao adicionar despesa:", error);
      message.error("Não foi possível adicionar a despesa.");
    }
  };

  const enviarFotos = async () => {
    if (!photoModal.arquivos.length) {
      message.warning("Selecione ao menos uma foto.");
      return;
    }

    try {
      const formData = new FormData();
      photoModal.arquivos.forEach((file) => {
        if (file.originFileObj) {
          formData.append("arquivos", file.originFileObj);
        }
      });
      formData.append("tipo", photoModal.tipo);

      await api.post(`/ordens/${id}/upload-fotos/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPhotoModal({ open: false, tipo: "antes", arquivos: [] });
      await carregarTela();
      message.success("Fotos enviadas com sucesso.");
    } catch (error) {
      console.error("Erro ao enviar fotos:", error);
      message.error("Não foi possível enviar as fotos.");
    }
  };

  const carregarChecklist = async (tipoServico) => {
    if (!tipoServico) return;
    try {
      setChecklistLoading(true);
      const [templatesRes, respostasRes] = await Promise.all([
        api.get(`/ordens/checklists/?tipo_servico=${tipoServico}&ativo=true`),
        api.get(`/ordens/${id}/checklist/`),
      ]);
      const templates = Array.isArray(templatesRes.data)
        ? templatesRes.data
        : templatesRes.data?.results || [];
      if (templates.length > 0) {
        setChecklistTemplate(templates[0]);
      }
      const respostasMap = {};
      const respostasArr = Array.isArray(respostasRes.data)
        ? respostasRes.data
        : respostasRes.data?.results || [];
      respostasArr.forEach((resp) => {
        respostasMap[resp.item] = resp;
      });
      setChecklistRespostas(respostasMap);
    } catch (err) {
      console.error("Erro ao carregar checklist:", err);
    } finally {
      setChecklistLoading(false);
    }
  };

  const salvarRespostaChecklist = async (itemId, valores) => {
    try {
      const response = await api.post(`/ordens/${id}/checklist/`, {
        item: itemId,
        ...valores,
      });
      setChecklistRespostas((prev) => ({ ...prev, [itemId]: response.data }));
    } catch (err) {
      console.error("Erro ao salvar resposta:", err);
      message.error("Não foi possível salvar a resposta.");
    }
  };

  const enviarFotoChecklist = async () => {
    if (!checklistFotoModal.arquivos.length) {
      message.warning("Selecione ao menos uma foto.");
      return;
    }
    try {
      const resposta = checklistRespostas[checklistFotoModal.itemId];
      let respostaId = resposta?.id;
      if (!respostaId) {
        const novo = await api.post(`/ordens/${id}/checklist/`, {
          item: checklistFotoModal.itemId,
        });
        respostaId = novo.data.id;
        setChecklistRespostas((prev) => ({ ...prev, [checklistFotoModal.itemId]: novo.data }));
      }
      for (const fileObj of checklistFotoModal.arquivos) {
        const formData = new FormData();
        formData.append("arquivo", fileObj.originFileObj || fileObj);
        formData.append("legenda", fileObj.name || "");
        const res = await api.post(`/ordens/${id}/checklist/${respostaId}/foto/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setChecklistRespostas((prev) => ({
          ...prev,
          [checklistFotoModal.itemId]: {
            ...prev[checklistFotoModal.itemId],
            fotos: [...(prev[checklistFotoModal.itemId]?.fotos || []), res.data],
          },
        }));
      }
      message.success("Foto(s) adicionada(s) ao checklist.");
      setChecklistFotoModal({ open: false, respostaId: null, itemId: null, arquivos: [] });
    } catch (err) {
      console.error("Erro ao enviar foto do checklist:", err);
      message.error("Não foi possível enviar a foto.");
    }
  };

  const gerarRelatorioTecnico = async () => {
    try {
      setGerandoRelatorioTecnico(true);
      const response = await api.post(
        `/ordens/${id}/gerar-relatorio-tecnico/`,
        {},
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio_tecnico_${ordem?.numero || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Relatório técnico gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar relatório técnico:", err);
      message.error("Não foi possível gerar o relatório técnico.");
    } finally {
      setGerandoRelatorioTecnico(false);
    }
  };


  const confirmarFaturamento = async () => {
    setSendingBilling(true);
    try {
      await form.validateFields([
        "valor_final_faturado",
        "numero_nf",
        "data_emissao_nf",
        "data_vencimento",
        "data_recebimento",
        "forma_cobranca",
        "conta_recebimento",
      ]);
      await salvarOS();
      const response = await api.post(`/ordens/${id}/confirmar-faturamento/`, {
        conta_bancaria: form.getFieldValue("conta_recebimento"),
      });
      if (response.data?.ordem) {
        setOrdem(response.data.ordem);
        preencherFormulario(response.data.ordem);
      }
      message.success("Faturamento confirmado e lançamento financeiro criado com a conta escolhida.");
    } catch (error) {
      console.error("Erro ao confirmar faturamento:", error);
      message.error(error?.response?.data?.detail || "Não foi possível confirmar o faturamento.");
    } finally {
      setSendingBilling(false);
    }
  };

  const changeStatus = async (status, observacao) => {
    try {
      const response = await api.post(`/ordens/${id}/mudar-status/`, {
        status,
        observacao: observacao || "",
      });
      setOrdem(response.data);
      preencherFormulario(response.data);
      message.success("Status atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      message.error("Não foi possível atualizar o status.");
    }
  };

  const moverParaEtapa = async (stageKey) => {
    const targetTab = stageTabMap[stageKey];
    if (targetTab) {
      setActiveTab(targetTab);
    }

    if (stageKey === "receita") {
      message.info("A etapa Receita depende do faturamento confirmado e do recebimento no financeiro.");
      return;
    }

    const targetStatus = stageStatusMap[stageKey];
    if (!targetStatus || ordem?.status === targetStatus) {
      return;
    }

    await salvarOS();
    await changeStatus(targetStatus, `Movida pela barra operacional para ${stageMeta[stageKey].label}.`);
  };

  const menuAcoesRapidas = {
    items: [
      { key: "lead", label: "Mover para Lead" },
      { key: "orcamento", label: "Mover para Orçamento" },
      { key: "aprovado", label: "Mover para Aprovado" },
      { key: "execucao", label: "Mover para Em execução" },
      { type: "divider" },
      { key: "faturamento", label: "Ir para Faturamento" },
      { key: "historico", label: "Abrir Histórico" },
    ],
    onClick: async ({ key }) => {
      if (key === "historico") {
        setActiveTab("historico");
        return;
      }
      if (key === "faturamento") {
        setActiveTab("faturamento");
        return;
      }
      await moverParaEtapa(key);
    },
  };

  const topSummaryCards = [
    {
      title: "Valor orçado",
      value: formatMoney(watchedValorOrcado ?? ordem?.valor_total_orcado),
      icon: <DollarOutlined style={{ color: "#3B82F6" }} />,
    },
    {
      title: "Custos lançados",
      value: formatMoney(expenseSummary.total),
      icon: <ToolOutlined style={{ color: "#B45309" }} />,
    },
    {
      title: "Margem atual",
      value: formatMoney(margemAtual),
      icon: <CheckCircleOutlined style={{ color: margemAtual >= 0 ? "#15803D" : "#B91C1C" }} />,
    },
    {
      title: "Recebimento",
      value: paymentStatusLabels[String(ordem?.status_pagamento || "pendente").toLowerCase()] || "Aguardando",
      icon: <ClockCircleOutlined style={{ color: "#5B21B6" }} />,
    },
  ];

  const itemColumns = [
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      render: (_, item) => (
        <div>
          <div style={{ color: "#0F172A", fontWeight: 700 }}>{item.descricao}</div>
          <div style={{ color: "#64748B", fontSize: 12 }}>
            {item.codigo_referencia || "-"} • {item.unidade_referencia || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Qtd",
      dataIndex: "quantidade",
      key: "quantidade",
      width: 100,
      render: (value) => Number(value || 0),
    },
    {
      title: "Valor unit.",
      dataIndex: "valor_unitario",
      key: "valor_unitario",
      width: 140,
      render: (value) => formatMoney(value),
    },
    {
      title: "Total",
      dataIndex: "valor_total",
      key: "valor_total",
      width: 140,
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: "Ações",
      key: "acoes",
      width: 110,
      render: (_, item, index) => (
        <Space size={4}>
          <Button type="text" icon={<EditOutlined />} onClick={() => editarItem(item, index)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removerItem(index)} />
        </Space>
      ),
    },
  ];

  const expenseColumns = [
    {
      title: "Despesa",
      dataIndex: "descricao",
      key: "descricao",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: "#10233C" }}>{record.descricao}</div>
          <div style={{ color: "#6B7280", fontSize: 12 }}>
            {expenseTypeOptions.find((option) => option.value === record.tipo)?.label || record.tipo}
          </div>
        </div>
      ),
    },
    {
      title: "Data",
      dataIndex: "data_despesa",
      key: "data_despesa",
      width: 120,
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      width: 130,
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
  ];

  const renderPhotoGallery = (title, fotos, tipo) => (
    <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
        <Title level={5} style={{ margin: 0 }}>{title}</Title>
        <Button icon={<CameraOutlined />} onClick={() => setPhotoModal({ open: true, tipo, arquivos: [] })}>
          Adicionar fotos
        </Button>
      </Space>
      {fotos.length ? (
        <Row gutter={[12, 12]}>
          {fotos.map((foto) => (
            <Col xs={12} md={8} lg={6} key={foto.id}>
              <Image
                src={foto.arquivo}
                style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10 }}
              />
              {foto.legenda ? (
                <Text style={{ display: "block", marginTop: 6, color: "#64748B", fontSize: 12 }}>
                  {foto.legenda}
                </Text>
              ) : null}
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description={`Nenhuma foto ${tipo === "antes" ? "antes" : "depois"} cadastrada`} />
      )}
    </Card>
  );

  const dadosGeraisTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 16, color: "#6B7280", textTransform: "uppercase" }}>
          Identificação
        </Title>
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}>
            <Form.Item label="Tipo de serviço" name="tipo_servico">
              <Select options={serviceOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Prioridade" name="prioridade">
              <Select options={priorityOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Origem do lead" name="origem_lead">
              <Select options={leadSourceOptions} allowClear />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 16, color: "#6B7280", textTransform: "uppercase" }}>
          Cliente
        </Title>
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item label="Cliente" name="cliente" rules={[{ required: true, message: "Selecione o cliente" }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={clients.map((cliente) => ({ label: cliente.nome, value: cliente.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="CNPJ" style={{ marginBottom: 12 }}>
              <Input value={getClientDocument(selectedClient)} readOnly />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Contato responsável" name="contato_responsavel">
              <Select
                allowClear
                options={(selectedClient?.contatos || []).map((contato) => ({
                  label: contato.nome,
                  value: contato.id,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Telefone / WhatsApp" style={{ marginBottom: 12 }}>
              <Input value={getClientPhone(selectedClient)} readOnly />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Endereço do serviço" name="endereco_servico">
              <Select
                allowClear
                options={(selectedClient?.enderecos || []).map((endereco) => ({
                  label: `${endereco.logradouro || ""}, ${endereco.numero || ""} - ${endereco.bairro || ""} ${endereco.cidade || ""}`.trim(),
                  value: endereco.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 16, color: "#6B7280", textTransform: "uppercase" }}>
          Pedido de compra do cliente
        </Title>
        <Form.Item name="tem_pedido_compra" valuePropName="checked" style={{ marginBottom: 16 }}>
          <Checkbox>Cliente possui pedido de compra (PC)?</Checkbox>
        </Form.Item>

        {watchedHasPc ? (
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item label="Número do PC" name="numero_pc">
                <Input placeholder="PC-2025-3341" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Valor autorizado" name="valor_autorizado_pc">
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: "100%" }}
                  formatter={(value) => `R$ ${value || ""}`}
                  parser={(value) => String(value || "").replace(/[^\d,.-]/g, "").replace(",", ".")}
                />
              </Form.Item>
              <Text type="secondary" style={{ display: "block", marginTop: -8 }}>
                Vem preenchido com o valor do orçamento, mas você pode ajustar se o pedido de compra trouxer outro limite aprovado.
              </Text>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Validade do PC" name="validade_pc">
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="PDF do PC" name="pdf_pc_upload" valuePropName="fileList">
                <Upload beforeUpload={() => false} maxCount={1} onChange={handlePcUploadChange}>
                  <Button icon={<UploadOutlined />}>Selecionar arquivo</Button>
                </Upload>
              </Form.Item>
              <Space size={12} wrap>
                {ordem?.pdf_pc ? (
                  <Button type="link" href={ordem.pdf_pc} target="_blank" style={{ padding: 0 }}>
                    Ver arquivo atual
                  </Button>
                ) : null}
                <Button
                  type="link"
                  icon={<FileSearchOutlined />}
                  style={{ padding: 0 }}
                  loading={pcAnalyzing}
                  onClick={() => analisarPedidoCompra()}
                >
                  Ler pedido de compra
                </Button>
              </Space>
            </Col>
          </Row>
        ) : (
          <Alert
            type="info"
            showIcon
            message="Sem pedido de compra"
            description="Quando esse toggle estiver desligado, os campos do PC somem para a tela ficar mais limpa."
            style={{ borderRadius: 10 }}
          />
        )}

        {pcAnalysis ? (
          <Card
            bordered={false}
            style={{ background: "#F8FBFF", border: "1px solid #D6E9FF", borderRadius: 12, marginTop: 16 }}
            bodyStyle={{ padding: 16 }}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <Text strong style={{ color: "#3B82F6" }}>Leitura inteligente do pedido de compra</Text>
                  <div style={{ color: "#64748B", marginTop: 4 }}>
                    Confiança da leitura: {Number(pcAnalysis.confianca || 0).toFixed(0)}%
                  </div>
                </div>
                <Button onClick={aplicarSugestaoPedidoCompra}>Aplicar descrição sugerida</Button>
              </div>

              <Descriptions size="small" column={{ xs: 1, md: 3 }}>
                <Descriptions.Item label="Número sugerido">{pcAnalysis.numero_pc_sugerido || "-"}</Descriptions.Item>
                <Descriptions.Item label="Validade sugerida">
                  {pcAnalysis.validade_sugerida ? dayjs(pcAnalysis.validade_sugerida).format("DD/MM/YYYY") : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Valor lido do PDF">
                  {formatMoney(pcAnalysis.valor_autorizado_sugerido || 0)}
                </Descriptions.Item>
              </Descriptions>

              {pcAnalysis.descricao_sugerida ? (
                <Alert
                  type="info"
                  showIcon
                  style={{ borderRadius: 10 }}
                  message="Descrição sugerida"
                  description={pcAnalysis.descricao_sugerida}
                />
              ) : null}

              {pcAnalysis.itens_detectados?.length ? (
                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>Itens detectados</Text>
                  <Space wrap>
                    {pcAnalysis.itens_detectados.map((item) => (
                      <Tag key={item} color="blue">
                        {item}
                      </Tag>
                    ))}
                  </Space>
                </div>
              ) : null}

              <Text type="secondary">
                O sistema guarda esse resumo e usa os exemplos confirmados pelo administrativo para melhorar as próximas sugestões do mesmo cliente.
              </Text>
            </Space>
          </Card>
        ) : null}
      </Card>

      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 16, color: "#6B7280", textTransform: "uppercase" }}>
          Orçamento
        </Title>
        <Row gutter={[16, 8]}>
          <Col xs={24}>
            <Form.Item label="Descrição do serviço" name="descricao_servico">
              <TextArea rows={4} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Valor orçado" name="valor_total_orcado">
              <InputNumber
                disabled
                style={{ width: "100%" }}
                formatter={(value) => `R$ ${value || ""}`}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Condição de pagamento" name="condicao_pagamento">
              <Input placeholder="À vista / Pix" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Validade do orçamento" name="validade_orcamento">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }} wrap>
          <div>
            <Text strong style={{ color: "#10233C" }}>Itens do orçamento</Text>
            <div style={{ color: "#64748B", fontSize: 13 }}>
              A OS continua editável aqui. Se o orçamento mudar, você já ajusta tudo neste ponto.
            </div>
          </div>
          <Button icon={<PlusOutlined />} onClick={abrirNovoItem}>
            Adicionar item
          </Button>
        </Space>

        <Table
          columns={itemColumns}
          dataSource={orcamentoItens}
          pagination={false}
          rowKey={(record, index) => record.id || `item-${index}`}
          locale={{ emptyText: "Nenhum item do orçamento cadastrado" }}
        />
      </Card>
    </Space>
  );

  const renderChecklistItem = (item) => {
    const resposta = checklistRespostas[item.id] || {};
    const fotos = resposta.fotos || [];

    const handleBool = (val) => {
      salvarRespostaChecklist(item.id, { valor_bool: val });
    };

    const handleTexto = (val) => {
      salvarRespostaChecklist(item.id, { valor_texto: val });
    };

    const handleNumero = (val) => {
      if (val !== null && val !== undefined) {
        salvarRespostaChecklist(item.id, { valor_numero: val });
      }
    };

    const abrirFotoModal = () => {
      setChecklistFotoModal({ open: true, respostaId: resposta?.id, itemId: item.id, arquivos: [] });
    };

    const isRespondido = resposta?.valor_bool !== null && resposta?.valor_bool !== undefined
      || !!(resposta?.valor_texto)
      || resposta?.valor_numero !== null && resposta?.valor_numero !== undefined
      || fotos.length > 0;

    return (
      <div key={item.id} style={{
        padding: "14px 16px",
        borderRadius: 10,
        border: "1px solid",
        borderColor: isRespondido ? "#D1FAE5" : "#E5E7EB",
        background: isRespondido ? "#F0FDF4" : "#FAFAFA",
        marginBottom: 10,
        transition: "all 0.2s",
      }}>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 8 }} wrap>
          <Space>
            {isRespondido
              ? <CheckCircleOutlined style={{ color: "#10B981", fontSize: 15 }} />
              : <QuestionCircleOutlined style={{ color: "#9CA3AF", fontSize: 15 }} />
            }
            <Text strong style={{ fontSize: 13, color: "#1E293B" }}>
              {item.obrigatorio && <span style={{ color: "#EF4444", marginRight: 4 }}>*</span>}
              {item.pergunta}
            </Text>
            {item.tipo_resposta && (
              <Tag color="blue" style={{ fontSize: 11 }}>
                {item.tipo_resposta === "sim_nao" ? "Sim/Não"
                  : item.tipo_resposta === "texto" ? "Texto"
                  : item.tipo_resposta === "numero" ? "Número"
                  : item.tipo_resposta === "foto" ? "Foto"
                  : "Múltiplo"}
              </Tag>
            )}
          </Space>
        </Space>

        {/* Boolean */}
        {(item.tipo_resposta === "sim_nao" || item.tipo_resposta === "multiplo") && (
          <Space style={{ marginBottom: 8 }}>
            <Button
              size="small"
              type={resposta?.valor_bool === true ? "primary" : "default"}
              icon={<CheckOutlined />}
              style={resposta?.valor_bool === true ? { background: "#10B981", borderColor: "#10B981" } : {}}
              onClick={() => handleBool(true)}
            >
              Sim
            </Button>
            <Button
              size="small"
              danger={resposta?.valor_bool === false}
              type={resposta?.valor_bool === false ? "primary" : "default"}
              icon={<CloseOutlined />}
              onClick={() => handleBool(false)}
            >
              Não
            </Button>
          </Space>
        )}

        {/* Texto */}
        {(item.tipo_resposta === "texto" || item.tipo_resposta === "multiplo") && (
          <Input.TextArea
            rows={2}
            placeholder={item.placeholder || "Informe aqui..."}
            defaultValue={resposta?.valor_texto || ""}
            onBlur={(e) => handleTexto(e.target.value)}
            style={{ marginBottom: 8, borderRadius: 8 }}
          />
        )}

        {/* Número */}
        {item.tipo_resposta === "numero" && (
          <InputNumber
            style={{ width: 160, marginBottom: 8 }}
            placeholder="0,00"
            defaultValue={resposta?.valor_numero}
            onBlur={(e) => handleNumero(parseFloat(e.target.value))}
            step={0.1}
          />
        )}

        {/* Fotos do item */}
        {(item.tipo_resposta === "foto" || item.tipo_resposta === "multiplo") && (
          <div style={{ marginTop: 8 }}>
            {fotos.length > 0 && (
              <Image.PreviewGroup>
                <Space wrap style={{ marginBottom: 8 }}>
                  {fotos.map((f, fi) => (
                    <Image key={fi} src={f.arquivo || f.url} width={72} height={72}
                      style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #E5E7EB" }}
                    />
                  ))}
                </Space>
              </Image.PreviewGroup>
            )}
            <Button size="small" icon={<CameraOutlined />} onClick={abrirFotoModal} style={{ borderRadius: 6 }}>
              {fotos.length > 0 ? `${fotos.length} foto(s)` : "Adicionar foto"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const execucaoTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
          <Title level={5} style={{ marginTop: 0, marginBottom: 0, color: "#6B7280", textTransform: "uppercase" }}>
            Execução do serviço
          </Title>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            loading={gerandoRelatorioTecnico}
            onClick={gerarRelatorioTecnico}
            style={{ background: "#0F172A", borderColor: "#0F172A", borderRadius: 8 }}
          >
            Gerar Relatório Técnico
          </Button>
        </Space>
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item label="Técnico responsável" name="tecnico_responsavel">
              <Select allowClear options={technicians} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Data agendada" name="data_agendada">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Hora de início" name="hora_inicio">
              <DatePicker picker="time" format="HH:mm" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Hora de conclusão" name="hora_conclusao">
              <DatePicker picker="time" format="HH:mm" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Marca do equipamento" name="equipamento_marca">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Modelo" name="equipamento_modelo">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Número de série" name="equipamento_serie">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Tipo de relatório" name="tipo_relatorio">
              <Select allowClear options={reportTypeOptions} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Observações técnicas" name="observacoes_tecnicas">
              <TextArea rows={4} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Checklist técnico */}
      <Card
        bordered={false}
        style={sectionCardStyle}
        bodyStyle={{ padding: 20 }}
      >
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 2, color: "#0F172A" }}>
              <ToolOutlined style={{ marginRight: 8, color: "#3B82F6" }} />
              Checklist Técnico
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {checklistTemplate
                ? checklistTemplate.nome
                : ordem?.tipo_servico
                ? `Nenhum template configurado para "${ordem.tipo_servico}"`
                : "Selecione o tipo de serviço na aba Dados Gerais para carregar o checklist"}
            </Text>
          </div>
          {checklistTemplate && (() => {
            const total = checklistTemplate.itens?.length || 0;
            const respondidos = (checklistTemplate.itens || []).filter((it) => {
              const r = checklistRespostas[it.id];
              return r && (r.valor_bool !== null && r.valor_bool !== undefined || r.valor_texto || r.valor_numero !== null && r.valor_numero !== undefined || (r.fotos?.length || 0) > 0);
            }).length;
            const pct = total > 0 ? Math.round((respondidos / total) * 100) : 0;
            return (
              <Tooltip title={`${respondidos}/${total} itens respondidos`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Progress type="circle" percent={pct} size={44} strokeColor="#10B981" />
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>{respondidos}/{total}</Text>
                </div>
              </Tooltip>
            );
          })()}
        </Space>

        {checklistLoading ? (
          <Spin tip="Carregando checklist..." style={{ display: "block", textAlign: "center", padding: 32 }} />
        ) : !checklistTemplate ? (
          <Empty description="Nenhum checklist disponível para este tipo de serviço" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div>
            {(checklistTemplate.itens || []).map(renderChecklistItem)}
          </div>
        )}
      </Card>

      {renderPhotoGallery("Fotos antes do serviço", beforePhotos, "antes")}
      {renderPhotoGallery("Fotos depois do serviço", afterPhotos, "depois")}
    </Space>
  );

  const chatTab = (
    <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>Chat interno da OS</Title>
          <Text type="secondary">Tudo aqui fica registrado automaticamente para a equipe.</Text>
        </div>

        <List
          dataSource={ordem?.mensagens || []}
          locale={{ emptyText: <Empty description="Nenhuma mensagem interna ainda" /> }}
          renderItem={(item) => (
            <List.Item style={{ paddingInline: 0 }}>
              <List.Item.Meta
                avatar={<Avatar style={{ background: "#3B82F6" }}>{makeInitials(item.usuario_nome)}</Avatar>}
                title={
                  <Space size={8} wrap>
                    <Text strong>{item.usuario_nome || "Equipe"}</Text>
                    <Text type="secondary">{dayjs(item.criado_em).format("DD/MM/YYYY HH:mm")}</Text>
                  </Space>
                }
                description={
                  <div>
                    <Paragraph style={{ marginBottom: 8 }}>{item.mensagem}</Paragraph>
                    {item.anexos?.length ? (
                      <Space wrap>
                        {item.anexos.map((anexo) => (
                          <Button key={anexo.id} size="small" icon={<PaperClipOutlined />} href={anexo.arquivo} target="_blank">
                            {anexo.nome_original}
                          </Button>
                        ))}
                      </Space>
                    ) : null}
                  </div>
                }
              />
            </List.Item>
          )}
        />

        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
          <TextArea
            rows={4}
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            placeholder="Escreva uma atualização para o técnico ou para o escritório"
          />
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" icon={<SendOutlined />} style={primaryButtonStyle} onClick={enviarMensagem}>
              Enviar mensagem
            </Button>
          </Space>
        </div>
      </Space>
    </Card>
  );

  const despesasTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
          <div>
            <Title level={5} style={{ margin: 0 }}>Despesas da OS</Title>
            <Text type="secondary">A margem já reage em tempo real conforme custos e faturamento.</Text>
          </div>
          <Button icon={<PlusOutlined />} onClick={() => setExpenseModalOpen(true)}>
            Nova despesa
          </Button>
        </Space>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {[
            { label: "Material comprado", value: expenseSummary.material, color: "#B91C1C" },
            { label: "Combustível", value: expenseSummary.deslocamento, color: "#B45309" },
            { label: "Alimentação", value: expenseSummary.alimentacao, color: "#7C3AED" },
            { label: "Terceirizados", value: expenseSummary.terceiro, color: "#1D4ED8" },
            { label: "Outros custos", value: expenseSummary.outro, color: "#475569" },
            { label: "Margem da OS", value: margemAtual, color: margemAtual >= 0 ? "#15803D" : "#B91C1C" },
          ].map((card) => (
            <Col xs={24} md={12} xl={8} key={card.label}>
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ color: "#64748B", fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                  {card.label}
                </div>
                <div style={{ color: card.color, fontSize: 24, fontWeight: 800 }}>
                  {formatMoney(card.value)}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <Table
          columns={expenseColumns}
          dataSource={ordem?.despesas || []}
          pagination={false}
          rowKey="id"
          locale={{ emptyText: "Nenhuma despesa lançada" }}
        />
      </Card>
    </Space>
  );

  const setTrib = (field, value) => setTributacao((prev) => ({ ...prev, [field]: value }));
  const calcTribImposto = (aliquota) => Number(((valorFaturadoAtual * Number(aliquota || 0)) / 100).toFixed(2));
  const valorCalcISSQN = calcTribImposto(tributacao.issqn_aliquota);
  const valorRetidoISSQN = tributacao.issqn_retencao ? valorCalcISSQN : 0;
  const valorCalcPIS = calcTribImposto(tributacao.pis_aliquota);
  const valorCalcCOFINS = calcTribImposto(tributacao.cofins_aliquota);
  const valorCalcIRPJ = calcTribImposto(tributacao.irpj_aliquota);
  const valorCalcCSLL = calcTribImposto(tributacao.csll_aliquota);
  const valorCalcIBS = calcTribImposto(tributacao.ibs_aliquota);
  const valorCalcCBS = calcTribImposto(tributacao.cbs_aliquota);
  const totalRetencoesTrib = valorRetidoISSQN + valorCalcPIS + valorCalcCOFINS + valorCalcIRPJ + valorCalcCSLL;
  const valorLiquidoNF = valorFaturadoAtual - totalRetencoesTrib;

  const aliquotaRow = (label, field, valorCalculado, tooltip) => (
    <Row gutter={[8, 0]} align="middle" style={{ marginBottom: 8 }} key={field}>
      <Col xs={24} sm={7}>
        <Space size={4}>
          <Text style={{ fontSize: 13 }}>{label}</Text>
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ color: "#94A3B8", fontSize: 12 }} />
            </Tooltip>
          )}
        </Space>
      </Col>
      <Col xs={12} sm={6}>
        <InputNumber
          min={0}
          max={100}
          step={0.01}
          value={tributacao[field]}
          onChange={(val) => setTrib(field, val ?? 0)}
          formatter={(v) => `${v}%`}
          parser={(v) => v?.replace("%", "")}
          style={{ width: "100%" }}
          size="small"
        />
      </Col>
      <Col xs={12} sm={6}>
        <Text style={{ fontSize: 13, color: "#64748B" }}>{formatMoney(valorCalculado)}</Text>
      </Col>
    </Row>
  );

  const faturamentoTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* Dados NF */}
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Space direction="vertical" size={6} style={{ width: "100%", marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>Faturamento</Title>
          <Text type="secondary">
            Registre NF, datas, PDF e tributação. Após salvar e confirmar, a OS gera receita no financeiro.
          </Text>
        </Space>
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item label="Valor final faturado" name="valor_final_faturado">
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: "100%" }}
                formatter={(v) => `R$ ${v || ""}`}
                parser={(v) => v?.replace(/R\$\s?/, "")}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Número da NF-e / NFS-e" name="numero_nf">
              <Input
                placeholder="NF-2025-00491"
                onChange={(e) => { if (e.target.value) autoCalcImpostos(); }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Data de emissão da NF" name="data_emissao_nf">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Data de vencimento" name="data_vencimento">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Data de recebimento" name="data_recebimento">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Forma de cobrança" name="forma_cobranca">
              <Select options={formaCobrancaOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Banco/conta de recebimento"
              name="conta_recebimento"
              rules={[{ required: true, message: "Selecione onde o dinheiro vai cair." }]}
            >
              <Select
                placeholder="Selecione a conta"
                options={contasRecebimento.map((conta) => ({
                  value: conta.id,
                  label: conta.banco
                    ? `${conta.nome} - ${conta.banco}`
                    : conta.nome,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Descrição do serviço na NF" name="descricao_servico_nf">
              <TextArea rows={3} placeholder="Descrição conforme será impressa na nota fiscal..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Município de incidência do ISSQN" name="municipio_issqn">
              <Input placeholder="Ex: São Paulo / SP" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Situação tributária PIS/COFINS" name="situacao_tributaria_pis_cofins">
              <Select
                placeholder="Selecione..."
                allowClear
                options={[
                  { value: "07", label: "07 – Operação Isenta da Contribuição" },
                  { value: "49", label: "49 – Outras Operações de Saída" },
                  { value: "50", label: "50 – Operação com Direito a Crédito" },
                  { value: "70", label: "70 – Operação de Aquisição sem Direito a Crédito" },
                  { value: "99", label: "99 – Outras Operações" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="PDF da nota fiscal" name="pdf_nf_upload" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList || []}>
              <Upload beforeUpload={() => false} maxCount={1}>
                <Button icon={<UploadOutlined />}>Selecionar PDF</Button>
              </Upload>
            </Form.Item>
            {ordem?.pdf_nf ? (
              <Button type="link" href={ordem.pdf_nf} target="_blank" style={{ padding: 0 }}>
                Ver PDF atual
              </Button>
            ) : null}
          </Col>
        </Row>
      </Card>

      {/* Tributação Detalhada */}
      <Card
        bordered={false}
        style={sectionCardStyle}
        bodyStyle={{ padding: 20 }}
        title={<Space><Text strong>Tributação Detalhada</Text>{autoCalcLoading && <Spin size="small" />}</Space>}
        extra={
          <Button size="small" onClick={autoCalcImpostos} loading={autoCalcLoading} icon={<DollarOutlined />}>
            Calcular impostos
          </Button>
        }
      >
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 13 }}>Regime tributário</Text>
            <Select
              value={tributacao.regime}
              disabled
              style={{ width: "100%", marginTop: 4 }}
              options={[
                { value: "mei", label: "MEI" },
                { value: "simples_nacional", label: "Simples Nacional" },
                { value: "lucro_presumido", label: "Lucro Presumido" },
                { value: "lucro_real", label: "Lucro Real" },
              ]}
            />
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0 14px" }} />

        <Row gutter={[8, 0]} style={{ marginBottom: 10 }}>
          <Col xs={24} sm={7}><Text type="secondary" style={{ fontSize: 12 }}>Imposto</Text></Col>
          <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Alíquota (%)</Text></Col>
          <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 12 }}>Valor calculado</Text></Col>
        </Row>

        {aliquotaRow("ISSQN", "issqn_aliquota", valorCalcISSQN)}
        <Row gutter={[8, 0]} align="middle" style={{ marginBottom: 14, paddingLeft: 2 }}>
          <Col xs={24} sm={18}>
            <Space size={8}>
              <Switch
                size="small"
                checked={tributacao.issqn_retencao}
                onChange={(checked) => setTrib("issqn_retencao", checked)}
              />
              <Text style={{ fontSize: 12 }}>Retenção ISSQN na fonte</Text>
              {tributacao.issqn_retencao && (
                <Text style={{ fontSize: 12, color: "#D97706" }}>
                  (retido: {formatMoney(valorRetidoISSQN)})
                </Text>
              )}
            </Space>
          </Col>
        </Row>

        {aliquotaRow("PIS", "pis_aliquota", valorCalcPIS)}
        {aliquotaRow("COFINS", "cofins_aliquota", valorCalcCOFINS)}
        {aliquotaRow("IRPJ", "irpj_aliquota", valorCalcIRPJ)}
        {aliquotaRow("CSLL", "csll_aliquota", valorCalcCSLL)}
        {aliquotaRow(
          "IBS",
          "ibs_aliquota",
          valorCalcIBS,
          "Imposto sobre Bens e Serviços – vigência progressiva 2026-2033 (Reforma Tributária)"
        )}
        {aliquotaRow(
          "CBS",
          "cbs_aliquota",
          valorCalcCBS,
          "Contribuição sobre Bens e Serviços – vigência progressiva 2026-2033 (Reforma Tributária)"
        )}

        <Divider style={{ margin: "12px 0" }} />

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "10px 14px" }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Total retenções</Text>
              <Text strong style={{ color: "#D97706", fontSize: 15 }}>{formatMoney(totalRetencoesTrib)}</Text>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ background: "#DBEAFE", borderRadius: 8, padding: "10px 14px" }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Valor faturado</Text>
              <Text strong style={{ color: "#1D4ED8", fontSize: 15 }}>{formatMoney(valorFaturadoAtual)}</Text>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ background: "#DCFCE7", borderRadius: 8, padding: "10px 14px" }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Valor líquido NF</Text>
              <Text strong style={{ color: "#15803D", fontSize: 15 }}>{formatMoney(valorLiquidoNF)}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Resumo e ações */}
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Alert
          type="success"
          showIcon
          style={{ borderRadius: 12, marginBottom: 16 }}
          message="Resumo financeiro da OS"
          description={`Valor faturado: ${formatMoney(valorFaturadoAtual)} • Custos lançados: ${formatMoney(expenseSummary.total)} • Margem atual: ${formatMoney(margemAtual)}`}
        />
        <Space wrap>
          <Button type="primary" icon={<CheckCircleOutlined />} style={primaryButtonStyle} onClick={confirmarFaturamento} loading={sendingBilling}>
            Confirmar faturamento e ir para o financeiro
          </Button>
          <Button icon={<SaveOutlined />} style={subtleButtonStyle} onClick={() => salvarOS()} loading={saving}>
            Salvar faturamento
          </Button>
        </Space>
      </Card>
    </Space>
  );

  const historicoTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Title level={5} style={{ marginTop: 0 }}>Histórico automático</Title>
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Ninguém precisa preencher aqui. O sistema vai registrando as transições, atualizações e confirmações.
        </Text>
        <Timeline
          items={historyItems.map((item) => ({
            color: item.color,
            children: (
              <div>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>{item.title}</div>
                <div style={{ color: "#64748B" }}>{item.description}</div>
              </div>
            ),
          }))}
        />
      </Card>

      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Descriptions column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="Criado por">{ordem?.criado_por_nome || "-"}</Descriptions.Item>
          <Descriptions.Item label="Última alteração">{ordem?.atualizado_em ? dayjs(ordem.atualizado_em).format("DD/MM/YYYY HH:mm") : "-"}</Descriptions.Item>
          <Descriptions.Item label="Status atual">{statusVisual.label}</Descriptions.Item>
          <Descriptions.Item label="Pagamento">{paymentStatusLabels[String(ordem?.status_pagamento || "pendente").toLowerCase()] || "Aguardando"}</Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );

  const tabItems = [
    { key: "dados-gerais", label: "Dados gerais", children: dadosGeraisTab },
    { key: "execucao", label: "Execução e fotos", children: execucaoTab },
    { key: "chat", label: "Chat interno", children: chatTab },
    { key: "despesas", label: "Despesas", children: despesasTab },
    { key: "faturamento", label: "Faturamento", children: faturamentoTab },
    { key: "historico", label: "Histórico", children: historicoTab },
  ];

  if (loading) {
    return (
      <div style={pageStyle}>
        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      </div>
    );
  }

  if (!ordem) {
    return (
      <div style={pageStyle}>
        <Card bordered={false} style={panelStyle}>
          <Empty description="Ordem de serviço não encontrada" />
        </Card>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <Form form={form} layout="vertical">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <Space size={10} wrap align="center">
                <Title level={2} style={{ margin: 0, fontSize: 34, fontWeight: 800, color: "#111827" }}>
                  {ordem.numero}
                </Title>
                <Tag
                  style={{
                    background: statusVisual.background,
                    color: statusVisual.color,
                    border: "none",
                    borderRadius: 999,
                    paddingInline: 12,
                    paddingBlock: 4,
                    fontWeight: 600,
                  }}
                >
                  {statusVisual.label}
                </Tag>
              </Space>
              <Text style={{ color: "#4B5563", fontSize: 18 }}>
                {ordem?.cliente_nome || selectedClient?.nome || "Cliente"} • {serviceTypeLabels[ordem?.tipo_servico] || "Serviço"} • Aberta em {ordem?.criado_em ? dayjs(ordem.criado_em).format("DD/MM/YYYY") : "-"}
              </Text>
            </div>

            <Space wrap>
              <Button icon={<FilePdfOutlined />} style={subtleButtonStyle} onClick={gerarRelatorio} loading={reportLoading}>
                Gerar relatório
              </Button>
              <Button icon={<DollarOutlined />} style={subtleButtonStyle} onClick={() => setActiveTab("faturamento")}>
                Faturar OS
              </Button>
              <Button type="primary" icon={<SaveOutlined />} style={primaryButtonStyle} onClick={() => salvarOS()} loading={saving}>
                Salvar
              </Button>
              <Dropdown menu={menuAcoesRapidas} trigger={["click"]}>
                <Button shape="circle" icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          </div>

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              }}
            >
              {stageOrder.map((stageKey, index) => {
                const meta = stageMeta[stageKey];
                const isDone = index < currentStageIndex;
                const isActive = index === currentStageIndex;
                return (
                  <div
                    key={stageKey}
                    onClick={() => moverParaEtapa(stageKey)}
                    style={{
                      alignItems: "center",
                      background: isActive ? meta.activeBg : isDone ? meta.doneBg : "#F8FAFC",
                      borderRight: index === stageOrder.length - 1 ? "none" : "1px solid #E5E7EB",
                      color: isActive || isDone ? meta.activeColor : "#64748B",
                      cursor: "pointer",
                      display: "flex",
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 600,
                      justifyContent: "center",
                      minHeight: 48,
                      padding: "0 12px",
                    }}
                  >
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </Card>

          <Row gutter={[16, 16]}>
            {topSummaryCards.map((card) => (
              <Col xs={24} md={12} xl={6} key={card.title}>
                <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ color: "#64748B", fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
                        {card.title}
                      </div>
                      <div style={{ color: "#10233C", fontSize: 26, fontWeight: 800 }}>
                        {card.value}
                      </div>
                    </div>
                    <div
                      style={{
                        alignItems: "center",
                        background: "#F8FAFC",
                        borderRadius: 12,
                        display: "flex",
                        height: 44,
                        justifyContent: "center",
                        width: 44,
                      }}
                    >
                      {card.icon}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Alert
            type="info"
            showIcon
            message="Fluxo operacional da OS"
            description="A barra no topo mostra a etapa exata da OS. Despesas atualizam a margem em tempo real, o faturamento empurra a rotina para o financeiro e o histórico é gerado automaticamente."
            style={{ borderRadius: 12 }}
          />

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </Card>
        </Space>
      </Form>

      <Modal
        open={expenseModalOpen}
        title="Registrar despesa da OS"
        okText="Salvar despesa"
        cancelText="Cancelar"
        onOk={adicionarDespesa}
        onCancel={() => setExpenseModalOpen(false)}
      >
        <Form form={expenseForm} layout="vertical" initialValues={{ tipo: "material", data_despesa: dayjs() }}>
          <Form.Item label="Descrição" name="descricao" rules={[{ required: true, message: "Informe a descrição" }]}>
            <Input placeholder="Compra de capacitor, almoço da equipe, deslocamento..." />
          </Form.Item>
          <Form.Item label="Tipo" name="tipo" rules={[{ required: true, message: "Selecione o tipo" }]}>
            <Select options={expenseTypeOptions} />
          </Form.Item>
          <Form.Item label="Valor" name="valor" rules={[{ required: true, message: "Informe o valor" }]}>
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} formatter={(value) => `R$ ${value || ""}`} />
          </Form.Item>
          <Form.Item label="Data da despesa" name="data_despesa" rules={[{ required: true, message: "Informe a data" }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={photoModal.open}
        title={photoModal.tipo === "antes" ? "Adicionar fotos antes do serviço" : "Adicionar fotos depois do serviço"}
        okText="Enviar fotos"
        cancelText="Cancelar"
        onOk={enviarFotos}
        onCancel={() => setPhotoModal({ open: false, tipo: "antes", arquivos: [] })}
      >
        <Upload
          multiple
          beforeUpload={() => false}
          fileList={photoModal.arquivos}
          onChange={({ fileList }) => setPhotoModal((current) => ({ ...current, arquivos: fileList }))}
          listType="picture"
        >
          <Button icon={<UploadOutlined />}>Selecionar imagens</Button>
        </Upload>
      </Modal>

      <Modal
        open={checklistFotoModal.open}
        title="Adicionar foto ao item do checklist"
        okText="Enviar foto(s)"
        cancelText="Cancelar"
        onOk={enviarFotoChecklist}
        onCancel={() => setChecklistFotoModal({ open: false, respostaId: null, itemId: null, arquivos: [] })}
      >
        <Upload
          multiple
          beforeUpload={() => false}
          fileList={checklistFotoModal.arquivos}
          onChange={({ fileList }) => setChecklistFotoModal((c) => ({ ...c, arquivos: fileList }))}
          listType="picture"
          accept="image/*"
        >
          <Button icon={<CameraOutlined />}>Selecionar foto(s)</Button>
        </Upload>
      </Modal>

      <Modal
        open={itemModalOpen}
        title={editingItemIndex === null ? "Adicionar item do orçamento" : "Editar item do orçamento"}
        okText={editingItemIndex === null ? "Adicionar" : "Salvar alterações"}
        cancelText="Cancelar"
        onOk={salvarItemOrcamento}
        onCancel={() => {
          setItemModalOpen(false);
          itemForm.resetFields();
        }}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item label="Descrição" name="descricao" rules={[{ required: true, message: "Informe a descrição do item" }]}>
            <TextArea rows={3} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Quantidade" name="quantidade" rules={[{ required: true, message: "Informe a quantidade" }]}>
                <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Valor unitário" name="valor_unitario" rules={[{ required: true, message: "Informe o valor unitário" }]}>
                <InputNumber min={0} step={0.01} style={{ width: "100%" }} formatter={(value) => `R$ ${value || ""}`} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tipo" name="origem_tipo">
                <Select
                  options={[
                    { value: "avulso", label: "Avulso" },
                    { value: "servico", label: "Serviço" },
                    { value: "produto", label: "Produto" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Código de referência" name="codigo_referencia">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Unidade" name="unidade_referencia">
                <Input placeholder="un, h, kg..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
