import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Empty,
  Input,
  Modal,
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
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  MergeCellsOutlined,
  PlusOutlined,
  RiseOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;

const pageStyle = {
  minHeight: "100vh",
  background: "#F8FAFC",
  padding: 24,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusOptions = [
  { label: "Rascunho", value: "rascunho" },
  { label: "Enviado", value: "enviado" },
  { label: "Aprovado", value: "aprovado" },
  { label: "Recusado", value: "recusado" },
  { label: "Expirado", value: "expirado" },
];

const statusColorMap = {
  rascunho: { label: "Rascunho", color: "#6B7280", background: "#F3F4F6" },
  enviado: { label: "Enviado", color: "#2563EB", background: "#DBEAFE" },
  aprovado: { label: "Aprovado", color: "#15803D", background: "#DCFCE7" },
  recusado: { label: "Recusado", color: "#B91C1C", background: "#FEE2E2" },
  expirado: { label: "Expirado", color: "#C2410C", background: "#FFEDD5" },
};

function normalizeList(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (Array.isArray(data?.results)) return { rows: data.results, total: data.count || data.results.length };
  return { rows: [], total: 0 };
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function mapBudgetStatus(record) {
  const rawStatus = String(record?.status || "").toLowerCase();
  const validade = record?.validade_orcamento ? dayjs(record.validade_orcamento) : null;

  if (validade && validade.isValid() && validade.endOf("day").isBefore(dayjs()) && ["rascunho", "orcamento_enviado"].includes(rawStatus)) {
    return "expirado";
  }

  if (rawStatus === "orcamento_enviado") return "enviado";
  if (rawStatus === "aprovada") return "aprovado";
  if (rawStatus === "cancelada") return "recusado";
  if (rawStatus === "rascunho") return "rascunho";

  return "rascunho";
}

function isBudgetRecord(record) {
  const rawStatus = String(record?.status || "").toLowerCase();
  return ["rascunho", "orcamento_enviado", "aprovada", "cancelada"].includes(rawStatus) || Boolean(record?.validade_orcamento);
}

function getBudgetNumber(record) {
  const numero = firstDefined(record?.numero, `ORC-${dayjs().year()}-${String(record?.id || 1).padStart(4, "0")}`);
  if (String(numero).startsWith("ORC-")) return numero;
  const suffix = String(numero).split("-").slice(-1)[0] || String(record?.id || 1).padStart(4, "0");
  return `ORC-${dayjs().year()}-${suffix.padStart(4, "0")}`;
}

function getValue(record) {
  const value = Number(firstDefined(record?.valor_total_orcado, record?.valor_final_faturado, record?.valor, 0));
  return Number.isFinite(value) ? value : 0;
}

function getClientName(record) {
  return firstDefined(record?.cliente_nome, record?.cliente?.nome, "Cliente não informado");
}

function getDescription(record) {
  const description = firstDefined(record?.descricao_servico, record?.observacoes_tecnicas, "Sem descrição");
  return String(description);
}

function getStatusMeta(status) {
  return statusColorMap[status] || statusColorMap.rascunho;
}

function SummaryCard({ color, icon, label, loading, value, monetaryValue, percentage }) {
  return (
    <Card
      bordered={false}
      style={{ ...panelStyle, position: "relative", overflow: "hidden" }}
      bodyStyle={{ padding: 18 }}
    >
      {/* Left colored accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: color,
        }}
      />

      <Skeleton active loading={loading} paragraph={false} title={{ width: "58%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            {/* Main value (count) */}
            <div style={{ color: "#1E293B", fontSize: 32, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>
              {value}
            </div>

            {/* Label */}
            <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {label}
            </Text>

            {/* Monetary value if provided */}
            {monetaryValue && (
              <div style={{ marginTop: 8, color, fontSize: 14, fontWeight: 700 }}>
                {monetaryValue}
              </div>
            )}

            {/* Progress bar if percentage provided */}
            {percentage !== undefined && (
              <div style={{ marginTop: 8, height: 4, background: "#E5E7EB", borderRadius: 2, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    background: color,
                    width: `${Math.min(percentage, 100)}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}
          </div>

          {/* Icon */}
          <div
            style={{
              alignItems: "center",
              background: `${color}18`,
              borderRadius: 12,
              color,
              display: "flex",
              height: 50,
              justifyContent: "center",
              width: 50,
              flexShrink: 0,
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
      }}
    >
      <Badge color={meta.color} />
      {meta.label}
    </span>
  );
}

export default function OrcamentosPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    busca: "",
    status: undefined,
    periodo: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadBudgets() {
      try {
        setLoading(true);
        const params = {};

        if (filters.busca) params.search = filters.busca;
        if (filters.periodo?.[0]) params.periodo_inicio = filters.periodo[0].format("YYYY-MM-DD");
        if (filters.periodo?.[1]) params.periodo_fim = filters.periodo[1].format("YYYY-MM-DD");

        const response = await api.get("/ordens/", { params: { ...params, modo: "orcamento" } });
        const normalized = normalizeList(response.data);
        let filteredRows = normalized.rows.filter(isBudgetRecord);

        if (filters.status) {
          filteredRows = filteredRows.filter((record) => mapBudgetStatus(record) === filters.status);
        }

        if (!isMounted) return;
        setRows(filteredRows);
      } catch {
        if (!isMounted) return;
        setRows([]);
        message.warning("Não foi possível carregar os orçamentos.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBudgets();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const paginatedRows = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return rows.slice(start, end);
  }, [pagination, rows]);

  const summary = useMemo(() => {
    const currentMonth = dayjs().format("YYYY-MM");
    const result = {
      pendentes: 0,
      pendentesTotal: 0,
      aprovados: 0,
      aprovadosTotal: 0,
      recusados: 0,
      recusadosTotal: 0,
      conversao: 0,
    };

    rows.forEach((record) => {
      const status = mapBudgetStatus(record);
      const criadoEm = record?.criado_em ? dayjs(record.criado_em) : null;
      const value = getValue(record);

      if (["rascunho", "enviado", "expirado"].includes(status)) {
        result.pendentes += 1;
        result.pendentesTotal += value;
      }
      if (status === "aprovado" && criadoEm?.format("YYYY-MM") === currentMonth) {
        result.aprovados += 1;
        result.aprovadosTotal += value;
      }
      if (status === "recusado") {
        result.recusados += 1;
        result.recusadosTotal += value;
      }
    });

    const decididos = result.aprovados + result.recusados;
    result.conversao = decididos > 0 ? Math.round((result.aprovados / decididos) * 100) : 0;
    return result;
  }, [rows]);

  const handleApprove = async (record) => {
    Modal.confirm({
      title: "Aprovar orçamento",
      content: "Deseja aprovar este orçamento agora? Ele seguirá para o fluxo de Ordem de Serviço.",
      okText: "Aprovar",
      cancelText: "Cancelar",
      async onOk() {
        try {
          const response = await api.post(`/ordens/${record.id}/mudar-status/`, {
            status: "aprovada",
          });
          message.success("Orçamento aprovado com sucesso.");
          navigate(`/orcamentos/${response.data?.id || record.id}`);
        } catch {
          message.error("Não foi possível aprovar o orçamento.");
        }
      },
    });
  };

  const handlePdf = async (record) => {
    try {
      const response = await api.post(`/ordens/${record.id}/gerar-pdf-orcamento/`, {}, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${getBudgetNumber(record)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("PDF do orçamento gerado.");
    } catch {
      message.error("Não foi possível gerar o PDF do orçamento.");
    }
  };

  const columns = [
    {
      title: "Número",
      key: "numero",
      width: 170,
      render: (_, record) => (
        <Button
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/orcamentos/${record.id}`);
          }}
          style={{ color: "#3B82F6", fontWeight: 800, padding: 0 }}
        >
          {getBudgetNumber(record)}
        </Button>
      ),
    },
    {
      title: "Cliente",
      key: "cliente",
      render: (_, record) => <Text strong>{getClientName(record)}</Text>,
    },
    {
      title: "Descrição resumida do serviço",
      key: "descricao",
      ellipsis: true,
      render: (_, record) => (
        <Paragraph ellipsis={{ rows: 1 }} style={{ marginBottom: 0, maxWidth: 380 }}>
          {getDescription(record)}
        </Paragraph>
      ),
    },
    {
      title: "Valor total",
      key: "valor_total",
      align: "right",
      width: 140,
      render: (_, record) => <Text strong>{moneyFormatter.format(getValue(record))}</Text>,
    },
    {
      title: "Validade",
      dataIndex: "validade_orcamento",
      key: "validade_orcamento",
      width: 130,
      render: (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Status",
      key: "status",
      width: 140,
      render: (_, record) => <StatusBadge status={mapBudgetStatus(record)} />,
    },
    {
      title: "Ações",
      key: "acoes",
      align: "right",
      width: 172,
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
            <Tooltip title="Ver">
              <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/orcamentos/${record.id}`)} />
            </Tooltip>
            <Tooltip title="Editar">
              <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/orcamentos/${record.id}?modo=edicao`)} />
            </Tooltip>
            <Tooltip title="Aprovar">
              <Button type="text" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record)} style={{ color: "#15803D" }} />
            </Tooltip>
            <Tooltip title="Gerar PDF">
              <Button type="text" icon={<FilePdfOutlined />} onClick={() => handlePdf(record)} style={{ color: "#3B82F6" }} />
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
            .orcamentos-table .ant-table-thead > tr > th {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
            }
          `}
        </style>

        {/* Light hero header */}
        <div
          style={{
            background: "linear-gradient(135deg, #F0F9FF 0%, #F8FAFC 60%, #EFF6FF 100%)",
            borderRadius: 16,
            padding: "20px 28px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            border: "1px solid #E2E8F0",
          }}
        >
          <div>
            <Title level={2} style={{ color: "#1E293B", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              Orçamentos
            </Title>
            <Text style={{ color: "#64748B", fontSize: 13 }}>Pipeline de propostas comerciais</Text>
          </div>
          <Space wrap>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => navigate("/orcamentos/inteligente")}
              style={{
                height: "40px",
                paddingLeft: "18px",
                paddingRight: "18px",
                fontWeight: 700,
                borderRadius: "8px",
                background: "#F1F5F9",
                color: "#1E293B",
                border: "1px solid #CBD5E1",
              }}
            >
              Inteligente
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/orcamentos/novo")}
              style={{
                background: "#3B82F6",
                borderColor: "#3B82F6",
                color: "#ffffff",
                height: "40px",
                paddingLeft: "20px",
                paddingRight: "20px",
                fontWeight: 600,
                fontSize: "14px",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
              }}
            >
              Novo Orçamento
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color="#D97706"
              icon={<ClockCircleOutlined style={{ fontSize: 22 }} />}
              label="Pendentes"
              loading={loading}
              value={summary.pendentes}
              monetaryValue={moneyFormatter.format(summary.pendentesTotal)}
              percentage={(summary.pendentes / (rows.length || 1)) * 100}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color="#15803D"
              icon={<CheckCircleOutlined style={{ fontSize: 22 }} />}
              label="Aprovados este mês"
              loading={loading}
              value={summary.aprovados}
              monetaryValue={moneyFormatter.format(summary.aprovadosTotal)}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color="#B91C1C"
              icon={<CloseCircleOutlined style={{ fontSize: 22 }} />}
              label="Recusados"
              loading={loading}
              value={summary.recusados}
              monetaryValue={moneyFormatter.format(summary.recusadosTotal)}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color="#3B82F6"
              icon={<RiseOutlined style={{ fontSize: 22 }} />}
              label="Taxa de conversão"
              loading={loading}
              value={`${summary.conversao}%`}
              percentage={summary.conversao}
            />
          </Col>
        </Row>

        {/* Pipeline Funnel Visualization */}
        <Card
          bordered={false}
          style={{ ...panelStyle, background: "#FFFFFF", marginBottom: 24 }}
          bodyStyle={{ padding: "24px" }}
        >
          <h3 style={{ color: "#1E293B", fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pipeline Visual
          </h3>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              justifyContent: "space-around",
              minHeight: 140,
              flexWrap: "wrap",
            }}
          >
            {/* Rascunho */}
            <div style={{ flex: "0.8 1", minWidth: 100, textAlign: "center", cursor: "pointer" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)",
                  borderRadius: 12,
                  padding: "16px 12px",
                  marginBottom: 12,
                  minHeight: 80,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  transition: "transform 0.2s",
                  border: "1px solid #D1D5DB",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Rascunho</Text>
                <Text style={{ color: "#1F2937", fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                  {rows.filter((r) => mapBudgetStatus(r) === "rascunho").length}
                </Text>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: "#CBD5E1", marginBottom: 12 }}>
              →
            </div>

            {/* Enviado */}
            <div style={{ flex: "1.1 1", minWidth: 110, textAlign: "center", cursor: "pointer" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
                  borderRadius: 12,
                  padding: "16px 12px",
                  marginBottom: 12,
                  minHeight: 100,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  transition: "transform 0.2s",
                  border: "1px solid #93C5FD",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                <Text style={{ color: "#1E40AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Enviado</Text>
                <Text style={{ color: "#1E3A8A", fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                  {rows.filter((r) => mapBudgetStatus(r) === "enviado").length}
                </Text>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: "#CBD5E1", marginBottom: 12 }}>
              →
            </div>

            {/* Aprovado */}
            <div style={{ flex: "1.4 1", minWidth: 130, textAlign: "center", cursor: "pointer" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)",
                  borderRadius: 12,
                  padding: "16px 12px",
                  marginBottom: 12,
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  transition: "transform 0.2s",
                  border: "1px solid #6EE7B7",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                <Text style={{ color: "#065F46", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Aprovado</Text>
                <Text style={{ color: "#047857", fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                  {rows.filter((r) => mapBudgetStatus(r) === "aprovado").length}
                </Text>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: "#CBD5E1", marginBottom: 12 }}>
              →
            </div>

            {/* Recusado */}
            <div style={{ flex: "0.7 1", minWidth: 90, textAlign: "center", cursor: "pointer" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #FECACA 0%, #FCA5A5 100%)",
                  borderRadius: 12,
                  padding: "16px 12px",
                  marginBottom: 12,
                  minHeight: 60,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  transition: "transform 0.2s",
                  border: "1px solid #F87171",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                <Text style={{ color: "#7F1D1D", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Recusado</Text>
                <Text style={{ color: "#991B1B", fontSize: 18, fontWeight: 800, marginTop: 6 }}>
                  {rows.filter((r) => mapBudgetStatus(r) === "recusado").length}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        <Card bordered={false} style={{ ...panelStyle, marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} lg={9}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                placeholder="Busca por número ou cliente"
                value={filters.busca}
                onChange={(event) => setFilters((current) => ({ ...current, busca: event.target.value }))}
                style={{ borderRadius: 8, height: 40 }}
              />
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Select
                allowClear
                options={statusOptions}
                placeholder="Status"
                value={filters.status}
                onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <RangePicker
                format="DD/MM/YYYY"
                value={filters.periodo}
                onChange={(value) => setFilters((current) => ({ ...current, periodo: value }))}
                style={{ borderRadius: 8, width: "100%" }}
              />
            </Col>
            <Col xs={24} lg={4}>
              <Button
                onClick={() => setFilters({ busca: "", status: undefined, periodo: null })}
                style={{ borderRadius: 8, fontWeight: 700 }}
              >
                Limpar filtros
              </Button>
            </Col>
          </Row>
        </Card>

        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 0 }}>
          <Skeleton active loading={loading && rows.length === 0} paragraph={{ rows: 9 }} title={false}>
            <Table
              className="orcamentos-table"
              columns={columns}
              dataSource={paginatedRows}
              rowKey="id"
              rowSelection={{
                type: "checkbox",
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys),
                getCheckboxProps: (record) => ({ name: String(record.id) }),
              }}
              onRow={(record) => ({
                onClick: () => navigate(`/orcamentos/${record.id}`),
                onMouseEnter: () => setHoveredRow(record.id),
                onMouseLeave: () => setHoveredRow(null),
                style: { cursor: "pointer" },
              })}
              locale={{
                emptyText: (
                  <Empty description="Nenhum orçamento encontrado" style={{ margin: "44px 0" }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => navigate("/orcamentos/novo")}
                      style={{
                        background: "#3B82F6",
                        borderColor: "#3B82F6",
                        color: "#ffffff",
                        height: "40px",
                        paddingLeft: "20px",
                        paddingRight: "20px",
                        fontWeight: 500,
                        fontSize: "14px",
                        borderRadius: "8px",
                      }}
                    >
                      Criar primeiro orçamento
                    </Button>
                  </Empty>
                ),
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: rows.length,
                showSizeChanger: false,
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              }}
              scroll={{ x: 1040 }}
            />
          </Skeleton>
        </Card>

        {/* ── BARRA FLUTUANTE DE SELEÇÃO MÚLTIPLA ── */}
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            zIndex: 1000,
            border: "1.5px solid #E2E6EC",
            transition: "all 0.2s ease",
            opacity: selectedIds.length >= 2 ? 1 : 0,
            pointerEvents: selectedIds.length >= 2 ? "auto" : "none",
          }}
        >
          <Text strong style={{ color: "#1E293B", whiteSpace: "nowrap" }}>
            {selectedIds.length} orçamentos selecionados
          </Text>
          <Button size="small" onClick={() => setSelectedIds([])}>
            Limpar seleção
          </Button>
          <Button
            type="primary"
            icon={<MergeCellsOutlined />}
            onClick={() => navigate(`/orcamentos/unificado?ids=${selectedIds.join(",")}`)}
            style={{ background: "#3B82F6", borderColor: "#3B82F6" }}
          >
            Unificar Orçamentos
          </Button>
        </div>
      </div>
    </ConfigProvider>
  );
}
