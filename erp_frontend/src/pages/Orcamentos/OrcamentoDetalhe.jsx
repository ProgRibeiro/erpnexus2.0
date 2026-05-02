import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
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
  Timeline,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
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

const budgetStatusConfig = {
  rascunho: { label: "Rascunho", color: "default" },
  enviado: { label: "Enviado", color: "blue" },
  aprovado: { label: "Aprovado", color: "green" },
  recusado: { label: "Recusado", color: "red" },
  expirado: { label: "Expirado", color: "orange" },
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getBudgetStatus(order) {
  const rawStatus = String(order?.status || "").toLowerCase();
  const validade = order?.validade_orcamento ? dayjs(order.validade_orcamento) : null;

  if (validade && validade.isValid() && validade.endOf("day").isBefore(dayjs()) && ["rascunho", "orcamento_enviado"].includes(rawStatus)) {
    return "expirado";
  }
  if (rawStatus === "orcamento_enviado") return "enviado";
  if (rawStatus === "aprovada") return "aprovado";
  if (rawStatus === "cancelada") return "recusado";
  return "rascunho";
}

function buildPayload(values, items) {
  return {
    cliente: values.cliente,
    contato_responsavel: values.contato_responsavel || null,
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
    itens: items.map((item, index) => ({
      id: item.id,
      descricao: item.descricao || `Item ${index + 1}`,
      quantidade: Number(item.quantidade || 0),
      valor_unitario: Number(item.valor_unitario || 0),
      ordem: index,
    })),
  };
}

function itemTotal(item) {
  return Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
}

export default function OrcamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [items, setItems] = useState([]);
  const [editMode, setEditMode] = useState(searchParams.get("modo") === "edicao");
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [approvalModal, setApprovalModal] = useState({ open: false, tecnico_responsavel: null, data_agendada: null });
  const [refusalReason, setRefusalReason] = useState("");

  const isAdmin = ["admin", "gestor"].includes(String(user?.role || "").toLowerCase());
  const budgetStatus = getBudgetStatus(order);

  const totals = useMemo(() => {
    const subtotal = items.reduce((accumulator, item) => accumulator + itemTotal(item), 0);
    return {
      subtotal,
      total: subtotal,
    };
  }, [items]);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      try {
        setLoading(true);
        const [orderResponse, clientsResponse, ordersResponse] = await Promise.all([
          api.get(`/ordens/${id}/`),
          api.get("/clientes/"),
          api.get("/ordens/"),
        ]);

        if (!isMounted) return;

        const currentOrder = orderResponse.data;
        const allOrders = normalizeList(ordersResponse.data);
        const technicianMap = new Map();
        allOrders.forEach((record) => {
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

        setClients(normalizeList(clientsResponse.data));
        setTechnicians(Array.from(technicianMap.values()));
        setOrder(currentOrder);
        setItems(
          (currentOrder.itens || []).map((item, index) => ({
            ...item,
            key: item.id || `item-${index}`,
          }))
        );

        form.setFieldsValue({
          cliente: currentOrder.cliente,
          contato_responsavel: currentOrder.contato_responsavel,
          tipo_servico: currentOrder.tipo_servico,
          prioridade: currentOrder.prioridade,
          descricao_servico: currentOrder.descricao_servico,
          tem_pedido_compra: currentOrder.tem_pedido_compra,
          numero_pc: currentOrder.numero_pc,
          valor_autorizado_pc: Number(currentOrder.valor_autorizado_pc || 0),
          validade_pc: currentOrder.validade_pc ? dayjs(currentOrder.validade_pc) : null,
          condicao_pagamento: currentOrder.condicao_pagamento,
          validade_orcamento: currentOrder.validade_orcamento ? dayjs(currentOrder.validade_orcamento) : null,
          observacoes: currentOrder.observacoes_tecnicas,
        });
      } catch {
        if (isMounted) message.error("Não foi possível carregar o orçamento.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [form, id, user?.id, user?.nome_completo]);

  const selectedClient = useMemo(
    () => clients.find((cliente) => String(cliente.id) === String(form.getFieldValue("cliente"))),
    [clients, form]
  );

  const setItemField = (key, field, value) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  };

  const saveEdition = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const response = await api.patch(`/ordens/${id}/`, buildPayload(values, items));
      setOrder(response.data);
      setEditMode(false);
      message.success("Orçamento atualizado com sucesso.");
    } catch {
      message.error("Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const sendBudget = async () => {
    try {
      await api.post(`/ordens/${id}/mudar-status/`, { status: "orcamento_enviado" });
      setOrder((current) => ({ ...current, status: "orcamento_enviado" }));
      message.success("Orçamento enviado para o cliente.");
    } catch {
      message.error("Não foi possível enviar o orçamento.");
    }
  };

  const deleteBudget = async () => {
    Modal.confirm({
      title: "Excluir orçamento",
      content: "Essa ação remove o orçamento atual. Deseja continuar?",
      okText: "Excluir",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      async onOk() {
        try {
          await api.delete(`/ordens/${id}/`);
          message.success("Orçamento excluído.");
          navigate("/orcamentos");
        } catch {
          message.error("Não foi possível excluir o orçamento.");
        }
      },
    });
  };

  const reopenBudget = async () => {
    try {
      await api.patch(`/ordens/${id}/`, { status: "rascunho" });
      setOrder((current) => ({ ...current, status: "rascunho" }));
      message.success("Orçamento reaberto.");
    } catch {
      message.error("Não foi possível reabrir o orçamento.");
    }
  };

  const generatePdf = async () => {
    try {
      const response = await api.post(`/ordens/${id}/gerar-pdf-orcamento/`, {}, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${order?.numero || `orcamento-${id}`}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("PDF do orçamento gerado.");
    } catch {
      message.error("Não foi possível gerar o PDF.");
    }
  };

  const confirmRefusal = async () => {
    if (!refusalReason.trim()) {
      message.warning("Informe o motivo da recusa.");
      return;
    }

    try {
      await api.post(`/ordens/${id}/mudar-status/`, {
        status: "cancelada",
        observacao: refusalReason,
      });
      setOrder((current) => ({ ...current, status: "cancelada", motivo_recusa: refusalReason }));
      setRefusalModalOpen(false);
      setRefusalReason("");
      message.success("Orçamento recusado.");
    } catch {
      message.error("Não foi possível recusar o orçamento.");
    }
  };

  const confirmApproval = async () => {
    try {
      await api.patch(`/ordens/${id}/`, {
        tecnico_responsavel: approvalModal.tecnico_responsavel,
        data_agendada: approvalModal.data_agendada?.format("YYYY-MM-DD"),
      });

      const response = await api.post(`/ordens/${id}/mudar-status/`, {
        status: "aprovada",
      });

      const osId = response.data?.os_id || response.data?.ordem_servico_id || response.data?.id || id;
      message.success("Orçamento aprovado com sucesso.");
      setApprovalModal({ open: false, tecnico_responsavel: null, data_agendada: null });
      navigate(`/ordens/${osId}`);
    } catch {
      message.error("Não foi possível aprovar e criar a OS.");
    }
  };

  const actionButtons = {
    rascunho: (
      <Space wrap>
        <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>
          Editar
        </Button>
        <Button type="primary" icon={<SendOutlined />} onClick={sendBudget} style={{ background: "#1B4F8A", borderColor: "#1B4F8A" }}>
          Enviar
        </Button>
        <Button danger icon={<DeleteOutlined />} onClick={deleteBudget}>
          Excluir
        </Button>
      </Space>
    ),
    enviado: (
      <Space wrap>
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setApprovalModal({ open: true, tecnico_responsavel: null, data_agendada: dayjs().add(1, "day") })} style={{ background: "#15803D", borderColor: "#15803D" }}>
          Aprovar
        </Button>
        <Button danger icon={<StopOutlined />} onClick={() => setRefusalModalOpen(true)}>
          Recusar
        </Button>
        <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>
          Editar
        </Button>
      </Space>
    ),
    aprovado: (
      <Space wrap>
        <Button type="primary" icon={<EyeOutlined />} onClick={() => navigate(`/ordens/${order?.id}`)} style={{ background: "#15803D", borderColor: "#15803D" }}>
          Ver OS gerada
        </Button>
        <Button icon={<FilePdfOutlined />} onClick={generatePdf}>
          Gerar PDF
        </Button>
      </Space>
    ),
    recusado: (
      <Space wrap>
        <Button icon={<ReloadOutlined />} onClick={reopenBudget}>
          Reabrir orçamento
        </Button>
      </Space>
    ),
    expirado: (
      <Space wrap>
        <Button icon={<ReloadOutlined />} onClick={reopenBudget}>
          Reativar orçamento
        </Button>
      </Space>
    ),
  };

  const itemColumns = [
    {
      title: "Descrição",
      key: "descricao",
      render: (_, item) =>
        editMode ? (
          <Input value={item.descricao} onChange={(event) => setItemField(item.key, "descricao", event.target.value)} />
        ) : (
          item.descricao
        ),
    },
    {
      title: "Qtd",
      key: "quantidade",
      width: 100,
      render: (_, item) =>
        editMode ? (
          <InputNumber min={0} value={item.quantidade} onChange={(value) => setItemField(item.key, "quantidade", value)} style={{ width: "100%" }} />
        ) : (
          item.quantidade
        ),
    },
    {
      title: "Valor Unit (R$)",
      key: "valor_unitario",
      width: 160,
      render: (_, item) =>
        editMode ? (
          <InputNumber min={0} step={0.01} value={item.valor_unitario} onChange={(value) => setItemField(item.key, "valor_unitario", value)} style={{ width: "100%" }} />
        ) : (
          moneyFormatter.format(Number(item.valor_unitario || 0))
        ),
    },
    {
      title: "Total",
      key: "total",
      width: 140,
      render: (_, item) => <Text strong>{moneyFormatter.format(itemTotal(item))}</Text>,
    },
  ];

  const timelineItems = [
    {
      color: "blue",
      children: `Criado em: ${order?.criado_em ? dayjs(order.criado_em).format("DD/MM/YYYY HH:mm") : "-"}`,
    },
    budgetStatus !== "rascunho"
      ? {
          color: "cyan",
          children: `Enviado em: ${order?.atualizado_em ? dayjs(order.atualizado_em).format("DD/MM/YYYY HH:mm") : "-"}`,
        }
      : null,
    budgetStatus === "aprovado"
      ? {
          color: "green",
          children: `Aprovado em: ${order?.data_aprovacao ? dayjs(order.data_aprovacao).format("DD/MM/YYYY HH:mm") : "-"}`,
        }
      : null,
    budgetStatus === "recusado"
      ? {
          color: "red",
          children: `Recusado em: ${order?.atualizado_em ? dayjs(order.atualizado_em).format("DD/MM/YYYY HH:mm") : "-"}`,
        }
      : null,
    budgetStatus === "aprovado"
      ? {
          color: "green",
          children: (
            <span>
              OS gerada:{" "}
              <Button type="link" onClick={() => navigate(`/ordens/${order?.id}`)} style={{ padding: 0 }}>
                abrir Ordem de Serviço
              </Button>
            </span>
          ),
        }
      : null,
  ].filter(Boolean);

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={{ ...panelStyle, marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
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
              {order?.numero || `ORC-${dayjs().year()}-${String(id).padStart(4, "0")}`}
            </Title>
            <Space size={10} wrap>
              <Tag color={budgetStatusConfig[budgetStatus]?.color || "default"} style={{ borderRadius: 999, paddingInline: 10 }}>
                {budgetStatusConfig[budgetStatus]?.label || "Rascunho"}
              </Tag>
              {editMode ? <Tag color="processing">Modo edição</Tag> : null}
            </Space>
          </Space>

          {actionButtons[budgetStatus]}
        </div>
      </Card>

      {editMode ? (
        <Alert
          type="info"
          showIcon
          message="Modo edição ativo"
          description="Os campos abaixo estão liberados para ajustes. Salve quando terminar."
          style={{ ...panelStyle, marginBottom: 16 }}
        />
      ) : null}

      <Form form={form} layout="vertical">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Cliente
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Form.Item label="Cliente" name="cliente">
                  <Select
                    disabled={!editMode}
                    options={clients.map((cliente) => ({ label: cliente.nome, value: cliente.id }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item label="Contato responsável" name="contato_responsavel">
                  <Select
                    disabled={!editMode}
                    allowClear
                    options={(selectedClient?.contatos || []).map((contato) => ({ label: contato.nome, value: contato.id }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Descriptions size="small" column={{ xs: 1, md: 3 }}>
              <Descriptions.Item label="CNPJ">{selectedClient?.cnpj_cpf || "-"}</Descriptions.Item>
              <Descriptions.Item label="Telefone">{selectedClient?.telefone || "-"}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedClient?.email || "-"}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Pedido de compra do cliente
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form.Item label="Cliente possui PC?" name="tem_pedido_compra" valuePropName="checked">
                  <Select
                    disabled={!editMode}
                    options={[
                      { label: "Sim", value: true },
                      { label: "Não", value: false },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Número PC" name="numero_pc">
                  <Input disabled={!editMode} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Valor autorizado" name="valor_autorizado_pc">
                  <InputNumber disabled={!editMode} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Serviço
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form.Item label="Tipo de serviço" name="tipo_servico">
                  <Select disabled={!editMode} options={serviceOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Prioridade" name="prioridade">
                  <Select disabled={!editMode} options={priorityOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Validade do orçamento" name="validade_orcamento">
                  <DatePicker disabled={!editMode} format="DD/MM/YYYY" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Descrição do serviço" name="descricao_servico">
                  <TextArea disabled={!editMode} rows={4} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Observações e termos" name="observacoes">
                  <TextArea disabled={!editMode} rows={4} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Itens do orçamento
            </Title>
            <Table columns={itemColumns} dataSource={items} pagination={false} rowKey="key" />
            <Divider />
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
              <Text style={{ color: "#6B7280" }}>Subtotal</Text>
              <Text strong>{moneyFormatter.format(totals.subtotal)}</Text>
            </div>
            <div
              style={{
                alignItems: "center",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
                padding: 16,
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
              Timeline de status
            </Title>
            <Timeline items={timelineItems} />
          </Card>
        </Space>
      </Form>

      {editMode ? (
        <Card bordered={false} style={{ ...panelStyle, marginTop: 16 }} bodyStyle={{ padding: 16 }}>
          <Space wrap>
            <Button type="primary" icon={<EditOutlined />} onClick={saveEdition} loading={saving} style={{ background: "#1B4F8A", borderColor: "#1B4F8A" }}>
              Salvar alterações
            </Button>
            <Button onClick={() => setEditMode(false)}>Cancelar edição</Button>
          </Space>
        </Card>
      ) : null}

      <Modal
        open={refusalModalOpen}
        title="Motivo da recusa"
        okText="Confirmar recusa"
        cancelText="Cancelar"
        onOk={confirmRefusal}
        onCancel={() => setRefusalModalOpen(false)}
      >
        <TextArea rows={4} value={refusalReason} onChange={(event) => setRefusalReason(event.target.value)} placeholder="Explique o motivo da recusa" />
      </Modal>

      <Modal
        open={approvalModal.open}
        title="Confirmar aprovação e criar Ordem de Serviço?"
        okText="Confirmar e criar OS"
        cancelText="Cancelar"
        onOk={confirmApproval}
        onCancel={() => setApprovalModal({ open: false, tecnico_responsavel: null, data_agendada: null })}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Select
            allowClear
            placeholder="Técnico responsável"
            value={approvalModal.tecnico_responsavel ?? undefined}
            onChange={(value) => setApprovalModal((current) => ({ ...current, tecnico_responsavel: value }))}
            options={technicians}
          />
          <DatePicker
            format="DD/MM/YYYY"
            value={approvalModal.data_agendada}
            onChange={(value) => setApprovalModal((current) => ({ ...current, data_agendada: value }))}
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>
    </div>
  );
}
