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
import FiscalIntelligenceAlert from "./components/FiscalIntelligenceAlert";
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
  background: "linear-gradient(135deg, #0F172A 0%, #1A2744 60%, #0F172A 100%)",
  paddingBottom: 12,
  marginBottom: 20,
  borderBottom: "1px solid #1E293B",
};

const itemCardStyle = {
  border: "1px solid #1E293B",
  borderRadius: 12,
  padding: 16,
  background: "#0F172A",
  color: "#E2E8F0",
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

  const selectedClient = useMemo(
    () => clients.find((cliente) => String(cliente.id) === String(selectedClientId)),
    [clients, selectedClientId]
  );

  const totals = useMemo(() => calcItemsTotals(items), [items]);
  const totalTerceiros = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.custo_terceiro || 0), 0),
    [items]
  );

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
        <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 24, alignItems: "center" }}>
            <div>
              <Title level={1} style={{ fontSize: 28, fontWeight: 900, margin: 0, color: "#FFFFFF" }}>
                Novo Orçamento
              </Title>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <Text style={{ color: "#93C5FD", fontWeight: 700, fontSize: 14 }}>{budgetNumber}</Text>
                <Tag color="default" style={{ borderRadius: 999, paddingInline: 10, background: "rgba(139, 92, 246, 0.2)", color: "#C4B5FD", borderColor: "#8B5CF6" }}>
                  Rascunho
                </Tag>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>
              <Button icon={<SaveOutlined />} onClick={() => saveBudget("rascunho")} loading={saving === "rascunho"} style={{ borderRadius: 8, background: "#1E293B", color: "#E2E8F0", borderColor: "#334155" }}>
                Salvar rascunho
              </Button>
              <Button icon={<EyeOutlined />} onClick={handleOpenPrintPage} style={{ borderRadius: 8, background: "#1E293B", color: "#E2E8F0", borderColor: "#334155" }}>
                Visualizar
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={handleGeneratePdf} style={{ borderRadius: 8, background: "#1E293B", color: "#E2E8F0", borderColor: "#334155" }}>
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
        <Space direction="vertical" size={16} style={{ width: "100%", maxWidth: 1400, margin: "0 auto", paddingInline: 16 }}>
          <Card bordered={false} style={{ ...panelStyle, background: "#111827", borderColor: "#1E293B" }} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0, color: "#FFFFFF" }}>Cliente</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Form.Item label="Cliente" name="cliente" rules={[{ required: true, message: "Selecione o cliente" }]}>
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
              </Col>
              <Col xs={24} lg={10} style={{ display: "flex", alignItems: "end" }}>
                <Button icon={<PlusOutlined />} onClick={() => setDrawerClienteAberto(true)} style={btnPrimaryStyle}>
                  Novo cliente
                </Button>
              </Col>
              <Col xs={24} md={8}>
                <Text strong>CNPJ</Text>
                <div style={{ color: "#6B7280", marginTop: 4 }}>{selectedClient?.cnpj_cpf || "-"}</div>
              </Col>
              <Col xs={24} md={8}>
                <Text strong>Telefone</Text>
                <div style={{ color: "#6B7280", marginTop: 4 }}>{selectedClient?.telefone || "-"}</div>
              </Col>
              <Col xs={24} md={8}>
                <Text strong>Email</Text>
                <div style={{ color: "#6B7280", marginTop: 4 }}>{selectedClient?.email || "-"}</div>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item label="Contato responsável" name="contato_responsavel">
                  <Select
                    allowClear
                    placeholder="Selecione o contato"
                    options={(selectedClient?.contatos || []).map((contato) => ({
                      label: `${contato.nome}${contato.email ? ` - ${contato.email}` : ""}`,
                      value: contato.id,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={{ ...panelStyle, background: "#111827", borderColor: "#1E293B" }} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0, color: "#FFFFFF" }}>Pedido de compra do cliente</Title>
            <Form.Item name="tem_pedido_compra" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>Cliente possui PC?</Checkbox>
            </Form.Item>

            {temPedidoCompra ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Form.Item label="Número PC" name="numero_pc">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Valor autorizado" name="valor_autorizado_pc">
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Validade" name="validade_pc">
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            ) : null}
          </Card>

          <Card bordered={false} style={{ ...panelStyle, background: "#111827", borderColor: "#1E293B" }} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0, color: "#FFFFFF" }}>Serviço</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form.Item label="Tipo de serviço" name="tipo_servico" rules={[{ required: true, message: "Selecione o tipo" }]}>
                  <Select options={serviceOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Prioridade" name="prioridade" rules={[{ required: true, message: "Selecione a prioridade" }]}>
                  <Select options={priorityOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Validade do orçamento" name="validade_orcamento">
                  <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Descrição do serviço" name="descricao_servico" rules={[{ required: true, message: "Descreva o serviço" }]}>
                  <TextArea rows={4} placeholder="Descreva o escopo do atendimento e o que será executado" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Observações e termos" name="observacoes">
                  <TextArea rows={4} placeholder="Condições adicionais, premissas e termos comerciais" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={{ ...panelStyle, background: "#111827", borderColor: "#1E293B" }} bodyStyle={{ padding: 20 }}>
            <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 16 }} wrap>
              <Title level={4} style={{ margin: 0, color: "#FFFFFF" }}>Itens do orçamento</Title>
              <Space wrap>
                <Button icon={<ShoppingOutlined />} onClick={() => setCatalogModalOpen(true)}>
                  Selecionar do catálogo
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => setQuickItemModalOpen(true)}>
                  Cadastrar item
                </Button>
                <Button icon={<ToolOutlined />} onClick={addManualItem}>
                  Item avulso
                </Button>
              </Space>
            </Space>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={24} lg={6}>
                <div style={{...itemCardStyle, borderLeft: "4px solid #10B981"}}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Subtotal serviços</Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#10B981", marginTop: 8 }}>
                    {moneyFormatter.format(totals.valorServicos)}
                  </div>
                </div>
              </Col>
              <Col xs={24} lg={6}>
                <div style={{...itemCardStyle, borderLeft: "4px solid #F59E0B"}}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Subtotal produtos</Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#F59E0B", marginTop: 8 }}>
                    {moneyFormatter.format(totals.valorMateriais)}
                  </div>
                </div>
              </Col>
              <Col xs={24} lg={6}>
                <div style={{...itemCardStyle, borderLeft: "4px solid #D97706"}}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Custo terceiros</Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#D97706", marginTop: 8 }}>
                    {moneyFormatter.format(totalTerceiros)}
                  </div>
                </div>
              </Col>
              <Col xs={24} lg={6}>
                <div style={{...itemCardStyle, borderLeft: "4px solid #3B82F6"}}>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>Total com impostos</Text>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#3B82F6", marginTop: 8 }}>
                    {moneyFormatter.format(Number(impostos?.total_geral || totals.subtotal || 0))}
                  </div>
                </div>
              </Col>
            </Row>

            <Table columns={itemColumns} dataSource={items} rowKey="key" pagination={false} />

            <Divider />

            <Alert
              type="info"
              showIcon
              style={{ borderRadius: 12 }}
              message="Descrição dos impostos pagos"
              description={
                calculandoImpostos ? (
                  "Calculando composição tributária..."
                ) : impostos ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span>Regime: <strong>{String(impostos.regime || "-").replaceAll("_", " ")}</strong></span>
                    <span>
                      ISS {moneyFormatter.format(impostos.iss || 0)} | PIS {moneyFormatter.format(impostos.pis || 0)} | COFINS {moneyFormatter.format(impostos.cofins || 0)} | IRPJ {moneyFormatter.format(impostos.irpj || 0)} | CSLL {moneyFormatter.format(impostos.csll || 0)}
                    </span>
                    <span>Total estimado de impostos pagos: <strong>{moneyFormatter.format(impostos.total_impostos || 0)}</strong></span>
                    {impostos.observacao ? <span>{impostos.observacao}</span> : null}
                  </div>
                ) : (
                  "Não foi possível calcular os impostos agora."
                )
              }
            />
            <FiscalIntelligenceAlert impostos={impostos} />
          </Card>

          <Card bordered={false} style={{ ...panelStyle, background: "#111827", borderColor: "#1E293B" }} bodyStyle={{ padding: 16 }}>
            <Space wrap>
              <Button icon={<SaveOutlined />} onClick={() => saveBudget("rascunho")} loading={saving === "rascunho"} style={{ borderRadius: 8, background: "#1E293B", color: "#E2E8F0", borderColor: "#334155" }}>
                Salvar rascunho
              </Button>
              <Button icon={<EyeOutlined />} onClick={handleOpenPrintPage} style={{ borderRadius: 8, background: "#1E293B", color: "#E2E8F0", borderColor: "#334155" }}>
                Visualizar impressão
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={handleGeneratePdf} style={{ borderRadius: 8, background: "#1E293B", color: "#E2E8F0", borderColor: "#334155" }}>
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
        title="Cadastrar item na página do orçamento"
        okText="Salvar item"
        cancelText="Cancelar"
        onOk={saveQuickItem}
        confirmLoading={salvandoItemRapido}
        onCancel={() => {
          setQuickItemModalOpen(false);
          quickItemForm.resetFields();
        }}
      >
        <Form form={quickItemForm} layout="vertical">
          <Form.Item label="Tipo do item" style={{ marginBottom: 12 }}>
            <Select
              value={quickItemType}
              onChange={(value) => {
                setQuickItemType(value);
                quickItemForm.resetFields();
              }}
              options={itemOriginOptions.filter((option) => option.value !== "avulso")}
            />
          </Form.Item>
          <Row gutter={[12, 0]}>
            <Col xs={24} md={16}>
              <Form.Item name="nome" label="Nome" rules={[{ required: true, message: "Informe o nome" }]}>
                <Input />
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
              <Form.Item name="descricao" label="Descrição">
                <TextArea rows={3} />
              </Form.Item>
            </Col>
            {quickItemType === "produto" ? (
              <>
                <Col xs={24} md={8}>
                  <Form.Item name="preco_custo" label="Preço de custo">
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="preco_venda" label="Preço de venda" rules={[{ required: true, message: "Informe o preço de venda" }]}>
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="estoque_minimo" label="Estoque mínimo">
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="localizacao" label="Localização">
                    <Input />
                  </Form.Item>
                </Col>
              </>
            ) : (
              <>
                <Col xs={24} md={8}>
                  <Form.Item name="categoria" label="Categoria" rules={[{ required: true, message: "Selecione a categoria" }]}>
                    <Select options={serviceOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="preco_padrao" label="Preço padrão" rules={[{ required: true, message: "Informe o preço" }]}>
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="tributacao" label="Tributação" rules={[{ required: true, message: "Selecione a tributação" }]}>
                    <Select options={tributacaoOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="codigo_lc116" label="Código LC 116">
                    <Input />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
        </Form>
      </Modal>

      <Drawer title="Novo Cliente" placement="right" onClose={() => setDrawerClienteAberto(false)} open={drawerClienteAberto} width={520} bodyStyle={{ background: "#0F172A" }} headerStyle={{ background: "#111827", borderColor: "#1E293B" }}>
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
