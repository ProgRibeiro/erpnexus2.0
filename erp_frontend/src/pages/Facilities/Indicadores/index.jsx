import { useState, useEffect } from "react";
import { Row, Col, Card, Typography, Spin, Tag, Table } from "antd";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import api from "../../../services/api";

const { Title, Text } = Typography;

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#6B7280"];

const statusLabel = {
  aberto: "Aberto",
  aguardando_orcamento: "Ag. Orçamento",
  aguardando_aprovacao: "Ag. Aprovação",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const prioridadeLabel = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica", emergencia: "Emergência",
};

export default function IndicadoresFacilities() {
  const [loading, setLoading] = useState(true);
  const [visaoGeral, setVisaoGeral] = useState({});
  const [evolucao, setEvolucao] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/portal/contratante/bi/visao-geral/"),
      api.get("/portal/contratante/bi/evolucao/?periodo=12m"),
    ])
      .then(([vg, ev]) => {
        setVisaoGeral(vg.data || {});
        setEvolucao(Array.isArray(ev.data) ? ev.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  const pieStatus = Object.entries(visaoGeral.por_status || {}).map(([key, value]) => ({
    name: statusLabel[key] || key,
    value,
  }));

  const prioridadeData = Object.entries(visaoGeral.por_prioridade || {}).map(([key, value]) => ({
    prioridade: prioridadeLabel[key] || key,
    total: value,
  }));

  const kpis = [
    {
      label: "Total de Chamados",
      value: visaoGeral.total_chamados || 0,
      desc: "Todos os chamados registrados",
      color: "#3B82F6",
      bg: "#EFF6FF",
    },
    {
      label: "Ticket Médio",
      value: visaoGeral.ticket_medio
        ? `R$ ${Number(visaoGeral.ticket_medio).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "R$ 0,00",
      desc: "Valor médio por chamado",
      color: "#10B981",
      bg: "#ECFDF5",
    },
  ];

  const colsPrioridade = [
    { title: "Prioridade", dataIndex: "prioridade", key: "prioridade" },
    { title: "Total de Chamados", dataIndex: "total", key: "total" },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Indicadores — BI Portal Contratante</Title>
        <Text type="secondary">Análise de chamados, orçamentos e desempenho</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {kpis.map((k) => (
          <Col xs={24} sm={12} lg={6} key={k.label}>
            <Card
              style={{ borderRadius: 14, border: "none", background: k.bg }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: k.color, marginBottom: 4 }}>
                {k.value}
              </div>
              <div style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{k.desc}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="Evolução Mensal de Chamados (12 meses)"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            {evolucao.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 40 }}>Sem dados de evolução</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={evolucao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Bar dataKey="valor" fill="#3B82F6" name="Valor (R$)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="Chamados por Status"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            {pieStatus.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 40 }}>Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieStatus.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title="Chamados por Prioridade"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            <Table
              dataSource={prioridadeData}
              columns={colsPrioridade}
              rowKey="prioridade"
              pagination={false}
              size="small"
              locale={{ emptyText: "Sem dados de prioridade" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
