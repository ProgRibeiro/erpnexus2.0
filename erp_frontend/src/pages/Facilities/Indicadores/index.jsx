import { useState, useEffect } from "react";
import { Row, Col, Card, Typography, Spin, Tag } from "antd";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import dayjs from "dayjs";
import api from "../../../services/api";

const { Title, Text } = Typography;

function calcMTTR(chamados) {
  const resolvidos = chamados.filter((c) => c.resolvido_em && c.aberto_em);
  if (!resolvidos.length) return 0;
  const totalHoras = resolvidos.reduce((acc, c) => {
    const diff = dayjs(c.resolvido_em).diff(dayjs(c.aberto_em), "hour", true);
    return acc + diff;
  }, 0);
  return (totalHoras / resolvidos.length).toFixed(1);
}

function calcTopAtivos(chamados) {
  const contagem = {};
  chamados.forEach((c) => {
    if (c.ativo_tag) {
      contagem[c.ativo_tag] = (contagem[c.ativo_tag] || 0) + 1;
    }
  });
  return Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, total]) => ({ tag, total }));
}

function calcChamadosPorMes(chamados) {
  const meses = {};
  for (let i = 5; i >= 0; i--) {
    const mes = dayjs().subtract(i, "month").format("MM/YYYY");
    meses[mes] = 0;
  }
  chamados.forEach((c) => {
    const mes = dayjs(c.aberto_em).format("MM/YYYY");
    if (mes in meses) meses[mes]++;
  });
  return Object.entries(meses).map(([mes, total]) => ({ mes, total }));
}

export default function IndicadoresFacilities() {
  const [loading, setLoading] = useState(true);
  const [ativos, setAtivos] = useState([]);
  const [chamados, setChamados] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/facilities/ativos/"),
      api.get("/facilities/chamados/?ordering=-aberto_em"),
    ])
      .then(([a, c]) => {
        setAtivos(Array.isArray(a.data) ? a.data : (a.data?.results || []));
        setChamados(Array.isArray(c.data) ? c.data : (c.data?.results || []));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  const mttr = calcMTTR(chamados);
  const totalAtivos = ativos.length;
  const atOper = ativos.filter((a) => a.status === "operacional").length;
  const disponibilidade = totalAtivos > 0 ? ((atOper / totalAtivos) * 100).toFixed(1) : 0;
  const topAtivos = calcTopAtivos(chamados);
  const porMes = calcChamadosPorMes(chamados);

  const kpis = [
    {
      label: "MTTR Médio",
      value: `${mttr}h`,
      desc: "Tempo médio de resolução de chamados",
      color: "#3B82F6",
      bg: "#EFF6FF",
    },
    {
      label: "Disponibilidade",
      value: `${disponibilidade}%`,
      desc: "Ativos operacionais / total",
      color: "#10B981",
      bg: "#ECFDF5",
    },
    {
      label: "Total de Chamados",
      value: chamados.length,
      desc: "Todos os chamados registrados",
      color: "#F59E0B",
      bg: "#FFFBEB",
    },
    {
      label: "Chamados Resolvidos",
      value: chamados.filter((c) => ["resolvido", "fechado"].includes(c.status)).length,
      desc: "Status: resolvido ou fechado",
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Indicadores Técnicos</Title>
        <Text type="secondary">KPIs de manutenção e disponibilidade dos ativos</Text>
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
        <Col xs={24} lg={12}>
          <Card
            title="Top 5 Ativos com Mais Chamados"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            {topAtivos.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", padding: 40 }}>
                Sem dados suficientes
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topAtivos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="tag" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3B82F6" name="Chamados" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Chamados por Mês (últimos 6 meses)"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={porMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3B82F6" }}
                  name="Chamados Abertos"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title="Distribuição de Ativos por Status"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            <Row gutter={[12, 12]}>
              {[
                { status: "operacional", label: "Operacional", cor: "green" },
                { status: "em_manutencao", label: "Em Manutenção", cor: "orange" },
                { status: "inativo", label: "Inativo", cor: "default" },
                { status: "sucateado", label: "Sucateado", cor: "red" },
              ].map(({ status, label, cor }) => {
                const count = ativos.filter((a) => a.status === status).length;
                const pct = totalAtivos > 0 ? ((count / totalAtivos) * 100).toFixed(0) : 0;
                return (
                  <Col xs={12} sm={6} key={status}>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "16px 8px",
                        background: "#F9FAFB",
                        borderRadius: 10,
                      }}
                    >
                      <Tag color={cor} style={{ fontSize: 13, marginBottom: 8 }}>{label}</Tag>
                      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{count}</div>
                      <div style={{ fontSize: 13, color: "#9CA3AF" }}>{pct}% do total</div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
