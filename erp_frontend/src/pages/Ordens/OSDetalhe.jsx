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
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CalendarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  FilePdfOutlined,
  MessageOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SaveOutlined,
  SendOutlined,
  ToolOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

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
  background: "#1B4F8A",
  borderColor: "#1B4F8A",
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
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingBilling, setSendingBilling] = useState(false);
  const [ordem, setOrdem] = useState(null);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [activeTab, setActiveTab] = useState("dados-gerais");
  const [chatMessage, setChatMessage] = useState("");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm] = Form.useForm();
  const [photoModal, setPhotoModal] = useState({ open: false, tipo: "antes", arquivos: [] });

  const watchedClient = Form.useWatch("cliente", form);
  const watchedHasPc = Form.useWatch("tem_pedido_compra", form);
  const watchedValorFaturado = Form.useWatch("valor_final_faturado", form);

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
      valor_final_faturado: Number(ordemAtual?.valor_final_faturado || ordemAtual?.total_com_impostos || 0),
      numero_nf: ordemAtual?.numero_nf || "",
      data_emissao_nf: ordemAtual?.data_emissao_nf ? dayjs(ordemAtual.data_emissao_nf) : null,
      data_vencimento: ordemAtual?.data_vencimento ? dayjs(ordemAtual.data_vencimento) : null,
      forma_cobranca: ordemAtual?.forma_cobranca || undefined,
      observacoes_internas: "",
      pdf_pc_upload: [],
      pdf_nf_upload: [],
    });
  };

  const carregarTela = async () => {
    try {
      setLoading(true);
      const [ordemResponse, clientsResponse, techniciansResponse] = await Promise.allSettled([
        api.get(`/ordens/${id}/`),
        api.get("/clientes/"),
        api.get("/auth/"),
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
      setOrdem(ordemAtual);
      preencherFormulario(ordemAtual);

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
    forma_cobranca: values.forma_cobranca || "",
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
      preencherFormulario(response.data);
      message.success("Ordem de serviço salva.");
      return response.data;
    } finally {
      setSaving(false);
    }
  };

  const gerarRelatorio = async () => {
    try {
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

  const confirmarFaturamento = async () => {
    setSendingBilling(true);
    try {
      await salvarOS();
      await api.post(`/ordens/${id}/mudar-status/`, {
        status: "faturada",
        observacao: "Faturamento confirmado pela tela operacional da OS.",
      });
      message.success("Faturamento confirmado. Redirecionando para o financeiro.");
      navigate(`/financeiro/lancamentos/novo?os=${id}`);
    } catch (error) {
      console.error("Erro ao confirmar faturamento:", error);
      message.error("Não foi possível confirmar o faturamento.");
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

  const topSummaryCards = [
    {
      title: "Valor orçado",
      value: formatMoney(ordem?.valor_total_orcado),
      icon: <DollarOutlined style={{ color: "#1B4F8A" }} />,
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
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Validade do PC" name="validade_pc">
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="PDF do PC" name="pdf_pc_upload" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList || []}>
                <Upload beforeUpload={() => false} maxCount={1}>
                  <Button icon={<UploadOutlined />}>Selecionar arquivo</Button>
                </Upload>
              </Form.Item>
              {ordem?.pdf_pc ? (
                <Button type="link" href={ordem.pdf_pc} target="_blank" style={{ padding: 0 }}>
                  Ver arquivo atual
                </Button>
              ) : null}
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

        <Table
          columns={itemColumns}
          dataSource={ordem?.itens || []}
          pagination={false}
          rowKey="id"
          locale={{ emptyText: "Nenhum item do orçamento cadastrado" }}
        />
      </Card>
    </Space>
  );

  const execucaoTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Title level={5} style={{ marginTop: 0, marginBottom: 16, color: "#6B7280", textTransform: "uppercase" }}>
          Execução do serviço
        </Title>
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
                avatar={<Avatar style={{ background: "#1B4F8A" }}>{makeInitials(item.usuario_nome)}</Avatar>}
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

  const faturamentoTab = (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Space direction="vertical" size={6} style={{ width: "100%", marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>Faturamento</Title>
          <Text type="secondary">
            Aqui a funcionária registra NF, data e PDF. Ao confirmar, a OS entra no fluxo financeiro.
          </Text>
        </Space>
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item label="Valor final faturado" name="valor_final_faturado" rules={[{ required: true, message: "Informe o valor faturado" }]}>
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: "100%" }}
                formatter={(value) => `R$ ${value || ""}`}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Número da NF-e / NFS-e" name="numero_nf" rules={[{ required: true, message: "Informe o número da nota" }]}>
              <Input placeholder="NF-2025-00491" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Data de emissão da NF" name="data_emissao_nf" rules={[{ required: true, message: "Informe a data de emissão" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Data de vencimento" name="data_vencimento" rules={[{ required: true, message: "Informe o vencimento" }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Forma de cobrança" name="forma_cobranca" rules={[{ required: true, message: "Selecione a forma de cobrança" }]}>
              <Select options={formaCobrancaOptions} />
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

        <Alert
          type="success"
          showIcon
          style={{ borderRadius: 12, marginTop: 6 }}
          message="Resumo financeiro da OS"
          description={`Valor faturado: ${formatMoney(valorFaturadoAtual)} • Custos lançados: ${formatMoney(expenseSummary.total)} • Margem atual: ${formatMoney(margemAtual)}`}
        />

        <Space wrap style={{ marginTop: 18 }}>
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
              <Button icon={<FilePdfOutlined />} style={subtleButtonStyle} onClick={gerarRelatorio}>
                Gerar relatório
              </Button>
              <Button icon={<DollarOutlined />} style={subtleButtonStyle} onClick={() => setActiveTab("faturamento")}>
                Faturar OS
              </Button>
              <Button type="primary" icon={<SaveOutlined />} style={primaryButtonStyle} onClick={() => salvarOS()} loading={saving}>
                Salvar
              </Button>
              <Button shape="circle" icon={<MoreOutlined />} />
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
                    style={{
                      alignItems: "center",
                      background: isActive ? meta.activeBg : isDone ? meta.doneBg : "#F8FAFC",
                      borderRight: index === stageOrder.length - 1 ? "none" : "1px solid #E5E7EB",
                      color: isActive || isDone ? meta.activeColor : "#64748B",
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
    </div>
  );
}
