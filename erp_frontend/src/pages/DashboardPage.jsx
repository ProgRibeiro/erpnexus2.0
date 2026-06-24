import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Table,
  Tag,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  ToolOutlined,
  WalletOutlined,
  WarningOutlined,
} from "@ant-design/icons";
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
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const sectionCardStyle = {
  border: "1px solid #E2E6EC",
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
  overflow: "hidden",
};

const metricCardStyle = {
  border: "1px solid #E2E6EC",
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
  minHeight: 164,
  transition: "transform 0.18s ease, box-shadow 0.18s ease",
};

const tableStyle = {
  border: "1px solid #EEF2F7",
  borderRadius: 12,
  overflow: "hidden",
};

const serviceTypeLabels = {
  hvac: "HVAC",
  refrigeracao: "Refrigeração",
  eletrica: "Elétrica",
  civil: "Civil",
  preventiva: "Preventiva",
  manutencao: "Manutenção",
  instalacao: "Instalação",
};

const statusConfig = {
  lead: { color: "default", label: "Lead" },
  orcamento: { color: "gold", label: "Orçamento" },
  orcamento_enviado: { color: "gold", label: "Orçamento" },
  aprovada: { color: "blue", label: "Aprovada" },
  aprovado: { color: "blue", label: "Aprovado" },
  aberta: { color: "cyan", label: "Aberta" },
  agendada: { color: "processing", label: "Agendada" },
  em_execucao: { color: "purple", label: "Em execução" },
  concluida: { color: "green", label: "Concluída" },
  faturada: { color: "success", label: "Faturada" },
  cancelada: { color: "error", label: "Cancelada" },
  vencido: { color: "error", label: "Vencido" },
};

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

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDateLong(date) {
  if (!date) return "";
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "");
}

