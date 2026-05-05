import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Typography, Space, Spin } from "antd";
import {
  BuildOutlined,
  AlertOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const { Title, Text } = Typography;

const prioridadeCor = { baixa: "blue", media: "gold", alta: "orange", critica: "red" };
const statusCor = { aberto: "red", em_atendimento: "orange", aguardando: "gold", resolvido: "green", fechado: "default" };

export default function FacilitiesDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState({});
  const [chamadosRecentes, setChamadosRecentes] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/facilities/dashboard/"),
      api.get("/facilities/chamados/?status=aberto&ordering=-aberto_em&limit=5"),
    ])
      .then(([m, c]) => {
        setMetricas(m.data || {});
        const lista = Array.isArray(c.data) ? c.data : (c.data?.results || []);
        setChamadosRecentes(lista.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "Total de Ativos", value: metricas.total_ativos || 0, icon: <BuildOutlined />, color: "#3B82F6", bg: "#EFF6FF" },
    { label: "Ativos Operacionais", value: metricas.ativos_operacionais || 0, icon: <CheckCircleOutlined />, color: "#10B981", bg: "#ECFDF5" },
    { label: "Chamados Abertos", value: metricas.chamados_abertos || 0, icon: <AlertOutlined />, color: "#F59E0B", bg: "#FFFBEB" },
    { label: "Chamados Críticos", value: metricas.chamados_criticos || 0, icon: <AlertOutlined />, color: "#EF4444", bg: "#FEF2F2" },
    { label: "Planos Vencidos", value: metricas.planos_vencidos || 0, icon: <ClockCircleOutlined />, color: "#8B5CF6", bg: "#F5F3FF" },
    { label: "Contratos Vencendo", value: metricas.contratos_vencendo || 0, icon: <FileProtectOutlined />, color: "#EC4899", bg: "#FDF2F8" },
    { label: "Projetos Ativos", value: metricas.projetos_ativos || 0, icon: <ProjectOutlined />, color: "#0EA5E9", bg: "#F0F9FF" },
  ];

  const colsChamados = [
    { title: "Nº", dataIndex: "numero", key: "numero", width: 130 },
    { title: "Título", dataIndex: "titulo", key: "titulo", ellipsis: true },
    { title: "Local", dataIndex: "local", key: "local", width: 160 },
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
      width: 130,
      render: (s) => <Tag color={statusCor[s]}>{s?.replace("_", " ").toUpperCase()}</Tag>,
    },
  ];

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard Facilities</Title>
        <Text type="secondary">Visão geral de ativos, manutenção e obras</Text>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {kpis.map((k) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={k.label}>
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
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Chamados Recentes (Abertos)</span>}
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
              onRow={(r) => ({ onClick: () => navigate("/facilities/chamados"), style: { cursor: "pointer" } })}
              locale={{ emptyText: "Nenhum chamado aberto" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Ações Rápidas</span>}
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            {[
              { label: "Gerenciar Ativos", path: "/facilities/ativos", icon: <BuildOutlined />, color: "#3B82F6" },
              { label: "Help Desk / Chamados", path: "/facilities/chamados", icon: <AlertOutlined />, color: "#EF4444" },
              { label: "Manutenção Preventiva", path: "/facilities/pmp", icon: <ToolOutlined />, color: "#10B981" },
              { label: "Contratos", path: "/facilities/contratos", icon: <FileProtectOutlined />, color: "#8B5CF6" },
              { label: "Obras e Projetos", path: "/facilities/obras", icon: <ProjectOutlined />, color: "#F59E0B" },
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
