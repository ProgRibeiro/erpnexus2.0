import { useState, useEffect } from "react";
import { Card, Col, Row, Table, Button, Empty, Spin } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowRightOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { MetricCard, StatusBadge } from "../components/ui";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ordens, setOrdens] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dashResponse, ordensResponse] = await Promise.all([
        api.get("/financeiro/dashboard/"),
        api.get("/ordens/agenda/hoje/"),
      ]);

      setDashboard(dashResponse.data);
      setOrdens(ordensResponse.data.results || ordensResponse.data || []);
    } catch {
      setDashboard(null);
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  };

  const dataGrafico = [
    { mes: "Jan", receita: 45000, despesas: 28000 },
    { mes: "Fev", receita: 52000, despesas: 31000 },
    { mes: "Mar", receita: 48000, despesas: 29000 },
    { mes: "Abr", receita: 61000, despesas: 35000 },
    { mes: "Mai", receita: 55000, despesas: 32000 },
    { mes: "Jun", receita: 67000, despesas: 38000 },
  ];

  const saudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const primeiroNome =
    user?.first_name ||
    user?.nome_completo?.split(" ")[0] ||
    user?.nome?.split(" ")[0] ||
    "Usuário";

  const colunas = [
    {
      title: "OS",
      dataIndex: "numero",
      key: "numero",
      render: (numero) => <strong>#{numero}</strong>,
    },
    {
      title: "Cliente",
      dataIndex: ["cliente", "nome"],
      key: "cliente",
    },
    {
      title: "Serviço",
      dataIndex: "servicos",
      key: "servicos",
      render: (servicos) => (servicos?.length || 0) + " itens",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Horário",
      dataIndex: "data_agendada",
      key: "horario",
      render: (data) =>
        data ? new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR") : "-",
    },
  ];

  if (loading) {
    return (
      <div className="flex-center" style={{ height: "400px" }}>
        <Spin />
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 700 }}>
          {saudacao()}, {primeiroNome}! 👋
        </h1>
        <p style={{ margin: "8px 0 0 0", color: "#8c8c8c", fontSize: "14px" }}>
          {dataFormatada}
        </p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: "32px" }}>
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            label="OS Abertas"
            value={dashboard?.ordens_abertas || 0}
            change={dashboard?.ordens_abertas_change || "0%"}
            trend={dashboard?.ordens_abertas_change_type || "neutral"}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            label="Em Execução"
            value={dashboard?.ordens_em_execucao || 0}
            change={dashboard?.ordens_em_execucao_change || "0%"}
            trend={dashboard?.ordens_em_execucao_change_type || "neutral"}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            label="Receita do Mês"
            value={`R$ ${Number(dashboard?.receita || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
            change="0%"
            trend="positive"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <MetricCard
            label="A Faturar"
            value={`R$ ${Number(dashboard?.contas_receber || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
            change="0%"
            trend="warning"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: "32px" }}>
        <Col xs={24}>
          <Card title="Receita vs Despesas (Últimos 6 Meses)" className="erp-page-card">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" stroke="#8c8c8c" />
                <YAxis stroke="#8c8c8c" />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #f0f0f0",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar dataKey="receita" fill="#1B4F8A" radius={[8, 8, 0, 0]} />
                <Bar dataKey="despesas" fill="#B91C1C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title="Ordens Agendadas para Hoje"
            extra={
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/agenda/hoje")}
              >
                Ver tudo
              </Button>
            }
            className="erp-page-card"
          >
            {ordens.length === 0 ? (
              <Empty description="Nenhuma ordem agendada para hoje" />
            ) : (
              <Table
                dataSource={ordens.slice(0, 5)}
                columns={colunas}
                pagination={false}
                size="small"
                rowKey="id"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title="Aguardando Faturamento"
            extra={
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/financeiro/lancamentos")}
              >
                Ver tudo
              </Button>
            }
            className="erp-page-card"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    background: "#fafafa",
                    borderRadius: "6px",
                    borderLeft: "3px solid #B45309",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", color: "#262626" }}>OS #{item}</div>
                    <div style={{ fontSize: "12px", color: "#8c8c8c", marginTop: "4px" }}>
                      Cliente {item}
                    </div>
                  </div>
                  <div style={{ fontWeight: "700", color: "#1B4F8A" }}>
                    R$ {(5000 * item).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
