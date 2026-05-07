import { useEffect, useState } from "react";
import { Button, Card, Col, DatePicker, Input, Row, Select, Space, Statistic, Table, Tag, Typography, message } from "antd";
import { CalendarOutlined, FileProtectOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { money, normalizeList, pageStyle, statusConfig } from "./shared";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function ContratosPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contratos, setContratos] = useState([]);
  const [summary, setSummary] = useState({});
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");

  async function fetchContratos() {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (busca) params.search = busca;
      const res = await api.get("/contratos/", { params });
      setContratos(normalizeList(res.data));
      setSummary(res.data?.summary || {});
    } catch {
      message.error("Erro ao carregar contratos de preventiva.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContratos();
  }, [status]);

  const columns = [
    { title: "Número", dataIndex: "numero", width: 140 },
    { title: "Cliente", dataIndex: "cliente_nome", ellipsis: true },
    { title: "Contrato", dataIndex: "titulo", ellipsis: true },
    {
      title: "Vigência",
      width: 190,
      render: (_, row) => `${row.data_inicio || "-"} até ${row.data_fim || "-"}`,
    },
    {
      title: "Valor mensal",
      dataIndex: "valor_total_mensal",
      width: 140,
      render: (value) => money.format(Number(value || 0)),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (value) => <Tag color={statusConfig[value]?.color}>{statusConfig[value]?.label || value}</Tag>,
    },
    {
      title: "Ações",
      width: 120,
      render: (_, row) => <Button size="small" onClick={() => navigate(`/contratos/${row.id}`)}>Abrir</Button>,
    },
  ];

  return (
    <div style={pageStyle}>
      <Space align="center" style={{ justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
        <Space>
          <FileProtectOutlined style={{ fontSize: 28, color: "#3B82F6" }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>Contratos Preventiva</Title>
            <Text type="secondary">Receita recorrente, multi-loja, OS automáticas e checklists técnicos</Text>
          </div>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchContratos}>Atualizar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/contratos/novo")}>Novo Contrato</Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 18 }}>
        <Col xs={24} md={6}><Card><Statistic title="Ativos" value={summary.ativos || 0} valueStyle={{ color: "#10B981" }} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Em rascunho" value={summary.rascunhos || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Receita mensal recorrente" value={Number(summary.receita_mensal || 0)} prefix="R$" precision={2} valueStyle={{ color: "#3B82F6" }} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Vencendo em 30 dias" value={summary.vencendo_30_dias || 0} prefix={<CalendarOutlined />} /></Card></Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search placeholder="Buscar por número, cliente ou título" allowClear value={busca} onChange={(e) => setBusca(e.target.value)} onSearch={fetchContratos} style={{ width: 320 }} />
          <Select allowClear placeholder="Status" value={status || undefined} onChange={(v) => setStatus(v || "")} style={{ width: 180 }}>
            {Object.entries(statusConfig).map(([value, cfg]) => <Select.Option key={value} value={value}>{cfg.label}</Select.Option>)}
          </Select>
          <RangePicker placeholder={["Início", "Fim"]} disabled />
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={contratos} scroll={{ x: 900 }} />
      </Card>
    </div>
  );
}
