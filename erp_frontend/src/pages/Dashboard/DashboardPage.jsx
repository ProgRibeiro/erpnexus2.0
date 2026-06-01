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
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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
  background: "#F8FAFC",
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

function MetricCard({ color, icon, label, loading, value, variation, sparklineData = [] }) {
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
      {/* colored left accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: color,
          borderRadius: "12px 0 0 12px",
        }}
      />

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

          {/* Sparkline if data provided */}
          {sparklineData.length > 0 && (
            <div style={{ marginTop: 12, marginRight: -20, marginBottom: -20, marginLeft: -20 }}>
              <ResponsiveContainer width="100%" height={36}>
                <LineChart data={sparklineData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trend badge */}
          <div style={{ alignItems: "center", display: "flex", gap: 8, marginTop: sparklineData.length > 0 ? 12 : 14 }}>
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

  const pieChartData = useMemo(() => {
    const statusMap = {
      rascunho: { name: "Rascunho", color: "#64748B" },
      enviado: { name: "Enviado", color: "#3B82F6" },
      execucao: { name: "Execução", color: "#8B5CF6" },
      concluida: { name: "Concluída", color: "#10B981" },
      aguardando_faturamento: { name: "Aguardando Faturamento", color: "#F59E0B" },
    };

    const counts = {};
    scheduledOrders.forEach((order) => {
      const status = String(order?.status || order?.situacao || "rascunho").toLowerCase();
      const key = status.includes("fatur") ? "aguardando_faturamento" : status;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts).map(([key, value]) => ({
      ...statusMap[key],
      value,
    }));
  }, [scheduledOrders]);

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
      {/* Hero header - light gradient background with greeting + date + 3 micro-stats */}
      <div
        style={{
          background: "linear-gradient(135deg, #F0F9FF 0%, #F8FAFC 60%, #EFF6FF 100%)",
          borderRadius: 16,
          padding: "28px 32px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          border: "1px solid #E2E8F0",
        }}
      >
        {/* Left side: greeting + date */}
        <div>
          <Title
            level={2}
            style={{
              color: "#1E293B",
              fontSize: 24,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {getGreeting()}, {getFirstName(user)}! 👋
          </Title>
          <Text style={{ color: "#64748B", fontSize: 13, marginTop: 2, display: "block" }}>
            {getFormattedDate()}
          </Text>
        </div>

        {/* Right side: 3 micro-stats inline */}
        <div
          style={{
            display: "flex",
            gap: 32,
            alignItems: "center",
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          {/* Receita Mês */}
          <div>
            <Text
              style={{
                color: "#64748B",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: 4,
              }}
            >
              Receita
            </Text>
            <Text
              style={{
                color: "#059669",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              {shortCurrencyFormatter.format(dashboard.receita_mes)}
            </Text>
          </div>

          {/* Separator */}
          <span style={{ width: 1, height: 40, background: "#CBD5E1" }} />

          {/* Lucro/Margin approximation (use variation as proxy) */}
          <div>
            <Text
              style={{
                color: "#64748B",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: 4,
              }}
            >
              Lucro
            </Text>
            <Text
              style={{
                color: "#7C3AED",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              {shortCurrencyFormatter.format(
                (dashboard.receita_mes * dashboard.receita_mes_variacao) / 100 || 0
              )}
            </Text>
          </div>

          {/* Separator */}
          <span style={{ width: 1, height: 40, background: "#CBD5E1" }} />

          {/* Saldo (awaiting billing as proxy) */}
          <div>
            <Text
              style={{
                color: "#64748B",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: 4,
              }}
            >
              Saldo
            </Text>
            <Text
              style={{
                color: "#EA580C",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              {shortCurrencyFormatter.format(dashboard.aguardando_faturamento_total)}
            </Text>
          </div>
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
            sparklineData={chartData}
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
            sparklineData={chartData}
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
            sparklineData={chartData}
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
            sparklineData={chartData}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: "20px 20px 16px" }}>
            <Skeleton active loading={loading} paragraph={{ rows: 8 }} title={{ width: "55%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ ...sectionTitleStyle, color: "#1E293B" }}>Receita vs Despesa</h2>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>últimos 6 meses</Text>
                </div>
              </div>
              <div style={{ height: 320, width: "100%" }}>
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -60, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0} />
                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      stroke="#CBD5E1"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 500, fill: "#64748B" }}
                    />
                    <YAxis
                      stroke="#CBD5E1"
                      axisLine={false}
                      tickFormatter={(value) => shortCurrencyFormatter.format(value)}
                      tickLine={false}
                      width={82}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                    />
                    <Tooltip
                      formatter={(value) => currencyFormatter.format(value)}
                      labelStyle={{ color: "#1E293B", fontWeight: 700, fontSize: 13 }}
                      contentStyle={{
                        border: "1px solid #E2E8F0",
                        borderRadius: 10,
                        background: "#F8FAFC",
                        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
                        fontSize: 13,
                      }}
                      cursor={{ fill: "rgba(5, 150, 105, 0.03)" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "#64748B" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReceita)"
                      name="Receita"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="despesa"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={false}
                      name="Despesa"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Skeleton>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ ...panelStyle, height: "100%" }} bodyStyle={{ padding: "20px 20px 16px" }}>
            <Skeleton active loading={loading} paragraph={{ rows: 7 }} title={{ width: "45%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ ...sectionTitleStyle, color: "#1E293B" }}>Distribuição OS</h2>
                  <Text style={{ color: "#64748B", fontSize: 12 }}>por status</Text>
                </div>
              </div>
              <div style={{ height: 280, width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {scheduledOrders.length === 0 ? (
                  <Empty
                    image={<FileTextOutlined style={{ color: "#CBD5E1", fontSize: 40 }} />}
                    description={<span style={{ color: "#64748B", fontSize: 13 }}>Sem dados</span>}
                    style={{ margin: "0" }}
                  />
                ) : (
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => value}
                        contentStyle={{
                          border: "1px solid #E2E8F0",
                          borderRadius: 10,
                          background: "#F8FAFC",
                          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              {/* Legend below pie chart */}
              {scheduledOrders.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {pieChartData.map((item, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <Text style={{ color: "#475569", fontSize: 12 }}>
                        {item.name}: {item.value}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </Skeleton>
          </Card>
        </Col>
      </Row>

      {/* Pipeline section */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: "24px 28px" }}>
            <Skeleton active loading={loading} paragraph={{ rows: 3 }} title={{ width: "30%" }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ ...sectionTitleStyle, color: "#1E293B" }}>Pipeline de Orçamentos</h2>
                <Text style={{ color: "#64748B", fontSize: 12 }}>Visualização do funil de conversão</Text>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  minHeight: 160,
                  flexWrap: "wrap",
                }}
              >
                {/* Rascunho */}
                <div style={{ flex: "1 1 auto", minWidth: 120, textAlign: "center" }}>
                  <div
                    style={{
                      background: "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)",
                      borderRadius: 12,
                      padding: "20px 16px",
                      marginBottom: 12,
                      minHeight: 100,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      border: "1px solid #D1D5DB",
                    }}
                  >
                    <Text style={{ color: "#64748B", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                      Rascunho
                    </Text>
                    <Text style={{ color: "#1E293B", fontSize: 20, fontWeight: 800, marginTop: 8 }}>
                      {pieChartData.find((p) => p.name === "Rascunho")?.value || 0}
                    </Text>
                    <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                      {shortCurrencyFormatter.format(
                        chartData[chartData.length - 1]?.receita * 0.2 || 0
                      )}
                    </Text>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: "flex", alignItems: "center", fontSize: 24, color: "#CBD5E1", marginBottom: 12 }}>
                  →
                </div>

                {/* Enviado */}
                <div style={{ flex: "1.5 1 auto", minWidth: 140, textAlign: "center" }}>
                  <div
                    style={{
                      background: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
                      borderRadius: 12,
                      padding: "20px 16px",
                      marginBottom: 12,
                      minHeight: 130,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      border: "1px solid #93C5FD",
                    }}
                  >
                    <Text style={{ color: "#1E40AF", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                      Enviado
                    </Text>
                    <Text style={{ color: "#1E293B", fontSize: 20, fontWeight: 800, marginTop: 8 }}>
                      {pieChartData.find((p) => p.name === "Enviado")?.value || 0}
                    </Text>
                    <Text style={{ color: "#1E40AF", fontSize: 12, marginTop: 4 }}>
                      {shortCurrencyFormatter.format(
                        chartData[chartData.length - 1]?.receita * 0.5 || 0
                      )}
                    </Text>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: "flex", alignItems: "center", fontSize: 24, color: "#CBD5E1", marginBottom: 12 }}>
                  →
                </div>

                {/* Aprovado */}
                <div style={{ flex: "2 1 auto", minWidth: 160, textAlign: "center" }}>
                  <div
                    style={{
                      background: "linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)",
                      borderRadius: 12,
                      padding: "20px 16px",
                      marginBottom: 12,
                      minHeight: 160,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      border: "1px solid #86EFAC",
                    }}
                  >
                    <Text style={{ color: "#15803D", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                      Aprovado
                    </Text>
                    <Text style={{ color: "#1E293B", fontSize: 20, fontWeight: 800, marginTop: 8 }}>
                      {pieChartData.find((p) => p.name === "Concluída")?.value || 0}
                    </Text>
                    <Text style={{ color: "#15803D", fontSize: 12, marginTop: 4 }}>
                      {shortCurrencyFormatter.format(
                        chartData[chartData.length - 1]?.receita || 0
                      )}
                    </Text>
                  </div>
                </div>
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
