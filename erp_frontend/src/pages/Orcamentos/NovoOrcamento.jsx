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
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";

const { Text, Title } = Typography;
const { TextArea } = Input;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: 24,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const stickyHeaderStyle = {
  position: "sticky",
  top: 0,
  zIndex: 12,
  background: "#F4F6F9",
  paddingBottom: 12,
  marginBottom: 20,
};

const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const serviceOptions = [
  { label: "HVAC", value: "hvac" },
  { label: "Refrigeração", value: "refrigeracao" },
  { label: "Elétrica", value: "eletrica" },
  { label: "Civil", value: "civil" },
  { label: "Preventiva", value: "manutencao" },
  { label: "Instalação", value: "instalacao" },
];

const priorityOptions = [
  { label: "Normal", value: "media" },
  { label: "Urgente", value: "alta" },
  { label: "Emergência", value: "urgente" },
];

const paymentOptions = [
  { label: "À vista/Pix", value: "pix" },
  { label: "30 dias", value: "30_dias" },
  { label: "30/60 dias", value: "30_60_dias" },
  { label: "30/60/90 dias", value: "30_60_90_dias" },
  { label: "Boleto", value: "boleto" },
  { label: "Cartão", value: "cartao" },
];

const segmentOptions = [
  { label: "Indústria", value: "industria" },
  { label: "Comércio", value: "comercio" },
  { label: "Residencial", value: "residencial" },
  { label: "Condomínio", value: "condominio" },
  { label: "Serviços", value: "servicos" },
  { label: "Governo", value: "governo" },
];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const maskCNPJ = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

const maskPhone = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
};

const maskCEP = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 9);
};

const btnStyle = {
  background: '#1B4F8A',
  borderColor: '#1B4F8A',
  color: '#ffffff',
  fontWeight: 500,
  height: '38px',
  borderRadius: '8px',
};

