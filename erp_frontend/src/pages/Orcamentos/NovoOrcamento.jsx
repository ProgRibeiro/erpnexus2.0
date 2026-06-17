import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SaveOutlined,
  SendOutlined,
  ShoppingOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import {
  buildBudgetNumber,
  buildItemsPayload,
  btnPrimaryStyle,
  calcItemsTotals,
  createEmptyItem,
  itemOriginOptions,
  mapProdutoToItem,
  mapServicoToItem,
  maskCEP,
  maskCNPJ,
  maskPhone,
  moneyFormatter,
  normalizeList,
  pageStyle,
  panelStyle,
  paymentOptions,
  priorityOptions,
  productUnitOptions,
  segmentOptions,
  serviceOptions,
  serviceUnitOptions,
  tributacaoOptions,
} from "./shared";

const { Title, Text } = Typography;
const { TextArea } = Input;

const stickyHeaderStyle = {
  position: "sticky",
  top: 0,
  zIndex: 12,
  background: "#FFFFFF",
  marginBottom: 14,
  borderBottom: "1px solid #E2E8F0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const itemCardStyle = {
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 16,
  background: "#FFFFFF",
  color: "#1E293B",
};

const itemSectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const itemActionButtonStyle = {
  borderRadius: 10,
  height: 40,
  fontWeight: 700,
  borderColor: "#CBD5E1",
  color: "#1E293B",
  background: "#FFFFFF",
};

const quickTypeCardStyle = (active, color) => ({
  width: "100%",
  minHeight: 86,
  border: `1px solid ${active ? color : "#E2E8F0"}`,
  borderRadius: 12,
  padding: 14,
  background: active ? "#F8FAFC" : "#FFFFFF",
  boxShadow: active ? "0 8px 20px rgba(15, 23, 42, 0.08)" : "none",
  textAlign: "left",
  cursor: "pointer",
});

const quickModalSectionStyle = {
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 16,
  background: "#FFFFFF",
};

const compactPanelStyle = {
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  background: "#FFFFFF",
  padding: 14,
  height: "100%",
};

const compactPanelHeaderStyle = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const miniInfoStyle = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: "9px 10px",
  minHeight: 58,
};

const headerMetricStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: "10px 14px",
  minWidth: 150,
};

function formatApiError(error, fallback = "Erro ao salvar.") {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  const field = Object.keys(data)[0];
  const value = data[field];
  const msg = Array.isArray(value) ? value[0] : value;
  return field ? `${field}: ${msg}` : fallback;
}

