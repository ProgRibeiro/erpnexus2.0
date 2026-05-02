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
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  RiseOutlined,
  SearchOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;

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

function SummaryCard({ color, icon, label, loading, value }) {
  return (
    <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 18 }}>
      <Skeleton active loading={loading} paragraph={false} title={{ width: "58%" }}>
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ color, fontSize: 30, fontWeight: 800 }}>{value}</div>
            <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
              {label}
            </Text>
          </div>
          <div
            style={{
              alignItems: "center",
              background: `${color}14`,
              borderRadius: 12,
              color,
              display: "flex",
              height: 46,
              justifyContent: "center",
              width: 46,
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

        let response = await api.get("/ordens/", { params: { ...params, tipo: "orcamento" } });
        let normalized = normalizeList(response.data);
        let filteredRows = normalized.rows.filter(isBudgetRecord);

        if (filteredRows.length === 0) {
          response = await api.get("/ordens/", { params });
          normalized = normalizeList(response.data);
          filteredRows = normalized.rows.filter(isBudgetRecord);
        }

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
      aprovados: 0,
      recusados: 0,
      conversao: 0,
    };

    rows.forEach((record) => {
      const status = mapBudgetStatus(record);
      const criadoEm = record?.criado_em ? dayjs(record.criado_em) : null;

      if (["rascunho", "enviado", "expirado"].includes(status)) result.pendentes += 1;
      if (status === "aprovado" && criadoEm?.format("YYYY-MM") === currentMonth) result.aprovados += 1;
      if (status === "recusado") result.recusados += 1;
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
          style={{ color: "#1B4F8A", fontWeight: 800, padding: 0 }}
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
              <Button type="text" icon={<FilePdfOutlined />} onClick={() => handlePdf(record)} style={{ color: "#1B4F8A" }} />
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

        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Title level={1} style={{ color: "#111827", fontSize: 24, fontWeight: 800, margin: 0 }}>
            Orçamentos
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/orcamentos/novo")}
            style={{
              background: "#1B4F8A",
              borderColor: "#1B4F8A",
              color: "#ffffff",
              height: "40px",
              paddingLeft: "20px",
              paddingRight: "20px",
              fontWeight: 500,
              fontSize: "14px",
              borderRadius: "8px",
            }}
          >
            Novo Orçamento
          </Button>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard color="#D97706" icon={<ClockCircleOutlined style={{ fontSize: 22 }} />} label="Pendentes" loading={loading} value={summary.pendentes} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard color="#15803D" icon={<CheckCircleOutlined style={{ fontSize: 22 }} />} label="Aprovados este mês" loading={loading} value={summary.aprovados} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard color="#B91C1C" icon={<CloseCircleOutlined style={{ fontSize: 22 }} />} label="Recusados" loading={loading} value={summary.recusados} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard color="#1B4F8A" icon={<RiseOutlined style={{ fontSize: 22 }} />} label="Taxa de conversão %" loading={loading} value={`${summary.conversao}%`} />
          </Col>
        </Row>

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
                        background: "#1B4F8A",
                        borderColor: "#1B4F8A",
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
      </div>
    </ConfigProvider>
  );
}
