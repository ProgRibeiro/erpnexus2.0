import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  FilePdfOutlined,
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

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

function getClientDisplay(cliente) {
  return `${cliente.nome}${cliente.cnpj_cpf ? ` - ${cliente.cnpj_cpf}` : ""}`;
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
  const [clientForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [draftId, setDraftId] = useState(null);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [items, setItems] = useState([emptyItem(0)]);
  const [budgetNumber, setBudgetNumber] = useState(buildBudgetNumber(1));
  const [approvePayload, setApprovePayload] = useState(null);

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

  const addItem = () => {
    setItems((current) => [...current, emptyItem(current.length)]);
  };

  const updateItem = (key, field, value) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };

  const removeItem = (key) => {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current));
  };

  const handleQuickClientCreate = async () => {
    try {
      const values = await clientForm.validateFields();
      const response = await api.post("/clientes/", {
        nome: values.nome,
        cnpj_cpf: values.cnpj_cpf || "",
        telefone: values.telefone || "",
        email: values.email || "",
        status: "ativo",
      });
      const novoCliente = response.data;
      setClients((current) => [novoCliente, ...current]);
      form.setFieldValue("cliente", novoCliente.id);
      clientForm.resetFields();
      setShowClientModal(false);
      message.success("Cliente criado com sucesso.");
    } catch {
      message.error("Não foi possível criar o cliente.");
    }
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
                style={{ background: "#1B4F8A", borderColor: "#1B4F8A" }}
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
                      label: getClientDisplay(cliente),
                      value: cliente.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} lg={10} style={{ display: "flex", alignItems: "end" }}>
                <Button icon={<PlusOutlined />} onClick={() => setShowClientModal(true)}>
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
            style={{ background: "#1B4F8A", borderColor: "#1B4F8A" }}
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

      <Modal
        open={showClientModal}
        title="Novo cliente"
        okText="Criar cliente"
        cancelText="Cancelar"
        onOk={handleQuickClientCreate}
        onCancel={() => setShowClientModal(false)}
      >
        <Form form={clientForm} layout="vertical">
          <Form.Item label="Nome" name="nome" rules={[{ required: true, message: "Informe o nome do cliente" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="CNPJ" name="cnpj_cpf">
            <Input />
          </Form.Item>
          <Form.Item label="Telefone" name="telefone">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

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
