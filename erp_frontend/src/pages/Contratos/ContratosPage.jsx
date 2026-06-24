import { useEffect, useState } from "react";
import { Badge, Button, Card, Col, DatePicker, Empty, Input, Row, Select, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import {
  CalendarOutlined,
  DollarOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { money, normalizeList, statusConfig } from "./shared";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

const statusBadgeMeta = {
  rascunho: { color: colors.textoSecundario, background: "#F3F4F6" },
  ativo: { color: colors.verde, background: "#DCFCE7" },
  suspenso: { color: colors.laranja, background: "#FFEDD5" },
  encerrado: { color: colors.azul, background: "#DBEAFE" },
  rescindido: { color: colors.vermelho, background: "#FEE2E2" },
};

function SummaryCard({ color, icon, label, loading, value, monetaryValue }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
      <Skeleton active loading={loading} paragraph={false} title={{ width: "58%" }}>
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
            {monetaryValue && (
              <div style={{ marginTop: 10, color, fontSize: 14, fontWeight: 700 }}>
                {monetaryValue}
              </div>
            )}
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
      </Skeleton>
    </Card>
  );
}

function StatusBadge({ status }) {
  const meta = statusBadgeMeta[status] || statusBadgeMeta.rascunho;
  const label = statusConfig[status]?.label || status;

  return (
    <span
      style={{
        alignItems: "center",
        background: meta.background,
        borderRadius: 999,
        color: meta.color,
        display: "inline-flex",
        fontSize: 12,
        fontWeight: 700,
        gap: 6,
        padding: "5px 10px",
      }}
    >
      <Badge color={meta.color} />
      {label}
    </span>
  );
}

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
    {
      title: "Contrato",
      dataIndex: "numero",
      width: 220,
      render: (value, row) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: colors.texto }}>{value}</Text>
          <Text style={{ color: colors.textoFraco, fontSize: 12 }}>{row.titulo}</Text>
        </Space>
      ),
    },
    {
      title: "Cliente",
      dataIndex: "cliente_nome",
      ellipsis: true,
      render: (value) => <Text style={{ color: colors.textoSecundario }}>{value}</Text>,
    },
    {
      title: "Vigência",
      width: 200,
      render: (_, row) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: colors.textoFraco }} />
          <Text style={{ color: colors.textoSecundario, fontSize: 13 }}>
            {row.data_inicio || "-"} até {row.data_fim || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Valor mensal",
      dataIndex: "valor_total_mensal",
      width: 150,
      render: (value) => <Text strong style={{ color: colors.verde }}>{money.format(Number(value || 0))}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      render: (value) => <StatusBadge status={value} />,
    },
    {
      title: "Ações",
      width: 110,
      align: "right",
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/contratos/${row.id}`)} style={{ borderRadius: 8, fontWeight: 600 }}>
          Abrir
        </Button>
      ),
    },
  ];

  return (
    <div style={pageStyle}>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
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
            <FileProtectOutlined />
          </div>
          <div>
            <Title level={1} style={{ color: colors.texto, fontSize: 26, fontWeight: 800, margin: 0 }}>
              Contratos Preventiva
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Receita recorrente, multi-loja, OS automáticas e checklists técnicos
            </Text>
          </div>
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchContratos} style={{ height: 40, borderRadius: 10, fontWeight: 600 }}>
            Atualizar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/contratos/novo")}
            style={{ height: 40, paddingInline: 20, fontWeight: 600, borderRadius: 10 }}
          >
            Novo Contrato
          </Button>
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} xl={6}>
          <SummaryCard color={colors.verde} icon={<FileProtectOutlined />} label="Ativos" loading={loading} value={summary.ativos || 0} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SummaryCard color={colors.textoSecundario} icon={<FileTextOutlined />} label="Em rascunho" loading={loading} value={summary.rascunhos || 0} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SummaryCard
            color={colors.azul}
            icon={<DollarOutlined />}
            label="Receita mensal recorrente"
            loading={loading}
            value={money.format(Number(summary.receita_mensal || 0))}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SummaryCard color={colors.laranja} icon={<CalendarOutlined />} label="Vencendo em 30 dias" loading={loading} value={summary.vencendo_30_dias || 0} />
        </Col>
      </Row>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} lg={9}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
              placeholder="Buscar por número, cliente ou título"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onPressEnter={fetchContratos}
              style={{ borderRadius: 8, height: 40 }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              allowClear
              placeholder="Status"
              value={status || undefined}
              onChange={(v) => setStatus(v || "")}
              style={{ width: "100%" }}
            >
              {Object.entries(statusConfig).map(([value, cfg]) => (
                <Select.Option key={value} value={value}>{cfg.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <RangePicker placeholder={["Início", "Fim"]} disabled style={{ width: "100%" }} />
          </Col>
          <Col xs={24} lg={3}>
            <Button onClick={fetchContratos} style={{ borderRadius: 8, fontWeight: 700, width: "100%" }}>
              Buscar
            </Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 0 }}>
        <Skeleton active loading={loading && contratos.length === 0} paragraph={{ rows: 8 }} title={false}>
          <Table
            rowKey="id"
            loading={loading && contratos.length > 0}
            columns={columns}
            dataSource={contratos}
            scroll={{ x: 1000 }}
            onRow={(row) => ({ onClick: () => navigate(`/contratos/${row.id}`), style: { cursor: "pointer" } })}
            locale={{
              emptyText: (
                <Empty description="Nenhum contrato encontrado" style={{ margin: "44px 0" }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate("/contratos/novo")}
                    style={{ height: 40, paddingInline: 20, fontWeight: 600, borderRadius: 10 }}
                  >
                    Criar primeiro contrato
                  </Button>
                </Empty>
              ),
            }}
          />
        </Skeleton>
      </Card>
    </div>
  );
}
