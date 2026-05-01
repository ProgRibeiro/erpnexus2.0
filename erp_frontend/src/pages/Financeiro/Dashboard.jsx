import { useEffect, useMemo, useState } from "react";
import { Card, Col, Row, Space, Statistic, Table, Typography } from "antd";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import financeiroService from "../../services/financeiro";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthLabel = (value) => (value ? new Date(value).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) : "-");

export default function FinanceiroDashboard() {
  const [data, setData] = useState(null);
  const [fluxo, setFluxo] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const [dashboard, fluxoCaixa] = await Promise.all([
          financeiroService.dashboard(),
          financeiroService.fluxoCaixa(),
        ]);
        setData(dashboard);
        setFluxo(fluxoCaixa);
      } catch {
        setData(null);
        setFluxo([]);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const meses = useMemo(() => {
    const mapa = {};
    (data?.por_mes || []).forEach((item) => {
      const key = monthLabel(item.mes);
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
      mapa[key].saldo += item.tipo === "receita" ? Number(item.total) : -Number(item.total);
    });
    return Object.values(mapa);
  }, [fluxo]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={3}>Financeiro</Typography.Title>
      <Row gutter={[16, 16]}>
        {[
          ["Receita", data?.receita],
          ["Despesa", data?.despesa],
          ["Lucro", data?.lucro],
          ["Contas a receber", data?.contas_receber],
          ["Contas a pagar", data?.contas_pagar],
          ["Saldo total", data?.saldo_total],
        ].map(([label, value]) => (
          <Col xs={24} md={8} xl={4} key={label}>
            <Card loading={loading}>
              <Statistic title={label} value={money(value)} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Receitas e despesas - 6 meses">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => money(value)} />
                <Legend />
                <Bar dataKey="receita" fill="#1677ff" />
                <Bar dataKey="despesa" fill="#cf1322" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Fluxo de caixa projetado">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={fluxoLinha}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(value) => money(value)} />
                <Line type="monotone" dataKey="saldo" stroke="#389e0d" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Contas a receber">
            <Table
              rowKey="id"
              size="small"
              dataSource={data?.contas_receber_lista || []}
              columns={[
                { title: "Descricao", dataIndex: "descricao" },
                { title: "Vencimento", dataIndex: "data_vencimento" },
                { title: "Valor", dataIndex: "valor", render: money },
              ]}
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Contas a pagar">
            <Table
              rowKey="id"
              size="small"
              dataSource={data?.contas_pagar_lista || []}
              columns={[
                { title: "Descricao", dataIndex: "descricao" },
                { title: "Vencimento", dataIndex: "data_vencimento" },
                { title: "Valor", dataIndex: "valor", render: money },
              ]}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={24}>
          <Card title="Despesas por categoria">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data?.despesas_categoria || []} dataKey="total" nameKey="categoria__nome">
                  {(data?.despesas_categoria || []).map((item, index) => (
                    <Cell key={index} fill={item.categoria__cor || "#1677ff"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
