import { useState, useEffect } from "react";
import { Row, Col, Card, Table, Tag, Typography, Space, Skeleton, Progress } from "antd";
import {
  BuildOutlined,
  AlertOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  ProjectOutlined,
  PlayCircleOutlined,
  DollarOutlined,
  CheckSquareOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../services/api";

const { Title, Text } = Typography;

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
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

const prioridadeCor = {
  baixa: "blue", media: "gold", alta: "orange", critica: "red", emergencia: "magenta",
};
const statusCor = {
  aberto: "red",
  aguardando_orcamento: "orange",
  aguardando_aprovacao: "gold",
  em_execucao: "blue",
  concluido: "green",
  cancelado: "default",
};
const statusLabel = {
  aberto: "Aberto",
  aguardando_orcamento: "Ag. Orçamento",
  aguardando_aprovacao: "Ag. Aprovação",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function KpiCard({ label, value, icon, color }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
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
          <div style={{ color: colors.texto, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
            {value}
          </div>
        </div>
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
    </Card>
  );
}

export default function FacilitiesDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState({});
  const [chamadosRecentes, setChamadosRecentes] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/portal/contratante/dashboard/"),
      api.get("/portal/contratante/chamados/?limit=5"),
    ])
      .then(([m, c]) => {
        setMetricas(m.data || {});
        const lista = Array.isArray(c.data) ? c.data : (c.data?.results || []);
        setChamadosRecentes(lista.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const budgetPct = metricas.budget_consumo_pct ?? 0;

  const kpis = [
    {
      label: "Chamados Abertos",
      value: metricas.chamados_abertos || 0,
      icon: <AlertOutlined />,
      color: colors.vermelho,
    },
    {
      label: "Em Execução",
      value: metricas.chamados_em_execucao || 0,
      icon: <PlayCircleOutlined />,
      color: colors.azul,
    },
    {
      label: "SLA Vencendo",
      value: metricas.sla_vencendo || 0,
      icon: <ClockCircleOutlined />,
      color: (metricas.sla_vencendo || 0) > 0 ? colors.vermelho : colors.verde,
    },
    {
      label: "Concluídos no Mês",
      value: metricas.concluidos_mes || 0,
      icon: <CheckCircleOutlined />,
      color: colors.verde,
    },
    {
      label: "Unidades Ativas",
      value: metricas.unidades_ativas || 0,
      icon: <BuildOutlined />,
      color: colors.roxo,
    },
    {
      label: "Aprovações Pendentes",
      value: metricas.aprovacoes_pendentes || 0,
      icon: <CheckSquareOutlined />,
      color: (metricas.aprovacoes_pendentes || 0) > 0 ? colors.laranja : colors.verde,
    },
  ];

  const acoesRapidas = [
    { label: "Help Desk / Chamados", path: "/facilities/chamados", icon: <AlertOutlined />, color: colors.vermelho },
    { label: "Unidades", path: "/facilities/unidades", icon: <BuildOutlined />, color: colors.azul },
    { label: "Budget", path: "/facilities/budget", icon: <DollarOutlined />, color: colors.laranja },
    { label: "Aprovações", path: "/facilities/aprovacoes", icon: <CheckSquareOutlined />, color: colors.verde },
    { label: "Manutenção Preventiva", path: "/facilities/pmp", icon: <ToolOutlined />, color: colors.roxo },
    { label: "Contratos", path: "/facilities/contratos", icon: <FileProtectOutlined />, color: "#EC4899" },
    { label: "Obras e Projetos", path: "/facilities/obras", icon: <ProjectOutlined />, color: "#0EA5E9" },
  ];

  const colsChamados = [
    {
      title: "Nº",
      dataIndex: "numero",
      key: "numero",
      width: 130,
      render: (v) => <Text strong style={{ color: colors.azul }}>{v}</Text>,
    },
    { title: "Tipo de Serviço", dataIndex: "tipo_servico", key: "tipo_servico", ellipsis: true },
    {
      title: "Prioridade",
      dataIndex: "prioridade",
      key: "prioridade",
      width: 110,
      render: (p) => <Tag color={prioridadeCor[p]} style={{ borderRadius: 999, fontWeight: 600 }}>{p?.toUpperCase()}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (s) => <Tag color={statusCor[s]} style={{ borderRadius: 999, fontWeight: 600 }}>{statusLabel[s] || s}</Tag>,
    },
    {
      title: "Abertura",
      dataIndex: "abertura",
      key: "abertura",
      width: 130,
      render: (d) => d ? dayjs(d).format("DD/MM/YYYY") : "-",
    },
  ];

  return (
    <div style={pageStyle}>
      <div>
        <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>
          Dashboard Facilities
        </Title>
        <Text style={{ color: colors.textoSecundario }}>
          Visão geral do portal contratante — SaaS
        </Text>
      </div>

      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            {kpis.map((k) => (
              <Col xs={24} sm={12} md={8} lg={4} key={k.label}>
                <KpiCard {...k} />
              </Col>
            ))}
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
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
                      Budget Consumido
                    </div>
                    <div style={{ color: colors.texto, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
                      {budgetPct.toFixed(1)}%
                    </div>
                  </div>
                  <div
                    style={{
                      alignItems: "center",
                      background: `${colors.laranja}14`,
                      borderRadius: 12,
                      color: colors.laranja,
                      display: "flex",
                      height: 44,
                      justifyContent: "center",
                      width: 44,
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    <DollarOutlined />
                  </div>
                </div>
                <Progress
                  percent={Math.min(budgetPct, 100)}
                  showInfo={false}
                  strokeColor={budgetPct > 90 ? colors.vermelho : budgetPct > 70 ? colors.laranja : colors.verde}
                  size="small"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={16}>
              <Card
                bordered={false}
                title="Chamados Recentes"
                style={panelStyle}
                bodyStyle={{ padding: 0 }}
                extra={
                  <Text
                    style={{ color: colors.azul, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    onClick={() => navigate("/facilities/chamados")}
                  >
                    Ver todos <ArrowRightOutlined style={{ fontSize: 11 }} />
                  </Text>
                }
              >
                <Table
                  dataSource={chamadosRecentes}
                  columns={colsChamados}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  onRow={() => ({ onClick: () => navigate("/facilities/chamados"), style: { cursor: "pointer" } })}
                  locale={{ emptyText: "Nenhum chamado registrado" }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card
                bordered={false}
                title="Ações Rápidas"
                style={panelStyle}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  {acoesRapidas.map((item) => (
                    <div
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${colors.borda}`,
                        background: colors.fundoSuave,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#EFF4FB";
                        e.currentTarget.style.borderColor = colors.azul;
                        e.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.fundoSuave;
                        e.currentTarget.style.borderColor = colors.borda;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: `${item.color}14`,
                          color: item.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>
                      <span style={{ fontWeight: 600, color: colors.texto, fontSize: 13 }}>{item.label}</span>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
