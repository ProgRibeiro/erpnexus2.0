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
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  ShoppingOutlined,
  StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import FiscalIntelligenceAlert from "./components/FiscalIntelligenceAlert";
import {
  buildItemsPayload,
  btnPrimaryStyle,
  calcItemsTotals,
  createEmptyItem,
  formatBudgetStatus,
  itemOriginOptions,
  mapBackendItem,
  mapProdutoToItem,
  mapServicoToItem,
  moneyFormatter,
  normalizeList,
  pageStyle,
  panelStyle,
  paymentOptions,
  priorityOptions,
  productUnitOptions,
  serviceOptions,
  serviceUnitOptions,
} from "./shared";

const { Text, Title } = Typography;
const { TextArea } = Input;

function getBudgetStatus(order) {
  const rawStatus = String(order?.status || "").toLowerCase();
  const validade = order?.validade_orcamento
    ? dayjs(order.validade_orcamento)
    : null;

  if (
    validade &&
    validade.isValid() &&
    validade.endOf("day").isBefore(dayjs()) &&
    ["rascunho", "orcamento_enviado"].includes(rawStatus)
  ) {
    return "expirado";
  }
  if (rawStatus === "orcamento_enviado") return "enviado";
  if (rawStatus === "aprovada") return "aprovado";
  if (rawStatus === "cancelada") return "recusado";
  return "rascunho";
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
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [impostos, setImpostos] = useState(null);
  const [editMode, setEditMode] = useState(
    searchParams.get("modo") === "edicao",
  );
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [approvalModal, setApprovalModal] = useState({
    open: false,
    tecnico_responsavel: null,
    data_agendada: null,
  });
  const [refusalReason, setRefusalReason] = useState("");
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogOrigin, setCatalogOrigin] = useState("servico");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [tipoDesconto, setTipoDesconto] = useState("valor"); // "valor" | "percentual"

  const isAdmin = ["admin", "gestor"].includes(
    String(user?.role || "").toLowerCase(),
  );
  const budgetStatus = getBudgetStatus(order);
  const budgetStatusMeta = formatBudgetStatus(budgetStatus);

  const totals = useMemo(() => calcItemsTotals(items), [items]);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      try {
        setLoading(true);
        const [
          orderResponse,
          clientsResponse,
          ordersResponse,
          produtosResponse,
          servicosResponse,
        ] = await Promise.all([
          api.get(`/ordens/${id}/`),
          api.get("/clientes/"),
          api.get("/ordens/"),
          api.get("/estoque/produtos/"),
          api.get("/estoque/servicos/"),
        ]);

        if (!active) return;

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

        if (user?.id && (user?.nome_completo || user?.nome)) {
          technicianMap.set(String(user.id), {
            label: user.nome_completo || user.nome,
            value: user.id,
          });
        }

        setClients(normalizeList(clientsResponse.data));
        setTechnicians(Array.from(technicianMap.values()));
        setProdutos(normalizeList(produtosResponse.data));
        setServicos(normalizeList(servicosResponse.data));
        setOrder(currentOrder);
        setImpostos(currentOrder.dados_impostos || null);
        setValorDesconto(Number(currentOrder.valor_desconto || 0));
        setItems(
          (currentOrder.itens || []).map((item, index) =>
            mapBackendItem(item, index),
          ),
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
          validade_pc: currentOrder.validade_pc
            ? dayjs(currentOrder.validade_pc)
            : null,
          condicao_pagamento: currentOrder.condicao_pagamento,
          validade_orcamento: currentOrder.validade_orcamento
            ? dayjs(currentOrder.validade_orcamento)
            : null,
          observacoes: currentOrder.observacoes_tecnicas,
        });
      } catch {
        if (active) message.error("Não foi possível carregar o orçamento.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [form, id, user?.id, user?.nome, user?.nome_completo]);

  useEffect(() => {
    if (!totals.subtotal) return undefined;
    let active = true;

    async function recalcularImpostos() {
      try {
        const response = await api.post("/fiscal/calcular-impostos/", {
          valor_servicos: totals.valorServicos,
          valor_materiais: totals.valorMateriais,
          tipo_servico: form.getFieldValue("tipo_servico") || "",
          descricao_servico: form.getFieldValue("descricao_servico") || "",
        });
        if (active) setImpostos(response.data || null);
      } catch {
        if (active) setImpostos(null);
      }
    }

    recalcularImpostos();
    return () => {
      active = false;
    };
  }, [totals.valorMateriais, totals.valorServicos, totals.subtotal]);

  const selectedClient = useMemo(
    () =>
      clients.find(
        (cliente) =>
          String(cliente.id) === String(form.getFieldValue("cliente")),
      ),
    [clients, form],
  );

  const setItemField = (key, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItem = (key) => {
    setItems((current) =>
      current.length > 1 ? current.filter((item) => item.key !== key) : current,
    );
  };

  const addManualItem = () =>
    setItems((current) => [...current, createEmptyItem(current.length)]);

  const addCatalogItem = () => {
    if (!selectedCatalogItem) {
      message.warning("Selecione um item do catálogo.");
      return;
    }
    const item =
      catalogOrigin === "produto"
        ? mapProdutoToItem(
            produtos.find(
              (produto) => String(produto.id) === String(selectedCatalogItem),
            ),
          )
        : mapServicoToItem(
            servicos.find(
              (servico) => String(servico.id) === String(selectedCatalogItem),
            ),
          );
    if (!item) {
      message.error("Item não encontrado.");
      return;
    }
    setItems((current) => [...current, item]);
    setCatalogModalOpen(false);
    setSelectedCatalogItem(null);
  };

  const saveEdition = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const response = await api.patch(`/ordens/${id}/`, {
        cliente: values.cliente,
        contato_responsavel: values.contato_responsavel || null,
        tipo_servico: values.tipo_servico,
        prioridade: values.prioridade,
        descricao_servico: values.descricao_servico,
        tem_pedido_compra: Boolean(values.tem_pedido_compra),
        numero_pc: values.numero_pc || "",
        valor_autorizado_pc: Number(values.valor_autorizado_pc || 0),
        validade_pc: values.validade_pc?.format("YYYY-MM-DD") || null,
        condicao_pagamento: values.condicao_pagamento,
        validade_orcamento:
          values.validade_orcamento?.format("YYYY-MM-DD") || null,
        observacoes_tecnicas: values.observacoes || "",
        itens: buildItemsPayload(items),
        valor_desconto: Number(valorDesconto || 0),
      });
      setOrder(response.data);
      setImpostos(response.data.dados_impostos || null);
      setValorDesconto(Number(response.data.valor_desconto || 0));
      setItems(
        (response.data.itens || []).map((item, index) =>
          mapBackendItem(item, index),
        ),
      );
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
      await api.post(`/ordens/${id}/mudar-status/`, {
        status: "orcamento_enviado",
      });
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
      const response = await api.post(
        `/ordens/${id}/gerar-pdf-orcamento/`,
        {},
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${order?.numero || `orcamento-${id}`}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("PDF do orçamento gerado.");
    } catch {
      message.error("Não foi possível gerar o PDF.");
    }
  };

  const openPrintPage = () => navigate(`/orcamentos/${id}/impressao`);

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
      setOrder((current) => ({ ...current, status: "cancelada" }));
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
      const osId =
        response.data?.os_id ||
        response.data?.ordem_servico_id ||
        response.data?.id ||
        id;
      message.success("Orçamento aprovado com sucesso.");
      setApprovalModal({
        open: false,
        tecnico_responsavel: null,
        data_agendada: null,
      });
      navigate(`/ordens/${osId}`);
    } catch {
      message.error("Não foi possível aprovar e criar a OS.");
    }
  };

  const itemColumns = [
    {
      title: "Origem",
      key: "origem_tipo",
      width: 110,
      render: (_, item) => (
        <Tag
          color={
            item.origem_tipo === "servico"
              ? "blue"
              : item.origem_tipo === "produto"
                ? "gold"
                : "default"
          }
        >
          {item.origem_tipo === "servico"
            ? "Serviço"
            : item.origem_tipo === "produto"
              ? "Produto"
              : "Avulso"}
        </Tag>
      ),
    },
    {
      title: "Descrição",
      key: "descricao",
      render: (_, item) =>
        editMode ? (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Input
              value={item.descricao}
              onChange={(event) =>
                setItemField(item.key, "descricao", event.target.value)
              }
            />
            <Space size={8} wrap>
              <Input
                value={item.codigo_referencia}
                onChange={(event) =>
                  setItemField(
                    item.key,
                    "codigo_referencia",
                    event.target.value,
                  )
                }
                style={{ width: 120 }}
              />
              <Select
                value={item.unidade_referencia || undefined}
                onChange={(value) =>
                  setItemField(item.key, "unidade_referencia", value)
                }
                options={[...productUnitOptions, ...serviceUnitOptions]}
                style={{ width: 120 }}
              />
            </Space>
          </Space>
        ) : (
          <div>
            <div style={{ fontWeight: 700, color: "#10233C" }}>
              {item.descricao}
            </div>
            <div style={{ color: "#6B7280", fontSize: 12 }}>
              {item.codigo_referencia || "-"} | {item.unidade_referencia || "-"}
            </div>
          </div>
        ),
    },
    {
      title: "Qtd",
      key: "quantidade",
      width: 100,
      render: (_, item) =>
        editMode ? (
          <InputNumber
            min={0}
            value={item.quantidade}
            onChange={(value) => setItemField(item.key, "quantidade", value)}
            style={{ width: "100%" }}
          />
        ) : (
          item.quantidade
        ),
    },
    {
      title: "Valor Unit (R$)",
      key: "valor_unitario",
      width: 150,
      render: (_, item) =>
        editMode ? (
          <InputNumber
            min={0}
            step={0.01}
            value={item.valor_unitario}
            onChange={(value) =>
              setItemField(item.key, "valor_unitario", value)
            }
            style={{ width: "100%" }}
          />
        ) : (
          moneyFormatter.format(Number(item.valor_unitario || 0))
        ),
    },
    {
      title: "Total",
      key: "total",
      width: 140,
      render: (_, item) => (
        <Text strong>
          {moneyFormatter.format(
            Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
          )}
        </Text>
      ),
    },
    ...(editMode
      ? [
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
        ]
      : []),
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
            <Button
              type="link"
              onClick={() => navigate(`/ordens/${order?.id}`)}
              style={{ padding: 0 }}
            >
              OS gerada: abrir Ordem de Serviço
            </Button>
          ),
        }
      : null,
  ].filter(Boolean);

  const actionButtons = {
    rascunho: (
      <Space wrap>
        <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>
          Editar
        </Button>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={sendBudget}
          style={btnPrimaryStyle}
        >
          Enviar
        </Button>
        <Button icon={<EyeOutlined />} onClick={openPrintPage}>
          Imprimir
        </Button>
        <Button danger icon={<DeleteOutlined />} onClick={deleteBudget}>
          Excluir
        </Button>
      </Space>
    ),
    enviado: (
      <Space wrap>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() =>
            setApprovalModal({
              open: true,
              tecnico_responsavel: null,
              data_agendada: dayjs().add(1, "day"),
            })
          }
          style={{ background: "#15803D", borderColor: "#15803D" }}
        >
          Aprovar
        </Button>
        <Button
          danger
          icon={<StopOutlined />}
          onClick={() => setRefusalModalOpen(true)}
        >
          Recusar
        </Button>
        <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>
          Editar
        </Button>
        <Button icon={<EyeOutlined />} onClick={openPrintPage}>
          Imprimir
        </Button>
      </Space>
    ),
    aprovado: (
      <Space wrap>
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/ordens/${order?.id}`)}
          style={{ background: "#15803D", borderColor: "#15803D" }}
        >
          Ver OS gerada
        </Button>
        <Button icon={<EyeOutlined />} onClick={openPrintPage}>
          Imprimir
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

  return (
    <div style={pageStyle}>
      <Card
        bordered={false}
        style={{ ...panelStyle, marginBottom: 16 }}
        bodyStyle={{ padding: 16 }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Space direction="vertical" size={2}>
            <Title
              level={1}
              style={{ fontSize: 24, fontWeight: 800, margin: 0 }}
            >
              {order?.numero ||
                `ORC-${dayjs().year()}-${String(id).padStart(4, "0")}`}
            </Title>
            <Space size={10} wrap>
              <Tag
                color={budgetStatusMeta.color}
                style={{ borderRadius: 999, paddingInline: 10 }}
              >
                {budgetStatusMeta.label}
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
          description="Você pode ajustar cliente, escopo, itens do catálogo e valores antes de salvar novamente."
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
                    options={clients.map((cliente) => ({
                      label: cliente.nome,
                      value: cliente.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item
                  label="Contato responsável"
                  name="contato_responsavel"
                >
                  <Select
                    disabled={!editMode}
                    allowClear
                    options={(selectedClient?.contatos || []).map(
                      (contato) => ({ label: contato.nome, value: contato.id }),
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Descriptions size="small" column={{ xs: 1, md: 3 }}>
              <Descriptions.Item label="CNPJ">
                {selectedClient?.cnpj_cpf || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Telefone">
                {selectedClient?.telefone || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedClient?.email || "-"}
              </Descriptions.Item>
            </Descriptions>
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
                <Form.Item
                  label="Validade do orçamento"
                  name="validade_orcamento"
                >
                  <DatePicker
                    disabled={!editMode}
                    format="DD/MM/YYYY"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  label="Descrição do serviço"
                  name="descricao_servico"
                >
                  <TextArea disabled={!editMode} rows={4} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Condição de pagamento"
                  name="condicao_pagamento"
                >
                  <Select disabled={!editMode} options={paymentOptions} />
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
            <Space
              style={{
                justifyContent: "space-between",
                width: "100%",
                marginBottom: 16,
              }}
              wrap
            >
              <Title level={4} style={{ margin: 0 }}>
                Itens do orçamento
              </Title>
              {editMode ? (
                <Space wrap>
                  <Button
                    icon={<ShoppingOutlined />}
                    onClick={() => setCatalogModalOpen(true)}
                  >
                    Selecionar do catálogo
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={addManualItem}>
                    Item avulso
                  </Button>
                </Space>
              ) : null}
            </Space>
            <Table
              columns={itemColumns}
              dataSource={items}
              pagination={false}
              rowKey="key"
            />
            <Divider />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <Text type="secondary">Subtotal serviços</Text>
                <div style={{ fontWeight: 800 }}>
                  {moneyFormatter.format(totals.valorServicos)}
                </div>
              </div>
              <div>
                <Text type="secondary">Subtotal produtos</Text>
                <div style={{ fontWeight: 800 }}>
                  {moneyFormatter.format(totals.valorMateriais)}
                </div>
              </div>
              <div>
                <Text type="secondary">Impostos</Text>
                <div style={{ fontWeight: 800 }}>
                  {moneyFormatter.format(Number(impostos?.total_impostos || 0))}
                </div>
              </div>
            </div>

            {/* Desconto */}
            <div
              style={{
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Text style={{ fontWeight: 700, color: "#92400E", minWidth: 80 }}>
                Desconto
              </Text>
              <Select
                value={tipoDesconto}
                onChange={(v) => {
                  setTipoDesconto(v);
                  setValorDesconto(0);
                }}
                options={[
                  { label: "R$ (valor fixo)", value: "valor" },
                  { label: "% (percentual)", value: "percentual" },
                ]}
                style={{ width: 140 }}
                disabled={!editMode}
              />
              <InputNumber
                min={0}
                max={tipoDesconto === "percentual" ? 100 : undefined}
                value={valorDesconto}
                onChange={(v) => setValorDesconto(Number(v || 0))}
                formatter={(v) =>
                  tipoDesconto === "percentual"
                    ? `${v}%`
                    : `R$ ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
                }
                parser={(v) =>
                  tipoDesconto === "percentual"
                    ? v.replace("%", "")
                    : v.replace(/R\$\s?|(\.*)/g, "")
                }
                style={{ width: 180 }}
                disabled={!editMode}
              />
              <Text style={{ color: "#92400E" }}>
                {(() => {
                  const descontoEmReais =
                    tipoDesconto === "percentual"
                      ? (totals.subtotal * valorDesconto) / 100
                      : valorDesconto;
                  return `= − ${moneyFormatter.format(descontoEmReais)}`;
                })()}
              </Text>
            </div>
            <Alert
              type="info"
              showIcon
              style={{ borderRadius: 12 }}
              message="Descrição dos impostos pagos"
              description={
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span>
                    ISS {moneyFormatter.format(impostos?.iss || 0)} | PIS{" "}
                    {moneyFormatter.format(impostos?.pis || 0)} | COFINS{" "}
                    {moneyFormatter.format(impostos?.cofins || 0)} | IRPJ{" "}
                    {moneyFormatter.format(impostos?.irpj || 0)} | CSLL{" "}
                    {moneyFormatter.format(impostos?.csll || 0)}
                  </span>
                  <span>
                    Total estimado:{" "}
                    <strong>
                      {moneyFormatter.format(
                        Number(impostos?.total_impostos || 0),
                      )}
                    </strong>
                  </span>
                  {impostos?.observacao ? (
                    <span>{impostos.observacao}</span>
                  ) : null}
                </div>
              }
            />
            <FiscalIntelligenceAlert impostos={impostos} />
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
              <div>
                <Text style={{ color: "#1E40AF", fontSize: 16, fontWeight: 700 }}>
                  Total com impostos
                </Text>
                {(() => {
                  const descontoEmReais =
                    tipoDesconto === "percentual"
                      ? (totals.subtotal * valorDesconto) / 100
                      : valorDesconto;
                  return descontoEmReais > 0 ? (
                    <div style={{ fontSize: 13, color: "#92400E" }}>
                      Desconto aplicado: −{moneyFormatter.format(descontoEmReais)}
                    </div>
                  ) : null;
                })()}
              </div>
              <Text style={{ color: "#3B82F6", fontSize: 28, fontWeight: 800 }}>
                {(() => {
                  const base = Number(
                    impostos?.total_geral ||
                      order?.total_com_impostos ||
                      totals.subtotal ||
                      0,
                  );
                  const descontoEmReais =
                    tipoDesconto === "percentual"
                      ? (totals.subtotal * valorDesconto) / 100
                      : valorDesconto;
                  return moneyFormatter.format(Math.max(0, base - descontoEmReais));
                })()}
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
        <Card
          bordered={false}
          style={{ ...panelStyle, marginTop: 16 }}
          bodyStyle={{ padding: 16 }}
        >
          <Space wrap>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveEdition}
              loading={saving}
              style={btnPrimaryStyle}
            >
              Salvar alterações
            </Button>
            <Button onClick={() => setEditMode(false)}>Cancelar edição</Button>
          </Space>
        </Card>
      ) : null}

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
          <Select
            value={catalogOrigin}
            onChange={setCatalogOrigin}
            options={itemOriginOptions.filter(
              (option) => option.value !== "avulso",
            )}
          />
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={
              catalogOrigin === "produto"
                ? "Selecione um produto"
                : "Selecione um serviço"
            }
            value={selectedCatalogItem}
            onChange={setSelectedCatalogItem}
            options={(catalogOrigin === "produto" ? produtos : servicos).map(
              (item) => ({
                label: `${item.codigo || "-"} - ${item.nome}`,
                value: item.id,
              }),
            )}
          />
        </Space>
      </Modal>

      <Modal
        open={refusalModalOpen}
        title="Motivo da recusa"
        okText="Confirmar recusa"
        cancelText="Cancelar"
        onOk={confirmRefusal}
        onCancel={() => setRefusalModalOpen(false)}
      >
        <TextArea
          rows={4}
          value={refusalReason}
          onChange={(event) => setRefusalReason(event.target.value)}
          placeholder="Explique o motivo da recusa"
        />
      </Modal>

      <Modal
        open={approvalModal.open}
        title="Confirmar aprovação e criar Ordem de Serviço?"
        okText="Confirmar e criar OS"
        cancelText="Cancelar"
        onOk={confirmApproval}
        onCancel={() =>
          setApprovalModal({
            open: false,
            tecnico_responsavel: null,
            data_agendada: null,
          })
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Select
            allowClear
            placeholder="Técnico responsável"
            value={approvalModal.tecnico_responsavel ?? undefined}
            onChange={(value) =>
              setApprovalModal((current) => ({
                ...current,
                tecnico_responsavel: value,
              }))
            }
            options={technicians}
          />
          <DatePicker
            format="DD/MM/YYYY"
            value={approvalModal.data_agendada}
            onChange={(value) =>
              setApprovalModal((current) => ({
                ...current,
                data_agendada: value,
              }))
            }
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>
    </div>
  );
}
