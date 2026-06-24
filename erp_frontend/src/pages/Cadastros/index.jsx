import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Input, Row, Space, Tag, Typography } from "antd";
import {
  AppstoreOutlined,
  BankOutlined,
  BuildOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const colors = {
  azul: "#3B82F6",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const sectionCardStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const MODULES = [
  {
    key: "clientes",
    title: "Clientes",
    description:
      "Cadastre pessoas e empresas, com histórico comercial e operacional.",
    path: "/clientes",
    icon: TeamOutlined,
    color: "#3B82F6",
    group: "Relacionamento",
  },
  {
    key: "servicos",
    title: "Serviços",
    description:
      "Monte serviços padronizados para orçamento, OS e faturamento.",
    path: "/servicos",
    icon: ToolOutlined,
    color: "#8B5CF6",
    group: "Operação",
  },
  {
    key: "equipe",
    title: "Equipe",
    description:
      "Gerencie técnicos, perfis, acesso e responsáveis por execução.",
    path: "/equipe",
    icon: BuildOutlined,
    color: "#10B981",
    group: "Operação",
  },
  {
    key: "terceiros",
    title: "Terceiros",
    description:
      "Organize parceiros e prestadores externos para apoio operacional.",
    path: "/terceiros",
    icon: TeamOutlined,
    color: "#14B8A6",
    group: "Operação",
  },
  {
    key: "estoque",
    title: "Estoque",
    description: "Produtos, categorias, entradas, saídas e controle de mínimo.",
    path: "/estoque",
    icon: ShoppingCartOutlined,
    color: "#0EA5E9",
    group: "Suprimentos",
  },
  {
    key: "financeiro",
    title: "Contas bancárias",
    description: "Cadastre contas, categorias e estrutura financeira de apoio.",
    path: "/financeiro/contas",
    icon: BankOutlined,
    color: "#F59E0B",
    group: "Financeiro",
  },
  {
    key: "lancamentos",
    title: "Lançamentos",
    description: "Crie entradas e saídas vinculadas à operação e cobrança.",
    path: "/financeiro/lancamentos",
    icon: DollarOutlined,
    color: "#EF4444",
    group: "Financeiro",
  },
  {
    key: "orcamentos",
    title: "Orçamentos",
    description:
      "Fluxo comercial para preparar propostas e acelerar aprovação.",
    path: "/orcamentos",
    icon: FileTextOutlined,
    color: "#6366F1",
    group: "Comercial",
  },
];

const QUICK_LINKS = [
  { label: "Clientes", path: "/clientes" },
  { label: "Orçamentos", path: "/orcamentos" },
  { label: "Ordens", path: "/ordens" },
  { label: "Estoque", path: "/estoque" },
  { label: "Financeiro", path: "/financeiro" },
  { label: "Serviços", path: "/servicos" },
];

function ModuleCard({ item, onClick }) {
  const Icon = item.icon;

  return (
    <Card
      hoverable
      bordered={false}
      onClick={onClick}
      style={{
        ...sectionCardStyle,
        cursor: "pointer",
        height: "100%",
      }}
      bodyStyle={{ padding: 20 }}
    >
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${item.color}14`,
            color: item.color,
          }}
        >
          <Icon style={{ fontSize: 20 }} />
        </div>
        <Space direction="vertical" size={4}>
          <Tag color={item.color} style={{ width: "fit-content", margin: 0 }}>
            {item.group}
          </Tag>
          <Text strong style={{ fontSize: 15, color: colors.texto }}>
            {item.title}
          </Text>
          <Paragraph
            style={{ marginBottom: 0, color: colors.textoSecundario, minHeight: 42 }}
          >
            {item.description}
          </Paragraph>
        </Space>
      </Space>
    </Card>
  );
}

export default function CadastrosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return MODULES;
    return MODULES.filter((item) => {
      const haystack =
        `${item.title} ${item.description} ${item.group}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card
        bordered={false}
        style={{
          ...sectionCardStyle,
          background: `linear-gradient(135deg, ${colors.fundoSuave} 0%, #EFF6FF 100%)`,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Tag color="blue" style={{ width: "fit-content", margin: 0 }}>
            Central de cadastros
          </Tag>
          <Title level={2} style={{ margin: 0, color: colors.texto }}>
            Registre tudo que alimenta a operação.
          </Title>
          <Paragraph
            style={{ marginBottom: 0, color: colors.textoSecundario, maxWidth: 860 }}
          >
            Use esta área como ponto de partida para manter clientes, serviços,
            equipe, estoque e finanças organizados em um fluxo único, como numa
            suíte ERP madura.
          </Paragraph>
        </Space>
      </Card>

      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 16 }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            {QUICK_LINKS.map((item) => (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{ borderRadius: 10 }}
              >
                {item.label}
              </Button>
            ))}
          </Space>
          <Input
            allowClear
            prefix={<AppstoreOutlined style={{ color: colors.textoFraco }} />}
            placeholder="Buscar cadastro"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ maxWidth: 320 }}
          />
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        {filtered.map((item) => (
          <Col key={item.key} xs={24} sm={12} lg={8} xl={6}>
            <ModuleCard item={item} onClick={() => navigate(item.path)} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
