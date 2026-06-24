import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  AlertOutlined,
  ArrowRightOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  PlusOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
  ToolOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import "./dashboard.css";

const { Paragraph, Text, Title } = Typography;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});
const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const integerFormatter = new Intl.NumberFormat("pt-BR");

const STATUS_CONFIG = {
  aberta: { label: "Abertas", color: "#3B82F6" },
  aprovada: { label: "Aprovadas", color: "#8B5CF6" },
  agendada: { label: "Agendadas", color: "#F59E0B" },
  em_execucao: { label: "Em execução", color: "#06B6D4" },
  concluida: { label: "Concluídas", color: "#10B981" },
  faturada: { label: "Faturadas", color: "#059669" },
};

const EMPTY_FINANCEIRO = {
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
};

const EMPTY_OPERACAO = {
  total: 0,
  abertas: 0,
  em_execucao: 0,
  concluidas_mes: 0,
  atrasadas: 0,
  urgentes: 0,
  valor_em_aberto: 0,
  taxa_conclusao_mes: 0,
  por_status: {},
  evolucao_mensal: [],
};

const EMPTY_ESTOQUE = {
  produtos_total: 0,
  produtos_em_alerta: 0,
  alertas_nao_lidos: 0,
  movimentacoes_hoje: 0,
  valor_total_estoque: 0,
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(source, defaults) {
  return Object.keys(defaults).reduce((result, key) => {
    const fallback = defaults[key];
    const value = source?.[key];
    if (Array.isArray(fallback)) {
      result[key] = Array.isArray(value) ? value : fallback;
    } else if (typeof fallback === "object") {
      result[key] = value && typeof value === "object" ? value : fallback;
    } else {
      result[key] = toNumber(value);
    }
    return result;
  }, {});
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getFirstName(user) {
  const name =
    user?.first_name || user?.nome_completo || user?.nome || user?.username;
  return name?.trim().split(" ")[0] || "Lucas";
}

function formatMonth(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Sem data";
  const safeValue = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR");
}

function MetricCard({ title, value, helper, icon: Icon, color, loading, onClick }) {
  return (
    <Card
      className={`executive-metric-card${onClick ? " is-clickable" : ""}`}
      bordered={false}
      onClick={onClick}
    >
      <Skeleton active loading={loading} paragraph={false} title={{ width: "75%" }}>
        <div className="executive-metric-head">
          <div className="executive-metric-icon" style={{ color, background: `${color}14` }}>
            <Icon />
          </div>
          {onClick && <ArrowRightOutlined className="executive-metric-arrow" />}
        </div>
        <Text className="executive-metric-label">{title}</Text>
        <div className="executive-metric-value" style={{ color }}>
          {value}
        </div>
        <Text className="executive-metric-helper">{helper}</Text>
      </Skeleton>
    </Card>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="executive-section-header">
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
    <div className="executive-chart-tooltip">
      <Text strong>{label}</Text>
      {payload.map((item) => (
        <div key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {currencyFormatter.format(toNumber(item.value))}
        </div>
      ))}
    </div>
  );
}

export default function CentralGestaoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failedSources, setFailedSources] = useState([]);
  const [financeiro, setFinanceiro] = useState(EMPTY_FINANCEIRO);
  const [operacao, setOperacao] = useState(EMPTY_OPERACAO);
  const [estoque, setEstoque] = useState(EMPTY_ESTOQUE);
  const [agendaHoje, setAgendaHoje] = useState([]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const requests = [
      ["financeiro", api.get("/financeiro/dashboard/")],
      ["operação", api.get("/ordens/dashboard/")],
      ["estoque", api.get("/estoque/dashboard/")],
      ["agenda", api.get("/ordens/agenda/hoje/")],
    ];
    const responses = await Promise.allSettled(requests.map(([, promise]) => promise));
    const failed = [];

    responses.forEach((response, index) => {
      const source = requests[index][0];
      if (response.status === "rejected") {
        failed.push(source);
        return;
      }
      const data = response.value?.data || {};
      if (source === "financeiro") setFinanceiro(normalize(data, EMPTY_FINANCEIRO));
      if (source === "operação") setOperacao(normalize(data, EMPTY_OPERACAO));
      if (source === "estoque") setEstoque(normalize(data, EMPTY_ESTOQUE));
      if (source === "agenda") setAgendaHoje(normalizeList(data));
    });

    setFailedSources(failed);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const financialEvolution = useMemo(() => {
    const months = {};
    financeiro.por_mes.forEach((item) => {
      const key = String(item.mes || "");
      if (!months[key]) {
        months[key] = { key, mes: formatMonth(key), receita: 0, despesa: 0 };
      }
      if (item.tipo === "receita" || item.tipo === "despesa") {
        months[key][item.tipo] = toNumber(item.total);
      }
    });
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [financeiro.por_mes]);

  const statusData = useMemo(
    () =>
      Object.entries(STATUS_CONFIG)
        .map(([key, config]) => ({
          status: key,
          nome: config.label,
          color: config.color,
          total: toNumber(operacao.por_status[key]),
        }))
        .filter((item) => item.total > 0),
    [operacao.por_status],
  );

  const expenseCategories = useMemo(() => {
    const total = financeiro.despesas_categoria.reduce(
      (sum, item) => sum + toNumber(item.total),
      0,
    );
    return financeiro.despesas_categoria.slice(0, 4).map((item) => ({
      name: item["categoria__nome"] || "Sem categoria",
      color: item["categoria__cor"] || "#3B82F6",
      value: toNumber(item.total),
      percent: total ? Math.round((toNumber(item.total) / total) * 100) : 0,
    }));
  }, [financeiro.despesas_categoria]);

  const margin = financeiro.receita
    ? ((financeiro.lucro / financeiro.receita) * 100).toFixed(1)
    : "0,0";
  const stockHealth = estoque.produtos_total
    ? Math.max(
        0,
        Math.round(
          ((estoque.produtos_total - estoque.produtos_em_alerta) /
            estoque.produtos_total) *
            100,
        ),
      )
    : 100;
  const commitmentCoverage = financeiro.contas_pagar
    ? Math.min(100, Math.round((financeiro.contas_receber / financeiro.contas_pagar) * 100))
    : 100;

  const metricCards = [
    {
      title: "Receita no mês",
      value: compactCurrencyFormatter.format(financeiro.receita),
      helper: `Margem operacional de ${margin}%`,
      icon: RiseOutlined,
      color: "#10B981",
      path: "/financeiro/analitico",
    },
    {
      title: "Resultado do mês",
      value: compactCurrencyFormatter.format(financeiro.lucro),
      helper: `${currencyFormatter.format(financeiro.despesa)} em despesas`,
      icon: BankOutlined,
      color: financeiro.lucro >= 0 ? "#3B82F6" : "#EF4444",
      path: "/financeiro/analitico",
    },
    {
      title: "Contas a receber",
      value: compactCurrencyFormatter.format(financeiro.contas_receber),
      helper: `${financeiro.receber_atrasado_count} título(s) vencido(s)`,
      icon: WalletOutlined,
      color: "#8B5CF6",
      path: "/financeiro/lancamentos?tipo=receita",
    },
    {
      title: "Recebíveis vencidos",
      value: compactCurrencyFormatter.format(financeiro.receber_atrasado),
      helper: "Prioridade de cobrança",
      icon: AlertOutlined,
      color: financeiro.receber_atrasado > 0 ? "#EF4444" : "#10B981",
      path: "/financeiro/lancamentos?status=atrasado",
    },
    {
      title: "OS em andamento",
      value: integerFormatter.format(operacao.abertas),
      helper: `${operacao.em_execucao} em execução agora`,
      icon: ToolOutlined,
      color: "#06B6D4",
      path: "/ordens",
    },
    {
      title: "Concluídas no mês",
      value: integerFormatter.format(operacao.concluidas_mes),
      helper: `${operacao.taxa_conclusao_mes}% de taxa de conclusão`,
      icon: CheckCircleOutlined,
      color: "#10B981",
      path: "/ordens?status=concluida",
    },
    {
      title: "Valor em estoque",
      value: compactCurrencyFormatter.format(estoque.valor_total_estoque),
      helper: `${estoque.produtos_total} produtos ativos`,
      icon: ShoppingCartOutlined,
      color: "#3B82F6",
      path: "/estoque",
    },
    {
      title: "Alertas de estoque",
      value: integerFormatter.format(estoque.produtos_em_alerta),
      helper: `${estoque.movimentacoes_hoje} movimentações hoje`,
      icon: AlertOutlined,
      color: estoque.produtos_em_alerta > 0 ? "#F59E0B" : "#10B981",
      path: "/estoque/alertas",
    },
  ];

  const currentDate = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="executive-dashboard">
      <section className="executive-hero">
        <div>
          <Tag color="blue" className="executive-eyebrow">
            Visão executiva
          </Tag>
          <Title level={2}>
            {getGreeting()}, {getFirstName(user)}.
          </Title>
          <Paragraph>
            Acompanhe o que movimenta a empresa e identifique rapidamente onde agir.
          </Paragraph>
          <Text className="executive-date">{currentDate}</Text>
        </div>
        <Space wrap className="executive-actions">
          <Button icon={<FileTextOutlined />} onClick={() => navigate("/orcamentos/novo")}>
            Novo orçamento
          </Button>
          <Button icon={<FileDoneOutlined />} onClick={() => navigate("/ordens/novo")}>
            Nova OS
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/financeiro/lancamentos/novo")}>
            Novo lançamento
          </Button>
          <Button
            aria-label="Atualizar dashboard"
            icon={<SyncOutlined spin={refreshing} />}
            onClick={() => loadDashboard(true)}
          />
        </Space>
      </section>

      {failedSources.length > 0 && (
        <Alert
          showIcon
          closable
          type="warning"
          message="Alguns indicadores não puderam ser atualizados"
          description={`Fontes indisponíveis: ${failedSources.join(", ")}. Os demais dados continuam visíveis.`}
        />
      )}

      <Row gutter={[16, 16]} className="executive-metrics-grid">
        {metricCards.map((metric) => (
          <Col key={metric.title} xs={24} sm={12} lg={8} xl={6}>
            <MetricCard
              {...metric}
              loading={loading}
              onClick={() => navigate(metric.path)}
            />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card className="executive-panel" bordered={false}>
            <SectionHeader
              title="Evolução financeira"
              subtitle="Receitas e despesas dos últimos seis meses"
              action={
                <Button type="link" onClick={() => navigate("/financeiro/analitico")}>
                  Ver análise completa <ArrowRightOutlined />
                </Button>
              }
            />
            <Skeleton active loading={loading} paragraph={{ rows: 7 }} title={false}>
              {financialEvolution.length ? (
                <div className="executive-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialEvolution} margin={{ top: 10, right: 8, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => compactCurrencyFormatter.format(value)} />
                      <ChartTooltip content={<FinancialTooltip />} />
                      <Area name="Receitas" type="monotone" dataKey="receita" stroke="#3B82F6" strokeWidth={3} fill="url(#revenueGradient)" />
                      <Area name="Despesas" type="monotone" dataKey="despesa" stroke="#F59E0B" strokeWidth={3} fill="url(#expenseGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty description="Ainda não há histórico financeiro para exibir" />
              )}
            </Skeleton>
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card className="executive-panel" bordered={false}>
            <SectionHeader
              title="Pipeline operacional"
              subtitle="Distribuição atual das ordens de serviço"
              action={<Tag color="blue">{operacao.total} OS</Tag>}
            />
            <Skeleton active loading={loading} paragraph={{ rows: 7 }} title={false}>
              {statusData.length ? (
                <div className="executive-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 24, left: 12, bottom: 0 }}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nome" width={88} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                      <ChartTooltip cursor={{ fill: "#F8FAFC" }} formatter={(value) => [value, "Ordens"]} />
                      <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={18}>
                        {statusData.map((item) => <Cell key={item.status} fill={item.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty description="Nenhuma ordem de serviço cadastrada" />
              )}
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="executive-bottom-row">
        <Col xs={24} xl={10}>
          <Card className="executive-panel" bordered={false}>
            <SectionHeader
              title="Agenda de hoje"
              subtitle={`${agendaHoje.length} atendimento(s) programado(s)`}
              action={<Button type="link" onClick={() => navigate("/agenda/hoje")}>Abrir agenda</Button>}
            />
            <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
              {agendaHoje.length ? (
                <div className="executive-agenda-list">
                  {agendaHoje.slice(0, 5).map((item) => (
                    <button
                      className="executive-agenda-item"
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/ordens/${item.id}`)}
                    >
                      <div className="executive-agenda-time">
                        <ClockCircleOutlined />
                        {String(item.hora_inicio || "--:--").slice(0, 5)}
                      </div>
                      <div className="executive-agenda-content">
                        <Text strong>{item.numero || `OS #${item.id}`}</Text>
                        <Text>{item.cliente_nome || "Cliente não informado"}</Text>
                      </div>
                      <Tag color={item.status === "em_execucao" ? "cyan" : "blue"}>
                        {item.status === "em_execucao" ? "Em execução" : "Agendada"}
                      </Tag>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma OS agendada para hoje" />
              )}
            </Skeleton>
          </Card>
        </Col>

        <Col xs={24} md={12} xl={7}>
          <Card className="executive-panel" bordered={false}>
            <SectionHeader title="Saúde da operação" subtitle="Indicadores que pedem acompanhamento" />
            <div className="executive-health-list">
              <div>
                <div className="executive-health-label">
                  <Text>Conclusão de OS no mês</Text>
                  <Text strong>{operacao.taxa_conclusao_mes}%</Text>
                </div>
                <Progress percent={operacao.taxa_conclusao_mes} showInfo={false} strokeColor="#10B981" />
              </div>
              <div>
                <div className="executive-health-label">
                  <Text>Cobertura de compromissos</Text>
                  <Text strong>{commitmentCoverage}%</Text>
                </div>
                <Progress percent={commitmentCoverage} showInfo={false} strokeColor="#3B82F6" />
              </div>
              <div>
                <div className="executive-health-label">
                  <Text>Saúde do estoque</Text>
                  <Text strong>{stockHealth}%</Text>
                </div>
                <Progress percent={stockHealth} showInfo={false} strokeColor={stockHealth >= 80 ? "#10B981" : "#F59E0B"} />
              </div>
              <div className="executive-alert-grid">
                <button type="button" onClick={() => navigate("/ordens")}>
                  <strong>{operacao.atrasadas}</strong>
                  <span>OS atrasadas</span>
                </button>
                <button type="button" onClick={() => navigate("/ordens")}>
                  <strong>{operacao.urgentes}</strong>
                  <span>OS urgentes</span>
                </button>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} xl={7}>
          <Card className="executive-panel" bordered={false}>
            <SectionHeader title="Maiores despesas" subtitle="Categorias com maior peso no mês" />
            {expenseCategories.length ? (
              <div className="executive-expenses-list">
                {expenseCategories.map((item) => (
                  <div key={item.name}>
                    <div className="executive-expense-row">
                      <span><i style={{ background: item.color }} />{item.name}</span>
                      <Text strong>{compactCurrencyFormatter.format(item.value)}</Text>
                    </div>
                    <Progress percent={item.percent} showInfo={false} strokeColor={item.color} size="small" />
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem despesas no período" />
            )}
            <Button block icon={<DollarOutlined />} onClick={() => navigate("/financeiro/lancamentos?tipo=despesa")}>
              Ver despesas
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
