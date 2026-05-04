import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApiOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarcodeOutlined,
  CarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  DollarOutlined,
  LeftOutlined,
  PlusOutlined,
  ProductOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

const { Content, Header } = Layout;
const { Text, Title } = Typography;
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const lojaBlue = "#3B82F6";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function currency(value) {
  return moneyFormatter.format(Number(value || 0));
}

function getProdutoNome(item) {
  return item.produto_dados?.nome || item.nome || "-";
}

function getProdutoCodigo(item) {
  return item.produto_dados?.codigo || item.codigo || "-";
}

export default function LojaPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [view, setView] = useState("pdv");
  const [dashboard, setDashboard] = useState({});
  const [produtos, setProdutos] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvandoProduto, setSalvandoProduto] = useState(false);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
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
      message.warning("Não foi possível carregar todas as conexões do Modo Loja agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((item) => {
      const nome = getProdutoNome(item).toLowerCase();
      const codigo = getProdutoCodigo(item).toLowerCase();
      const ncm = String(item.ncm || "").toLowerCase();
      return nome.includes(termo) || codigo.includes(termo) || ncm.includes(termo);
    });
  }, [busca, produtos]);

  const produtosComAlerta = useMemo(() => {
    return produtos.filter((item) => item.produto_dados?.em_alerta || Number(item.estoque_atual || 0) <= Number(item.produto_dados?.estoque_minimo || 0));
  }, [produtos]);

  const abrirCaixa = async () => {
    try {
      await api.post("/loja/caixas/abrir/", { nome: `Caixa Loja ${caixas.length + 1}`, valor_abertura: 0 });
      message.success("Caixa aberto.");
      carregar();
    } catch {
      message.error("Não foi possível abrir o caixa. Verifique se seu usuário tem permissão de gerente da loja.");
    }
  };

  const abrirCadastroProduto = () => {
    form.resetFields();
    form.setFieldsValue({
      unidade_medida: "un",
      origem_produto: "nacional",
      cfop_padrao: "5102",
      vendido_loja: true,
      destaque: false,
      tipo_suprimento: "estoque",
      markup_percentual: 30,
      aliquota_impostos_percentual: 0,
      despesas_operacionais_percentual: 0,
      estoque_minimo: 0,
      estoque_inicial: 0,
    });
    setModalProdutoAberto(true);
  };

  const salvarProduto = async (values) => {
    try {
      setSalvandoProduto(true);
      await api.post("/loja/produtos/", {
        ...values,
        preco_custo: values.preco_custo || 0,
        preco_venda: values.preco_venda || 0,
        markup_percentual: values.markup_percentual || 0,
        aliquota_impostos_percentual: values.aliquota_impostos_percentual || 0,
        despesas_operacionais_percentual: values.despesas_operacionais_percentual || 0,
        estoque_minimo: values.estoque_minimo || 0,
        estoque_inicial: values.estoque_inicial || 0,
      });
      message.success("Produto cadastrado e conectado ao estoque.");
      setModalProdutoAberto(false);
      carregar();
    } catch (error) {
      const detalhe = error.response?.data?.detail || error.response?.data?.nome?.[0] || "Não foi possível cadastrar o produto.";
      message.error(detalhe);
    } finally {
      setSalvandoProduto(false);
    }
  };

  const precoSugerido = Form.useWatch([], form);
  const valorSugerido = useMemo(() => {
    const custo = Number(precoSugerido?.preco_custo || 0);
    const markup = Number(precoSugerido?.markup_percentual || 0);
    const impostos = Number(precoSugerido?.aliquota_impostos_percentual || 0);
    const despesas = Number(precoSugerido?.despesas_operacionais_percentual || 0);
    return custo + (custo * (markup + impostos + despesas)) / 100;
  }, [precoSugerido]);

  const produtoColumns = [
    {
      title: "Produto",
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Text strong>{getProdutoNome(item)}</Text>
          <Text style={{ color: "#64748B", fontSize: 12 }}>{getProdutoCodigo(item)}</Text>
        </Space>
      ),
    },
    { title: "Estoque", dataIndex: "estoque_atual", render: (value, item) => <Tag color={item.produto_dados?.em_alerta ? "red" : "blue"}>{Number(value || 0)}</Tag> },
    { title: "Custo", render: (_, item) => currency(item.produto_dados?.preco_custo) },
    { title: "Venda", dataIndex: "preco_vigente", render: (value) => <Text strong>{currency(value)}</Text> },
    { title: "Margem", render: (_, item) => `${Number(item.produto_dados?.margem_percentual || 0).toFixed(2)}%` },
    { title: "Fiscal", render: (_, item) => `${item.ncm || "NCM pendente"} / CFOP ${item.cfop_padrao || "-"}` },
    { title: "Status", render: (_, item) => <Badge status={item.vendido_loja ? "success" : "default"} text={item.vendido_loja ? "Vendendo" : "Oculto"} /> },
  ];

  const conexoes = [
    { titulo: "Estoque", texto: `${produtos.length} produtos vinculados`, ok: true },
    { titulo: "Financeiro", texto: "Receitas geradas ao finalizar venda", ok: true },
    { titulo: "Caixa", texto: `${caixas.length} caixa(s) aberto(s)`, ok: caixas.length > 0 },
    { titulo: "Fiscal", texto: "NCM, CEST, CFOP e origem no cadastro", ok: produtos.every((item) => item.ncm && item.cfop_padrao) },
  ];

  const menuOptions = [
    { label: "PDV", value: "pdv", icon: <ShoppingCartOutlined /> },
    { label: "Produtos", value: "produtos", icon: <ProductOutlined /> },
    { label: "Caixa", value: "caixa", icon: <BankOutlined /> },
    { label: "Compras", value: "compras", icon: <AppstoreOutlined /> },
    { label: "Entregas", value: "entregas", icon: <CarOutlined /> },
    { label: "Relatórios", value: "relatorios", icon: <DashboardOutlined /> },
  ];

  const renderPdV = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={16}>
        <Card
          title="PDV - venda rápida"
          extra={<Button type="primary" icon={<PlusOutlined />} style={{ background: lojaBlue }} onClick={abrirCadastroProduto}>Produto</Button>}
        >
          <Input
            size="large"
            prefix={<BarcodeOutlined />}
            placeholder="Buscar produto, NCM ou escanear código de barras"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          <Table
            style={{ marginTop: 16 }}
            loading={loading}
            rowKey="id"
            dataSource={produtosFiltrados}
            columns={produtoColumns}
            pagination={{ pageSize: 6 }}
          />
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card title="Venda atual">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Alert
              type={caixas.length ? "success" : "warning"}
              showIcon
              message={caixas.length ? "Caixa conectado" : "Abra um caixa para vender"}
              description={caixas.length ? "O PDV está pronto para registrar vendas e gerar financeiro." : "Sem caixa aberto o sistema bloqueia a venda."}
            />
            <Button type="primary" size="large" block disabled={!caixas.length} style={{ background: lojaBlue }}>
              Iniciar venda
            </Button>
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

  const renderProdutos = () => (
    <Card
      title="Cadastro e tabela de produtos da loja"
      extra={<Button type="primary" icon={<PlusOutlined />} style={{ background: lojaBlue }} onClick={abrirCadastroProduto}>Cadastrar produto</Button>}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="O cadastro da loja cria o produto no estoque e já deixa ele disponível para venda no PDV."
      />
      <Table loading={loading} rowKey="id" dataSource={produtosFiltrados} columns={produtoColumns} />
    </Card>
  );

  const renderCaixa = () => (
    <Card title="Gestão de caixa" extra={<Button type="primary" icon={<DollarOutlined />} style={{ background: lojaBlue }} onClick={abrirCaixa}>Abrir caixa</Button>}>
      <Table
        rowKey="id"
        dataSource={caixas}
        columns={[
          { title: "Caixa", dataIndex: "nome" },
          { title: "Responsável", dataIndex: "responsavel_nome" },
          { title: "Saldo", dataIndex: "saldo_atual", render: currency },
          { title: "Abertura", dataIndex: "abertura" },
        ]}
      />
    </Card>
  );

  const renderEntregas = () => (
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

  const renderResumo = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}><Card><Statistic title="Vendas do dia" value={Number(dashboard.vendas_dia || 0)} prefix="R$" precision={2} valueStyle={{ color: lojaBlue }} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Ticket médio" value={Number(dashboard.ticket_medio || 0)} prefix="R$" precision={2} valueStyle={{ color: "#10B981" }} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Produtos em alerta" value={produtosComAlerta.length} prefix={<WarningOutlined />} valueStyle={{ color: "#F59E0B" }} /></Card></Col>
    </Row>
  );

  const contentByView = {
    pdv: renderPdV,
    produtos: renderProdutos,
    caixa: renderCaixa,
    entregas: renderEntregas,
    compras: renderResumo,
    relatorios: renderResumo,
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#F3F6FA" }}>
      <Header
        style={{
          height: "auto",
          minHeight: 76,
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          padding: "14px 28px",
          lineHeight: "normal",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Space size={14}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: "#0F172A", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>LJ</div>
          <Space direction="vertical" size={0}>
            <Text style={{ color: "#94A3B8", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>ERP Nexus Loja</Text>
            <Title level={3} style={{ margin: 0 }}>PDV, estoque e varejo</Title>
          </Space>
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={carregar}>Atualizar conexões</Button>
          <Button icon={<LeftOutlined />} onClick={() => navigate("/dashboard")}>Voltar ao ERP Serviços</Button>
        </Space>
      </Header>

      <Content style={{ padding: 28 }}>
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <Card style={{ border: "1px solid #E2E8F0" }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} lg={10}>
                <Space direction="vertical" size={2}>
                  <Text style={{ color: "#64748B" }}>Ambiente separado, dados integrados</Text>
                  <Title level={2} style={{ margin: 0 }}>Operação de loja</Title>
                  <Text style={{ color: "#64748B" }}>Produtos, caixa, pagamentos, financeiro e estoque usando a mesma base do ERP.</Text>
                </Space>
              </Col>
              <Col xs={24} lg={14}>
                <Row gutter={[12, 12]}>
                  {conexoes.map((item) => (
                    <Col xs={12} md={6} key={item.titulo}>
                      <Card size="small" style={{ background: item.ok ? "#F0FDF4" : "#FFF7ED", borderColor: item.ok ? "#BBF7D0" : "#FED7AA" }}>
                        <Space direction="vertical" size={4}>
                          {item.ok ? <CheckCircleOutlined style={{ color: "#10B981" }} /> : <ApiOutlined style={{ color: "#F59E0B" }} />}
                          <Text strong>{item.titulo}</Text>
                          <Text style={{ color: "#64748B", fontSize: 12 }}>{item.texto}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}><Card><Statistic title="Vendas do dia" value={Number(dashboard.vendas_dia || 0)} prefix="R$" precision={2} valueStyle={{ color: lojaBlue }} /></Card></Col>
            <Col xs={24} md={8}><Card><Statistic title="Ticket médio" value={Number(dashboard.ticket_medio || 0)} prefix="R$" precision={2} valueStyle={{ color: "#10B981" }} /></Card></Col>
            <Col xs={24} md={8}><Card><Statistic title="Caixas abertos" value={caixas.length} prefix={<ThunderboltOutlined />} /></Card></Col>
          </Row>

          <Card>
            <Segmented
              block
              size="large"
              value={view}
              onChange={setView}
              options={menuOptions.map((item) => ({ label: <Space>{item.icon}{item.label}</Space>, value: item.value }))}
            />
          </Card>

          {contentByView[view]()}
        </Space>
      </Content>

      <Modal
        title="Cadastrar produto da loja"
        open={modalProdutoAberto}
        onCancel={() => setModalProdutoAberto(false)}
        onOk={() => form.submit()}
        confirmLoading={salvandoProduto}
        width={860}
        okText="Salvar produto"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={salvarProduto}>
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item name="nome" label="Nome do produto" rules={[{ required: true, message: "Informe o nome." }]}>
                <Input placeholder="Ex: Controle universal ar-condicionado" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="categoria_nome" label="Categoria">
                <Input placeholder="Ex: Refrigeração" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="descricao" label="Descrição">
                <Input.TextArea rows={2} placeholder="Descrição comercial e técnica do produto" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Preço, margem e estoque</Divider>
          <Row gutter={16}>
            <Col xs={24} md={6}><Form.Item name="preco_custo" label="Preço de compra"><InputNumber min={0} precision={2} style={{ width: "100%" }} prefix="R$" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="markup_percentual" label="Markup (%)"><InputNumber min={0} precision={2} style={{ width: "100%" }} suffix="%" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="aliquota_impostos_percentual" label="Impostos (%)"><InputNumber min={0} precision={2} style={{ width: "100%" }} suffix="%" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="despesas_operacionais_percentual" label="Despesas (%)"><InputNumber min={0} precision={2} style={{ width: "100%" }} suffix="%" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="preco_venda" label="Preço venda manual"><InputNumber min={0} precision={2} style={{ width: "100%" }} prefix="R$" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="estoque_inicial" label="Estoque inicial"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="estoque_minimo" label="Estoque mínimo"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="localizacao" label="Localização"><Input placeholder="Ex: Prateleira A1" /></Form.Item></Col>
          </Row>
          <Alert type="success" showIcon message={`Preço sugerido automático: ${currency(valorSugerido)}`} />

          <Divider orientation="left">Fiscal e venda</Divider>
          <Row gutter={16}>
            <Col xs={24} md={6}><Form.Item name="ncm" label="NCM"><Input maxLength={8} placeholder="8 dígitos" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="cest" label="CEST"><Input placeholder="Opcional" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="cfop_padrao" label="CFOP padrão"><Input maxLength={4} /></Form.Item></Col>
            <Col xs={24} md={6}>
              <Form.Item name="origem_produto" label="Origem">
                <Select
                  options={[
                    { value: "nacional", label: "Nacional" },
                    { value: "importado", label: "Importado" },
                    { value: "estrangeira_direta", label: "Estrangeira direta" },
                    { value: "estrangeira_interna", label: "Estrangeira mercado interno" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="unidade_medida" label="Unidade">
                <Select options={[{ value: "un", label: "Unidade" }, { value: "m", label: "Metro" }, { value: "m2", label: "m2" }, { value: "kg", label: "Kg" }, { value: "litro", label: "Litro" }, { value: "caixa", label: "Caixa" }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="tipo_suprimento" label="Suprimento">
                <Select options={[{ value: "estoque", label: "Alocado no estoque" }, { value: "futuro", label: "Produto futuro / sob compra" }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Layout>
  );
}
