import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  BankOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReconciliationOutlined,
  SyncOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import financeiroService from "../../services/financeiro";
import "./hub.css";

const { Paragraph, Text, Title } = Typography;

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const compactMoneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const INITIAL_DASHBOARD = {
  receita: 0,
  despesa: 0,
  lucro: 0,
  contas_receber: 0,
  contas_pagar: 0,
  saldo_total: 0,
  receber_atrasado: 0,
  receber_atrasado_count: 0,
  pagar_atrasado: 0,
  pagar_atrasado_count: 0,
  por_mes: [],
  despesas_categoria: [],
  contas_receber_lista: [],
  contas_pagar_lista: [],
};

const quickActions = [
  { key: "lancamentos", label: "Lançamentos", path: "/financeiro/lancamentos", icon: FileTextOutlined },
  { key: "contas", label: "Contas bancárias", path: "/financeiro/contas", icon: BankOutlined },
  { key: "relatorios", label: "Relatórios", path: "/financeiro/relatorios", icon: BarChartOutlined },
  { key: "analitico", label: "Análise avançada", path: "/financeiro/analitico", icon: ReconciliationOutlined },
];

const quickLinkCards = [
  {
    key: "lancamentos",
    label: "Lançamentos",
    helper: "Receitas, despesas e baixas",
    path: "/financeiro/lancamentos",
    icon: FileTextOutlined,
    color: "#3B82F6",
  },
  {
    key: "contas",
    label: "Contas bancárias",
    helper: "Saldos e movimentações",
    path: "/financeiro/contas",
    icon: BankOutlined,
    color: "#1A7A4A",
  },
  {
    key: "relatorios",
    label: "Relatórios",
    helper: "Exportações e demonstrativos",
    path: "/financeiro/relatorios",
    icon: BarChartOutlined,
    color: "#B45309",
  },
  {
    key: "analitico",
    label: "Análise avançada",
    helper: "DRE, fluxo de caixa e aging",
    path: "/financeiro/analitico",
    icon: ReconciliationOutlined,
    color: "#5B21B6",
  },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return moneyFormatter.format(toNumber(value));
}

function formatDate(value) {
  if (!value) return "Sem vencimento";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Sem vencimento";
  return date.toLocaleDateString("pt-BR");
}

function formatMonth(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function normalizeDashboard(data = {}) {
  return {
    receita: toNumber(data.receita),
    despesa: toNumber(data.despesa),
    lucro: toNumber(data.lucro),
    contas_receber: toNumber(data.contas_receber),
    contas_pagar: toNumber(data.contas_pagar),
    saldo_total: toNumber(data.saldo_total),
    receber_atrasado: toNumber(data.receber_atrasado),
    receber_atrasado_count: toNumber(data.receber_atrasado_count),
    pagar_atrasado: toNumber(data.pagar_atrasado),
    pagar_atrasado_count: toNumber(data.pagar_atrasado_count),
    por_mes: Array.isArray(data.por_mes) ? data.por_mes : [],
    despesas_categoria: Array.isArray(data.despesas_categoria) ? data.despesas_categoria : [],
    contas_receber_lista: Array.isArray(data.contas_receber_lista) ? data.contas_receber_lista : [],
    contas_pagar_lista: Array.isArray(data.contas_pagar_lista) ? data.contas_pagar_lista : [],
  };
}

function MetricCard({ label, value, helper, icon: Icon, color, loading, trend }) {
  return (
    <Card className="finance-metric-card" bordered={false}>
      <Skeleton active loading={loading} paragraph={false} title={{ width: "75%" }}>
        <div className="finance-metric-top">
          <span className="finance-metric-icon" style={{ color, background: `${color}14` }}>
            <Icon />
          </span>
          {trend !== undefined && (
            <span className={`finance-trend ${trend >= 0 ? "is-positive" : "is-negative"}`}>
              {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <Text className="finance-metric-label">{label}</Text>
        <div className="finance-metric-value" style={{ color }}>{value}</div>
        <Text className="finance-metric-helper">{helper}</Text>
      </Skeleton>
    </Card>
  );
}

function PanelHeader({ title, subtitle, action }) {
  return (
    <div className="finance-panel-header">
      <div>
        <Title level={4}>{title}</Title>
        <Text>{subtitle}</Text>
      </div>
      {action}
    </div>
  );
}

function FinancialTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="finance-chart-tooltip">
      <Text strong>{label}</Text>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {formatMoney(item.value)}
        </span>
      ))}
    </div>
  );
}

