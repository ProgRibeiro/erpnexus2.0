import { useState, useEffect } from "react";
import { Row, Col, Card, Typography, Skeleton, Table } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import api from "../../../services/api";

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
};

const PIE_COLORS = [colors.azul, colors.verde, colors.laranja, colors.vermelho, colors.roxo, colors.textoFraco];

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

function KpiCard({ label, value, desc, color }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
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
          marginBottom: 14,
        }}
      >
        <BarChartOutlined />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 6, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontWeight: 700, color: colors.texto, marginBottom: 4, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 12, color: colors.textoFraco }}>{desc}</div>
    </Card>
  );
}

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
      color: colors.azul,
    },
    {
      label: "Ticket Médio",
      value: visaoGeral.ticket_medio
        ? `R$ ${Number(visaoGeral.ticket_medio).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "R$ 0,00",
      desc: "Valor médio por chamado",
      color: colors.verde,
    },
  ];

  const colsPrioridade = [
    { title: "Prioridade", dataIndex: "prioridade", key: "prioridade" },
    { title: "Total de Chamados", dataIndex: "total", key: "total" },
  ];

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.roxo}14`,
              color: colors.roxo,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <BarChartOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>
              Indicadores — BI Portal Contratante
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Análise de chamados, orçamentos e desempenho
            </Text>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            {kpis.map((k) => (
              <Col xs={24} sm={12} lg={6} key={k.label}>
                <KpiCard {...k} />
              </Col>
            ))}
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={14}>
              <Card
                bordered={false}
                title="Evolução Mensal de Chamados (12 meses)"
                style={panelStyle}
              >
                {evolucao.length === 0 ? (
                  <div style={{ textAlign: "center", color: colors.textoFraco, padding: 40 }}>Sem dados de evolução</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={evolucao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF4" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: colors.textoSecundario }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: colors.textoSecundario }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E6EC", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}
                      />
                      <Legend />
                      <Bar dataKey="valor" fill={colors.azul} name="Valor (R$)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                bordered={false}
                title="Chamados por Status"
                style={panelStyle}
              >
                {pieStatus.length === 0 ? (
                  <div style={{ textAlign: "center", color: colors.textoFraco, padding: 40 }}>Sem dados</div>
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
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E6EC", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>

            <Col xs={24}>
              <Card
                bordered={false}
                title="Chamados por Prioridade"
                style={panelStyle}
                bodyStyle={{ padding: 0 }}
              >
                <Table
                  dataSource={prioridadeData}
                  columns={colsPrioridade}
                  rowKey="prioridade"
                  pagination={false}
                  size="middle"
                  locale={{ emptyText: "Sem dados de prioridade" }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
