import { Card, Col, Row, Space, Tag, Typography } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BuildOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  ProjectOutlined,
  ShopOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

const { Text, Title } = Typography;

const erpModules = [
  { title: "CRM", subtitle: "Funil comercial", path: "/crm", color: "#2563EB", icon: <TeamOutlined /> },
  { title: "Orçamentos", subtitle: "Propostas e aprovações", path: "/orcamentos", color: "#F97316", icon: <FileTextOutlined /> },
  { title: "Serviços e OS", subtitle: "Operação de campo", path: "/ordens", color: "#0D9488", icon: <ToolOutlined /> },
  { title: "Compras e Estoque", subtitle: "Produtos e reposição", path: "/estoque", color: "#EF4444", icon: <DatabaseOutlined /> },
  { title: "Finanças", subtitle: "Receitas e despesas", path: "/financeiro", color: "#65A30D", icon: <DollarOutlined /> },
  { title: "Loja", subtitle: "PDV e vendas balcão", path: "/loja", color: "#0891B2", icon: <ShopOutlined />, external: true },
  { title: "Agenda", subtitle: "Planejamento técnico", path: "/agenda", color: "#7C3AED", icon: <CalendarOutlined /> },
  { title: "Fiscal", subtitle: "CNPJ e impostos", path: "/fiscal", color: "#475569", icon: <CheckSquareOutlined /> },
];

const facilitiesModules = [
  { title: "Help Desk", subtitle: "Solicitações e chamados", path: "/facilities/chamados", color: "#2563EB", icon: <CheckSquareOutlined /> },
  { title: "Ativos", subtitle: "Equipamentos e locais", path: "/facilities/ativos", color: "#0D9488", icon: <DatabaseOutlined /> },
  { title: "Preventiva", subtitle: "PMP e rotinas", path: "/facilities/pmp", color: "#F97316", icon: <BuildOutlined /> },
  { title: "Contratos", subtitle: "Prestadores e SLA", path: "/facilities/contratos", color: "#7C3AED", icon: <FileProtectOutlined /> },
  { title: "Obras", subtitle: "Projetos e execução", path: "/facilities/obras", color: "#EF4444", icon: <ProjectOutlined /> },
  { title: "Indicadores", subtitle: "BI operacional", path: "/facilities/indicadores", color: "#65A30D", icon: <BarChartOutlined /> },
  { title: "Budget", subtitle: "Centros de custo", path: "/facilities/budget", color: "#0891B2", icon: <DollarOutlined /> },
  { title: "Licitações", subtitle: "Cotações e propostas", path: "/facilities/licitacao", color: "#475569", icon: <TrophyOutlined /> },
];

function moduloUsuario(user) {
  if (user?.is_superuser) return "ambos";
  return user?.modulo || "erp";
}

function getAmbiente(user) {
  const modulo = moduloUsuario(user);
  if (modulo === "facilities") {
    return {
      title: "ERP Facilities",
      subtitle: "Ambiente do contratante para chamados, ativos, preventiva, obras e governança de prestadores.",
      tag: "Licença Facilities",
      modules: facilitiesModules,
      accent: "#10B981",
    };
  }

  return {
    title: "ERP Nexus Serviços",
    subtitle: "Ambiente do prestador para comercial, orçamentos, ordens de serviço, estoque, loja e financeiro.",
    tag: modulo === "ambos" ? "Licença completa" : "Licença ERP Serviços",
    modules: erpModules,
    accent: "#3B82F6",
  };
}

export default function AmbientePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ambiente = getAmbiente(user);

  const abrirModulo = (modulo) => {
    if (modulo.external) {
      window.open(modulo.path, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(modulo.path);
  };

  return (
    <div className="erp-ambiente-page">
      <section className="erp-ambiente-header">
        <Space size={12} align="start">
          <div className="erp-ambiente-mark" style={{ background: ambiente.accent }}>
            <AppstoreOutlined />
          </div>
          <div>
            <Tag color={ambiente.accent}>{ambiente.tag}</Tag>
            <Title level={2} style={{ margin: "8px 0 4px" }}>
              Olá, {user?.first_name || user?.nome?.split(" ")?.[0] || "usuário"}
            </Title>
            <Text>{ambiente.subtitle}</Text>
          </div>
        </Space>
      </section>

      <Row gutter={[10, 10]} className="erp-ambiente-grid">
        {ambiente.modules.map((modulo) => (
          <Col xs={24} sm={12} lg={8} xl={6} xxl={6} key={modulo.title}>
            <button
              type="button"
              className="erp-module-tile"
              style={{ "--module-color": modulo.color }}
              onClick={() => abrirModulo(modulo)}
            >
              <span className="erp-module-icon">{modulo.icon}</span>
              <span className="erp-module-copy">
                <strong>{modulo.title}</strong>
                <small>{modulo.subtitle}</small>
              </span>
            </button>
          </Col>
        ))}
      </Row>

      <Row gutter={[10, 10]} style={{ marginTop: 10 }}>
        <Col xs={24} lg={12}>
          <Card title="Fluxo de integração" className="erp-ambiente-info">
            <Text>
              Ambientes separados por licença. A comunicação entre contratante e prestador acontece por solicitações, chamados, cotações e aprovações.
            </Text>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Acesso" className="erp-ambiente-info">
            <Text>
              Cada usuário acessa apenas o produto liberado na licença. O menu e as rotas respeitam essa separação automaticamente.
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
