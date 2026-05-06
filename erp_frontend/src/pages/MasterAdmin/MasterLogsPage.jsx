import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Row, Select, Table, Tag, Typography } from "antd";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;

const ACAO_COLORS = {
  login: "blue", logout: "default", bloqueou: "red", desbloqueou: "green",
  criou: "green", editou: "orange", cancelou: "red", resetou_senha: "orange",
  confirmou_pagamento: "green", gerou_mensalidade: "blue", aplicou_desconto: "purple",
};

export default function MasterLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroAcao, setFiltroAcao] = useState(undefined);
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroAcao) params.acao = filtroAcao;
      if (busca) params.busca = busca;
      const r = await masterApi.get("/logs/");
      const items = Array.isArray(r.data) ? r.data : r.data?.results || [];
      const filtrado = busca
        ? items.filter(l =>
            (l.detalhes || "").toLowerCase().includes(busca.toLowerCase()) ||
            (l.ip_acesso || "").includes(busca)
          )
        : items;
      setLogs(filtrado);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const columns = [
    {
      title: "Data/hora",
      dataIndex: "criado_em",
      key: "data",
      render: (v) => {
        if (!v) return "-";
        const d = new Date(v);
        return <Text style={{ fontSize: 12, fontFamily: "monospace" }}>{d.toLocaleString("pt-BR")}</Text>;
      },
      width: 160,
    },
    {
      title: "Ação",
      dataIndex: "acao",
      key: "acao",
      render: (v, r) => <Tag color={ACAO_COLORS[v] || "default"}>{r.acao_display || v}</Tag>,
      width: 160,
    },
    {
      title: "Detalhes",
      dataIndex: "detalhes",
      key: "detalhes",
      render: (v) => <Text type="secondary">{v || "—"}</Text>,
    },
    {
      title: "IP",
      dataIndex: "ip_acesso",
      key: "ip",
      render: (v) => <Text style={{ fontFamily: "monospace", fontSize: 12 }}>{v || "—"}</Text>,
      width: 130,
    },
  ];

  const acoes = [
    "login", "logout", "bloqueou", "desbloqueou", "criou", "editou",
    "cancelou", "resetou_senha", "confirmou_pagamento", "gerou_mensalidade", "aplicou_desconto",
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Logs de Acesso</Title>
        <Text type="secondary">Histórico de ações realizadas no painel Master.</Text>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <Row gutter={12} align="middle">
          <Col xs={24} sm={10}>
            <Input
              placeholder="Buscar por detalhes ou IP..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onPressEnter={carregar}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder="Filtrar por ação"
              allowClear
              style={{ width: "100%" }}
              value={filtroAcao}
              onChange={v => setFiltroAcao(v)}
            >
              {acoes.map(a => <Select.Option key={a} value={a}>{a}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button block onClick={carregar}>Filtrar</Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 30 }}
          size="small"
        />
      </Card>
    </div>
  );
}
