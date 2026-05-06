import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";

const { Text, Title } = Typography;

const emptyDashboard = {
  ordens_abertas: 0,
  ordens_abertas_variacao: 0,
  em_execucao_hoje: 0,
  em_execucao_hoje_variacao: 0,
  receita_mes: 0,
  receita_mes_variacao: 0,
  aguardando_faturamento_total: 0,
  aguardando_faturamento_variacao: 0,
  meses: [],
  aguardando_faturamento: [],
  pagamentos_atrasados: [],
};

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: "24px 28px",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E8EDF2",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
};

const metricCardStyle = {
  ...panelStyle,
  height: "100%",
  overflow: "hidden",
  position: "relative",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#0F172A",
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const shortCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function normalizeDashboard(data) {
  const chartSource = normalizeList(
    firstDefined(data?.ultimos_6_meses, data?.receita_despesa, data?.por_mes, data?.meses)
  );

  return {
    ordens_abertas: toNumber(firstDefined(data?.ordens_abertas, data?.os_abertas)),
    ordens_abertas_variacao: toNumber(
      firstDefined(data?.ordens_abertas_variacao, data?.ordens_abertas_change, data?.variacoes?.ordens_abertas)
    ),
    em_execucao_hoje: toNumber(
      firstDefined(data?.em_execucao_hoje, data?.ordens_em_execucao_hoje, data?.ordens_em_execucao)
    ),
    em_execucao_hoje_variacao: toNumber(
      firstDefined(data?.em_execucao_hoje_variacao, data?.ordens_em_execucao_change, data?.variacoes?.em_execucao_hoje)
    ),
    receita_mes: toNumber(firstDefined(data?.receita_mes, data?.receita, data?.receita_do_mes)),
    receita_mes_variacao: toNumber(
      firstDefined(data?.receita_mes_variacao, data?.receita_change, data?.variacoes?.receita_mes)
    ),
    aguardando_faturamento_total: toNumber(
      firstDefined(data?.aguardando_faturamento_total, data?.aguardando_faturamento_valor, data?.contas_receber)
    ),
    aguardando_faturamento_variacao: toNumber(
      firstDefined(
        data?.aguardando_faturamento_variacao,
        data?.contas_receber_change,
        data?.variacoes?.aguardando_faturamento
      )
    ),
    meses: chartSource.map((item) => ({
      mes: firstDefined(item.mes, item.month, item.nome, "-"),
      receita: toNumber(firstDefined(item.receita, item.total_receita, item.entradas)),
      despesa: toNumber(firstDefined(item.despesa, item.despesas, item.total_despesa, item.saidas)),
    })),
    aguardando_faturamento: normalizeList(
      firstDefined(data?.aguardando_faturamento, data?.aguardando_faturamento_lista, data?.contas_receber_lista)
    ),
    pagamentos_atrasados: normalizeList(
      firstDefined(data?.pagamentos_atrasados, data?.pagamentos_atrasados_lista, data?.contas_pagar_lista)
    ),
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getFormattedDate() {
  const formatted = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getFirstName(user) {
  return (
    user?.first_name ||
    user?.nome_completo?.split(" ")[0] ||
    user?.nome?.split(" ")[0] ||
    user?.username ||
    "Lucas"
  );
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

function getStatusColor(status = "") {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("concl")) return "green";
  if (normalized.includes("exec")) return "purple";
  if (normalized.includes("cancel")) return "red";
  if (normalized.includes("agend")) return "blue";
  if (normalized.includes("fatur")) return "orange";
  return "default";
}

function getClienteName(record) {
  return firstDefined(record?.cliente?.nome, record?.cliente_nome, record?.nome_cliente, "Cliente nao informado");
}

function getOsNumber(record) {
  return firstDefined(record?.numero, record?.codigo, record?.ordem_servico, record?.os, record?.id, "-");
}

function getValue(record) {
  return toNumber(firstDefined(record?.valor, record?.valor_total, record?.total, record?.saldo));
}

function getDays(record, keys) {
  return toNumber(keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null));
}

function formatTime(record) {
  const raw = firstDefined(record?.horario, record?.hora, record?.data_hora, record?.data_agendada, record?.inicio);
  if (!raw) return "--:--";

  if (/^\d{2}:\d{2}/.test(String(raw))) {
    return String(raw).slice(0, 5);
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricCard({ color, icon, label, loading, value, variation }) {
  const isPositive = toNumber(variation) >= 0;
  const variationColor = isPositive ? "#059669" : "#DC2626";
  const variationBg = isPositive ? "#ECFDF5" : "#FEF2F2";
  const absVariation = Math.abs(toNumber(variation)).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });

  return (
    <Card
      bordered={false}
      style={metricCardStyle}
      bodyStyle={{ padding: 0 }}
    >
      {/* colored top accent */}
      <div style={{ height: 3, background: color, borderRadius: "12px 12px 0 0" }} />

      <Skeleton active loading={loading} paragraph={{ rows: 2 }} title={false}>
        <div style={{ padding: "18px 20px 20px" }}>
          {/* Label + icon row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text
              style={{
                color: "#6B7280",
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </Text>
            <div
              style={{
                alignItems: "center",
                background: `${color}18`,
                borderRadius: 9,
                color,
                display: "flex",
                height: 38,
                justifyContent: "center",
                width: 38,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          </div>

          {/* Big number */}
          <div
            style={{
              color: "#0F172A",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              marginTop: 14,
            }}
          >
            {value}
          </div>

          {/* Trend badge */}
          <div style={{ alignItems: "center", display: "flex", gap: 8, marginTop: 14 }}>
            <span
              style={{
                alignItems: "center",
                background: variationBg,
                borderRadius: 20,
                color: variationColor,
                display: "inline-flex",
                fontSize: 12,
                fontWeight: 700,
                gap: 3,
                padding: "3px 9px",
              }}
            >
              {isPositive ? (
                <ArrowUpOutlined style={{ fontSize: 10 }} />
              ) : (
                <ArrowDownOutlined style={{ fontSize: 10 }} />
              )}
              {absVariation}%
            </span>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>vs mês anterior</Text>
          </div>
        </div>
      </Skeleton>
    </Card>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [scheduledOrders, setScheduledOrders] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        const [financeiroResponse, agendaResponse] = await Promise.all([
          api.get("/financeiro/dashboard/"),
          api.get("/ordens/agenda/hoje/"),
        ]);

        if (!isMounted) return;

        setDashboard(normalizeDashboard(financeiroResponse.data || {}));
        setScheduledOrders(normalizeList(agendaResponse.data));
      } catch {
        if (!isMounted) return;
        setDashboard(emptyDashboard);
        setScheduledOrders([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const chartData = useMemo(() => {
    if (dashboard.meses.length > 0) return dashboard.meses.slice(-6);

    return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"].map((mes) => ({
      mes,
      receita: 0,
      despesa: 0,
    }));
  }, [dashboard.meses]);

  const faturamentoRows = useMemo(
    () =>
      dashboard.aguardando_faturamento
        .slice(0, 5)
        .map((record, index) => ({ ...record, key: record.id || `faturamento-${index}` })),
    [dashboard.aguardando_faturamento]
  );

  const atrasoRows = useMemo(
    () =>
      dashboard.pagamentos_atrasados
        .slice()
        .sort(
          (a, b) =>
            getDays(b, ["dias_atraso", "dias_em_atraso", "dias"]) -
            getDays(a, ["dias_atraso", "dias_em_atraso", "dias"])
        )
        .slice(0, 5)
        .map((record, index) => ({ ...record, key: record.id || `atraso-${index}` })),
    [dashboard.pagamentos_atrasados]
  );

  const tableBaseColumns = [
    {
      title: "OS",
      key: "os",
      render: (_, record) => <Text strong>#{getOsNumber(record)}</Text>,
    },
    {
      title: "Cliente",
      key: "cliente",
      ellipsis: true,
      render: (_, record) => getClienteName(record),
    },
    {
      title: "Valor",
      key: "valor",
      align: "right",
      render: (_, record) => <Text strong>{currencyFormatter.format(getValue(record))}</Text>,
    },
  ];

  const faturamentoColumns = [
    ...tableBaseColumns,
    {
      title: "Dias aguardando",
      key: "dias_aguardando",
      align: "center",
      render: (_, record) => {
        const days = getDays(record, ["dias_aguardando", "dias_em_aberto", "dias"]);
        return days > 3 ? <Tag color="red">{days} dias</Tag> : <Tag>{days} dias</Tag>;
      },
    },
  ];

  const atrasoColumns = [
    ...tableBaseColumns,
    {
      title: "Dias atraso",
      key: "dias_atraso",
      align: "center",
      render: (_, record) => {
        const days = getDays(record, ["dias_atraso", "dias_em_atraso", "dias"]);
        return <Tag color={days > 0 ? "red" : "default"}>{days} dias</Tag>;
      },
    },
  ];

  const cardHeader = (title, route) => (
    <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 }}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <Button type="link" onClick={() => navigate(route)} style={{ color: "#3B82F6", paddingInline: 0 }}>
        ver todas <ArrowRightOutlined />
      </Button>
    </div>
  );

  return (
    <div style={pageStyle}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <Title
          level={1}
          style={{
            color: "#0F172A",
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {getGreeting()}, {getFirstName(user)}! 👋
        </Title>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <Text style={{ color: "#64748B", fontSize: 14 }}>{getFormattedDate()}</Text>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#CBD5E1", display: "inline-block" }} />
          <Text style={{ color: "#94A3B8", fontSize: 14 }}>Resumo do dia</Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            color="#3B82F6"
            icon={<FileTextOutlined style={{ fontSize: 20 }} />}
            label="OS Abertas"
            loading={loading}
            value={dashboard.ordens_abertas}
            variation={dashboard.ordens_abertas_variacao}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            color="#8B5CF6"
            icon={<ToolOutlined style={{ fontSize: 20 }} />}
            label="Em Execução Hoje"
            loading={loading}
            value={dashboard.em_execucao_hoje}
            variation={dashboard.em_execucao_hoje_variacao}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            color="#10B981"
            icon={<DollarOutlined style={{ fontSize: 20 }} />}
            label="Receita do Mês"
            loading={loading}
            value={shortCurrencyFormatter.format(dashboard.receita_mes)}
            variation={dashboard.receita_mes_variacao}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            color="#F59E0B"
            icon={<ClockCircleOutlined style={{ fontSize: 20 }} />}
            label="Aguardando Faturamento"
            loading={loading}
            value={shortCurrencyFormatter.format(dashboard.aguardando_faturamento_total)}
            variation={dashboard.aguardando_faturamento_variacao}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: "20px 20px 16px" }}>
            <Skeleton active loading={loading} paragraph={{ rows: 8 }} title={{ width: "55%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={sectionTitleStyle}>Receita vs Despesa</h2>
                  <Text style={{ color: "#94A3B8", fontSize: 12 }}>últimos 6 meses</Text>
                </div>
              </div>
              <div style={{ height: 300, width: "100%" }}>
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={chartData} barCategoryGap="35%">
                    <CartesianGrid stroke="#F1F4F8" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      stroke="#9CA3AF"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      axisLine={false}
                      tickFormatter={(value) => shortCurrencyFormatter.format(value)}
                      tickLine={false}
                      width={82}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => currencyFormatter.format(value)}
                      labelStyle={{ color: "#0F172A", fontWeight: 700, fontSize: 13 }}
                      contentStyle={{
                        border: "1px solid #E8EDF2",
                        borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.1)",
                        fontSize: 13,
                      }}
                      cursor={{ fill: "rgba(59,130,246,0.04)" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Bar dataKey="receita" fill="#10B981" name="Receita" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="despesa" fill="#F87171" name="Despesa" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Skeleton>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ ...panelStyle, height: "100%" }} bodyStyle={{ padding: "20px 20px 16px" }}>
            <Skeleton active loading={loading} paragraph={{ rows: 7 }} title={{ width: "45%" }}>
              {cardHeader("OS Agendadas Hoje", "/agenda/hoje")}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                {scheduledOrders.length === 0 ? (
                  <Empty
                    image={<CalendarOutlined style={{ color: "#CBD5E1", fontSize: 40 }} />}
                    description={<span style={{ color: "#94A3B8", fontSize: 13 }}>Nenhuma OS agendada hoje</span>}
                    style={{ margin: "36px 0" }}
                  />
                ) : (
                  scheduledOrders.slice(0, 5).map((order, index) => {
                    const technicianName = firstDefined(
                      order?.tecnico?.nome,
                      order?.tecnico_nome,
                      order?.responsavel?.nome,
                      "Técnico"
                    );
                    const status = firstDefined(order?.status, order?.situacao, "Agendada");

                    return (
                      <div
                        key={order.id || index}
                        style={{
                          alignItems: "center",
                          background: "#FAFBFD",
                          border: "1px solid #EEF1F7",
                          borderRadius: 10,
                          display: "grid",
                          gap: 12,
                          gridTemplateColumns: "54px 1fr auto",
                          padding: "10px 12px",
                        }}
                      >
                        <Text strong style={{ color: "#3B82F6", fontSize: 14, letterSpacing: "-0.01em" }}>
                          {formatTime(order)}
                        </Text>
                        <div style={{ minWidth: 0 }}>
                          <Text ellipsis strong style={{ color: "#0F172A", display: "block", fontSize: 13 }}>
                            {getClienteName(order)}
                          </Text>
                          <Space size={6} style={{ marginTop: 4 }}>
                            <Avatar size={22} style={{ background: "#3B82F6", fontSize: 10 }}>
                              {getInitials(technicianName)}
                            </Avatar>
                            <Text style={{ color: "#6B7280", fontSize: 12 }}>{technicianName}</Text>
                          </Space>
                        </div>
                        <Badge color={getStatusColor(status)} text={<span style={{ fontSize: 12 }}>{status}</span>} />
                      </div>
                    );
                  })
                )}
              </div>
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Skeleton active loading={loading} paragraph={{ rows: 6 }} title={{ width: "50%" }}>
              {cardHeader("Aguardando Faturamento", "/financeiro/lancamentos")}
              <Table
                columns={faturamentoColumns}
                dataSource={faturamentoRows}
                locale={{ emptyText: "Nenhuma OS aguardando faturamento" }}
                pagination={false}
                size="middle"
                style={{ marginTop: 12 }}
              />
            </Skeleton>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Skeleton active loading={loading} paragraph={{ rows: 6 }} title={{ width: "45%" }}>
              {cardHeader("Pagamentos Atrasados", "/financeiro/lancamentos")}
              <Table
                columns={atrasoColumns}
                dataSource={atrasoRows}
                locale={{ emptyText: "Nenhum pagamento atrasado" }}
                pagination={false}
                size="middle"
                style={{ marginTop: 12 }}
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DashboardPage;
