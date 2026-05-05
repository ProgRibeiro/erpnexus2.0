import { useState, useEffect } from "react";
import { Row, Col, Card, Table, Tag, Typography, Space, Spin, Select, Statistic } from "antd";
import { BuildOutlined } from "@ant-design/icons";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const tipoLabel = {
  loja_shopping: "Loja Shopping",
  escritorio: "Escritório",
  fabrica: "Fábrica",
  centro_distribuicao: "Centro Distribuição",
  outlet: "Outlet",
};

const tipoColor = {
  loja_shopping: "blue",
  escritorio: "green",
  fabrica: "orange",
  centro_distribuicao: "purple",
  outlet: "cyan",
};

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState(null);

  useEffect(() => {
    api.get("/portal/contratante/unidades/")
      .then((r) => setUnidades(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const lista = filtroTipo
    ? unidades.filter((u) => u.tipo === filtroTipo)
    : unidades;

  const totalAtivas = unidades.filter((u) => u.ativo).length;
  const totalInativas = unidades.filter((u) => !u.ativo).length;

  const colunas = [
    {
      title: "Código",
      dataIndex: "codigo_interno",
      key: "codigo_interno",
      width: 120,
      render: (v) => <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#3B82F6" }}>{v || "-"}</span>,
    },
    { title: "Nome", dataIndex: "nome", key: "nome", ellipsis: true },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 160,
      render: (t) => <Tag color={tipoColor[t] || "default"}>{tipoLabel[t] || t || "-"}</Tag>,
    },
    {
      title: "Área (m²)",
      dataIndex: "area_m2",
      key: "area_m2",
      width: 100,
      render: (v) => v ? `${Number(v).toLocaleString("pt-BR")} m²` : "-",
    },
    {
      title: "Empresa",
      key: "empresa",
      render: (_, r) => r.empresa?.nome || "-",
    },
    {
      title: "Status",
      dataIndex: "ativo",
      key: "ativo",
      width: 100,
      render: (v) => (
        <Tag color={v ? "green" : "default"}>{v ? "Ativo" : "Inativo"}</Tag>
      ),
    },
  ];

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Space direction="vertical" size={4} style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Unidades</Title>
        <Text type="secondary">Gerenciamento de unidades do tenant</Text>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, border: "none", background: "#EFF6FF" }} bodyStyle={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#3B82F620", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#3B82F6" }}>
                <BuildOutlined />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{unidades.length}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Total de Unidades</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, border: "none", background: "#ECFDF5" }} bodyStyle={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#10B98120", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#10B981" }}>
                <BuildOutlined />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{totalAtivas}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Unidades Ativas</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, border: "none", background: "#F3F4F6" }} bodyStyle={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#6B728020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#6B7280" }}>
                <BuildOutlined />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{totalInativas}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Unidades Inativas</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
        title={
          <Row justify="space-between" align="middle">
            <Col><span style={{ fontWeight: 600 }}>Lista de Unidades</span></Col>
            <Col>
              <Select
                allowClear
                placeholder="Filtrar por tipo"
                value={filtroTipo}
                onChange={setFiltroTipo}
                style={{ width: 200 }}
              >
                {Object.entries(tipoLabel).map(([v, l]) => (
                  <Option key={v} value={v}>{l}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        }
      >
        <Table
          dataSource={lista}
          columns={colunas}
          rowKey="id"
          pagination={{ pageSize: 20, showTotal: (t) => `${t} unidades` }}
          size="small"
          locale={{ emptyText: "Nenhuma unidade encontrada" }}
        />
      </Card>
    </div>
  );
}