function emptyItem(index) {
  return {
    key: `item-${Date.now()}-${index}`,
    descricao: "",
    quantidade: 1,
    valor_unitario: 0,
  };
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function buildBudgetNumber(sequence = 1) {
  return `ORC-${dayjs().year()}-${String(sequence).padStart(4, "0")}`;
}

function createPayload(values, items, selectedClient, budgetStatus) {
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
    endereco_servico_texto: values.endereco_servico || "",
    observacoes_tecnicas: values.observacoes || "",
    aprovado_por: budgetStatus === "aprovada" ? "Aprovação interna" : "",
    data_aprovacao: budgetStatus === "aprovada" ? dayjs().toISOString() : null,
    valor_total_orcado: Number(values.total_geral || 0),
    itens: items.map((item, index) => ({
      descricao: item.descricao || `Item ${index + 1}`,
      quantidade: Number(item.quantidade || 0),
      valor_unitario: Number(item.valor_unitario || 0),
      ordem: index,
    })),
    cliente_nome: selectedClient?.nome,
  };
}

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [draftId, setDraftId] = useState(null);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [drawerClienteAberto, setDrawerClienteAberto] = useState(false);
  const [items, setItems] = useState([emptyItem(0)]);
  const [budgetNumber, setBudgetNumber] = useState(buildBudgetNumber(1));
  const [approvePayload, setApprovePayload] = useState(null);

  // States do Drawer de Cliente
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
  const [salvando, setSalvando] = useState(false);

  const isAdmin = ["admin", "gestor"].includes(String(user?.role || "").toLowerCase());

  const selectedClientId = Form.useWatch("cliente", form);
  const selectedClient = useMemo(
    () => clients.find((cliente) => String(cliente.id) === String(selectedClientId)),
    [clients, selectedClientId]
  );

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (accumulator, item) => accumulator + Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
      0
    );
    const discountType = form.getFieldValue("tipo_desconto") || "valor";
    const discountValue = Number(form.getFieldValue("desconto") || 0);
    const discountAmount = discountType === "percentual" ? subtotal * (discountValue / 100) : discountValue;
    const total = Math.max(subtotal - discountAmount, 0);
    return { subtotal, discountAmount, total };
  }, [form, items]);

  useEffect(() => {
    form.setFieldsValue({
      validade_orcamento: dayjs().add(30, "day"),
      prioridade: "media",
      tipo_desconto: "valor",
      desconto: 0,
      total_geral: 0,
    });
  }, [form]);

  useEffect(() => {
    form.setFieldsValue({
      subtotal: totals.subtotal,
      valor_desconto: totals.discountAmount,
      total_geral: totals.total,
    });
  }, [form, totals]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        setLoading(true);
        const [clientsResponse, budgetsResponse] = await Promise.all([
          api.get("/clientes/"),
          api.get("/ordens/"),
        ]);

        if (!isMounted) return;

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
        if (user?.id && user?.nome_completo) {
          technicianMap.set(String(user.id), {
            label: user.nome_completo,
            value: user.id,
          });
        }

        setClients(clientRows);
        setTechnicians(Array.from(technicianMap.values()));
        setBudgetNumber(buildBudgetNumber(budgetRows.length + 1));
      } catch {
        if (isMounted) message.warning("Não foi possível carregar os dados iniciais do orçamento.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.nome_completo]);

  const consultarCNPJ = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
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

      setRazaoSocial(data.razao_social || "");
      setMunicipio(data.municipio || "");
      setUf(data.uf || "");
      setNomeFantasia(data.razao_social || "");
      setCnpjValido(true);
      setCnpjErro(false);
      message.success("CNPJ consultado com sucesso!");
    } catch (error) {
      setCnpjValido(false);
      setCnpjErro(true);
      message.error("CNPJ não encontrado na Receita Federal");
    } finally {
      setConsultandoCNPJ(false);
    }
  };

  const consultarCEP = async (cepValue) => {
    const cepLimpo = cepValue.replace(/\D/g, '');
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
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (!nomeFantasia || !cnpjLimpo || cnpjLimpo.length !== 14) {
      message.error("Preenchimento obrigatório: CNPJ e Nome Fantasia");
      return;
    }

    setSalvando(true);
    try {
      const response = await api.post("/clientes/", {
        nome_fantasia: nomeFantasia,
        razao_social: razaoSocial,
        cnpj_cpf: cnpjLimpo,
        segmento: segmento || null,
        email: email || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        uf: ufEndereco || null,
        status: "ativo",
      });

      const novoCliente = response.data;
      setClients((current) => [novoCliente, ...current]);
      form.setFieldValue("cliente", novoCliente.id);

      // Reset do drawer
      setCnpj("");
      setRazaoSocial("");
      setMunicipio("");
      setUf("");
      setNomeFantasia("");
      setSegmento("");
      setEmail("");
      setTelefone("");
      setWhatsapp("");
      setCep("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setUfEndereco("");
      setCnpjValido(false);
      setCnpjErro(false);

      setDrawerClienteAberto(false);
      message.success("Cliente cadastrado com sucesso!");
    } catch (error) {
      message.error("Erro ao salvar cliente");
    } finally {
      setSalvando(false);
    }
  };

  const addItem = () => {
    setItems((current) => [...current, emptyItem(current.length)]);
  };

  const updateItem = (key, field, value) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };

  const removeItem = (key) => {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current));
  };

  const saveBudget = async (targetStatus) => {
    try {
      const values = await form.validateFields();
      if (!items.some((item) => item.descricao && Number(item.quantidade) > 0)) {
        message.warning("Adicione pelo menos um item válido ao orçamento.");
        return null;
      }

      const payload = createPayload(values, items, selectedClient, targetStatus);
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
      message.success("PDF gerado com sucesso.");
    } catch {
      message.error("Não foi possível gerar o PDF do orçamento.");
    }
  };

  const startApproval = async () => {
    let record = draftId ? { id: draftId } : null;
    if (!record) {
      record = await saveBudget("rascunho");
    }
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
      title: "Descrição",
      key: "descricao",
      render: (_, item) => (
        <Input
          value={item.descricao}
          onChange={(event) => updateItem(item.key, "descricao", event.target.value)}
          placeholder="Descrição do item"
        />
      ),
    },
    {
      title: "Qtd",
      key: "quantidade",
      width: 110,
      render: (_, item) => (
        <InputNumber min={0} value={item.quantidade} onChange={(value) => updateItem(item.key, "quantidade", value)} style={{ width: "100%" }} />
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
      title: "Total",
      key: "total",
      width: 150,
      render: (_, item) => (
        <Text strong>{moneyFormatter.format(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))}</Text>
      ),
    },
    {
      title: "",
      key: "remover",
      width: 60,
      align: "center",
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
        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
            }}
          >
            <Space direction="vertical" size={2}>
              <Title level={1} style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
                Novo Orçamento
              </Title>
              <Space size={10} wrap>
                <Text style={{ color: "#6B7280", fontWeight: 600 }}>{budgetNumber}</Text>
                <Tag color="default" style={{ borderRadius: 999, paddingInline: 10 }}>
                  Rascunho
                </Tag>
              </Space>
            </Space>

            <Space wrap>
              <Button icon={<SaveOutlined />} onClick={() => saveBudget("rascunho")} loading={saving === "rascunho"}>
                Salvar rascunho
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => saveBudget("orcamento_enviado")}
                loading={saving === "orcamento_enviado"}
                style={btnStyle}
              >
                Enviar para cliente
              </Button>
              {isAdmin ? (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={startApproval}
                  style={{ background: "#15803D", borderColor: "#15803D" }}
                >
                  Aprovar direto
                </Button>
              ) : null}
            </Space>
          </div>
        </Card>
      </div>

      <Form form={form} layout="vertical">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Cliente
            </Title>
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
                <Button icon={<PlusOutlined />} onClick={() => setDrawerClienteAberto(true)} style={btnStyle}>
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

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Pedido de compra do cliente
            </Title>
            <Form.Item name="tem_pedido_compra" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>Cliente possui PC?</Checkbox>
            </Form.Item>

            {Form.useWatch("tem_pedido_compra", form) ? (
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

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Serviço
            </Title>
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
                <Form.Item label="Endereço do serviço" name="endereco_servico">
                  <Input placeholder="Rua, número, bairro e cidade" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Descrição do serviço" name="descricao_servico" rules={[{ required: true, message: "Descreva o serviço" }]}>
                  <TextArea rows={4} placeholder="Descreva o escopo do atendimento e o que será executado" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                Itens do orçamento
              </Title>
              <Button icon={<PlusOutlined />} onClick={addItem}>
                Adicionar item
              </Button>
            </Space>

            <Table columns={itemColumns} dataSource={items} rowKey="key" pagination={false} />

            <Divider />

            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form.Item label="Desconto" name="desconto">
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Tipo de desconto" name="tipo_desconto">
                  <Select
                    options={[
                      { label: "R$", value: "valor" },
                      { label: "%", value: "percentual" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Alert
                  type="info"
                  showIcon
                  message="Subtotal"
                  description={moneyFormatter.format(totals.subtotal)}
                  style={{ borderRadius: 10 }}
                />
              </Col>
            </Row>

            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
                padding: 16,
                borderRadius: 12,
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
              }}
            >
              <Text style={{ color: "#1E40AF", fontSize: 16, fontWeight: 700 }}>Total geral</Text>
              <Text style={{ color: "#1B4F8A", fontSize: 28, fontWeight: 800 }}>
                {moneyFormatter.format(totals.total)}
              </Text>
            </div>
          </Card>

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Condições
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form.Item label="Condição de pagamento" name="condicao_pagamento">
                  <Select options={paymentOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Validade do orçamento" name="validade_orcamento">
                  <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Observações e termos" name="observacoes">
                  <TextArea rows={4} placeholder="Condições adicionais, premissas e termos comerciais" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Space>
      </Form>

      <Card bordered={false} style={{ ...panelStyle, marginTop: 16 }} bodyStyle={{ padding: 16 }}>
        <Space wrap>
          <Button icon={<SaveOutlined />} onClick={() => saveBudget("rascunho")} loading={saving === "rascunho"}>
            Salvar rascunho
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handleGeneratePdf}>
            Gerar PDF
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => saveBudget("orcamento_enviado")}
            loading={saving === "orcamento_enviado"}
            style={btnStyle}
          >
            Enviar para cliente
          </Button>
          {isAdmin ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={startApproval}
              style={{ background: "#15803D", borderColor: "#15803D" }}
            >
              Aprovar e gerar OS
            </Button>
          ) : null}
        </Space>
      </Card>

      {/* DRAWER: Novo Cliente Completo */}
      <Drawer
        title="Novo Cliente"
        placement="right"
        onClose={() => setDrawerClienteAberto(false)}
        open={drawerClienteAberto}
        width={520}
      >
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          {/* SEÇÃO 1: Consulta CNPJ */}
          <Card
            style={{
              background: "#EBF2FB",
              border: "1px solid #BFDBFE",
              borderRadius: 8,
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Text strong style={{ display: "block", marginBottom: 12 }}>
              CNPJ da empresa
            </Text>

            {consultandoCNPJ ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Spin tip="Consultando Receita Federal..." />
              </div>
            ) : (
              <>
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col flex={1}>
                    <Input
                      placeholder="XX.XXX.XXX/XXXX-XX"
                      value={cnpj}
                      onChange={(e) => {
                        const masked = maskCNPJ(e.target.value);
                        setCnpj(masked);
                      }}
                      maxLength={18}
                    />
                  </Col>
                  <Col>
                    <Button
                      type="primary"
                      onClick={consultarCNPJ}
                      style={btnStyle}
                    >
                      Consultar
                    </Button>
                  </Col>
                </Row>

                {cnpjValido && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircleOutlined style={{ color: "#22c55e", fontSize: 16 }} />
                    <span style={{ color: "#22c55e" }}>CNPJ válido — dados preenchidos automaticamente</span>
                  </div>
                )}

                {cnpjErro && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CloseCircleOutlined style={{ color: "#ef4444", fontSize: 16 }} />
                    <span style={{ color: "#ef4444" }}>CNPJ não encontrado</span>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* SEÇÃO 2: Dados da Receita (Readonly) */}
          <div>
            <Text strong style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 12 }}>
              DADOS DA RECEITA FEDERAL
            </Text>

            <Form.Item label="Razão social" style={{ marginBottom: 12 }}>
              <Input
                value={razaoSocial}
                disabled
                style={{ background: "#F4F6F9", color: "#5A6070" }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Dado oficial — não editável
              </Text>
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={14}>
                <Form.Item label="Município" style={{ marginBottom: 12 }}>
                  <Input
                    value={municipio}
                    disabled
                    style={{ background: "#F4F6F9", color: "#5A6070" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item label="UF" style={{ marginBottom: 12 }}>
                  <Input
                    value={uf}
                    disabled
                    style={{ background: "#F4F6F9", color: "#5A6070" }}
                    maxLength={2}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* SEÇÃO 3: Identificação no Sistema */}
          <div>
            <Text strong style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 12 }}>
              IDENTIFICAÇÃO NO SISTEMA
            </Text>

            <Form.Item label={<span>Nome Fantasia <span style={{ color: "red" }}>*</span></span>} style={{ marginBottom: 12 }}>
              <Input
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                placeholder="Como aparecerá nos orçamentos e OS"
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Para grupos com várias lojas use nomes distintos: XYZ Copacabana, XYZ Barra, XYZ Centro
              </Text>
            </Form.Item>

            <Form.Item label="Segmento" style={{ marginBottom: 12 }}>
              <Select
                value={segmento || undefined}
                onChange={setSegmento}
                placeholder="Selecione o segmento"
                options={segmentOptions}
                allowClear
              />
            </Form.Item>
          </div>

          {/* SEÇÃO 4: Contato */}
          <div>
            <Text strong style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 12 }}>
              CONTATO
            </Text>

            <Form.Item label="Email" style={{ marginBottom: 12 }}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
              />
            </Form.Item>

            <Form.Item label="Telefone" style={{ marginBottom: 12 }}>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                placeholder="(XX) XXXXX-XXXX"
                maxLength={15}
              />
            </Form.Item>

            <Form.Item label="WhatsApp" style={{ marginBottom: 12 }}>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                placeholder="(XX) XXXXX-XXXX"
                maxLength={15}
              />
            </Form.Item>
          </div>

          {/* SEÇÃO 5: Endereço */}
          <div>
            <Text strong style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 12 }}>
              ENDEREÇO
            </Text>

            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col flex={1}>
                <Form.Item label="CEP">
                  <Input
                    value={cep}
                    onChange={(e) => setCep(maskCEP(e.target.value))}
                    placeholder="XXXXX-XXX"
                    maxLength={9}
                  />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label=" ">
                  <Button
                    onClick={() => consultarCEP(cep)}
                    disabled={cep.replace(/\D/g, '').length !== 8}
                  >
                    Buscar CEP
                  </Button>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Logradouro" style={{ marginBottom: 12 }}>
              <Input
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </Form.Item>

            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item label="Número" style={{ marginBottom: 12 }}>
                  <Input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Complemento" style={{ marginBottom: 12 }}>
                  <Input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Bairro" style={{ marginBottom: 12 }}>
              <Input
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </Form.Item>

            <Row gutter={12}>
              <Col xs={24} sm={16}>
                <Form.Item label="Cidade" style={{ marginBottom: 12 }}>
                  <Input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="UF" style={{ marginBottom: 12 }}>
                  <Input
                    value={ufEndereco}
                    onChange={(e) => setUfEndereco(e.target.value.toUpperCase())}
                    maxLength={2}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* RODAPÉ */}
          <div style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            borderTop: "1px solid #e8e8e8",
            paddingTop: 16,
            marginTop: 16,
          }}>
            <Button onClick={() => setDrawerClienteAberto(false)}>
              Cancelar
            </Button>
            <Button
              type="primary"
              onClick={salvarCliente}
              loading={salvando}
              style={btnStyle}
            >
              Salvar cliente
            </Button>
          </div>
        </Space>
      </Drawer>

      {/* MODAL: Aprovação */}
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
