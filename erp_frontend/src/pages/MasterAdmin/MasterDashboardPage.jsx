import { useEffect, useState } from "react";
import {
  Card, Col, Row, Statistic, Typography, Table, Tag, Spin, Badge
} from "antd";
import {
  TeamOutlined, DollarCircleOutlined, WarningOutlined, AppstoreOutlined,
  RiseOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;

const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v) => moneyFmt.format(Number(v || 0));

const statusColors = { pendente: "orange", pago: "green", vencido: "red", cancelado: "default" };

export default function MasterDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    masterApi.get("/dashboard/")
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spin size="large" /></div>;
  if (!data) return null;

  const { resumo, por_sistema, receita_mensal, ultimos_pagamentos } = data;

  const kpis = [
    { label: "MRR (Receita Mensal)", value: fmt(resumo.mrr), icon: <RiseOutlined />, color: "#6366F1", bg: "#EEF2FF" },
    { label: "Clientes Ativos", value: resumo.ativos, icon: <TeamOutlined />, color: "#10B981", bg: "#ECFDF5" },
    { label: "Em Trial", value: resumo.trial, icon: <ClockCircleOutlined />, color: "#F59E0B", bg: "#FFFBEB" },
    { label: "Suspensos", value: resumo.suspensos, icon: <WarningOutlined />, color: "#EF4444", bg: "#FEF2F2" },
    { label: "Total em Atraso", value: fmt(resumo.total_vencido), icon: <DollarCircleOutlined />, color: "#EF4444", bg: "#FEF2F2" },
    { label: "Vencendo em 7 dias", value: resumo.vencendo_proximos_7_dias, icon: <WarningOutlined />, color: "#F59E0B", bg: "#FFFBEB" },
  ];

  const colunasPgtos = [
    { title: "Referência", dataIndex: "referencia", key: "referencia" },
    { title: "Valor", dataIndex: "valor_cobrado", key: "valor", render: (v) => <Text strong>{fmt(v)}</Text> },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (v, r) => <Tag color={statusColors[v] || "default"}>{r.status_display || v}</Tag>
    },
    { title: "Vencimento", dataIndex: "data_vencimento", key: "venc", render: (v) => v || "-" },
    { title: "Pagamento", dataIndex: "data_pagamento", key: "pgto", render: (v) => v || "-" },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ margin: 0, color: "#0F172A" }}>
          Dashboard Master
        </Title>
        <Text type="secondary">Visão geral de todos os clientes e receita dos sistemas.</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {kpis.map((k) => (
          <Col xs={24} sm={12} lg={8} key={k.label}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", background: "#fff" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: k.bg, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, color: k.color,
                }}>
                  {k.icon}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{k.label}</Text>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A" }}>{k.value}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Gráfico de receita */}
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <Title level={5} style={{ marginBottom: 20 }}>Receita dos últimos 6 meses</Title>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={receita_mensal} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="masterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Area type="monotone" dataKey="valor" stroke="#6366F1" strokeWidth={2} fill="url(#masterGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Clientes por sistema */}
        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", height: "100%" }}>
            <Title level={5} style={{ marginBottom: 20 }}>Assinaturas por sistema</Title>
            {[
              { label: "ERP Nexus", value: por_sistema.erp, color: "#3B82F6" },
              { label: "Facilities SaaS", value: por_sistema.facilities, color: "#10B981" },
              { label: "ERP + Facilities", value: por_sistema.ambos, color: "#8B5CF6" },
            ].map((s) => (
              <div key={s.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 0", borderBottom: "1px solid #F1F5F9",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                  <Text>{s.label}</Text>
                </div>
                <Text strong style={{ fontSize: 20, color: s.color }}>{s.value}</Text>
              </div>
            ))}
            <div style={{ paddingTop: 16 }}>
              <Statistic
                title="Total geral"
                value={resumo.total_clientes}
                valueStyle={{ color: "#0F172A", fontSize: 28, fontWeight: 800 }}
                prefix={<TeamOutlined />}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Últimos pagamentos */}
      <Card bordered={false} style={{ borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <Title level={5} style={{ marginBottom: 16 }}>Últimos pagamentos</Title>
        <Table
          columns={colunasPgtos}
          dataSource={ultimos_pagamentos}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: "Nenhum pagamento ainda" }}
        />
      </Card>
    </div>
  );
}