function getGreeting() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function getInitials(nome) {
  return String(nome || "OS")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function getStatusTag(status) {
  const config = statusConfig[status] || { color: "default", label: status || "-" };
  return <Tag color={config.color}>{config.label}</Tag>;
}

function normalizeMonthlyData(rawSeries) {
  if (Array.isArray(rawSeries) && rawSeries.length) {
    return rawSeries.slice(0, 6).map((item, index) => ({
      mes: item.mes || item.label || item.month || formatMonth(new Date(new Date().getFullYear(), index, 1)),
      receita: Number(item.receita || item.revenue || 0),
      despesa: Number(item.despesa || item.despesas || item.expense || 0),
    }));
  }

  return Array.from({ length: 6 }, (_, index) => {
    const data = new Date();
    data.setMonth(data.getMonth() - (5 - index));
    return {
      mes: formatMonth(data),
      receita: 0,
      despesa: 0,
    };
  });
}

function extractItems(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function DashboardMetricCard({ label, value, trend, color, icon, trendMode = "percent", trendText }) {
  const trendNumber = Number(trend || 0);
  const isPositive = trendNumber >= 0;
  const isAlertMode = trendMode === "alert";
  const alertActive = isAlertMode && trendNumber > 0;

  return (
    <Card
      bordered={false}
      style={metricCardStyle}
      bodyStyle={{ padding: 20, height: "100%" }}
      hoverable
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: colors.textoFraco,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 18,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 36,
                lineHeight: 1,
                fontWeight: 700,
                color: colors.texto,
                wordBreak: "break-word",
              }}
            >
              {value}
            </div>
          </div>

          <div
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 12,
              background: `${color}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
              fontSize: 20,
            }}
          >
            {icon}
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: isAlertMode
              ? (alertActive ? colors.vermelho : colors.verde)
              : (isPositive ? colors.verde : colors.vermelho),
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {isAlertMode ? (
            <>
              {alertActive ? <WarningOutlined /> : <ArrowUpOutlined />}
              <span>
                {trendText ||
                  (alertActive
                    ? `${Math.abs(trendNumber)} título${Math.abs(trendNumber) > 1 ? "s" : ""} vencido${Math.abs(trendNumber) > 1 ? "s" : ""}`
                    : "Tudo em dia")}
              </span>
            </>
          ) : (
            <>
              {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <span>{Math.abs(trendNumber)}%</span>
              <span style={{ color: colors.textoSecundario, fontWeight: 500 }}>vs mês anterior</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({});
  const [agendaHoje, setAgendaHoje] = useState([]);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const [dashboardResponse, agendaResponse] = await Promise.all([
          api.get("/financeiro/dashboard/"),
          api.get("/ordens/agenda/hoje/"),
        ]);

        setDashboard(dashboardResponse?.data || {});
        setAgendaHoje(extractItems(agendaResponse?.data));
      } catch (error) {
        setDashboard({});
        setAgendaHoje([]);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const primeiroNome =
    user?.first_name ||
    user?.nome?.split(" ")[0] ||
    user?.nome_completo?.split(" ")[0] ||
    "Admin";

  const chartData = useMemo(
    () =>
      normalizeMonthlyData(
        dashboard?.receita_despesa_mensal ||
          dashboard?.grafico_receita_despesa ||
          dashboard?.ultimos_6_meses
      ),
    [dashboard]
  );

  const cards = useMemo(
    () => [
      {
        key: "abertas",
        label: "OS Abertas",
        value: Number(dashboard?.ordens_abertas || 0).toLocaleString("pt-BR"),
        trend: dashboard?.ordens_abertas_change ?? 0,
        color: colors.azul,
        icon: <FileTextOutlined />,
      },
      {
        key: "execucao",
        label: "Em Execução Hoje",
        value: Number(dashboard?.ordens_em_execucao || dashboard?.em_execucao_hoje || 0).toLocaleString("pt-BR"),
        trend: dashboard?.ordens_em_execucao_change ?? 0,
        color: colors.roxo,
        icon: <ToolOutlined />,
      },
      {
        key: "receita",
        label: "Receita do Mês",
        value: formatCurrency(dashboard?.receita || dashboard?.receita_mes || 0),
        trend: dashboard?.receita_change ?? 0,
        color: colors.verde,
        icon: <DollarOutlined />,
      },
      {
        key: "faturamento",
        label: "Aguardando Faturamento",
        value: Number(
          dashboard?.aguardando_faturamento_count ||
            dashboard?.ordens_aguardando_faturamento ||
            0
        ).toLocaleString("pt-BR"),
        trend: dashboard?.aguardando_faturamento_change ?? 0,
        color: colors.laranja,
        icon: <ClockCircleOutlined />,
      },
      {
        key: "lucro",
        label: "Lucro do Mês",
        value: formatCurrency(dashboard?.lucro ?? (Number(dashboard?.receita || 0) - Number(dashboard?.despesa || 0))),
        trend: dashboard?.lucro_change ?? 0,
        color: colors.azul,
        icon: <WalletOutlined />,
      },
      {
        key: "vencido",
        label: "Vencido a Receber",
        value: formatCurrency(dashboard?.receber_atrasado || 0),
        trend: dashboard?.receber_atrasado_count || 0,
        trendMode: "alert",
        color: colors.vermelho,
        icon: <WarningOutlined />,
      },
    ],
    [dashboard]
  );

  const faturamentoRows = useMemo(() => {
    const raw = extractItems(
      dashboard?.aguardando_faturamento ||
        dashboard?.ordens_aguardando_faturamento_lista
    );
    return raw.slice(0, 5).map((item, index) => ({
      key: item.id || item.numero || index,
      numero: item.numero || item.os || `OS-${index + 1}`,
      cliente: item.cliente?.nome || item.cliente || "-",
      valor: Number(item.valor || item.valor_total || item.valor_final || 0),
      dias: Number(item.dias_aguardando || item.dias || 0),
    }));
  }, [dashboard]);

  const pagamentosAtrasadosRows = useMemo(() => {
    const raw = extractItems(
      dashboard?.pagamentos_atrasados ||
        dashboard?.titulos_atrasados ||
        dashboard?.contas_atrasadas
    );
    return raw
      .map((item, index) => ({
        key: item.id || item.numero || index,
        numero: item.numero || item.os || `OS-${index + 1}`,
        cliente: item.cliente?.nome || item.cliente || "-",
        valor: Number(item.valor || item.valor_total || item.valor_final || 0),
        dias: Number(item.dias_atraso || item.dias || 0),
      }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 5);
  }, [dashboard]);

  const agendaColunas = [
    {
      title: "Horário",
      dataIndex: "data_agendada",
      key: "horario",
      width: 88,
      render: (_, record) => {
        const horario = record?.hora_inicio || record?.horario || record?.hora_agendada;
        return (
          <span style={{ fontWeight: 600, color: colors.texto }}>
            {horario ? String(horario).slice(0, 5) : "--:--"}
          </span>
        );
      },
    },
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
      render: (_, record) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: colors.texto }}>
            {record?.cliente?.nome || "Cliente não informado"}
          </div>
          <div style={{ color: colors.textoFraco, fontSize: 12 }}>
            {serviceTypeLabels[record?.tipo_servico] || "Serviço"}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 132,
      render: (value) => getStatusTag(value),
    },
  ];

  const billingColumns = [
    {
      title: "OS",
      dataIndex: "numero",
      key: "numero",
      width: 90,
      render: (value) => <span style={{ fontWeight: 700, color: colors.azul }}>{value}</span>,
    },
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
      ellipsis: true,
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      width: 120,
      render: (value) => formatCurrency(value),
    },
    {
      title: "Dias",
      dataIndex: "dias",
      key: "dias",
      width: 110,
      render: (value) =>
        value > 3 ? <Tag color="error">{value} dias</Tag> : <span>{value} dias</span>,
    },
  ];

  const overdueColumns = [
    {
      title: "OS",
      dataIndex: "numero",
      key: "numero",
      width: 90,
      render: (value) => <span style={{ fontWeight: 700, color: colors.azul }}>{value}</span>,
    },
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
      ellipsis: true,
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      width: 120,
      render: (value) => formatCurrency(value),
    },
    {
      title: "Atraso",
      dataIndex: "dias",
      key: "dias",
      width: 110,
      render: (value) => <Tag color="error">{value} dias</Tag>,
    },
  ];

  const renderAgendaList = () => {
    if (!agendaHoje.length) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Nenhuma OS agendada hoje"
          style={{ padding: "34px 0 26px" }}
        />
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {agendaHoje.slice(0, 5).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(`/ordens/${item.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: "100%",
              textAlign: "left",
              padding: 14,
              borderRadius: 14,
              border: "1px solid #EEF2F7",
              background: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                minWidth: 60,
                fontSize: 18,
                fontWeight: 700,
                color: colors.texto,
              }}
            >
              {item?.hora_inicio ? String(item.hora_inicio).slice(0, 5) : "--:--"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: colors.texto }}>
                {item?.cliente?.nome || "Cliente não informado"}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: colors.textoSecundario,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {serviceTypeLabels[item?.tipo_servico] || "Serviço geral"}
              </div>
            </div>

            <Avatar
              size={38}
              style={{ background: "#DBEAFE", color: colors.azul, fontWeight: 700 }}
            >
              {getInitials(item?.tecnico_responsavel?.nome || item?.tecnico?.nome || "T")}
            </Avatar>

            <div>{getStatusTag(item?.status)}</div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 46,
            lineHeight: 1.04,
            fontWeight: 700,
            color: colors.texto,
            wordBreak: "break-word",
          }}
        >
          {getGreeting()}, {primeiroNome}!
        </div>
        <div style={{ fontSize: 16, color: colors.textoSecundario }}>
          {formatDateLong(new Date())}
        </div>
        <div style={{ fontSize: 20, color: colors.textoFraco }}>
          Aqui está o resumo do seu dia
        </div>
      </div>

      {loading ? (
        <Card bordered={false} style={sectionCardStyle}>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            {cards.map((card) => (
              <Col xs={24} sm={12} xl={4} key={card.key}>
                <DashboardMetricCard {...card} />
              </Col>
            ))}
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24} xl={14}>
              <Card
                bordered={false}
                title="Receita vs Despesa — últimos 6 meses"
                style={sectionCardStyle}
              >
                <div style={{ width: "100%", height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={10}>
                      <CartesianGrid stroke="#E8EDF4" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="mes"
                        tick={{ fill: "#6B7280", fontSize: 13 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6B7280", fontSize: 13 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(15, 23, 42, 0.03)" }}
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E2E6EC",
                          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="receita" name="Receita" fill={colors.verde} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="despesa" name="Despesa" fill={colors.vermelho} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={10}>
              <Card
                bordered={false}
                title="OS Agendadas Hoje"
                extra={
                  <Button type="link" onClick={() => navigate("/agenda")}>
                    ver todas
                  </Button>
                }
                style={sectionCardStyle}
              >
                {renderAgendaList()}
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                title="Aguardando Faturamento"
                extra={
                  <Button type="link" onClick={() => navigate("/financeiro/lancamentos")}>
                    ver todas
                  </Button>
                }
                style={sectionCardStyle}
              >
                <div style={tableStyle}>
                  <Table
                    dataSource={faturamentoRows}
                    columns={billingColumns}
                    pagination={false}
                    locale={{ emptyText: "Nenhuma OS aguardando faturamento" }}
                    size="middle"
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card
                bordered={false}
                title="Pagamentos Atrasados"
                extra={
                  <Button type="link" onClick={() => navigate("/financeiro")}>
                    ver todas
                  </Button>
                }
                style={sectionCardStyle}
              >
                <div style={tableStyle}>
                  <Table
                    dataSource={pagamentosAtrasadosRows}
                    columns={overdueColumns}
                    pagination={false}
                    locale={{ emptyText: "Nenhum pagamento atrasado" }}
                    size="middle"
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
