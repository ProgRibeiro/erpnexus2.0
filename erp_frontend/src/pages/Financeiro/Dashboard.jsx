import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
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
  Progress,
} from "antd";
import {
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BankOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReconciliationOutlined,
  WalletOutlined,
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

function statusBadge(status) {
  const statusConfig = {
    pendente: { color: "#EA8C55", label: "Pendente" },
    pago: { color: "#16a34a", label: "Pago" },
    atrasado: { color: "#dc2626", label: "Atrasado" },
    cancelado: { color: "#9CA3AF", label: "Cancelado" },
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

function TabelaContasReceber({ data, loading, onEdit, onBaixa, onOpenList }) {
  const columns = [
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Button
            type="link"
            onClick={() => onEdit(record)}
            style={{ fontWeight: 800, height: "auto", padding: 0, textAlign: "left" }}
          >
            {text}
          </Button>
          <Space size={6} wrap>
            <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              Editar
            </Button>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => onBaixa(record)}
              style={{ color: "#16a34a", borderColor: "#86efac" }}
            >
              Baixar
            </Button>
          </Space>
        </Space>
      ),
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
      render: statusBadge,
    },
  ];

  return (
    <Card bordered={false} style={cardStyle}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Contas a Receber
        </Title>
        <Button size="small" onClick={onOpenList}>
          Ver todos
        </Button>
      </div>
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        <Table
          columns={columns}
          dataSource={data?.contas_receber_lista || []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Nenhuma conta a receber" /> }}
          size="small"
          scroll={{ x: 680 }}
        />
      </Skeleton>
    </Card>
  );
}

function TabelaContasPagar({ data, loading, onEdit, onBaixa, onOpenList }) {
  const columns = [
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Button
            type="link"
            onClick={() => onEdit(record)}
            style={{ fontWeight: 800, height: "auto", padding: 0, textAlign: "left" }}
          >
            {text}
          </Button>
          <Space size={6} wrap>
            <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              Editar
            </Button>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => onBaixa(record)}
              style={{ color: "#16a34a", borderColor: "#86efac" }}
            >
              Baixar
            </Button>
          </Space>
        </Space>
      ),
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
      render: statusBadge,
    },
  ];

  return (
    <Card bordered={false} style={cardStyle}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Contas a Pagar
        </Title>
        <Button size="small" onClick={onOpenList}>
          Ver todos
        </Button>
      </div>
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        <Table
          columns={columns}
          dataSource={data?.contas_pagar_lista || []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Nenhuma conta a pagar" /> }}
          size="small"
          scroll={{ x: 680 }}
        />
      </Skeleton>
    </Card>
  );
}

export default function FinanceiroDashboard() {
  const navigate = useNavigate();
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

  const receita = Number(data?.receita || 0);
  const despesa = Number(data?.despesa || 0);
  const contasReceber = Number(data?.contas_receber || 0);
  const contasPagar = Number(data?.contas_pagar || 0);
  const margem = receita > 0 ? Math.round(((receita - despesa) / receita) * 100) : 0;
  const cobertura = contasPagar > 0 ? Math.min(100, Math.round((contasReceber / contasPagar) * 100)) : 100;

  const abrirLancamento = (record, action) => {
    navigate(`/financeiro/lancamentos?${action}=${record.id}`);
  };

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
            Central Financeira
          </Title>
          <Space wrap>
            <Button icon={<FileTextOutlined />} onClick={() => navigate("/financeiro/lancamentos")}>
              Lançamentos
            </Button>
            <Button icon={<BankOutlined />} onClick={() => navigate("/financeiro/contas")}>
              Contas bancárias
            </Button>
            <Button icon={<ReconciliationOutlined />} onClick={() => navigate("/financeiro/lancamentos?importar=1")}>
              Importar extrato
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/financeiro/lancamentos?novo=1")}>
              Novo lançamento
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={16}>
            <Alert
              type={contasPagar > contasReceber ? "warning" : "success"}
              showIcon
              message="Resumo executivo"
              description={`Margem operacional de ${margem}% no período. Existem ${formatMoney(contasReceber)} em aberto para receber e ${formatMoney(contasPagar)} para pagar.`}
            />
          </Col>
          <Col xs={24} lg={8}>
            <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 16 }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text strong>Cobertura de compromissos</Text>
                <Progress percent={cobertura} strokeColor={cobertura >= 80 ? "#10B981" : "#F59E0B"} />
              </Space>
            </Card>
          </Col>
        </Row>

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
              icon={ArrowUpOutlined}
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
              icon={ArrowDownOutlined}
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
              icon={WalletOutlined}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Contas a Receber"
              value={formatMoney(data?.contas_receber)}
              color="#EA8C55"
              loading={loading}
              icon={FileTextOutlined}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Contas a Pagar"
              value={formatMoney(data?.contas_pagar)}
              color="#5B21B6"
              loading={loading}
              icon={ReconciliationOutlined}
            />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={4}>
            <MetricCard
              label="Saldo Total"
              value={formatMoney(data?.saldo_total)}
              color="#0891b2"
              loading={loading}
              icon={BankOutlined}
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
            <TabelaContasReceber
              data={data}
              loading={loading}
              onEdit={(record) => abrirLancamento(record, "editar")}
              onBaixa={(record) => abrirLancamento(record, "baixar")}
              onOpenList={() => navigate("/financeiro/lancamentos?tipo=receita&status=pendente")}
            />
          </Col>
          <Col xs={24} lg={12}>
            <TabelaContasPagar
              data={data}
              loading={loading}
              onEdit={(record) => abrirLancamento(record, "editar")}
              onBaixa={(record) => abrirLancamento(record, "baixar")}
              onOpenList={() => navigate("/financeiro/lancamentos?tipo=despesa&status=pendente")}
            />
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
