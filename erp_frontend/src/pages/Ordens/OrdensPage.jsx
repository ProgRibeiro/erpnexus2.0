import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Empty,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ClockCircleOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../../services/api";

const colors = {
  azul: "#3B82F6",
  roxo: "#5B21B6",
  verde: "#1A7A4A",
  laranja: "#B45309",
  vermelho: "#B91C1C",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const statusOptions = [
  { label: "Lead", value: "lead" },
  { label: "Orçamento", value: "orcamento" },
  { label: "Aprovado", value: "aprovado" },
  { label: "Em execução", value: "em_execucao" },
  { label: "Faturado", value: "faturado" },
  { label: "Concluído", value: "concluido" },
  { label: "Cancelado", value: "cancelado" },
];

const statusApiAliases = {
  lead: "aberta",
  orcamento: "orcamento_enviado",
  aprovado: "aprovada",
  concluido: "concluida",
  cancelado: "cancelada",
};

const statusDisplayAliases = {
  aberta: "lead",
  rascunho: "lead",
  orcamento_enviado: "orcamento",
  aprovada: "aprovado",
  agendada: "aprovado",
  concluida: "concluido",
  cancelada: "cancelado",
};

const serviceTypeOptions = [
  { label: "HVAC", value: "hvac" },
  { label: "Refrigeração", value: "refrigeracao" },
  { label: "Elétrica", value: "eletrica" },
  { label: "Civil", value: "civil" },
  { label: "Preventiva", value: "preventiva" },
];

const serviceTypeLabels = {
  hvac: "HVAC",
  refrigeracao: "Refrigeração",
  eletrica: "Elétrica",
  civil: "Civil",
  preventiva: "Preventiva",
  manutencao: "Manutenção",
  instalacao: "Instalação",
  outro: "Outro",
};

const statusConfig = {
  lead: { label: "Lead", color: colors.textoSecundario, background: "#F3F4F6" },
  orcamento: { label: "Orçamento", color: colors.laranja, background: "#FEF3C7" },
  aprovado: { label: "Aprovado", color: colors.azul, background: "#DBEAFE" },
  em_execucao: { label: "Em execução", color: colors.roxo, background: "#EDE9FE" },
  faturado: { label: "Faturado", color: colors.verde, background: "#DCFCE7" },
  concluido: { label: "Concluído", color: "#166534", background: "#BBF7D0" },
  cancelado: { label: "Cancelado", color: colors.vermelho, background: "#FEE2E2" },
};

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const cardStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const metricCardStyle = {
  ...cardStyle,
  minHeight: 124,
};

const filterStyle = {
  ...cardStyle,
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function normalizeList(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (Array.isArray(data?.results)) return { rows: data.results, total: data.count || data.results.length };
  return { rows: [], total: 0 };
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeStatus(status) {
  const value = String(status || "lead").toLowerCase();
  return statusDisplayAliases[value] || value;
}

function getApiStatus(status) {
  return statusApiAliases[status] || status;
}

function getFiltersFromSearchParams(searchParams) {
  const rawStatus = searchParams.get("status") || "";
  const status = rawStatus
    .split(",")
    .map((item) => normalizeStatus(item.trim()))
    .filter((item) => statusConfig[item])
    .filter((item, index, array) => array.indexOf(item) === index);

  return {
    busca: searchParams.get("busca") || searchParams.get("search") || "",
    status,
    tipoServico: searchParams.get("tipo_servico") || searchParams.get("tipoServico") || undefined,
    tecnico: searchParams.get("tecnico") || searchParams.get("tecnico_responsavel") || undefined,
    periodo: null,
  };
}

function getStatusMeta(status) {
  const normalized = normalizeStatus(status);
  return statusConfig[normalized] || statusConfig.lead;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "TE";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getClientName(order) {
  return firstDefined(order?.cliente_nome, order?.cliente?.nome, order?.nome_cliente, "Cliente não informado");
}

function getTechnicianName(order) {
  return firstDefined(
    order?.tecnico_nome,
    order?.tecnico_responsavel_nome,
    order?.tecnico?.nome,
    order?.tecnico_responsavel?.nome,
    order?.tecnico_responsavel?.username,
    "Sem técnico"
  );
}

function getTechnicianId(order) {
  return firstDefined(order?.tecnico_responsavel, order?.tecnico?.id, order?.tecnico_id);
}

function getServiceType(order) {
  const type = firstDefined(order?.tipo_servico, order?.tipo, "outro");
  return serviceTypeLabels[type] || String(type).replace(/_/g, " ");
}

function getValue(order) {
  const value = Number(firstDefined(order?.valor_total_orcado, order?.valor_final_faturado, order?.valor, 0));
  return Number.isFinite(value) ? value : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const safeValue = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function isLate(order) {
  if (!order?.data_agendada) return false;
  const today = new Date();
  const scheduled = new Date(`${order.data_agendada}T23:59:59`);
  const status = normalizeStatus(order.status);
  return scheduled < today && !["faturado", "concluido", "cancelado"].includes(status);
}

function SummaryCard({ color, icon, label, loading, value }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 18, height: "100%" }} hoverable>
      <Skeleton active loading={loading} paragraph={false} title={{ width: "65%" }}>
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: colors.textoFraco,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div style={{ color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
              {value}
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              background: `${color}14`,
              borderRadius: 10,
              color,
              display: "flex",
              flexShrink: 0,
              fontSize: 18,
              height: 42,
              justifyContent: "center",
              width: 42,
            }}
          >
            {icon}
          </div>
        </div>
      </Skeleton>
    </Card>
  );
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);

  return (
    <span
      style={{
        alignItems: "center",
        background: meta.background,
        borderRadius: 999,
        color: meta.color,
        display: "inline-flex",
        fontSize: 12,
        fontWeight: 700,
        gap: 6,
        padding: "5px 10px",
        whiteSpace: "nowrap",
      }}
    >
      <Badge color={meta.color} />
      {meta.label}
    </span>
  );
}

function OrdensPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [technicians, setTechnicians] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters] = useState(() => getFiltersFromSearchParams(searchParams));

  const technicianOptionsFromOrders = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const id = getTechnicianId(order);
      const name = getTechnicianName(order);
      if (id && name && name !== "Sem técnico") {
        map.set(String(id), { label: name, value: String(id) });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const technicianOptions = technicians.length > 0 ? technicians : technicianOptionsFromOrders;

  const summary = useMemo(
    () =>
      orders.reduce(
        (acc, order) => {
          const status = normalizeStatus(order.status);
          if (["lead", "orcamento", "aprovado"].includes(status)) acc.abertas += 1;
          if (status === "em_execucao") acc.execucao += 1;
          if (status === "faturado" || order.status_pagamento === "pendente") acc.faturamento += 1;
          if (isLate(order)) acc.atrasadas += 1;
          return acc;
        },
        { abertas: 0, execucao: 0, faturamento: 0, atrasadas: 0 }
      ),
    [orders]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadTechnicians() {
      try {
        const response = await api.get("/auth/");
        const { rows } = normalizeList(response.data);
        if (!isMounted) return;

        setTechnicians(
          rows
            .filter((user) => String(user.role || "").toLowerCase() === "tecnico")
            .map((user) => ({
              label: firstDefined(user.nome_completo, user.nome, user.username, user.email, "Técnico"),
              value: String(user.id),
            }))
        );
      } catch {
        if (isMounted) setTechnicians([]);
      }
    }

    loadTechnicians();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setFilters(getFiltersFromSearchParams(searchParams));
    setPagination((current) => ({ ...current, current: 1 }));
  }, [searchParamsString]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        const params = {
          page: pagination.current,
          page_size: pagination.pageSize,
        };

        if (filters.busca) params.search = filters.busca;
        if (filters.status.length === 1) params.status = getApiStatus(filters.status[0]);
        if (filters.status.length > 1) params.status = filters.status.map(getApiStatus).join(",");
        if (filters.tipoServico) params.tipo_servico = filters.tipoServico;
        if (filters.tecnico) params.tecnico_responsavel = filters.tecnico;
        if (filters.periodo?.[0]) params.periodo_inicio = filters.periodo[0].format("YYYY-MM-DD");
        if (filters.periodo?.[1]) params.periodo_fim = filters.periodo[1].format("YYYY-MM-DD");

        const response = await api.get("/ordens/", { params });
        const { rows, total: responseTotal } = normalizeList(response.data);

        if (!isMounted) return;

        setOrders(rows);
        setTotal(responseTotal);
      } catch {
        if (!isMounted) return;
        setOrders([]);
        setTotal(0);
        message.warning("Não foi possível carregar as ordens de serviço.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [filters, pagination.current, pagination.pageSize]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const clearFilters = () => {
    setSearchParams({});
    setFilters({
      busca: "",
      status: [],
      tipoServico: undefined,
      tecnico: undefined,
      periodo: null,
    });
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const goToOrder = (order) => {
    if (order?.id) navigate(`/ordens/${order.id}`);
  };

  const columns = [
    {
      title: "Número",
      dataIndex: "numero",
      key: "numero",
      width: 130,
      render: (numero, record) => (
        <Button
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            goToOrder(record);
          }}
          style={{ color: "#3B82F6", fontWeight: 800, padding: 0 }}
        >
          {numero || `#${record.id}`}
        </Button>
      ),
    },
    {
      title: "Cliente",
      key: "cliente",
      ellipsis: true,
      render: (_, record) => <Text strong>{getClientName(record)}</Text>,
    },
    {
      title: "Tipo de serviço",
      key: "tipo_servico",
      width: 160,
      render: (_, record) => getServiceType(record),
    },
    {
      title: "Técnico",
      key: "tecnico",
      width: 210,
      render: (_, record) => {
        const name = getTechnicianName(record);
        return (
          <Space size={8}>
            <Avatar size={28} style={{ background: "#3B82F6", fontSize: 11 }}>
              {getInitials(name)}
            </Avatar>
            <Text>{name}</Text>
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Data agendada",
      dataIndex: "data_agendada",
      key: "data_agendada",
      width: 150,
      render: formatDate,
    },
    {
      title: "Valor",
      key: "valor",
      align: "right",
      width: 140,
      render: (_, record) => <Text strong>{moneyFormatter.format(getValue(record))}</Text>,
    },
    {
      title: "Ações",
      key: "acoes",
      align: "right",
      width: 128,
      render: (_, record) => {
        const visible = hoveredRow === record.id;

        return (
          <Space
            size={4}
            onClick={(event) => event.stopPropagation()}
            style={{
              opacity: visible ? 1 : 0,
              pointerEvents: visible ? "auto" : "none",
              transition: "opacity 160ms ease",
            }}
          >
            <Tooltip title="Ver OS">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => goToOrder(record)}
                style={{ color: "#3B82F6" }}
              />
            </Tooltip>
            <Tooltip title="Editar OS">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => navigate(`/ordens/${record.id}/editar`)}
                style={{ color: "#374151" }}
              />
            </Tooltip>
            <Tooltip title="Faturar OS">
              <Button
                type="text"
                icon={<DollarOutlined />}
                onClick={() => navigate(`/ordens/${record.id}?tab=faturamento`)}
                style={{ color: "#1A7A4A" }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: "#F8FAFC",
            headerColor: "#6B7280",
            rowHoverBg: "#F3F6FA",
          },
        },
      }}
    >
      <div style={pageStyle}>
        <style>
          {`
            .ordens-page-table .ant-table-thead > tr > th {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0;
              text-transform: uppercase;
            }

            .ordens-page-table .ant-table-tbody > tr > td {
              transition: background 160ms ease;
            }
          `}
        </style>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <Title level={1} style={{ color: colors.texto, fontSize: 28, fontWeight: 800, margin: 0 }}>
              Ordens de Serviço
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Acompanhe o fluxo completo, do lead até o faturamento.
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/ordens/novo")}
            style={{
              height: 40,
              paddingInline: 20,
              fontWeight: 600,
              fontSize: 14,
              borderRadius: 10,
            }}
          >
            Nova OS
          </Button>
        </div>

        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.azul}
              icon={<FileTextOutlined />}
              label="OS Abertas"
              loading={loading}
              value={summary.abertas}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.roxo}
              icon={<ToolOutlined />}
              label="Em Execução"
              loading={loading}
              value={summary.execucao}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.laranja}
              icon={<ClockCircleOutlined />}
              label="Aguardando Faturamento"
              loading={loading}
              value={summary.faturamento}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.vermelho}
              icon={<DollarOutlined />}
              label="Atrasadas"
              loading={loading}
              value={summary.atrasadas}
            />
          </Col>
        </Row>

        <Card bordered={false} style={filterStyle} bodyStyle={{ padding: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} lg={7}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                placeholder="Buscar por número OS ou cliente"
                value={filters.busca}
                onChange={(event) => updateFilter("busca", event.target.value)}
                style={{ borderRadius: 8, height: 40 }}
              />
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Select
                allowClear
                mode="multiple"
                maxTagCount="responsive"
                options={statusOptions}
                placeholder="Status"
                value={filters.status}
                onChange={(value) => updateFilter("status", value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Select
                allowClear
                options={serviceTypeOptions}
                placeholder="Tipo de serviço"
                value={filters.tipoServico}
                onChange={(value) => updateFilter("tipoServico", value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Select
                allowClear
                showSearch
                filterOption={(input, option) =>
                  String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                }
                options={technicianOptions}
                placeholder="Técnico"
                value={filters.tecnico}
                onChange={(value) => updateFilter("tecnico", value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <RangePicker
                format="DD/MM/YYYY"
                value={filters.periodo}
                onChange={(value) => updateFilter("periodo", value)}
                style={{ borderRadius: 8, width: "100%" }}
              />
            </Col>
            <Col xs={24}>
              <Button onClick={clearFilters} style={{ borderRadius: 8, fontWeight: 700 }}>
                Limpar filtros
              </Button>
            </Col>
          </Row>
        </Card>

        <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <Skeleton active loading={loading && orders.length === 0} paragraph={{ rows: 10 }} title={false}>
            <Table
              className="ordens-page-table"
              columns={columns}
              dataSource={orders}
              locale={{
                emptyText: (
                  <Empty description="Nenhuma ordem de serviço encontrada" style={{ margin: "44px 0" }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => navigate("/ordens/novo")}
                      style={{
                        height: 40,
                        paddingInline: 20,
                        fontWeight: 600,
                        fontSize: 14,
                        borderRadius: 10,
                      }}
                    >
                      Criar primeira OS
                    </Button>
                  </Empty>
                ),
              }}
              loading={loading && orders.length > 0}
              onRow={(record) => ({
                onClick: () => goToOrder(record),
                onMouseEnter: () => setHoveredRow(record.id),
                onMouseLeave: () => setHoveredRow(null),
                style: { cursor: "pointer" },
              })}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total,
                showSizeChanger: false,
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              }}
              rowKey="id"
              scroll={{ x: 1120 }}
            />
          </Skeleton>
        </Card>
      </div>
    </ConfigProvider>
  );
}

export default OrdensPage;