function PendingList({ title, subtitle, items, type, loading, onOpenMore }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card className="finance-panel finance-pending-card" bordered={false}>
      <PanelHeader
        title={title}
        subtitle={subtitle}
        action={<Button type="link" onClick={onOpenMore}>Ver tudo <ArrowRightOutlined /></Button>}
      />
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        {items.length ? (
          <List
            className="finance-pending-list"
            dataSource={items.slice(0, 5)}
            renderItem={(item) => {
              const dueDate = item.data_vencimento
                ? new Date(`${String(item.data_vencimento).slice(0, 10)}T00:00:00`)
                : null;
              const overdue = item.status === "atrasado" || (dueDate && dueDate < today);
              return (
                <List.Item onClick={() => onOpenMore(item)}>
                  <span className={`finance-entry-indicator ${type}`} />
                  <List.Item.Meta
                    title={item.descricao || item.numero_documento || "Lançamento financeiro"}
                    description={
                      <Space size={6} wrap>
                        <Text>{formatDate(item.data_vencimento)}</Text>
                        <Tag color={overdue ? "red" : "default"}>{overdue ? "Vencido" : "Pendente"}</Tag>
                      </Space>
                    }
                  />
                  <Text strong className={type === "receita" ? "finance-income" : "finance-expense"}>
                    {type === "receita" ? "+" : "-"} {formatMoney(item.valor)}
                  </Text>
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`Nenhuma conta ${type === "receita" ? "a receber" : "a pagar"}`} />
        )}
      </Skeleton>
    </Card>
  );
}

export default function FinanceiroHubPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(INITIAL_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const data = await financeiroService.dashboard();
      setDashboard(normalizeDashboard(data));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthlyData = useMemo(() => {
    const months = {};
    dashboard.por_mes.forEach((item) => {
      const key = String(item.mes || "");
      if (!months[key]) months[key] = { key, mes: formatMonth(key), receita: 0, despesa: 0 };
      if (item.tipo === "receita" || item.tipo === "despesa") {
        months[key][item.tipo] = toNumber(item.total);
      }
    });
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [dashboard.por_mes]);

  const revenueGrowth = useMemo(() => {
    const months = monthlyData.slice(-2);
    if (months.length < 2) return 0;
    const previous = months[0].receita;
    const current = months[1].receita;
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, [monthlyData]);

  const margin = dashboard.receita
    ? (dashboard.lucro / dashboard.receita) * 100
    : 0;
  const coverage = dashboard.contas_pagar
    ? Math.min(100, Math.round((dashboard.contas_receber / dashboard.contas_pagar) * 100))
    : 100;
  const netProjection = dashboard.contas_receber - dashboard.contas_pagar;

  const expenseCategories = dashboard.despesas_categoria.slice(0, 5).map((item) => ({
    name: item["categoria__nome"] || "Sem categoria",
    color: item["categoria__cor"] || "#3B82F6",
    value: toNumber(item.total),
  }));
  const expenseCategoryTotal = expenseCategories.reduce((sum, item) => sum + item.value, 0);

  const currentDate = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="finance-hub">
      <header className="finance-page-header">
        <div>
          <Text className="finance-eyebrow">Gestão financeira</Text>
          <Title level={2}>Central financeira</Title>
          <Paragraph>Visão consolidada do caixa, recebimentos e compromissos em {currentDate}.</Paragraph>
        </div>
        <Space wrap className="finance-header-actions">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return <Button key={action.key} icon={<Icon />} onClick={() => navigate(action.path)}>{action.label}</Button>;
          })}
          <Button
            aria-label="Atualizar dados financeiros"
            icon={<SyncOutlined spin={refreshing} />}
            onClick={() => load(true)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/financeiro/lancamentos/novo")}>
            Novo lançamento
          </Button>
        </Space>
      </header>

      {error && (
        <Alert
          showIcon
          type="warning"
          message="Não foi possível atualizar os dados financeiros"
          description="Confira se o backend está ativo e tente atualizar novamente."
          action={<Button size="small" onClick={() => load(true)}>Tentar novamente</Button>}
        />
      )}

      <section className="finance-quicklinks">
        {quickLinkCards.map((link) => {
          const Icon = link.icon;
          return (
            <div
              key={link.key}
              className="finance-quicklink-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(link.path)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") navigate(link.path);
              }}
            >
              <span className="finance-quicklink-icon" style={{ color: link.color, background: `${link.color}14` }}>
                <Icon />
              </span>
              <span className="finance-quicklink-text">
                <span className="finance-quicklink-label">{link.label}</span>
                <span className="finance-quicklink-helper">{link.helper}</span>
              </span>
              <ArrowRightOutlined className="finance-quicklink-arrow" />
            </div>
          );
        })}
      </section>

      <section className="finance-position-card">
        <div className="finance-position-main">
          <Text>Resultado do período</Text>
          <strong className={dashboard.lucro >= 0 ? "is-positive" : "is-negative"}>
            {formatMoney(dashboard.lucro)}
          </strong>
          <span>
            {dashboard.lucro >= 0 ? <CheckCircleOutlined /> : <WarningOutlined />}
            Margem operacional de {margin.toFixed(1)}%
          </span>
        </div>
        <div className="finance-position-divider" />
        <div className="finance-position-stat">
          <ArrowUpOutlined />
          <span>A receber</span>
          <strong>{formatMoney(dashboard.contas_receber)}</strong>
          <small>{dashboard.receber_atrasado_count} vencido(s)</small>
        </div>
        <div className="finance-position-stat expense">
          <ArrowDownOutlined />
          <span>A pagar</span>
          <strong>{formatMoney(dashboard.contas_pagar)}</strong>
          <small>{dashboard.pagar_atrasado_count} vencido(s)</small>
        </div>
        <div className="finance-position-stat projection">
          <WalletOutlined />
          <span>Projeção líquida</span>
          <strong>{formatMoney(netProjection)}</strong>
          <small>Recebimentos menos compromissos</small>
        </div>
      </section>

      <Row gutter={[16, 16]} className="finance-metrics-grid">
        <Col xs={24} sm={12} xl={6}>
          <MetricCard label="Receitas" value={compactMoneyFormatter.format(dashboard.receita)} helper="Entradas no período" icon={ArrowUpOutlined} color="#10B981" loading={loading} trend={revenueGrowth} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard label="Despesas" value={compactMoneyFormatter.format(dashboard.despesa)} helper="Saídas no período" icon={ArrowDownOutlined} color="#EF4444" loading={loading} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard label="Saldo em contas" value={compactMoneyFormatter.format(dashboard.saldo_total)} helper="Saldo bancário consolidado" icon={BankOutlined} color="#3B82F6" loading={loading} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard label="Recebíveis vencidos" value={compactMoneyFormatter.format(dashboard.receber_atrasado)} helper={`${dashboard.receber_atrasado_count} cobrança(s) em atenção`} icon={WarningOutlined} color={dashboard.receber_atrasado ? "#F59E0B" : "#10B981"} loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="finance-panel" bordered={false}>
            <PanelHeader
              title="Evolução financeira"
              subtitle="Comparativo mensal entre receitas e despesas"
              action={<Button type="link" onClick={() => navigate("/financeiro/analitico")}>Análise detalhada <ArrowRightOutlined /></Button>}
            />
            <Skeleton active loading={loading} paragraph={{ rows: 7 }} title={false}>
              {monthlyData.length ? (
                <div className="finance-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="financeRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="financeExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => compactMoneyFormatter.format(value)} />
                      <ChartTooltip content={<FinancialTooltip />} />
                      <Area name="Receitas" type="monotone" dataKey="receita" stroke="#10B981" strokeWidth={3} fill="url(#financeRevenue)" />
                      <Area name="Despesas" type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={3} fill="url(#financeExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty description="Ainda não há histórico financeiro" />
              )}
            </Skeleton>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="finance-panel finance-health-card" bordered={false}>
            <PanelHeader title="Saúde do caixa" subtitle="Capacidade de cobrir os compromissos atuais" />
            <div className="finance-coverage">
              <Progress
                type="dashboard"
                percent={coverage}
                strokeColor={coverage >= 80 ? "#10B981" : coverage >= 50 ? "#F59E0B" : "#EF4444"}
                trailColor="#E2E8F0"
                format={(value) => <><strong>{value}%</strong><small>cobertura</small></>}
              />
              <Text>
                {coverage >= 100
                  ? "Os recebíveis cobrem os compromissos em aberto."
                  : "Atenção à diferença entre valores a receber e a pagar."}
              </Text>
            </div>
            <div className="finance-health-details">
              <div>
                <span>Vencidos a receber</span>
                <strong>{formatMoney(dashboard.receber_atrasado)}</strong>
              </div>
              <div>
                <span>Vencidos a pagar</span>
                <strong>{formatMoney(dashboard.pagar_atrasado)}</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card className="finance-panel finance-categories-card" bordered={false}>
            <PanelHeader title="Despesas por categoria" subtitle="Maiores centros de custo do período" />
            {expenseCategories.length ? (
              <div className="finance-category-list">
                {expenseCategories.map((item) => {
                  const percent = expenseCategoryTotal ? Math.round((item.value / expenseCategoryTotal) * 100) : 0;
                  return (
                    <div key={item.name}>
                      <div><span><i style={{ background: item.color }} />{item.name}</span><strong>{formatMoney(item.value)}</strong></div>
                      <Progress percent={percent} showInfo={false} strokeColor={item.color} size="small" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem despesas no período" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <PendingList
            title="Contas a receber"
            subtitle={`${formatMoney(dashboard.contas_receber)} pendentes`}
            items={dashboard.contas_receber_lista}
            type="receita"
            loading={loading}
            onOpenMore={(item) => navigate(item?.id ? `/financeiro/lancamentos/${item.id}` : "/financeiro/lancamentos?tipo=receita")}
          />
        </Col>
        <Col xs={24} xl={8}>
          <PendingList
            title="Contas a pagar"
            subtitle={`${formatMoney(dashboard.contas_pagar)} pendentes`}
            items={dashboard.contas_pagar_lista}
            type="despesa"
            loading={loading}
            onOpenMore={(item) => navigate(item?.id ? `/financeiro/lancamentos/${item.id}` : "/financeiro/lancamentos?tipo=despesa")}
          />
        </Col>
      </Row>
    </div>
  );
}
