import { useState, useEffect } from "react";
import { Row, Col, Card, Table, Tag, Typography, Space, Skeleton, Select } from "antd";
import { BuildOutlined, CheckCircleOutlined, StopOutlined } from "@ant-design/icons";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

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
  minHeight: 110,
};

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

function KpiCard({ label, value, icon, color }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: colors.textoFraco,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
          <div style={{ color: colors.texto, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
            {value}
          </div>
        </div>
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
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

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
      width: 130,
      render: (v) => (
        <span
          style={{
            fontWeight: 700,
            fontFamily: "monospace",
            color: colors.azul,
            background: "#EFF6FF",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          {v || "-"}
        </span>
      ),
    },
    {
      title: "Nome",
      dataIndex: "nome",
      key: "nome",
      ellipsis: true,
      render: (v) => <Text strong style={{ color: colors.texto }}>{v}</Text>,
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 170,
      render: (t) => <Tag color={tipoColor[t] || "default"} style={{ borderRadius: 999, fontWeight: 600 }}>{tipoLabel[t] || t || "-"}</Tag>,
    },
    {
      title: "Área (m²)",
      dataIndex: "area_m2",
      key: "area_m2",
      width: 110,
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
      width: 110,
      render: (v) => (
        <Tag color={v ? "green" : "default"} style={{ borderRadius: 999, fontWeight: 600 }}>{v ? "Ativo" : "Inativo"}</Tag>
      ),
    },
  ];

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <Space align="start">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.azul}14`,
              color: colors.azul,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <BuildOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>Unidades</Title>
            <Text style={{ color: colors.textoSecundario }}>
              Gerenciamento de unidades do tenant
            </Text>
          </div>
        </Space>
      </Card>

      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            <Col xs={24} sm={8}>
              <KpiCard label="Total de Unidades" value={unidades.length} icon={<BuildOutlined />} color={colors.azul} />
            </Col>
            <Col xs={24} sm={8}>
              <KpiCard label="Unidades Ativas" value={totalAtivas} icon={<CheckCircleOutlined />} color={colors.verde} />
            </Col>
            <Col xs={24} sm={8}>
              <KpiCard label="Unidades Inativas" value={totalInativas} icon={<StopOutlined />} color={colors.textoFraco} />
            </Col>
          </Row>

          <Card
            bordered={false}
            style={panelStyle}
            bodyStyle={{ padding: 0 }}
            title="Lista de Unidades"
            extra={
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
            }
          >
            <Table
              dataSource={lista}
              columns={colunas}
              rowKey="id"
              pagination={{ pageSize: 20, showTotal: (t) => `${t} unidades` }}
              size="middle"
              scroll={{ x: 900 }}
              locale={{ emptyText: "Nenhuma unidade encontrada" }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