function createPayload(values, items, selectedClient, budgetStatus, impostos) {
  const totals = calcItemsTotals(items);

  return {
    cliente: values.cliente,
    contato_responsavel: values.contato_responsavel || null,
    status: budgetStatus,
    tipo_servico: values.tipo_servico,
    prioridade: values.prioridade,
    descricao_servico: values.descricao_servico,
    condicao_pagamento: values.condicao_pagamento,
    validade_orcamento: values.validade_orcamento?.format("YYYY-MM-DD") || null,
    tem_pedido_compra: Boolean(values.tem_pedido_compra),
    numero_pc: values.numero_pc || "",
    valor_autorizado_pc: Number(values.valor_autorizado_pc || 0),
    validade_pc: values.validade_pc?.format("YYYY-MM-DD") || null,
    observacoes_tecnicas: values.observacoes || "",
    aprovado_por: budgetStatus === "aprovada" ? "Aprovação interna" : "",
    data_aprovacao: budgetStatus === "aprovada" ? dayjs().toISOString() : null,
    valor_total_orcado: Number(totals.subtotal || 0),
    valor_servicos: Number(totals.valorServicos || 0),
    valor_materiais: Number(totals.valorMateriais || 0),
    dados_impostos: impostos || {},
    total_com_impostos: Number(impostos?.total_geral || totals.subtotal || 0),
    itens: buildItemsPayload(items),
    cliente_nome: selectedClient?.nome,
  };
}

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [quickItemForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [draftId, setDraftId] = useState(null);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [items, setItems] = useState([createEmptyItem(0)]);
  const [budgetNumber, setBudgetNumber] = useState(buildBudgetNumber(1));
  const [approvePayload, setApprovePayload] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [terceiros, setTerceiros] = useState([]);
  const [impostos, setImpostos] = useState(null);
  const [calculandoImpostos, setCalculandoImpostos] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogOrigin, setCatalogOrigin] = useState("servico");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [quickItemModalOpen, setQuickItemModalOpen] = useState(false);
  const [quickItemType, setQuickItemType] = useState("servico");

  const [drawerClienteAberto, setDrawerClienteAberto] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [segmento, setSegmento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [ufEndereco, setUfEndereco] = useState("");
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  const [cnpjValido, setCnpjValido] = useState(false);
  const [cnpjErro, setCnpjErro] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [salvandoItemRapido, setSalvandoItemRapido] = useState(false);

  const isAdmin = ["admin", "gestor"].includes(String(user?.role || "").toLowerCase());
  const selectedClientId = Form.useWatch("cliente", form);
  const temPedidoCompra = Form.useWatch("tem_pedido_compra", form);
  const quickItemValues = Form.useWatch([], quickItemForm) || {};

  const selectedClient = useMemo(
    () => clients.find((cliente) => String(cliente.id) === String(selectedClientId)),
    [clients, selectedClientId]
  );

  const totals = useMemo(() => calcItemsTotals(items), [items]);
  const itemCounters = useMemo(
    () => ({
      total: items.length,
      servicos: items.filter((item) => item.origem_tipo === "servico").length,
      produtos: items.filter((item) => item.origem_tipo === "produto").length,
      avulsos: items.filter((item) => item.origem_tipo === "avulso").length,
    }),
    [items]
  );
  const totalTerceiros = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.custo_terceiro || 0), 0),
    [items]
  );
  const quickPreviewPrice = Number(
    quickItemType === "produto" ? quickItemValues.preco_venda || 0 : quickItemValues.preco_padrao || 0
  );
  const quickPreviewCost = Number(quickItemValues.preco_custo || 0);
  const quickPreviewMargin =
    quickItemType === "produto" && quickPreviewPrice > 0
      ? Math.max(0, ((quickPreviewPrice - quickPreviewCost) / quickPreviewPrice) * 100)
      : null;

  useEffect(() => {
    form.setFieldsValue({
      validade_orcamento: dayjs().add(30, "day"),
      prioridade: "media",
      total_geral: 0,
    });
  }, [form]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        const [clientsResponse, budgetsResponse, produtosResponse, servicosResponse, terceirosResponse] = await Promise.all([
          api.get("/clientes/"),
          api.get("/ordens/"),
          api.get("/estoque/produtos/"),
          api.get("/estoque/servicos/"),
          api.get("/terceiros/terceirizados/", { params: { status: "ativo" } }),
        ]);

        if (!active) return;

        const clientRows = normalizeList(clientsResponse.data);
        const budgetRows = normalizeList(budgetsResponse.data).filter((record) =>
          ["rascunho", "orcamento_enviado", "aprovada", "cancelada"].includes(String(record?.status || "").toLowerCase())
        );
        const technicianMap = new Map();
        normalizeList(budgetsResponse.data).forEach((record) => {
          if (record?.tecnico_responsavel && record?.tecnico_nome) {
            technicianMap.set(String(record.tecnico_responsavel), {
              label: record.tecnico_nome,
              value: record.tecnico_responsavel,
            });
          }
        });

        if (user?.id && (user?.nome_completo || user?.nome)) {
          technicianMap.set(String(user.id), {
            label: user.nome_completo || user.nome,
            value: user.id,
          });
        }

        setClients(clientRows);
        setTechnicians(Array.from(technicianMap.values()));
        setBudgetNumber(buildBudgetNumber(budgetRows.length + 1));
        setProdutos(normalizeList(produtosResponse.data));
        setServicos(normalizeList(servicosResponse.data));
        setTerceiros(normalizeList(terceirosResponse.data));
      } catch {
        if (active) message.warning("Não foi possível carregar os dados iniciais do orçamento.");
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [user?.id, user?.nome, user?.nome_completo]);

  useEffect(() => {
    let active = true;
    async function calcularImpostos() {
      try {
        setCalculandoImpostos(true);
        const response = await api.post("/fiscal/calcular-impostos/", {
          valor_servicos: totals.valorServicos,
          valor_materiais: totals.valorMateriais,
          tipo_servico: form.getFieldValue("tipo_servico") || "",
          descricao_servico: form.getFieldValue("descricao_servico") || "",
        });
        if (active) {
          setImpostos(response.data || null);
          form.setFieldValue("total_geral", Number(response.data?.total_geral || totals.subtotal || 0));
        }
      } catch {
        if (active) {
          setImpostos(null);
          form.setFieldValue("total_geral", totals.subtotal || 0);
        }
      } finally {
        if (active) setCalculandoImpostos(false);
      }
    }

    calcularImpostos();
    return () => {
      active = false;
    };
  }, [form, totals.subtotal, totals.valorMateriais, totals.valorServicos]);

  const consultarCNPJ = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      message.warning("CNPJ deve ter 14 dígitos");
      return;
    }

    setConsultandoCNPJ(true);
    setCnpjValido(false);
    setCnpjErro(false);

    try {
      const response = await api.post("/fiscal/consultar-cnpj/", { cnpj: cnpjLimpo });
      const data = response.data;
      const endereco = data.endereco || {};
      const cidadeApi = data.municipio || data.cidade || endereco.cidade || "";
      const ufApi = data.uf || data.estado || endereco.uf || "";
      setRazaoSocial(data.razao_social || "");
      setMunicipio(cidadeApi);
      setUf(ufApi);
      setNomeFantasia(data.nome_fantasia || data.razao_social || "");
      setEmail(data.email || "");
      setTelefone(data.telefone || "");
      setCep(maskCEP(data.cep || endereco.cep || ""));
      setLogradouro(data.logradouro || endereco.logradouro || data.endereco_logradouro || "");
      setNumero(data.numero || endereco.numero || "");
      setComplemento(data.complemento || endereco.complemento || "");
      setBairro(data.bairro || endereco.bairro || "");
      setCidade(cidadeApi);
      setUfEndereco(ufApi);
      setCnpjValido(true);
      message.success("CNPJ consultado com sucesso! Todos os dados foram preenchidos.");
    } catch (error) {
      setCnpjErro(true);
      const errorMsg = error?.response?.data?.detail || "CNPJ não encontrado na Receita Federal";
      message.error(errorMsg);
    } finally {
      setConsultandoCNPJ(false);
    }
  };

  const consultarCEP = async (cepValue) => {
    const cepLimpo = cepValue.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setUfEndereco(data.uf || "");
      } else {
        message.error("CEP não encontrado");
      }
    } catch {
      message.error("Erro ao consultar CEP");
    }
  };

  const salvarCliente = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (!nomeFantasia?.trim() || cnpjLimpo.length !== 14) {
      message.error("Preencha CNPJ e Nome Fantasia.");
      return;
    }
    if (!razaoSocial?.trim()) {
      message.error("Preencha Razão Social.");
      return;
    }

    try {
      setSalvandoCliente(true);
      const response = await api.post("/clientes/", {
        tipo_pessoa: "juridica",
        nome: nomeFantasia || razaoSocial,
        nome_fantasia: nomeFantasia || "",
        razao_social: razaoSocial || "",
        cnpj_cpf: cnpjLimpo,
        segmento: segmento || "",
        email: email || "",
        telefone: telefone || "",
        whatsapp: whatsapp || "",
        cep: cep || "",
        logradouro: logradouro || "",
        numero: numero || "",
        complemento: complemento || "",
        bairro: bairro || "",
        cidade: cidade || municipio || "",
        uf: ufEndereco || uf || "",
        status: "ativo",
      });

      const novoCliente = response.data;
      setClients((current) => [novoCliente, ...current]);
      form.setFieldValue("cliente", novoCliente.id);
      setDrawerClienteAberto(false);
      message.success("Cliente cadastrado com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      message.error(formatApiError(error, "Erro ao salvar cliente."));
    } finally {
      setSalvandoCliente(false);
    }
  };

  const updateItem = (key, field, value) => {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const next = { ...item, [field]: value };
        if (field === "terceiro") {
          const terceiro = terceiros.find((record) => record.id === value);
          next.markup_terceiro = Number(terceiro?.markup_padrao || next.markup_terceiro || 0);
          next.gerar_contas_pagar_terceiro = Boolean(value);
        }
        if (field === "custo_terceiro" || field === "markup_terceiro") {
          const custo = Number(field === "custo_terceiro" ? value : next.custo_terceiro || 0);
          const markup = Number(field === "markup_terceiro" ? value : next.markup_terceiro || 0);
          if (custo > 0) {
            next.valor_unitario = Number((custo * (1 + markup / 100)).toFixed(2));
          }
        }
        return next;
      })
    );
  };

  const removeItem = (key) => {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current));
  };

  const addManualItem = () => {
    setItems((current) => [...current, createEmptyItem(current.length)]);
  };

  const openQuickItemModal = (type = quickItemType) => {
    setQuickItemType(type);
    quickItemForm.resetFields();
    quickItemForm.setFieldsValue({
      unidade_medida: type === "produto" ? "un" : "uni",
      categoria: form.getFieldValue("tipo_servico") || "manutencao",
      tributacao: type === "servico" ? "iss" : undefined,
      estoque_minimo: 0,
      preco_custo: 0,
      preco_venda: 0,
      preco_padrao: 0,
    });
    setQuickItemModalOpen(true);
  };

  const addCatalogItem = () => {
    if (!selectedCatalogItem) {
      message.warning("Selecione um item do catálogo.");
      return;
    }

    const baseItem =
      catalogOrigin === "produto"
        ? mapProdutoToItem(produtos.find((produto) => String(produto.id) === String(selectedCatalogItem)))
        : mapServicoToItem(servicos.find((servico) => String(servico.id) === String(selectedCatalogItem)));

    if (!baseItem) {
      message.error("Item do catálogo não encontrado.");
      return;
    }

    setItems((current) => [...current, baseItem]);
    setCatalogModalOpen(false);
    setSelectedCatalogItem(null);
    message.success("Item adicionado ao orçamento.");
  };

  const saveQuickItem = async () => {
    try {
      const values = await quickItemForm.validateFields();
      setSalvandoItemRapido(true);

      if (quickItemType === "produto") {
        const response = await api.post("/estoque/produtos/", {
          nome: values.nome,
          descricao: values.descricao || "",
          unidade_medida: values.unidade_medida,
          preco_custo: Number(values.preco_custo || 0),
          preco_venda: Number(values.preco_venda || 0),
          estoque_minimo: Number(values.estoque_minimo || 0),
          localizacao: values.localizacao || "",
          ativo: true,
        });
        const novoProduto = response.data;
        setProdutos((current) => [novoProduto, ...current]);
        setItems((current) => [...current, mapProdutoToItem(novoProduto)]);
      } else {
        const response = await api.post("/estoque/servicos/", {
          nome: values.nome,
          descricao: values.descricao || "",
          categoria: values.categoria,
          unidade_medida: values.unidade_medida,
          preco_padrao: Number(values.preco_padrao || 0),
          tributacao: values.tributacao,
          codigo_lc116: values.codigo_lc116 || "",
          ativo: true,
        });
        const novoServico = response.data;
        setServicos((current) => [novoServico, ...current]);
        setItems((current) => [...current, mapServicoToItem(novoServico)]);
      }

      quickItemForm.resetFields();
      setQuickItemModalOpen(false);
      message.success("Item cadastrado e incluído no orçamento.");
    } catch {
      message.error("Não foi possível cadastrar o item.");
    } finally {
      setSalvandoItemRapido(false);
    }
  };

  const saveBudget = async (targetStatus) => {
    try {
      const values = await form.validateFields();
      if (!items.some((item) => item.descricao && Number(item.quantidade) > 0)) {
        message.warning("Adicione pelo menos um item válido ao orçamento.");
        return null;
      }

      const payload = createPayload(values, items, selectedClient, targetStatus, impostos);
      setSaving(targetStatus);

      let response;
      if (draftId) {
        response = await api.patch(`/ordens/${draftId}/`, payload);
      } else {
        response = await api.post("/ordens/", payload);
      }

      const record = response.data;
      setDraftId(record.id);
      message.success(
        targetStatus === "rascunho"
          ? "Orçamento salvo como rascunho."
          : targetStatus === "orcamento_enviado"
            ? "Orçamento enviado para o cliente."
            : "Orçamento salvo com sucesso."
      );
      return record;
    } catch {
      message.error("Não foi possível salvar o orçamento.");
      return null;
    } finally {
      setSaving("");
    }
  };

  const handleGeneratePdf = async () => {
    let currentId = draftId;

    if (!currentId) {
      const record = await saveBudget("rascunho");
      currentId = record?.id;
    }

    if (!currentId) return;

    try {
      const response = await api.post(`/ordens/${currentId}/gerar-pdf-orcamento/`, {}, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${budgetNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("PDF gerado e salvo com sucesso.");
    } catch {
      message.error("Não foi possível gerar o PDF do orçamento.");
    }
  };

  const handleOpenPrintPage = async () => {
    let currentId = draftId;
    if (!currentId) {
      const record = await saveBudget("rascunho");
      currentId = record?.id;
    }
    if (currentId) navigate(`/orcamentos/${currentId}/impressao`);
  };

  const startApproval = async () => {
    let record = draftId ? { id: draftId } : null;
    if (!record) record = await saveBudget("rascunho");
    if (!record?.id) return;

    setApprovePayload({
      id: record.id,
      tecnico_responsavel: null,
      data_agendada: dayjs().add(1, "day"),
    });
  };

  const confirmApproval = async () => {
    if (!approvePayload?.id) return;

    try {
      await api.patch(`/ordens/${approvePayload.id}/`, {
        tecnico_responsavel: approvePayload.tecnico_responsavel,
        data_agendada: approvePayload.data_agendada?.format("YYYY-MM-DD"),
      });

      const response = await api.post(`/ordens/${approvePayload.id}/mudar-status/`, {
        status: "aprovada",
      });

      const osId = response.data?.os_id || response.data?.ordem_servico_id || response.data?.id || approvePayload.id;
      message.success("Orçamento aprovado e encaminhado para Ordem de Serviço.");
      setApprovePayload(null);
      navigate(`/ordens/${osId}`);
    } catch {
      message.error("Não foi possível aprovar e gerar a OS.");
    }
  };

  const itemColumns = [
    {
      title: "Origem",
      key: "origem_tipo",
      width: 120,
      render: (_, item) => (
        <Tag color={item.origem_tipo === "servico" ? "blue" : item.origem_tipo === "produto" ? "gold" : "default"}>
          {item.origem_tipo === "servico" ? "Serviço" : item.origem_tipo === "produto" ? "Produto" : "Avulso"}
        </Tag>
      ),
    },
    {
      title: "Descrição",
      key: "descricao",
      render: (_, item) => (
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Input
            value={item.descricao}
            onChange={(event) => updateItem(item.key, "descricao", event.target.value)}
            placeholder="Descrição do item"
          />
          <Space size={8} wrap>
            <Input
              value={item.codigo_referencia}
              onChange={(event) => updateItem(item.key, "codigo_referencia", event.target.value)}
              placeholder="Código"
              style={{ width: 130 }}
            />
            <Select
              value={item.unidade_referencia || undefined}
              onChange={(value) => updateItem(item.key, "unidade_referencia", value)}
              options={[...productUnitOptions, ...serviceUnitOptions]}
              placeholder="Unidade"
              style={{ width: 130 }}
            />
          </Space>
        </Space>
      ),
    },
    {
      title: "Qtd",
      key: "quantidade",
      width: 100,
      render: (_, item) => (
        <InputNumber
          min={0}
          value={item.quantidade}
          onChange={(value) => updateItem(item.key, "quantidade", value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Valor Unit (R$)",
      key: "valor_unitario",
      width: 160,
      render: (_, item) => (
        <InputNumber
          min={0}
          step={0.01}
          value={item.valor_unitario}
          onChange={(value) => updateItem(item.key, "valor_unitario", value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Terceiro / custo interno",
      key: "terceiro",
      width: 280,
      render: (_, item) => (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Select
            allowClear
            showSearch
            value={item.terceiro || undefined}
            placeholder="Terceirizado"
            optionFilterProp="label"
            onChange={(value) => updateItem(item.key, "terceiro", value || null)}
            options={terceiros.map((terceiro) => ({
              value: terceiro.id,
              label: `${terceiro.nome_fantasia || terceiro.nome} ${terceiro.estado_base ? `- ${terceiro.estado_base}` : ""}`,
            }))}
          />
          <Space size={8} wrap>
            <InputNumber
              min={0}
              step={0.01}
              value={item.custo_terceiro}
              placeholder="Custo"
              onChange={(value) => updateItem(item.key, "custo_terceiro", value || 0)}
              style={{ width: 105 }}
            />
            <InputNumber
              min={0}
              step={1}
              addonAfter="%"
              value={item.markup_terceiro}
              placeholder="Markup"
              onChange={(value) => updateItem(item.key, "markup_terceiro", value || 0)}
              style={{ width: 105 }}
            />
            <Switch
              size="small"
              checked={Boolean(item.gerar_contas_pagar_terceiro)}
              onChange={(checked) => updateItem(item.key, "gerar_contas_pagar_terceiro", checked)}
            />
          </Space>
          {item.terceiro && (
            <Text style={{ fontSize: 12, color: "#6B7280" }}>
              Interno: {moneyFormatter.format(Number(item.custo_terceiro || 0))}. Cliente vê apenas seu valor.
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 140,
      render: (_, item) => (
        <Text strong>{moneyFormatter.format(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))}</Text>
      ),
    },
    {
      title: "",
      key: "remover",
      width: 60,
      render: (_, item) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(item.key)}
          disabled={items.length === 1}
        />
      ),
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={stickyHeaderStyle}>
        <div style={{ padding: "14px 32px", maxWidth: 1480, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
            <div>
              <Title level={1} style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#1E293B" }}>
                Orçamento técnico
              </Title>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <Text style={{ color: "#3B82F6", fontWeight: 700, fontSize: 14 }}>{budgetNumber}</Text>
                <Tag color="default" style={{ borderRadius: 999, paddingInline: 10, background: "#DDD6FE", color: "#7C3AED", borderColor: "#C4B5FD" }}>
                  Rascunho
                </Tag>
              </div>
            </div>

            <Space size={10} wrap>
              <div style={headerMetricStyle}>
                <Text style={{ color: "#64748B", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Total</Text>
                <div style={{ color: "#1E293B", fontSize: 18, fontWeight: 900 }}>
                  {moneyFormatter.format(totals.subtotal)}
                </div>
              </div>
              <div style={headerMetricStyle}>
                <Text style={{ color: "#64748B", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Serviços</Text>
                <div style={{ color: "#10B981", fontSize: 18, fontWeight: 900 }}>
                  {moneyFormatter.format(totals.valorServicos)}
                </div>
              </div>
            </Space>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <Button icon={<SaveOutlined />} onClick={() => saveBudget("rascunho")} loading={saving === "rascunho"} style={{ borderRadius: 8, background: "#F1F5F9", color: "#1E293B", borderColor: "#CBD5E1" }}>
                Salvar
              </Button>
              <Button icon={<EyeOutlined />} onClick={handleOpenPrintPage} style={{ borderRadius: 8, background: "#F1F5F9", color: "#1E293B", borderColor: "#CBD5E1" }}>
                Visualizar
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={handleGeneratePdf} style={{ borderRadius: 8, background: "#F1F5F9", color: "#1E293B", borderColor: "#CBD5E1" }}>
                PDF
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => saveBudget("orcamento_enviado")}
                loading={saving === "orcamento_enviado"}
                style={{ borderRadius: 8, background: "#3B82F6", borderColor: "#3B82F6" }}
              >
                Enviar
              </Button>
              {isAdmin ? (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={startApproval} style={{ borderRadius: 8, background: "#10B981", borderColor: "#10B981" }}>
                  Aprovar
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Space direction="vertical" size={14} style={{ width: "100%", maxWidth: 1480, margin: "0 auto", paddingInline: 16 }}>
          <Card bordered={false} style={{ ...panelStyle, background: "#FFFFFF", borderColor: "#E2E8F0" }} bodyStyle={{ padding: 14 }}>
            <Row gutter={[12, 12]} align="stretch">
              <Col xs={24} xl={8}>
                <div style={compactPanelStyle}>
                  <div style={compactPanelHeaderStyle}>
                    <Text strong style={{ color: "#1E293B", fontSize: 16 }}>Cliente</Text>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => setDrawerClienteAberto(true)} style={{ borderRadius: 8 }}>
                      Novo
                    </Button>
                  </div>
                  <Form.Item label="Cliente" name="cliente" rules={[{ required: true, message: "Selecione o cliente" }]} style={{ marginBottom: 10 }}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Selecione o cliente"
                      options={clients.map((cliente) => ({
                        label: `${cliente.nome_fantasia || cliente.nome}${cliente.cnpj_cpf ? ` - ${cliente.cnpj_cpf}` : ""}`,
                        value: cliente.id,
                      }))}
                    />
                  </Form.Item>
                  <Row gutter={[8, 8]}>
                    <Col xs={24} md={8}>
                      <div style={miniInfoStyle}>
                        <Text style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>CNPJ</Text>
                        <div style={{ color: "#1E293B", fontWeight: 700, marginTop: 3 }}>{selectedClient?.cnpj_cpf || "-"}</div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div style={miniInfoStyle}>
                        <Text style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>Telefone</Text>
                        <div style={{ color: "#1E293B", fontWeight: 700, marginTop: 3 }}>{selectedClient?.telefone || "-"}</div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div style={miniInfoStyle}>
                        <Text style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>Email</Text>
                        <div style={{ color: "#1E293B", fontWeight: 700, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis" }}>{selectedClient?.email || "-"}</div>
                      </div>
                    </Col>
                  </Row>
                  <Form.Item label="Contato responsável" name="contato_responsavel" style={{ marginTop: 10, marginBottom: 0 }}>
                    <Select
                      allowClear
                      placeholder="Selecione o contato"
                      options={(selectedClient?.contatos || []).map((contato) => ({
                        label: `${contato.nome}${contato.email ? ` - ${contato.email}` : ""}`,
                        value: contato.id,
                      }))}
                    />
                  </Form.Item>
                </div>
              </Col>

              <Col xs={24} xl={10}>
                <div style={compactPanelStyle}>
                  <div style={compactPanelHeaderStyle}>
                    <Text strong style={{ color: "#1E293B", fontSize: 16 }}>Escopo técnico</Text>
                    <Tag color="blue" style={{ margin: 0, borderRadius: 999 }}>Proposta</Tag>
                  </div>
                  <Row gutter={[10, 8]}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Tipo" name="tipo_servico" rules={[{ required: true, message: "Selecione o tipo" }]} style={{ marginBottom: 8 }}>
                        <Select options={serviceOptions} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Prioridade" name="prioridade" rules={[{ required: true, message: "Selecione a prioridade" }]} style={{ marginBottom: 8 }}>
                        <Select options={priorityOptions} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Validade" name="validade_orcamento" style={{ marginBottom: 8 }}>
                        <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Descrição do serviço" name="descricao_servico" rules={[{ required: true, message: "Descreva o serviço" }]} style={{ marginBottom: 8 }}>
                        <TextArea rows={3} placeholder="Escopo objetivo, etapas técnicas, local, ativo/equipamento e premissas de execução" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Observações e termos" name="observacoes" style={{ marginBottom: 0 }}>
                        <TextArea rows={2} placeholder="Condições comerciais, garantia, exclusões, acesso, prazo e premissas" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </Col>

              <Col xs={24} xl={6}>
                <div style={compactPanelStyle}>
                  <div style={compactPanelHeaderStyle}>
                    <Text strong style={{ color: "#1E293B", fontSize: 16 }}>Pedido de compra</Text>
                    <Form.Item name="tem_pedido_compra" valuePropName="checked" style={{ margin: 0 }}>
                      <Checkbox>Possui PC</Checkbox>
                    </Form.Item>
                  </div>
                  <Row gutter={[10, 8]}>
                    <Col xs={24}>
                      <Form.Item label="Número PC" name="numero_pc" style={{ marginBottom: 8 }}>
                        <Input disabled={!temPedidoCompra} placeholder="PC / PO" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={24}>
                      <Form.Item label="Valor autorizado" name="valor_autorizado_pc" style={{ marginBottom: 8 }}>
                        <InputNumber disabled={!temPedidoCompra} min={0} step={0.01} prefix="R$" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={24}>
                      <Form.Item label="Validade PC" name="validade_pc" style={{ marginBottom: 0 }}>
                        <DatePicker disabled={!temPedidoCompra} format="DD/MM/YYYY" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={{ ...panelStyle, background: "#FFFFFF", borderColor: "#E2E8F0" }} bodyStyle={{ padding: 18 }}>
            <div style={itemSectionHeaderStyle}>
              <div>
                <Title level={4} style={{ margin: 0, color: "#1E293B" }}>Construtor de itens</Title>
                <Text style={{ color: "#64748B" }}>
                  Inclua serviços, produtos, custos internos e itens avulsos em uma composição única.
                </Text>
              </div>
              <Space wrap>
                <Button icon={<ShoppingOutlined />} onClick={() => setCatalogModalOpen(true)} style={itemActionButtonStyle}>
                  Catálogo
                </Button>
                <Button icon={<ToolOutlined />} onClick={() => openQuickItemModal("servico")} style={itemActionButtonStyle}>
                  Novo serviço
                </Button>
                <Button icon={<ShoppingOutlined />} onClick={() => openQuickItemModal("produto")} style={itemActionButtonStyle}>
                  Novo produto
                </Button>
                <Button icon={<PlusOutlined />} onClick={addManualItem} style={{ ...itemActionButtonStyle, background: "#F8FAFC" }}>
                  Avulso
                </Button>
              </Space>
            </div>

            <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
              <Col xs={12} lg={6}>
                <div style={{ ...itemCardStyle, borderLeft: "4px solid #3B82F6", padding: 14 }}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Itens</Text>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", marginTop: 4 }}>{itemCounters.total}</div>
                </div>
              </Col>
              <Col xs={12} lg={6}>
                <div style={{ ...itemCardStyle, borderLeft: "4px solid #10B981", padding: 14 }}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Serviços</Text>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981", marginTop: 4 }}>{moneyFormatter.format(totals.valorServicos)}</div>
                </div>
              </Col>
              <Col xs={12} lg={6}>
                <div style={{ ...itemCardStyle, borderLeft: "4px solid #F59E0B", padding: 14 }}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Produtos</Text>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#F59E0B", marginTop: 4 }}>{moneyFormatter.format(totals.valorMateriais)}</div>
                </div>
              </Col>
              <Col xs={12} lg={6}>
                <div style={{ ...itemCardStyle, borderLeft: "4px solid #64748B", padding: 14 }}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Custos internos</Text>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#475569", marginTop: 4 }}>{moneyFormatter.format(totalTerceiros)}</div>
                </div>
              </Col>
            </Row>

            <Row gutter={[14, 14]} align="top">
              <Col xs={24} xl={18}>
                <Table
                  columns={itemColumns}
                  dataSource={items}
                  rowKey="key"
                  pagination={false}
                  scroll={{ x: 1160 }}
                  size="middle"
                />
              </Col>
              <Col xs={24} xl={6}>
                <div style={{ ...compactPanelStyle, background: "#F8FAFC" }}>
                  <Text strong style={{ color: "#1E293B", fontSize: 16 }}>Fechamento</Text>
                  <Divider style={{ margin: "12px 0" }} />
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <Text type="secondary">Serviços</Text>
                      <Text strong>{moneyFormatter.format(totals.valorServicos)}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <Text type="secondary">Produtos</Text>
                      <Text strong>{moneyFormatter.format(totals.valorMateriais)}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <Text type="secondary">Itens avulsos</Text>
                      <Text strong>{itemCounters.avulsos}</Text>
                    </div>
                    <Divider style={{ margin: "6px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <Text strong>Total do orçamento</Text>
                      <Text strong style={{ color: "#3B82F6", fontSize: 22 }}>
                        {moneyFormatter.format(totals.subtotal)}
                      </Text>
                    </div>
                  </Space>
                </div>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={{ ...panelStyle, background: "#FFFFFF", borderColor: "#E2E8F0" }} bodyStyle={{ padding: 16 }}>
            <Space wrap>
              <Button icon={<SaveOutlined />} onClick={() => saveBudget("rascunho")} loading={saving === "rascunho"} style={{ borderRadius: 8, background: "#F1F5F9", color: "#1E293B", borderColor: "#CBD5E1" }}>
                Salvar rascunho
              </Button>
              <Button icon={<EyeOutlined />} onClick={handleOpenPrintPage} style={{ borderRadius: 8, background: "#F1F5F9", color: "#1E293B", borderColor: "#CBD5E1" }}>
                Visualizar impressão
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={handleGeneratePdf} style={{ borderRadius: 8, background: "#F1F5F9", color: "#1E293B", borderColor: "#CBD5E1" }}>
                Gerar PDF
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => saveBudget("orcamento_enviado")}
                loading={saving === "orcamento_enviado"}
                style={{ borderRadius: 8, background: "#3B82F6", borderColor: "#3B82F6" }}
              >
                Enviar para cliente
              </Button>
              {isAdmin ? (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={startApproval} style={{ borderRadius: 8, background: "#10B981", borderColor: "#10B981" }}>
                  Aprovar e gerar OS
                </Button>
              ) : null}
            </Space>
          </Card>
        </Space>
      </Form>

      <Modal
        open={catalogModalOpen}
        title="Selecionar item do catálogo"
        okText="Adicionar item"
        cancelText="Cancelar"
        onOk={addCatalogItem}
        onCancel={() => {
          setCatalogModalOpen(false);
          setSelectedCatalogItem(null);
        }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Select value={catalogOrigin} onChange={setCatalogOrigin} options={itemOriginOptions.filter((option) => option.value !== "avulso")} />
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={catalogOrigin === "produto" ? "Selecione um produto" : "Selecione um serviço"}
            value={selectedCatalogItem}
            onChange={setSelectedCatalogItem}
            options={(catalogOrigin === "produto" ? produtos : servicos).map((item) => ({
              label: `${item.codigo || "-"} - ${item.nome}`,
              value: item.id,
            }))}
          />
        </Space>
      </Modal>

      <Modal
        open={quickItemModalOpen}
        title={null}
        okText="Salvar item"
        cancelText="Cancelar"
        onOk={saveQuickItem}
        confirmLoading={salvandoItemRapido}
        width={860}
        onCancel={() => {
          setQuickItemModalOpen(false);
          quickItemForm.resetFields();
        }}
        okButtonProps={{ style: { background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 8, fontWeight: 700 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
      >
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#1E293B" }}>
              Cadastro rápido de item
            </Title>
            <Text style={{ color: "#64748B" }}>
              O item será salvo no catálogo e já incluído neste orçamento.
            </Text>
          </div>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <button
                type="button"
                style={quickTypeCardStyle(quickItemType === "servico", "#3B82F6")}
                onClick={() => {
                  setQuickItemType("servico");
                  quickItemForm.resetFields();
                  quickItemForm.setFieldsValue({
                    unidade_medida: "uni",
                    categoria: form.getFieldValue("tipo_servico") || "manutencao",
                    tributacao: "iss",
                    preco_padrao: 0,
                  });
                }}
              >
                <Space align="start">
                  <ToolOutlined style={{ color: "#3B82F6", fontSize: 22, marginTop: 2 }} />
                  <div>
                    <Text strong style={{ color: "#1E293B" }}>Serviço</Text>
                    <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                      Mão de obra, diagnóstico, instalação, visita técnica ou execução.
                    </div>
                  </div>
                </Space>
              </button>
            </Col>
            <Col xs={24} md={12}>
              <button
                type="button"
                style={quickTypeCardStyle(quickItemType === "produto", "#F59E0B")}
                onClick={() => {
                  setQuickItemType("produto");
                  quickItemForm.resetFields();
                  quickItemForm.setFieldsValue({
                    unidade_medida: "un",
                    estoque_minimo: 0,
                    preco_custo: 0,
                    preco_venda: 0,
                  });
                }}
              >
                <Space align="start">
                  <ShoppingOutlined style={{ color: "#F59E0B", fontSize: 22, marginTop: 2 }} />
                  <div>
                    <Text strong style={{ color: "#1E293B" }}>Produto / material</Text>
                    <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                      Peças, insumos, materiais de aplicação e componentes vendidos.
                    </div>
                  </div>
                </Space>
              </button>
            </Col>
          </Row>

          <Form form={quickItemForm} layout="vertical">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <div style={quickModalSectionStyle}>
                    <Text strong style={{ display: "block", color: "#1E293B", marginBottom: 12 }}>
                      Identificação
                    </Text>
                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={16}>
                        <Form.Item name="nome" label="Nome do item" rules={[{ required: true, message: "Informe o nome" }]}>
                          <Input placeholder={quickItemType === "produto" ? "Ex.: Capacitor 35+5 uF" : "Ex.: Diagnóstico técnico de split"} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="unidade_medida"
                          label="Unidade"
                          rules={[{ required: true, message: "Selecione a unidade" }]}
                        >
                          <Select options={quickItemType === "produto" ? productUnitOptions : serviceUnitOptions} />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item name="descricao" label="Descrição técnica / comercial">
                          <TextArea
                            rows={4}
                            placeholder="Detalhe o que será entregue, aplicado ou executado. Esse texto ajuda o orçamento a ficar mais claro para o cliente."
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {quickItemType === "produto" ? (
                    <div style={quickModalSectionStyle}>
                      <Text strong style={{ display: "block", color: "#1E293B", marginBottom: 12 }}>
                        Produto, estoque e localização
                      </Text>
                      <Row gutter={[12, 0]}>
                        <Col xs={24} md={8}>
                          <Form.Item name="preco_custo" label="Preço de custo">
                            <InputNumber min={0} step={0.01} prefix="R$" style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item name="preco_venda" label="Preço de venda" rules={[{ required: true, message: "Informe o preço de venda" }]}>
                            <InputNumber min={0} step={0.01} prefix="R$" style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item name="estoque_minimo" label="Estoque mínimo">
                            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item name="localizacao" label="Localização no estoque">
                            <Input placeholder="Ex.: Prateleira A3, veículo técnico, almoxarifado central" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <div style={quickModalSectionStyle}>
                      <Text strong style={{ display: "block", color: "#1E293B", marginBottom: 12 }}>
                        Serviço e tributação
                      </Text>
                      <Row gutter={[12, 0]}>
                        <Col xs={24} md={8}>
                          <Form.Item name="categoria" label="Categoria" rules={[{ required: true, message: "Selecione a categoria" }]}>
                            <Select options={serviceOptions} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item name="preco_padrao" label="Preço padrão" rules={[{ required: true, message: "Informe o preço" }]}>
                            <InputNumber min={0} step={0.01} prefix="R$" style={{ width: "100%" }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item name="tributacao" label="Tributação" rules={[{ required: true, message: "Selecione a tributação" }]}>
                            <Select options={tributacaoOptions} />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item name="codigo_lc116" label="Código LC 116">
                            <Input placeholder="Ex.: 14.01, 7.02, 17.01" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  )}
                </Space>
              </Col>

              <Col xs={24} lg={8}>
                <div style={{ ...quickModalSectionStyle, background: "#F8FAFC", height: "100%" }}>
                  <Text strong style={{ display: "block", color: "#1E293B", marginBottom: 12 }}>
                    Prévia do item
                  </Text>
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <div style={itemCardStyle}>
                      <Text type="secondary">Tipo</Text>
                      <div style={{ fontWeight: 900, color: quickItemType === "produto" ? "#B45309" : "#1D4ED8", marginTop: 4 }}>
                        {quickItemType === "produto" ? "Produto / material" : "Serviço"}
                      </div>
                    </div>
                    <div style={itemCardStyle}>
                      <Text type="secondary">Preço que entra no orçamento</Text>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", marginTop: 4 }}>
                        {moneyFormatter.format(quickPreviewPrice)}
                      </div>
                    </div>
                    {quickItemType === "produto" ? (
                      <div style={itemCardStyle}>
                        <Text type="secondary">Margem estimada</Text>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#10B981", marginTop: 4 }}>
                          {quickPreviewMargin === null ? "0%" : `${quickPreviewMargin.toFixed(1)}%`}
                        </div>
                      </div>
                    ) : (
                      <div style={itemCardStyle}>
                        <Text type="secondary">Uso recomendado</Text>
                        <div style={{ color: "#475569", marginTop: 4 }}>
                          Diagnóstico, visita, manutenção, instalação ou execução técnica.
                        </div>
                      </div>
                    )}
                  </Space>
                </div>
              </Col>
            </Row>
          </Form>
        </Space>
      </Modal>

      <Drawer title="Novo Cliente" placement="right" onClose={() => setDrawerClienteAberto(false)} open={drawerClienteAberto} width={520} bodyStyle={{ background: "#F8FAFC" }} headerStyle={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Card style={{ background: "#EBF2FB", border: "1px solid #BFDBFE", borderRadius: 8 }} bodyStyle={{ padding: 16 }}>
            <Text strong style={{ display: "block", marginBottom: 12 }}>CNPJ da empresa</Text>
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col flex={1}>
                <Input placeholder="XX.XXX.XXX/XXXX-XX" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} maxLength={18} />
              </Col>
              <Col>
                <Button type="primary" onClick={consultarCNPJ} loading={consultandoCNPJ} style={btnPrimaryStyle}>
                  Consultar
                </Button>
              </Col>
            </Row>
            {cnpjValido ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircleOutlined style={{ color: "#22c55e" }} />
                <span style={{ color: "#22c55e" }}>CNPJ válido — dados preenchidos automaticamente</span>
              </div>
            ) : null}
            {cnpjErro ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CloseCircleOutlined style={{ color: "#ef4444" }} />
                <span style={{ color: "#ef4444" }}>CNPJ não encontrado</span>
              </div>
            ) : null}
          </Card>

          <Form layout="vertical">
            <Form.Item label="Razão social">
              <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={14}>
                <Form.Item label="Município">
                  <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item label="UF">
                  <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} maxLength={2} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Nome Fantasia">
              <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
            </Form.Item>
            <Form.Item label="Segmento">
              <Select value={segmento || undefined} onChange={setSegmento} options={segmentOptions} allowClear />
            </Form.Item>
            <Form.Item label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </Form.Item>
            <Form.Item label="Telefone">
              <Input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} />
            </Form.Item>
            <Form.Item label="WhatsApp">
              <Input value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} />
            </Form.Item>
            <Row gutter={12}>
              <Col flex={1}>
                <Form.Item label="CEP">
                  <Input value={cep} onChange={(e) => setCep(maskCEP(e.target.value))} />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label=" ">
                  <Button onClick={() => consultarCEP(cep)}>Buscar CEP</Button>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Logradouro">
              <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item label="Número">
                  <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Complemento">
                  <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Bairro">
              <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} sm={16}>
                <Form.Item label="Cidade">
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="UF">
                  <Input value={ufEndereco} onChange={(e) => setUfEndereco(e.target.value.toUpperCase())} maxLength={2} />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid #e8e8e8", paddingTop: 16 }}>
            <Button onClick={() => setDrawerClienteAberto(false)}>Cancelar</Button>
            <Button type="primary" onClick={salvarCliente} loading={salvandoCliente} style={btnPrimaryStyle}>
              Salvar cliente
            </Button>
          </div>
        </Space>
      </Drawer>

      <Modal
        open={Boolean(approvePayload)}
        title="Deseja aprovar e criar a Ordem de Serviço agora?"
        okText="Sim, aprovar"
        cancelText="Cancelar"
        onOk={confirmApproval}
        onCancel={() => setApprovePayload(null)}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="Aprovação interna"
            description="Defina o responsável e a primeira data agendada antes de seguir para a OS."
            style={{ borderRadius: 10 }}
          />
          <Select
            allowClear
            placeholder="Técnico responsável"
            value={approvePayload?.tecnico_responsavel ?? undefined}
            onChange={(value) => setApprovePayload((current) => ({ ...current, tecnico_responsavel: value }))}
            options={technicians}
          />
          <DatePicker
            format="DD/MM/YYYY"
            value={approvePayload?.data_agendada || null}
            onChange={(value) => setApprovePayload((current) => ({ ...current, data_agendada: value }))}
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>
    </div>
  );
}
