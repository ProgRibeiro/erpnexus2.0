import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Empty,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tooltip,
  Typography,
  Button,
  message,
} from "antd";
import {
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import {
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
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import financeiroService from "../../services/financeiro";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: "24px",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const filterStyle = {
  ...cardStyle,
  marginBottom: 16,
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const safeValue = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function MetricCard({
  label,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  color,
  loading,
}) {
  return (
    <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 18 }}>
      <Skeleton active loading={loading} paragraph={false} title={{ width: "65%" }}>
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color,
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {value}
            </div>
            <Text
              style={{
                color: "#6B7280",
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {label}
            </Text>
            {change !== undefined && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 8,
                  fontSize: 12,
                  color: trend === "positive" ? "#16a34a" : trend === "negative" ? "#dc2626" : "#6B7280",
                  fontWeight: 600,
                }}
              >
                {trend === "positive" && <ArrowUpOutlined />}
                {trend === "negative" && <ArrowDownOutlined />}
                {change}
              </div>
            )}
          </div>
          {Icon && (
            <div
              style={{
                background: `${color}14`,
                borderRadius: 10,
                height: 50,
                width: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color,
              }}
            >
              <Icon />
            </div>
          )}
        </div>
      </Skeleton>
    </Card>
  );
}

function TabelaContasReceber({ data, loading }) {
  const columns = [
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Vencimento",
      dataIndex: "data_vencimento",
      key: "data_vencimento",
      width: 120,
      render: formatDate,
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      width: 120,
      align: "right",
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const statusConfig = {
          pendente: { color: "#EA8C55", label: "Pendente" },
          pago: { color: "#16a34a", label: "Pago" },
          vencido: { color: "#dc2626", label: "Vencido" },
        };
        const config = statusConfig[status] || statusConfig.pendente;
        return (
          <span
            style={{
              background: `${config.color}14`,
              color: config.color,
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {config.label}
          </span>
        );
      },
    },
  ];

  return (
    <Card bordered={false} style={cardStyle}>
      <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        Contas a Receber
      </Title>
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        <Table
          columns={columns}
          dataSource={data?.contas_receber_lista || []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Nenhuma conta a receber" /> }}
          size="small"
        />
      </Skeleton>
    </Card>
  );
}

function TabelaContasPagar({ data, loading }) {
  const columns = [
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Vencimento",
      dataIndex: "data_vencimento",
      key: "data_vencimento",
      width: 120,
      render: formatDate,
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      width: 120,
      align: "right",
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => {
        const statusConfig = {
          pendente: { color: "#EA8C55", label: "Pendente" },
          pago: { color: "#16a34a", label: "Pago" },
          vencido: { color: "#dc2626", label: "Vencido" },
        };
        const config = statusConfig[status] || statusConfig.pendente;
        return (
          <span
            style={{
              background: `${config.color}14`,
              color: config.color,
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {config.label}
          </span>
        );
      },
    },
  ];

  return (
    <Card bordered={false} style={cardStyle}>
      <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        Contas a Pagar
      </Title>
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        <Table
          columns={columns}
          dataSource={data?.contas_pagar_lista || []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Nenhuma conta a pagar" /> }}
          size="small"
        />
      </Skeleton>
    </Card>
  );
}

export default function FinanceiroDashboard() {
  const [data, setData] = useState(null);
  const [fluxo, setFluxo] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    mes: undefined,
    ano: undefined,
    conta: undefined,
  });

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filters.conta) params.conta = filters.conta;
        if (filters.mes) params.mes = filters.mes;
        if (filters.ano) params.ano = filters.ano;

        const [dashboard, fluxoCaixa, contasList] = await Promise.all([
          financeiroService.dashboard(params),
          financeiroService.fluxoCaixa(params),
          financeiroService.listarContas(),
        ]);
        setData(dashboard);
        setFluxo(fluxoCaixa);
        setContas(contasList);
      } catch (error) {
        message.error("Erro ao carregar dashboard");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [filters]);

  const meses = useMemo(() => {
    const mapa = {};
    (data?.por_mes || []).forEach((item) => {
      const date = new Date(item.mes);
      const key = date.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });
      mapa[key] = { mes: key, ...(mapa[key] || {}) };
      mapa[key][item.tipo] = Number(item.total);
    });
    return Object.values(mapa).slice(-6);
  }, [data]);

  const fluxoLinha = useMemo(() => {
    const mapa = {};
    fluxo.forEach((item) => {
      const key = item.data_vencimento;
      mapa[key] = { data: key, saldo: mapa[key]?.saldo || 0 };
      mapa[key].saldo +=
        item.tipo === "receita" ? Number(item.total) : -Number(item.total);
    });
    return Object.values(mapa);
  }, [fluxo]);

  const cores = [
    "#3B82F6",
    "#5B21B6",
    "#B45309",
    "#16a34a",
    "#EA8C55",
    "#dc2626",
    "#0891b2",
    "#7c3aed",
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
            Dashboard Financeiro
          </Title>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => message.info("Recurso em desenvolvimento")}
            style={{ borderRadius: 8 }}
          >
            Exportar
          </Button>
        </div>

        {/* Filtros */}
        <Card bordered={false} style={filterStyle} bodyStyle={{ padding: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} lg={6}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Mês
              </div>
              <Select
                allowClear
                placeholder="Selecione um mês"
                style={{ width: "100%" }}
                options={[
                  { label: "Janeiro", value: 1 },
                  { label: "Fevereiro", value: 2 },
                  { label: "Março", value: 3 },
                  { label: "Abril", value: 4 },
                  { label: "Maio", value: 5 },
                  { label: "Junho", value: 6 },
                  { label: "Julho", value: 7 },
                  { label: "Agosto", value: 8 },
                  { label: "Setembro", value: 9 },
                  { label: "Outubro", value: 10 },
                  { label: "Novembro", value: 11 },
                  { label: "Dezembro", value: 12 },
                ]}
                value={filters.mes}
                onChange={(value) => setFilters({ ...filters, mes: value })}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Ano
              </div>
              <Select
                allowClear
                placeholder="Selecione um ano"
                style={{ width: "100%" }}
                options={[
                  { label: "2024", value: 2024 },
                  { label: "2025", value: 2025 },
                  { label: "2026", value: 2026 },
                ]}
                value={filters.ano}
                onChange={(value) => setFilters({ ...filters, ano: value })}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Conta Bancária
              </div>
              <Select
                allowClear
                placeholder="Todas as contas"
                style={{ width: "100%" }}
                options={(contas || []).map((c) => ({
                  label: c.nome,
                  value: c.id,
                }))}
                value={filters.conta}
                onChange={(value) => setFilters({ ...filters, conta: value })}
              />
            </Col>
            <Col xs={24} lg={6}>
              <Button
                onClick={() =>
                  setFilters({
                    mes: undefined,
                    ano: undefined,
                    conta: undefined,
                  })
                }
                style={{ width: "100%", borderRadius: 8, marginTop: 24 }}
              >
                Limpar filtros
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Cards de Métricas */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Receitas"
              value={formatMoney(data?.receita)}
              change="+12% vs mês anterior"
              trend="positive"
              color="#16a34a"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Despesas"
              value={formatMoney(data?.despesa)}
              change="+5% vs mês anterior"
              trend="negative"
              color="#dc2626"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Lucro"
              value={formatMoney(data?.lucro)}
              change="+8% vs mês anterior"
              trend="positive"
              color="#3B82F6"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Contas a Receber"
              value={formatMoney(data?.contas_receber)}
              color="#EA8C55"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Contas a Pagar"
              value={formatMoney(data?.contas_pagar)}
              color="#5B21B6"
              loading={loading}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Saldo Total"
              value={formatMoney(data?.saldo_total)}
              color="#0891b2"
              loading={loading}
            />
          </Col>
        </Row>

        {/* Gráficos */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card
              bordered={false}
              style={cardStyle}
              title="Receitas vs Despesas - Últimos 6 Meses"
            >
              <Skeleton active loading={loading} paragraph={{ rows: 8 }} title={false}>
                {meses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={meses}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
                      <XAxis dataKey="mes" tick={{ fill: "#6B7280", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #E2E6EC",
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="receita" fill="#16a34a" name="Receita" />
                      <Bar dataKey="despesa" fill="#dc2626" name="Despesa" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Sem dados" />
                )}
              </Skeleton>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              bordered={false}
              style={cardStyle}
              title="Fluxo de Caixa Projetado"
            >
              <Skeleton active loading={loading} paragraph={{ rows: 8 }} title={false}>
                {fluxoLinha.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={fluxoLinha}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
                      <XAxis dataKey="data" tick={{ fill: "#6B7280", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #E2E6EC",
                          borderRadius: 8,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                        name="Saldo"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Sem dados" />
                )}
              </Skeleton>
            </Card>
          </Col>
        </Row>

        {/* Tabelas */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <TabelaContasReceber data={data} loading={loading} />
          </Col>
          <Col xs={24} lg={12}>
            <TabelaContasPagar data={data} loading={loading} />
          </Col>
        </Row>

        {/* Gráfico Pizza */}
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card
              bordered={false}
              style={cardStyle}
              title="Despesas por Categoria"
            >
              <Skeleton active loading={loading} paragraph={{ rows: 8 }} title={false}>
                {(data?.despesas_categoria || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data?.despesas_categoria || []}
                        dataKey="total"
                        nameKey="categoria__nome"
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ categoria__nome, total }) =>
                          `${categoria__nome}: ${formatMoney(total)}`
                        }
                      >
                        {(data?.despesas_categoria || []).map((item, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={item.categoria__cor || cores[index % cores.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #E2E6EC",
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Sem dados de despesas" />
                )}
              </Skeleton>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
}
