import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
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
  DeleteOutlined,
  DollarOutlined,
  LeftOutlined,
  PlusOutlined,
  ProductOutlined,
  ReloadOutlined,
  PrinterOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import "./loja.css";

const { Content, Header } = Layout;
const { Text, Title } = Typography;
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const lojaBlue = "#3B82F6";
const lojaGreen = "#10B981";
const lojaBorder = "#E2E6EC";
const lojaMuted = "#64748B";

const shellStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #F8FAFC 0%, #EEF4F8 100%)",
};

const pageInnerStyle = {
  width: "100%",
  maxWidth: 1540,
  margin: "0 auto",
};

const panelStyle = {
  border: `1px solid ${lojaBorder}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const compactListStyle = {
  border: `1px solid ${lojaBorder}`,
  borderRadius: 12,
  background: "#FFFFFF",
  transition: "all 0.2s ease",
};

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

function LojaMetric({ icon: Icon, label, value, helper, color }) {
  return (
    <Card className="store-metric-card" bordered={false}>
      <div className="store-metric-top">
        <span className="store-metric-icon" style={{ color, background: `${color}14` }}>
          <Icon />
        </span>
        <span className="store-metric-trend">Hoje</span>
      </div>
      <Text className="store-metric-label">{label}</Text>
      <div className="store-metric-value" style={{ color }}>{value}</div>
      <Text className="store-metric-helper">{helper}</Text>
    </Card>
  );
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
  const [relatorios, setRelatorios] = useState({
    curvaAbc: [],
    vendasVendedor: [],
    produtosMaisVendidos: [],
  });
  const [loading, setLoading] = useState(false);
  const [salvandoProduto, setSalvandoProduto] = useState(false);
  const [finalizandoVenda, setFinalizandoVenda] = useState(false);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [modalPdvAberto, setModalPdvAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaPdv, setBuscaPdv] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [formaPagamentoId, setFormaPagamentoId] = useState(null);

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

      const [curvaResp, vendedoresResp, vendidosResp] = await Promise.allSettled([
        api.get("/loja/relatorios/curva-abc/"),
        api.get("/loja/relatorios/vendas-por-vendedor/"),
        api.get("/loja/relatorios/produtos-mais-vendidos/"),
      ]);
      setRelatorios({
        curvaAbc: curvaResp.status === "fulfilled" ? normalizeList(curvaResp.value.data) : [],
        vendasVendedor: vendedoresResp.status === "fulfilled" ? normalizeList(vendedoresResp.value.data) : [],
        produtosMaisVendidos: vendidosResp.status === "fulfilled" ? normalizeList(vendidosResp.value.data) : [],
      });
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

  const produtosPdvFiltrados = useMemo(() => {
    const termo = buscaPdv.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((item) => {
      const nome = getProdutoNome(item).toLowerCase();
      const codigo = getProdutoCodigo(item).toLowerCase();
      const ncm = String(item.ncm || "").toLowerCase();
      return nome.includes(termo) || codigo.includes(termo) || ncm.includes(termo);
    });
  }, [buscaPdv, produtos]);

  const totalCarrinho = useMemo(() => {
    return carrinho.reduce((total, item) => total + Number(item.quantidade || 0) * Number(item.valor_unitario || 0), 0);
  }, [carrinho]);

  const produtosComAlerta = useMemo(() => {
    return produtos.filter((item) => item.produto_dados?.em_alerta || Number(item.estoque_atual || 0) <= Number(item.produto_dados?.estoque_minimo || 0));
  }, [produtos]);

  const produtosFiscalPendente = useMemo(() => {
    return produtos.filter((item) => !item.ncm || !item.cfop_padrao);
  }, [produtos]);

  const produtosRecompra = useMemo(() => {
    return produtosComAlerta.map((item) => ({
      ...item,
      sugestao_compra: Math.max(Number(item.produto_dados?.estoque_minimo || 0) * 2 - Number(item.estoque_atual || 0), 1),
    }));
  }, [produtosComAlerta]);

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

  const abrirPdv = () => {
    if (!caixas.length) {
      message.warning("Abra um caixa antes de iniciar uma venda.");
      setView("caixa");
      return;
    }
    setCarrinho([]);
    setBuscaPdv("");
    setFormaPagamentoId(formas[0]?.id || null);
    setModalPdvAberto(true);
  };

  const adicionarProdutoCarrinho = (produto) => {
    if (!produto.vendido_loja) {
      message.warning("Produto oculto para venda na loja.");
      return;
    }
    if (Number(produto.estoque_atual || 0) <= 0 && produto.produto_dados?.tipo_suprimento !== "futuro") {
      message.warning("Produto sem estoque disponível.");
      return;
    }
    setCarrinho((atual) => {
      const existente = atual.find((item) => item.produto.id === produto.id);
      if (existente) {
        return atual.map((item) => (item.produto.id === produto.id ? { ...item, quantidade: Number(item.quantidade || 0) + 1 } : item));
      }
      return [
        ...atual,
        {
          produto,
          quantidade: 1,
          valor_unitario: Number(produto.preco_vigente || produto.produto_dados?.preco_venda || 0),
        },
      ];
    });
  };

  const atualizarItemCarrinho = (produtoId, campo, valor) => {
    setCarrinho((atual) => atual.map((item) => (item.produto.id === produtoId ? { ...item, [campo]: valor } : item)));
  };

  const removerItemCarrinho = (produtoId) => {
    setCarrinho((atual) => atual.filter((item) => item.produto.id !== produtoId));
  };

  const gerarComprovanteHtml = (venda) => {
    const itens = venda.itens || [];
    const pagamentos = venda.pagamentos || [];
    return `
      <html>
        <head>
          <title>Comprovante ${venda.numero}</title>
          <style>
            body { font-family: Arial, sans-serif; width: 280px; margin: 0; padding: 12px; color: #111827; }
            h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
            .muted { color: #64748B; font-size: 11px; text-align: center; }
            .line { border-top: 1px dashed #94A3B8; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin: 4px 0; }
            .item { font-size: 12px; margin-bottom: 8px; }
            .total { font-weight: 700; font-size: 15px; }
            @media print { body { width: 280px; } }
          </style>
        </head>
        <body>
          <h1>ERP Nexus Loja</h1>
          <div class="muted">Comprovante de venda</div>
          <div class="muted">${venda.numero || ""}</div>
          <div class="muted">${new Date().toLocaleString("pt-BR")}</div>
          <div class="line"></div>
          ${itens
            .map(
              (item) => `
                <div class="item">
                  <div>${item.produto_nome || "Produto"}</div>
                  <div class="row"><span>${Number(item.quantidade || 0)} x ${currency(item.valor_unitario)}</span><strong>${currency(item.valor_total)}</strong></div>
                </div>
              `
            )
            .join("")}
          <div class="line"></div>
          <div class="row"><span>Subtotal</span><span>${currency(venda.subtotal)}</span></div>
          <div class="row"><span>Desconto</span><span>${currency(venda.desconto_total)}</span></div>
          <div class="row total"><span>Total</span><span>${currency(venda.valor_total)}</span></div>
          <div class="line"></div>
          ${pagamentos.map((pag) => `<div class="row"><span>${pag.forma_nome}</span><span>${currency(pag.valor)}</span></div>`).join("")}
          <div class="line"></div>
          <div class="muted">Obrigado pela preferência.</div>
        </body>
      </html>
    `;
  };

  const imprimirComprovante = (venda) => {
    const janela = window.open("", "_blank", "width=360,height=640");
    if (!janela) {
      message.warning("Permita pop-ups para imprimir o comprovante.");
      return;
    }
    janela.document.write(gerarComprovanteHtml(venda));
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 300);
  };

  const finalizarVendaPdv = async () => {
    if (!caixas.length) {
      message.warning("Abra um caixa antes de vender.");
      return;
    }
    if (!carrinho.length) {
      message.warning("Adicione pelo menos um produto ao carrinho.");
      return;
    }
    if (!formaPagamentoId) {
      message.warning("Selecione a forma de pagamento.");
      return;
    }

    try {
      setFinalizandoVenda(true);
      const vendaResp = await api.post("/loja/vendas/", {
        caixa: caixas[0].id,
        canal: "balcao",
        observacoes: "Venda balcão pelo PDV do Modo Loja",
      });
      const vendaId = vendaResp.data.id;

      for (const item of carrinho) {
        await api.post(`/loja/vendas/${vendaId}/adicionar-item/`, {
          produto: item.produto.id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          desconto_item: 0,
        });
      }

      const finalizadaResp = await api.post(`/loja/vendas/${vendaId}/finalizar/`, {
        pagamentos: [{ forma: formaPagamentoId, valor: totalCarrinho, parcelas: 1 }],
      });

      message.success("Venda finalizada. Estoque, caixa e financeiro atualizados.");
      setModalPdvAberto(false);
      setCarrinho([]);
      imprimirComprovante(finalizadaResp.data);
      carregar();
    } catch (error) {
      const detalhe = error.response?.data?.detail || "Não foi possível finalizar a venda.";
      message.error(detalhe);
    } finally {
      setFinalizandoVenda(false);
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
      width: 280,
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Text strong>{getProdutoNome(item)}</Text>
          <Text style={{ color: lojaMuted, fontSize: 12 }}>{getProdutoCodigo(item)}</Text>
        </Space>
      ),
    },
    { title: "Estoque", width: 100, dataIndex: "estoque_atual", render: (value, item) => <Tag color={item.produto_dados?.em_alerta ? "red" : "blue"}>{Number(value || 0)}</Tag> },
    { title: "Custo", width: 112, render: (_, item) => currency(item.produto_dados?.preco_custo) },
    { title: "Venda", width: 118, dataIndex: "preco_vigente", render: (value) => <Text strong>{currency(value)}</Text> },
    { title: "Margem", width: 92, render: (_, item) => `${Number(item.produto_dados?.margem_percentual || 0).toFixed(2)}%` },
    {
      title: "Fiscal",
      width: 170,
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{item.ncm || "NCM pendente"}</Text>
          <Text style={{ color: lojaMuted, fontSize: 12 }}>CFOP {item.cfop_padrao || "-"}</Text>
        </Space>
      ),
    },
    { title: "Status", width: 110, render: (_, item) => <Badge status={item.vendido_loja ? "success" : "default"} text={item.vendido_loja ? "Vendendo" : "Oculto"} /> },
    {
      title: "PDV",
      width: 110,
      render: (_, item) => (
        <Button
          size="small"
          icon={<PlusOutlined />}
          style={{ borderRadius: 8, transition: "all 0.2s ease" }}
          onClick={() => adicionarProdutoCarrinho(item)}
        >
          Adicionar
        </Button>
      ),
    },
  ];

  const conexoes = [
    { titulo: "Estoque", texto: `${produtos.length} produtos vinculados`, ok: true },
    { titulo: "Financeiro", texto: "Receitas geradas ao finalizar venda", ok: true },
    { titulo: "Caixa", texto: `${caixas.length} caixa(s) aberto(s)`, ok: caixas.length > 0 },
    { titulo: "Fiscal", texto: `${produtosFiscalPendente.length} produto(s) com fiscal pendente`, ok: produtosFiscalPendente.length === 0 },
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
    <Row gutter={[14, 14]}>
      <Col xs={24} xl={17}>
        <Card
          title="Mesa de venda"
          style={panelStyle}
          bodyStyle={{ padding: 14 }}
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={carregar}>Sincronizar</Button>
              <Button type="primary" icon={<PlusOutlined />} style={{ background: lojaBlue }} onClick={abrirCadastroProduto}>Produto</Button>
            </Space>
          }
        >
          <Row gutter={[10, 10]} align="middle">
            <Col xs={24} lg={16}>
              <Input
                size="large"
                prefix={<BarcodeOutlined />}
                placeholder="Buscar produto, NCM ou escanear código de barras"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </Col>
            <Col xs={24} lg={8}>
              <Button type="primary" size="large" block disabled={!caixas.length} style={{ background: lojaGreen }} onClick={abrirPdv}>
                Abrir frente de caixa
              </Button>
            </Col>
          </Row>
          <Table
            style={{ marginTop: 12 }}
            size="small"
            loading={loading}
            rowKey="id"
            dataSource={produtosFiltrados}
            columns={produtoColumns}
            scroll={{ x: 980 }}
            pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} produtos` }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Nenhum produto encontrado"
                  style={{ margin: "32px 0" }}
                />
              ),
            }}
          />
        </Card>
      </Col>
      <Col xs={24} xl={7}>
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Card title="Status do turno" style={panelStyle} bodyStyle={{ padding: 14 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={10}>
              <Alert
                type={caixas.length ? "success" : "warning"}
                showIcon
                message={caixas.length ? "Caixa pronto para venda" : "Abertura de caixa pendente"}
                description={caixas.length ? `${caixas[0]?.nome || "Caixa"} conectado ao financeiro e estoque.` : "Abra um caixa para liberar vendas de balcão."}
              />
              <Row gutter={10}>
                <Col span={12}>
                  <div style={compactListStyle}>
                    <div style={{ padding: 12 }}>
                      <Text type="secondary">Caixas</Text>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{caixas.length}</div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={compactListStyle}>
                    <div style={{ padding: 12 }}>
                      <Text type="secondary">Pagamentos</Text>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{formas.length}</div>
                    </div>
                  </div>
                </Col>
              </Row>
              <Button block icon={<DollarOutlined />} onClick={abrirCaixa}>Abrir caixa</Button>
            </Space>
          </Card>

          <Card title="Formas de pagamento" style={panelStyle} bodyStyle={{ padding: "2px 14px" }}>
            <List
              dataSource={formas.slice(0, 6)}
              locale={{ emptyText: "Nenhuma forma cadastrada" }}
              renderItem={(forma) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <Text strong>{forma.nome}</Text>
                    <Text style={{ color: lojaMuted, fontSize: 12 }}>
                      Taxa {Number(forma.taxa_percentual || 0).toFixed(2)}% - D+{forma.prazo_recebimento_dias || 0}
                    </Text>
                  </Space>
                  <Tag>{forma.tipo}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Space>
      </Col>
    </Row>
  );

  const renderProdutos = () => (
    <Card
      title="Cadastro e tabela de produtos da loja"
      style={panelStyle}
      bodyStyle={{ padding: 14 }}
      extra={<Button type="primary" icon={<PlusOutlined />} style={{ background: lojaBlue }} onClick={abrirCadastroProduto}>Cadastrar produto</Button>}
    >
      <Row gutter={[10, 10]} align="middle" style={{ marginBottom: 12 }}>
        <Col xs={24} lg={16}>
          <Input prefix={<BarcodeOutlined />} placeholder="Filtrar por produto, código, NCM ou CFOP" value={busca} onChange={(event) => setBusca(event.target.value)} />
        </Col>
        <Col xs={24} lg={8}>
          <Alert type="info" showIcon message="Cadastro integrado ao estoque, PDV e fiscal." />
        </Col>
      </Row>
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={produtosFiltrados}
        columns={produtoColumns}
        scroll={{ x: 980 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nenhum produto cadastrado"
              style={{ margin: "32px 0" }}
            >
              <Button type="primary" icon={<PlusOutlined />} style={{ background: lojaBlue, borderRadius: 8 }} onClick={abrirCadastroProduto}>
                Cadastrar produto
              </Button>
            </Empty>
          ),
        }}
      />
    </Card>
  );

  const renderCaixa = () => (
    <Row gutter={[14, 14]}>
      <Col xs={24} lg={16}>
        <Card title="Gestão de caixa" style={panelStyle} bodyStyle={{ padding: 14 }} extra={<Button type="primary" icon={<DollarOutlined />} style={{ background: lojaBlue }} onClick={abrirCaixa}>Abrir caixa</Button>}>
          <Table
            size="small"
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
      </Col>
      <Col xs={24} lg={8}>
        <Card title="Rotina operacional" style={panelStyle} bodyStyle={{ padding: "2px 14px" }}>
          <List
            dataSource={[
              "Abrir caixa com valor inicial conferido",
              "Registrar vendas por forma de pagamento",
              "Usar sangria para retirada de dinheiro",
              "Usar suprimento para reforço de caixa",
              "Fechar caixa conferindo saldo físico e sistema",
            ]}
            renderItem={(item) => <List.Item><CheckCircleOutlined style={{ color: "#10B981" }} /> <Text>{item}</Text></List.Item>}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderEntregas = () => (
    <Card title="Logística e entregas" style={panelStyle} bodyStyle={{ padding: 14 }}>
      <Table
        size="small"
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

  const renderCompras = () => (
    <Card title="Sugestão de compras e reposição" style={panelStyle} bodyStyle={{ padding: 14 }}>
      <Row gutter={[10, 10]} align="middle" style={{ marginBottom: 12 }}>
        <Col xs={24} lg={16}>
          <Alert
            type={produtosRecompra.length ? "warning" : "success"}
            showIcon
            message={produtosRecompra.length ? "Há produtos abaixo do mínimo." : "Nenhum produto abaixo do mínimo agora."}
            description="A sugestão considera estoque mínimo e quantidade atual para ajudar no pedido de compra."
          />
        </Col>
        <Col xs={24} lg={8}>
          <div style={{ ...compactListStyle, padding: 12 }}>
            <Text type="secondary">Custo estimado de recompra</Text>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {currency(produtosRecompra.reduce((sum, item) => sum + Number(item.produto_dados?.preco_custo || 0) * Number(item.sugestao_compra || 0), 0))}
            </div>
          </div>
        </Col>
      </Row>
      <Table
        size="small"
        rowKey="id"
        dataSource={produtosRecompra}
        columns={[
          { title: "Produto", render: (_, item) => getProdutoNome(item) },
          { title: "Estoque atual", dataIndex: "estoque_atual" },
          { title: "Mínimo", render: (_, item) => item.produto_dados?.estoque_minimo || 0 },
          { title: "Comprar sugerido", dataIndex: "sugestao_compra", render: (value) => <Tag color="orange">{value}</Tag> },
          { title: "Custo estimado", render: (_, item) => currency(Number(item.produto_dados?.preco_custo || 0) * Number(item.sugestao_compra || 0)) },
        ]}
      />
    </Card>
  );

  const renderRelatorios = () => (
    <Row gutter={[14, 14]}>
      <Col xs={24} xl={8}>
        <Card title="Curva ABC" style={panelStyle} bodyStyle={{ padding: 14 }}>
          <Table
            size="small"
            pagination={false}
            rowKey={(row, index) => `${row.produto__produto__nome}-${index}`}
            dataSource={relatorios.curvaAbc.slice(0, 8)}
            columns={[
              { title: "Produto", dataIndex: "produto__produto__nome" },
              { title: "Faturamento", dataIndex: "total", render: currency },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card title="Produtos mais vendidos" style={panelStyle} bodyStyle={{ padding: 14 }}>
          <Table
            size="small"
            pagination={false}
            rowKey={(row, index) => `${row.produto__produto__nome}-${index}`}
            dataSource={relatorios.produtosMaisVendidos.slice(0, 8)}
            columns={[
              { title: "Produto", dataIndex: "produto__produto__nome" },
              { title: "Qtd", dataIndex: "total" },
              { title: "Valor", dataIndex: "faturamento", render: currency },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card title="Vendas por vendedor" style={panelStyle} bodyStyle={{ padding: 14 }}>
          <Table
            size="small"
            pagination={false}
            rowKey={(row, index) => `${row.codigo_vendedor}-${index}`}
            dataSource={relatorios.vendasVendedor.slice(0, 8)}
            columns={[
              { title: "Vendedor", dataIndex: "codigo_vendedor" },
              { title: "Vendas", dataIndex: "vendas" },
              { title: "Total", dataIndex: "total", render: currency },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );

  const contentByView = {
    pdv: renderPdV,
    produtos: renderProdutos,
    caixa: renderCaixa,
    entregas: renderEntregas,
    compras: renderCompras,
    relatorios: renderRelatorios,
  };

  const entregasAbertas = entregas.filter(
    (item) => !["entregue", "devolvido"].includes(item.status),
  ).length;

  const currentView = menuOptions.find((item) => item.value === view);

  return (
    <Layout className="store-shell" style={shellStyle}>
      <Header className="store-header">
        <div className="store-brand">
          <div className="store-brand-mark"><ShopOutlined /></div>
          <div>
            <Text>ERP Nexus</Text>
            <Title level={3}>Loja & PDV</Title>
          </div>
        </div>
        <div className="store-header-actions">
          <span className={`store-cash-status ${caixas.length ? "is-open" : "is-closed"}`}>
            <i /> {caixas.length ? `${caixas.length} caixa(s) aberto(s)` : "Caixa fechado"}
          </span>
          <Button icon={<ReloadOutlined spin={loading} />} onClick={carregar}>Atualizar</Button>
          <Button icon={<LeftOutlined />} onClick={() => navigate("/dashboard")}>Voltar ao ERP</Button>
        </div>
      </Header>

      <Content className="store-content">
        <div className="store-container" style={pageInnerStyle}>
          <section className="store-hero">
            <div className="store-hero-copy">
              <Tag>Operação integrada</Tag>
              <Title level={1}>Venda, estoque e caixa no mesmo ritmo.</Title>
              <Text>
                Uma visão limpa da operação comercial para vender com rapidez e controlar tudo sem retrabalho.
              </Text>
              <div className="store-hero-actions">
                <Button type="primary" size="large" icon={<ShoppingCartOutlined />} disabled={!caixas.length} onClick={abrirPdv}>
                  Iniciar nova venda
                </Button>
                {!caixas.length && <Button size="large" icon={<DollarOutlined />} onClick={abrirCaixa}>Abrir caixa</Button>}
                <Button size="large" icon={<PlusOutlined />} onClick={abrirCadastroProduto}>Novo produto</Button>
              </div>
            </div>
            <div className="store-hero-summary">
              <span>Faturamento de hoje</span>
              <strong>{currency(dashboard.vendas_dia)}</strong>
              <div>
                <span><b>{dashboard.quantidade_vendas || 0}</b> vendas</span>
                <span><b>{currency(dashboard.ticket_medio)}</b> ticket médio</span>
              </div>
            </div>
          </section>

          <Row gutter={[14, 14]} className="store-metrics-grid">
            <Col xs={12} lg={6}>
              <LojaMetric icon={DollarOutlined} label="Vendas do dia" value={currency(dashboard.vendas_dia)} helper={`${dashboard.quantidade_vendas || 0} transações`} color="#3B82F6" />
            </Col>
            <Col xs={12} lg={6}>
              <LojaMetric icon={ShoppingCartOutlined} label="Ticket médio" value={currency(dashboard.ticket_medio)} helper="Valor médio por venda" color="#8B5CF6" />
            </Col>
            <Col xs={12} lg={6}>
              <LojaMetric icon={ProductOutlined} label="Estoque crítico" value={produtosComAlerta.length} helper={`${produtos.length} produtos ativos`} color={produtosComAlerta.length ? "#F59E0B" : "#10B981"} />
            </Col>
            <Col xs={12} lg={6}>
              <LojaMetric icon={CarOutlined} label="Entregas abertas" value={entregasAbertas} helper={`${produtosRecompra.length} reposições sugeridas`} color="#10B981" />
            </Col>
          </Row>

          <div className="store-integration-bar">
            <div className="store-integration-title">
              <ThunderboltOutlined />
              <span>Integrações da operação</span>
            </div>
            <div className="store-integration-items">
              {conexoes.map((item) => (
                <span key={item.titulo} className={item.ok ? "is-ok" : "needs-attention"} title={item.texto}>
                  {item.ok ? <CheckCircleOutlined /> : <ApiOutlined />}
                  <b>{item.titulo}</b>
                  <small>{item.texto}</small>
                </span>
              ))}
            </div>
          </div>

          <Card className="store-navigation" bordered={false}>
            <Segmented
              block
              size="large"
              value={view}
              onChange={(value) => setView(value)}
              options={menuOptions.map((item) => ({ label: <Space>{item.icon}{item.label}</Space>, value: item.value }))}
            />
          </Card>

          <div className="store-view-heading">
            <div>
              <Text>Área de trabalho</Text>
              <Title level={3}>{currentView?.label || "PDV"}</Title>
            </div>
            <Text>Dados sincronizados entre loja, estoque, financeiro e fiscal.</Text>
          </div>

          <div className="store-workspace">{contentByView[view]()}</div>
        </div>
      </Content>

      <Modal
        title={
          <Space direction="vertical" size={0}>
            <Text strong>Frente de caixa</Text>
            <Text style={{ color: lojaMuted, fontSize: 12 }}>Venda de balcão com baixa de estoque e comprovante</Text>
          </Space>
        }
        open={modalPdvAberto}
        onCancel={() => setModalPdvAberto(false)}
        width="96vw"
        footer={null}
        destroyOnClose
        styles={{ body: { paddingTop: 8 } }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={15}>
            <Card
              title="Adicionar produtos"
              style={panelStyle}
              bodyStyle={{ padding: 14 }}
              extra={<Button icon={<PlusOutlined />} onClick={abrirCadastroProduto}>Cadastrar produto</Button>}
            >
              <Input
                size="large"
                prefix={<BarcodeOutlined />}
                placeholder="Escaneie ou busque produto pelo nome, código ou NCM"
                value={buscaPdv}
                onChange={(event) => setBuscaPdv(event.target.value)}
              />
              <Table
                style={{ marginTop: 14 }}
                size="small"
                rowKey="id"
                dataSource={produtosPdvFiltrados}
                pagination={{ pageSize: 7 }}
                scroll={{ x: 760 }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Nenhum produto encontrado"
                      style={{ margin: "28px 0" }}
                    />
                  ),
                }}
                columns={[
                  { title: "Produto", render: (_, item) => <Text strong>{getProdutoNome(item)}</Text> },
                  { title: "Código", render: (_, item) => getProdutoCodigo(item) },
                  { title: "Estoque", dataIndex: "estoque_atual", render: (value) => <Tag>{Number(value || 0)}</Tag> },
                  { title: "Preço", dataIndex: "preco_vigente", render: (value) => <Text strong>{currency(value)}</Text> },
                  {
                    title: "",
                    render: (_, item) => (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        style={{ background: lojaBlue, borderRadius: 8, transition: "all 0.2s ease" }}
                        onClick={() => adicionarProdutoCarrinho(item)}
                      >
                        Adicionar
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} xl={9}>
            <Card
              title="Carrinho da venda"
              style={panelStyle}
              bodyStyle={{ padding: 14 }}
              extra={<Tag color={caixas.length ? "green" : "orange"}>{caixas[0]?.nome || "Sem caixa"}</Tag>}
            >
              <Table
                size="small"
                rowKey={(item) => item.produto.id}
                dataSource={carrinho}
                pagination={false}
                scroll={{ x: 620 }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Carrinho vazio"
                      style={{ margin: "24px 0" }}
                    />
                  ),
                }}
                columns={[
                  { title: "Produto", render: (_, item) => getProdutoNome(item.produto) },
                  {
                    title: "Qtd",
                    width: 90,
                    render: (_, item) => (
                      <InputNumber
                        min={0.01}
                        precision={2}
                        value={item.quantidade}
                        onChange={(value) => atualizarItemCarrinho(item.produto.id, "quantidade", value || 1)}
                        style={{ width: 78 }}
                      />
                    ),
                  },
                  {
                    title: "Valor",
                    width: 112,
                    render: (_, item) => (
                      <InputNumber
                        min={0}
                        precision={2}
                        value={item.valor_unitario}
                        onChange={(value) => atualizarItemCarrinho(item.produto.id, "valor_unitario", value || 0)}
                        style={{ width: 104 }}
                      />
                    ),
                  },
                  { title: "Total", render: (_, item) => currency(Number(item.quantidade || 0) * Number(item.valor_unitario || 0)) },
                  {
                    title: "",
                    width: 42,
                    render: (_, item) => (
                      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removerItemCarrinho(item.produto.id)} />
                    ),
                  },
                ]}
              />

              <Divider />
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <Statistic title="Total da venda" value={totalCarrinho} prefix="R$" precision={2} valueStyle={{ color: lojaBlue, fontWeight: 800 }} />
                <Select
                  size="large"
                  placeholder="Forma de pagamento"
                  value={formaPagamentoId}
                  onChange={setFormaPagamentoId}
                  options={formas.map((forma) => ({ value: forma.id, label: `${forma.nome} - ${forma.tipo}` }))}
                  style={{ width: "100%" }}
                />
                <Alert
                  type="info"
                  showIcon
                  message="Ao finalizar, o sistema baixa o estoque, movimenta o caixa, cria receita no financeiro e abre o comprovante para impressão."
                />
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<PrinterOutlined />}
                  style={{ background: lojaBlue }}
                  loading={finalizandoVenda}
                  disabled={!carrinho.length || !formaPagamentoId}
                  onClick={finalizarVendaPdv}
                >
                  Finalizar e imprimir comprovante
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Modal>

      <Modal
        title={
          <Space direction="vertical" size={0}>
            <Text strong>Cadastrar produto da loja</Text>
            <Text style={{ color: lojaMuted, fontSize: 12 }}>Produto comercial, estoque inicial, preço e fiscal</Text>
          </Space>
        }
        open={modalProdutoAberto}
        onCancel={() => setModalProdutoAberto(false)}
        onOk={() => form.submit()}
        confirmLoading={salvandoProduto}
        width={980}
        okText="Salvar produto"
        cancelText="Cancelar"
        styles={{ body: { paddingTop: 8 } }}
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

          <Divider orientation="left" style={{ margin: "8px 0 16px" }}>Preço, margem e estoque</Divider>
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
          <Alert type="success" showIcon message={`Preço sugerido automático: ${currency(valorSugerido)}`} style={{ marginBottom: 8 }} />

          <Divider orientation="left" style={{ margin: "8px 0 16px" }}>Fiscal e venda</Divider>
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
