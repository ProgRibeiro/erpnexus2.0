import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  Layout,
  List,
  Menu,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  BankOutlined,
  BarcodeOutlined,
  CarOutlined,
  DashboardOutlined,
  DollarOutlined,
  LogoutOutlined,
  ProductOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const lojaBlue = "#3B82F6";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function LojaPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("pdv");
  const [dashboard, setDashboard] = useState({});
  const [produtos, setProdutos] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    try {
      setLoading(true);
      const [dash, produtosResp, caixasResp, entregasResp, formasResp] = await Promise.all([
        api.get("/loja/dashboard/"),
        api.get("/loja/produtos/"),
        api.get("/loja/caixas/abertos/"),
        api.get("/loja/entregas/"),
        api.get("/loja/formas-pagamento/"),
      ]);
      setDashboard(dash.data || {});
      setProdutos(normalizeList(produtosResp.data));
      setCaixas(normalizeList(caixasResp.data));
      setEntregas(normalizeList(entregasResp.data));
      setFormas(normalizeList(formasResp.data));
    } catch {
      message.warning("Não foi possível carregar o modo loja agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return produtos.filter((item) => {
      const nome = item.produto_dados?.nome || "";
      const codigo = item.produto_dados?.codigo || "";
      return nome.toLowerCase().includes(termo) || codigo.toLowerCase().includes(termo);
    });
  }, [busca, produtos]);

  const abrirCaixa = async () => {
    try {
      await api.post("/loja/caixas/abrir/", { nome: `Caixa Loja ${caixas.length + 1}`, valor_abertura: 0 });
      message.success("Caixa aberto.");
      carregar();
    } catch {
      message.error("Não foi possível abrir o caixa.");
    }
  };

  const menuItems = [
    { key: "pdv", icon: <ShoppingCartOutlined />, label: "PDV" },
    { key: "produtos", icon: <ProductOutlined />, label: "Produtos" },
    { key: "caixa", icon: <BankOutlined />, label: "Caixa" },
    { key: "compras", icon: <AppstoreOutlined />, label: "Compras" },
    { key: "entregas", icon: <CarOutlined />, label: "Entregas" },
    { key: "relatorios", icon: <DashboardOutlined />, label: "Relatórios" },
  ];

  const produtoColumns = [
    { title: "Produto", render: (_, item) => item.produto_dados?.nome || "-" },
    { title: "Código", render: (_, item) => item.produto_dados?.codigo || "-" },
    { title: "Estoque", dataIndex: "estoque_atual" },
    { title: "Preço", dataIndex: "preco_vigente", render: (value) => moneyFormatter.format(Number(value || 0)) },
    { title: "Fiscal", render: (_, item) => `${item.ncm || "NCM não informado"} / CFOP ${item.cfop_padrao || "-"}` },
    { title: "Loja", render: (_, item) => <Tag color={item.vendido_loja ? "green" : "default"}>{item.vendido_loja ? "Ativo" : "Oculto"}</Tag> },
  ];

  const renderContent = () => {
    if (view === "pdv") {
      return (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={15}>
            <Card title="PDV - busca rápida">
              <Input
                size="large"
                prefix={<BarcodeOutlined />}
                placeholder="Buscar produto ou escanear código de barras"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
              <Table
                style={{ marginTop: 16 }}
                loading={loading}
                rowKey="id"
                dataSource={produtosFiltrados}
                columns={produtoColumns}
                pagination={{ pageSize: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card title="Venda atual">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text style={{ color: "#6B7280" }}>O PDV usa os endpoints `/api/v1/loja/vendas/` para montar e finalizar vendas.</Text>
                <Button type="primary" block style={{ background: lojaBlue }} disabled={!caixas.length}>
                  Iniciar venda
                </Button>
                {!caixas.length ? <Text type="warning">Abra um caixa para iniciar vendas.</Text> : null}
              </Space>
            </Card>
            <Card title="Formas de pagamento" style={{ marginTop: 16 }}>
              <List
                dataSource={formas}
                renderItem={(forma) => (
                  <List.Item>
                    <Text>{forma.nome}</Text>
                    <Tag>{forma.tipo}</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      );
    }

    if (view === "produtos") {
      return (
        <Card title="Produtos da loja">
          <Table loading={loading} rowKey="id" dataSource={produtosFiltrados} columns={produtoColumns} />
        </Card>
      );
    }

    if (view === "caixa") {
      return (
        <Card title="Caixas abertos">
          <Space style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<DollarOutlined />} style={{ background: lojaBlue }} onClick={abrirCaixa}>
              Abrir caixa
            </Button>
          </Space>
          <Table
            rowKey="id"
            dataSource={caixas}
            columns={[
              { title: "Caixa", dataIndex: "nome" },
              { title: "Responsável", dataIndex: "responsavel_nome" },
              { title: "Saldo", dataIndex: "saldo_atual", render: (value) => moneyFormatter.format(Number(value || 0)) },
              { title: "Abertura", dataIndex: "abertura" },
            ]}
          />
        </Card>
      );
    }

    if (view === "entregas") {
      return (
        <Card title="Logística e entregas">
          <Table
            rowKey="id"
            dataSource={entregas}
            columns={[
              { title: "Venda", dataIndex: "venda_numero" },
              { title: "Tipo", dataIndex: "tipo" },
              { title: "Status", dataIndex: "status", render: (value) => <Badge status={value === "entregue" ? "success" : "processing"} text={value} /> },
              { title: "Previsão", dataIndex: "previsao_entrega" },
              { title: "Endereço", dataIndex: "endereco_entrega" },
            ]}
          />
        </Card>
      );
    }

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Text style={{ color: "#6B7280", fontWeight: 700 }}>VENDAS DO DIA</Text>
            <div style={{ color: lojaBlue, fontSize: 30, fontWeight: 800 }}>{moneyFormatter.format(Number(dashboard.vendas_dia || 0))}</div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text style={{ color: "#6B7280", fontWeight: 700 }}>TICKET MÉDIO</Text>
            <div style={{ color: "#10B981", fontSize: 30, fontWeight: 800 }}>{moneyFormatter.format(Number(dashboard.ticket_medio || 0))}</div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Text style={{ color: "#6B7280", fontWeight: 700 }}>CAIXAS ABERTOS</Text>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{caixas.length}</div>
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <Sider width={240} style={{ background: "#0B1220", padding: "18px 10px", position: "fixed", inset: "0 auto 0 0" }}>
        <div style={{ padding: "10px 12px 22px" }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: lojaBlue, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>
            LJ
          </div>
          <Title level={4} style={{ color: "#fff", margin: "14px 0 4px" }}>ERP Nexus Loja</Title>
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>Ambiente de varejo integrado ao ERP.</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[view]}
          items={menuItems}
          onClick={({ key }) => setView(key)}
          style={{ background: "transparent", border: 0, color: "#fff" }}
          className="erp-sidebar-menu"
        />
      </Sider>

      <Layout style={{ marginLeft: 240, background: "transparent" }}>
        <Header style={{ position: "sticky", top: 0, zIndex: 20, height: 66, background: "#fff", borderBottom: "1px solid #E2E8F0", paddingInline: 24 }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space direction="vertical" size={0}>
              <Text style={{ color: "#94A3B8", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Modo separado</Text>
              <Text strong style={{ fontSize: 18 }}>Loja, PDV e varejo</Text>
            </Space>
            <Space>
              <Button onClick={carregar}>Atualizar</Button>
              <Button icon={<LogoutOutlined />} onClick={() => navigate("/dashboard")}>
                Voltar ao ERP Serviços
              </Button>
            </Space>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card>
                  <Text style={{ color: "#6B7280", fontWeight: 700 }}>VENDAS DO DIA</Text>
                  <div style={{ color: lojaBlue, fontSize: 26, fontWeight: 800 }}>{moneyFormatter.format(Number(dashboard.vendas_dia || 0))}</div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card>
                  <Text style={{ color: "#6B7280", fontWeight: 700 }}>TICKET MÉDIO</Text>
                  <div style={{ color: "#10B981", fontSize: 26, fontWeight: 800 }}>{moneyFormatter.format(Number(dashboard.ticket_medio || 0))}</div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card>
                  <Text style={{ color: "#6B7280", fontWeight: 700 }}>CAIXAS ABERTOS</Text>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{caixas.length}</div>
                </Card>
              </Col>
            </Row>
            {renderContent()}
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
