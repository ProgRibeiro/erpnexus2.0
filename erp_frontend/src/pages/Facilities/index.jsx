import { useState, useEffect } from "react";
import { Row, Col, Card, Table, Tag, Typography, Space, Spin, Progress } from "antd";
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
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../services/api";

const { Title, Text } = Typography;

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
      color: "#EF4444",
      bg: "#FEF2F2",
    },
    {
      label: "Em Execução",
      value: metricas.chamados_em_execucao || 0,
      icon: <PlayCircleOutlined />,
      color: "#3B82F6",
      bg: "#EFF6FF",
    },
    {
      label: "SLA Vencendo",
      value: metricas.sla_vencendo || 0,
      icon: <ClockCircleOutlined />,
      color: (metricas.sla_vencendo || 0) > 0 ? "#EF4444" : "#10B981",
      bg: (metricas.sla_vencendo || 0) > 0 ? "#FEF2F2" : "#ECFDF5",
    },
    {
      label: "Concluídos no Mês",
      value: metricas.concluidos_mes || 0,
      icon: <CheckCircleOutlined />,
      color: "#10B981",
      bg: "#ECFDF5",
    },
    {
      label: "Unidades Ativas",
      value: metricas.unidades_ativas || 0,
      icon: <BuildOutlined />,
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
    {
      label: "Aprovações Pendentes",
      value: metricas.aprovacoes_pendentes || 0,
      icon: <CheckSquareOutlined />,
      color: (metricas.aprovacoes_pendentes || 0) > 0 ? "#F59E0B" : "#10B981",
      bg: (metricas.aprovacoes_pendentes || 0) > 0 ? "#FFFBEB" : "#ECFDF5",
    },
  ];

  const colsChamados = [
    { title: "Nº", dataIndex: "numero", key: "numero", width: 130 },
    { title: "Tipo de Serviço", dataIndex: "tipo_servico", key: "tipo_servico", ellipsis: true },
    {
      title: "Prioridade",
      dataIndex: "prioridade",
      key: "prioridade",
      width: 110,
      render: (p) => <Tag color={prioridadeCor[p]}>{p?.toUpperCase()}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (s) => <Tag color={statusCor[s]}>{statusLabel[s] || s}</Tag>,
    },
    {
      title: "Abertura",
      dataIndex: "abertura",
      key: "abertura",
      width: 130,
      render: (d) => d ? dayjs(d).format("DD/MM/YYYY") : "-",
    },
  ];

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard Facilities</Title>
        <Text type="secondary">Visão geral do portal contratante — SaaS</Text>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {kpis.map((k) => (
          <Col xs={24} sm={12} md={8} lg={4} key={k.label}>
            <Card
              style={{ borderRadius: 14, border: "none", background: k.bg, cursor: "default" }}
              bodyStyle={{ padding: "16px 20px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: k.color + "20",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: k.color,
                  }}
                >
                  {k.icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{k.label}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card
            style={{ borderRadius: 14, border: "none", background: "#FFF7ED" }}
            bodyStyle={{ padding: "16px 20px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: "#F59E0B20",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: "#F59E0B",
                }}
              >
                <DollarOutlined />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                  {budgetPct.toFixed(1)}%
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Budget Consumido</div>
              </div>
            </div>
            <Progress
              percent={Math.min(budgetPct, 100)}
              showInfo={false}
              strokeColor={budgetPct > 90 ? "#EF4444" : budgetPct > 70 ? "#F59E0B" : "#10B981"}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Chamados Recentes</span>}
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            extra={
              <Text
                style={{ color: "#3B82F6", cursor: "pointer", fontSize: 13 }}
                onClick={() => navigate("/facilities/chamados")}
              >
                Ver todos
              </Text>
            }
          >
            <Table
              dataSource={chamadosRecentes}
              columns={colsChamados}
              rowKey="id"
              pagination={false}
              size="small"
              onRow={() => ({ onClick: () => navigate("/facilities/chamados"), style: { cursor: "pointer" } })}
              locale={{ emptyText: "Nenhum chamado registrado" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Ações Rápidas</span>}
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            {[
              { label: "Help Desk / Chamados", path: "/facilities/chamados", icon: <AlertOutlined />, color: "#EF4444" },
              { label: "Unidades", path: "/facilities/unidades", icon: <BuildOutlined />, color: "#3B82F6" },
              { label: "Budget", path: "/facilities/budget", icon: <DollarOutlined />, color: "#F59E0B" },
              { label: "Aprovações", path: "/facilities/aprovacoes", icon: <CheckSquareOutlined />, color: "#10B981" },
              { label: "Manutenção Preventiva", path: "/facilities/pmp", icon: <ToolOutlined />, color: "#8B5CF6" },
              { label: "Contratos", path: "/facilities/contratos", icon: <FileProtectOutlined />, color: "#EC4899" },
              { label: "Obras e Projetos", path: "/facilities/obras", icon: <ProjectOutlined />, color: "#0EA5E9" },
            ].map((item) => (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                  marginBottom: 8, background: "#F9FAFB",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              >
                <span style={{ color: item.color, fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontWeight: 500, color: "#374151" }}>{item.label}</span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
