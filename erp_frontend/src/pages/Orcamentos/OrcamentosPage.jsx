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
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  MergeCellsOutlined,
  PlusOutlined,
  RiseOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;

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

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const metricCardStyle = {
  ...panelStyle,
  minHeight: 124,
};

const filterStyle = {
  ...panelStyle,
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
  rascunho: { label: "Rascunho", color: colors.textoSecundario, background: "#F3F4F6" },
  enviado: { label: "Enviado", color: colors.azul, background: "#DBEAFE" },
  aprovado: { label: "Aprovado", color: colors.verde, background: "#DCFCE7" },
  recusado: { label: "Recusado", color: colors.vermelho, background: "#FEE2E2" },
  expirado: { label: "Expirado", color: colors.laranja, background: "#FFEDD5" },
};

const serviceTypeMap = {
  hvac: "HVAC",
  refrigeracao: "Refrigeração",
  eletrica: "Elétrica",
  civil: "Civil",
  manutencao: "Manutenção",
  instalacao: "Instalação",
  outro: "Outro",
};

const serviceColorMap = {
  hvac: "blue",
  refrigeracao: "cyan",
  eletrica: "gold",
  civil: "volcano",
  manutencao: "green",
  instalacao: "purple",
  outro: "default",
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

function getServiceType(record) {
  const type = String(firstDefined(record?.tipo_servico, "outro")).toLowerCase();
  return {
    raw: type,
    label: serviceTypeMap[type] || type,
    color: serviceColorMap[type] || "default",
  };
}

function getValueBreakdown(record) {
  const servicos = Number(firstDefined(record?.valor_servicos, 0));
  const materiais = Number(firstDefined(record?.valor_materiais, 0));
  const totalImpostos = Number(record?.dados_impostos?.total_impostos || record?.total_com_impostos || 0) - getValue(record);
  return {
    servicos: Number.isFinite(servicos) ? servicos : 0,
    materiais: Number.isFinite(materiais) ? materiais : 0,
    impostos: Number.isFinite(totalImpostos) && totalImpostos > 0 ? totalImpostos : 0,
  };
}

function getValidityMeta(record) {
  const validade = record?.validade_orcamento ? dayjs(record.validade_orcamento) : null;
  if (!validade?.isValid()) return { label: "Sem validade", color: "#64748B", background: "#F1F5F9", days: null };
  const days = validade.endOf("day").diff(dayjs().startOf("day"), "day");
  if (days < 0) return { label: `Vencido há ${Math.abs(days)}d`, color: "#B91C1C", background: "#FEE2E2", days };
  if (days <= 3) return { label: `${days}d para vencer`, color: "#C2410C", background: "#FFEDD5", days };
  if (days <= 7) return { label: `${days}d de validade`, color: "#A16207", background: "#FEF3C7", days };
  return { label: `${days}d de validade`, color: "#15803D", background: "#DCFCE7", days };
}

function getTechnicalScore(record) {
  let score = 0;
  const description = getDescription(record);
  const breakdown = getValueBreakdown(record);
  if (description.length >= 80) score += 25;
  if (record?.tipo_servico) score += 15;
  if (Number(record?.valor_servicos || 0) > 0) score += 15;
  if (Number(record?.valor_materiais || 0) > 0 || breakdown.materiais > 0) score += 15;
  if (record?.validade_orcamento) score += 10;
  if (record?.condicao_pagamento) score += 10;
  if (record?.observacoes_tecnicas) score += 10;
  return Math.min(score, 100);
}

function getStatusMeta(status) {
  return statusColorMap[status] || statusColorMap.rascunho;
}

function SummaryCard({ color, icon, label, loading, value, monetaryValue, percentage }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
      <Skeleton active loading={loading} paragraph={false} title={{ width: "58%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: colors.textoFraco,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                marginBottom: 14,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>

            {/* Main value (count) */}
            <div style={{ color: colors.texto, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
              {value}
            </div>

            {/* Monetary value if provided */}
            {monetaryValue && (
              <div style={{ marginTop: 10, color, fontSize: 14, fontWeight: 700 }}>
                {monetaryValue}
              </div>
            )}

            {/* Progress bar if percentage provided */}
            {percentage !== undefined && (
              <div style={{ marginTop: 10, height: 4, background: "#EEF2F7", borderRadius: 2, overflow: "hidden" }}>
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
              background: `${color}14`,
              borderRadius: 12,
              color,
              display: "flex",
              height: 44,
              justifyContent: "center",
              width: 44,
              fontSize: 20,
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
      valorTecnico: 0,
      materiais: 0,
      vencendo: 0,
      scoreMedio: 0,
    };

    rows.forEach((record) => {
      const status = mapBudgetStatus(record);
      const criadoEm = record?.criado_em ? dayjs(record.criado_em) : null;
      const value = getValue(record);
      const breakdown = getValueBreakdown(record);
      const validity = getValidityMeta(record);

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
      result.valorTecnico += value;
      result.materiais += breakdown.materiais;
      if (validity.days !== null && validity.days <= 7) result.vencendo += 1;
      result.scoreMedio += getTechnicalScore(record);
    });

    const decididos = result.aprovados + result.recusados;
    result.conversao = decididos > 0 ? Math.round((result.aprovados / decididos) * 100) : 0;
    result.scoreMedio = rows.length ? Math.round(result.scoreMedio / rows.length) : 0;
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
      title: "Orçamento",
      key: "numero",
      width: 210,
      render: (_, record) => {
        const type = getServiceType(record);
        return (
          <Space direction="vertical" size={6}>
            <Button
              type="link"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/orcamentos/${record.id}`);
              }}
              style={{ color: "#3B82F6", fontWeight: 900, padding: 0, height: "auto" }}
            >
              {getBudgetNumber(record)}
            </Button>
            <Space size={6} wrap>
              <Tag color={type.color} style={{ margin: 0, borderRadius: 999 }}>{type.label}</Tag>
              <Text style={{ color: "#64748B", fontSize: 12 }}>
                #{record.id}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Cliente",
      key: "cliente",
      width: 210,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "#0F172A" }}>{getClientName(record)}</Text>
          <Text style={{ color: "#64748B", fontSize: 12 }}>
            {record?.condicao_pagamento || "Condição a definir"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Escopo técnico",
      key: "descricao",
      width: 360,
      render: (_, record) => (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, maxWidth: 360, color: "#334155" }}>
            {getDescription(record)}
          </Paragraph>
          <Progress
            percent={getTechnicalScore(record)}
            size="small"
            showInfo={false}
            strokeColor={getTechnicalScore(record) >= 70 ? "#10B981" : getTechnicalScore(record) >= 45 ? "#F59E0B" : "#EF4444"}
          />
          <Text style={{ color: "#64748B", fontSize: 12 }}>
            Completude técnica: {getTechnicalScore(record)}%
          </Text>
        </Space>
      ),
    },
    {
      title: "Composição",
      key: "composicao",
      width: 210,
      render: (_, record) => {
        const breakdown = getValueBreakdown(record);
        return (
          <Space direction="vertical" size={3}>
            <Text strong style={{ color: "#0F172A" }}>{moneyFormatter.format(getValue(record))}</Text>
            <Text style={{ color: "#64748B", fontSize: 12 }}>
              Serviços: {moneyFormatter.format(breakdown.servicos)}
            </Text>
            <Text style={{ color: "#64748B", fontSize: 12 }}>
              Materiais: {moneyFormatter.format(breakdown.materiais)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Validade técnica",
      dataIndex: "validade_orcamento",
      key: "validade_orcamento",
      width: 160,
      render: (_, record) => {
        const validity = getValidityMeta(record);
        return (
          <Space direction="vertical" size={4}>
            <span
              style={{
                background: validity.background,
                borderRadius: 999,
                color: validity.color,
                display: "inline-flex",
                fontSize: 12,
                fontWeight: 800,
                padding: "5px 10px",
              }}
            >
              {validity.label}
            </span>
            <Text style={{ color: "#64748B", fontSize: 12 }}>
              {record?.validade_orcamento ? dayjs(record.validade_orcamento).format("DD/MM/YYYY") : "Sem data"}
            </Text>
          </Space>
        );
      },
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
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }

            .orcamentos-table .ant-table-tbody > tr > td {
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
              Orçamentos
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Controle de escopo, composição técnica, validade e conversão de propostas.
            </Text>
          </div>
          <Space wrap>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => navigate("/orcamentos/inteligente")}
              style={{
                height: 40,
                paddingInline: 18,
                fontWeight: 600,
                borderRadius: 10,
              }}
            >
              Modelo técnico
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/orcamentos/novo")}
              style={{
                height: 40,
                paddingInline: 20,
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 10,
              }}
            >
              Novo orçamento
            </Button>
          </Space>
        </div>

        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.laranja}
              icon={<ClockCircleOutlined />}
              label="Pendentes técnicos"
              loading={loading}
              value={summary.pendentes}
              monetaryValue={moneyFormatter.format(summary.pendentesTotal)}
              percentage={(summary.pendentes / (rows.length || 1)) * 100}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.verde}
              icon={<CheckCircleOutlined />}
              label="Aprovados no mês"
              loading={loading}
              value={summary.aprovados}
              monetaryValue={moneyFormatter.format(summary.aprovadosTotal)}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.vermelho}
              icon={<CloseCircleOutlined />}
              label="Recusados / cancelados"
              loading={loading}
              value={summary.recusados}
              monetaryValue={moneyFormatter.format(summary.recusadosTotal)}
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard
              color={colors.azul}
              icon={<RiseOutlined />}
              label="Conversão técnica"
              loading={loading}
              value={`${summary.conversao}%`}
              percentage={summary.conversao}
            />
          </Col>
        </Row>

        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 24 }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Text style={{ color: colors.textoFraco, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Painel técnico
              </Text>
              <div style={{ color: colors.textoSecundario, marginTop: 6 }}>
                Leitura rápida dos pontos que travam aprovação: validade, materiais, escopo e completude.
              </div>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={{ borderRadius: 12, background: colors.fundoSuave, border: `1px solid ${colors.borda}` }} bodyStyle={{ padding: 16 }}>
                  <Space align="start">
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${colors.laranja}14`,
                        color: colors.laranja,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      <WarningOutlined />
                    </div>
                    <div>
                      <Text type="secondary">Vencendo em até 7 dias</Text>
                      <div style={{ fontSize: 22, fontWeight: 800, color: colors.texto }}>{summary.vencendo}</div>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={{ borderRadius: 12, background: colors.fundoSuave, border: `1px solid ${colors.borda}` }} bodyStyle={{ padding: 16 }}>
                  <Space align="start">
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${colors.verde}14`,
                        color: colors.verde,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      <AuditOutlined />
                    </div>
                    <div>
                      <Text type="secondary">Completude média</Text>
                      <div style={{ fontSize: 22, fontWeight: 800, color: colors.texto }}>{summary.scoreMedio}%</div>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={{ borderRadius: 12, background: colors.fundoSuave, border: `1px solid ${colors.borda}` }} bodyStyle={{ padding: 16 }}>
                  <Space align="start">
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${colors.azul}14`,
                        color: colors.azul,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      <DollarOutlined />
                    </div>
                    <div>
                      <Text type="secondary">Carteira técnica</Text>
                      <div style={{ fontSize: 18, fontWeight: 800, color: colors.texto }}>{moneyFormatter.format(summary.valorTecnico)}</div>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card bordered={false} style={{ borderRadius: 12, background: colors.fundoSuave, border: `1px solid ${colors.borda}` }} bodyStyle={{ padding: 16 }}>
                  <Space align="start">
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${colors.roxo}14`,
                        color: colors.roxo,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      <AppstoreOutlined />
                    </div>
                    <div>
                      <Text type="secondary">Materiais previstos</Text>
                      <div style={{ fontSize: 18, fontWeight: 800, color: colors.texto }}>{moneyFormatter.format(summary.materiais)}</div>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        <Card bordered={false} style={filterStyle} bodyStyle={{ padding: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} lg={9}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                placeholder="Buscar por número, cliente ou escopo"
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
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum orçamento encontrado" style={{ margin: "44px 0" }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => navigate("/orcamentos/novo")}
                      style={{
                        height: 40,
                        paddingInline: 20,
                        fontWeight: 600,
                        fontSize: 14,
                        borderRadius: 10,
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
              scroll={{ x: 1280 }}
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
            background: "#FFFFFF",
            borderRadius: 16,
            boxShadow: "0 18px 44px rgba(15, 23, 42, 0.16)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            zIndex: 1000,
            border: `1px solid ${colors.borda}`,
            transition: "all 0.2s ease",
            opacity: selectedIds.length >= 2 ? 1 : 0,
            pointerEvents: selectedIds.length >= 2 ? "auto" : "none",
          }}
        >
          <Text strong style={{ color: colors.texto, whiteSpace: "nowrap" }}>
            {selectedIds.length} orçamentos selecionados
          </Text>
          <Button size="small" onClick={() => setSelectedIds([])} style={{ borderRadius: 8 }}>
            Limpar seleção
          </Button>
          <Button
            type="primary"
            icon={<MergeCellsOutlined />}
            onClick={() => navigate(`/orcamentos/unificado?ids=${selectedIds.join(",")}`)}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Unificar Orçamentos
          </Button>
        </div>
      </div>
    </ConfigProvider>
  );
}
