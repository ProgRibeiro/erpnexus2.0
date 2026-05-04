import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalculatorOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  StockOutlined,
} from "@ant-design/icons";

import estoqueService from "../../services/estoque";

const { Text, Title } = Typography;

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const btnPrimary = {
  background: "#3B82F6",
  borderColor: "#3B82F6",
  color: "#fff",
  fontWeight: 600,
  borderRadius: 8,
};

const unidades = [
  { value: "un", label: "Unidade" },
  { value: "m", label: "Metro" },
  { value: "m2", label: "Metro quadrado" },
  { value: "kg", label: "Quilograma" },
  { value: "litro", label: "Litro" },
  { value: "par", label: "Par" },
  { value: "caixa", label: "Caixa" },
];

const suprimentos = [
  { value: "estoque", label: "Alocado no estoque" },
  { value: "futuro", label: "Produto futuro / sob compra" },
];

function calcularPrecoSugerido(values = {}) {
  const custo = Number(values.preco_custo || 0);
  const percentual =
    Number(values.markup_percentual || 0) +
    Number(values.aliquota_impostos_percentual || 0) +
    Number(values.despesas_operacionais_percentual || 0);
  return custo + (custo * percentual) / 100;
}

export default function EstoquePage() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const formValues = Form.useWatch([], form) || {};

  const precoSugerido = useMemo(() => calcularPrecoSugerido(formValues), [formValues]);
  const produtosAlerta = produtos.filter((produto) => produto.em_alerta || Number(produto.estoque_atual || 0) <= Number(produto.estoque_minimo || 0));
  const valorEstoque = produtos.reduce((sum, produto) => sum + Number(produto.estoque_atual || 0) * Number(produto.preco_custo || 0), 0);

  const carregar = async () => {
    setLoading(true);
    try {
      const [produtosData, categoriasData, movimentosData, dashboardData] = await Promise.all([
        estoqueService.listarProdutos(),
        estoqueService.listarCategorias(),
        estoqueService.listarMovimentacoes(),
        estoqueService.dashboard().catch(() => ({})),
      ]);
      setProdutos(produtosData || []);
      setCategorias(categoriasData || []);
      setMovimentacoes((movimentosData || []).slice(0, 8));
      setDashboard(dashboardData || {});
    } catch {
      message.error("Erro ao carregar estoque");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      unidade_medida: "un",
      tipo_suprimento: "estoque",
      markup_percentual: 30,
      aliquota_impostos_percentual: 0,
      despesas_operacionais_percentual: 0,
      estoque_minimo: 1,
      estoque_inicial: 0,
      preco_manual: false,
    });
    setDrawerOpen(true);
  };

  const abrirEdicao = (produto) => {
    setEditing(produto);
    form.setFieldsValue({
      ...produto,
      categoria: produto.categoria || undefined,
      estoque_inicial: 0,
    });
    setDrawerOpen(true);
  };

  const salvarProduto = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        ...values,
        preco_venda: values.preco_manual ? values.preco_venda : precoSugerido,
      };
      const estoqueInicial = Number(payload.estoque_inicial || 0);
      delete payload.estoque_inicial;

      const produto = await estoqueService.salvarProduto(payload, editing?.id);
      if (!editing && estoqueInicial > 0 && produto?.tipo_suprimento === "estoque") {
        await estoqueService.criarMovimentacao({
          produto: produto.id,
          tipo: "entrada",
          quantidade: estoqueInicial,
          valor_unitario: produto.preco_custo,
          motivo: "compra",
          observacoes: "Entrada inicial pelo cadastro do produto",
        });
      }

      message.success(editing ? "Produto atualizado" : "Produto cadastrado");
      setDrawerOpen(false);
      carregar();
    } catch (error) {
      const detail = error?.response?.data?.detail || "Erro ao salvar produto";
      message.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Código", dataIndex: "codigo", width: 120 },
    {
      title: "Produto",
      dataIndex: "nome",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => abrirEdicao(record)}>
            {text}
          </Button>
          <Text type="secondary">{record.categoria_nome || "Sem categoria"}</Text>
        </Space>
      ),
    },
    { title: "Tipo", dataIndex: "tipo_suprimento", render: (v) => <Tag color={v === "futuro" ? "purple" : "blue"}>{v === "futuro" ? "Futuro" : "Estoque"}</Tag> },
    { title: "Estoque", dataIndex: "estoque_atual", render: (v, r) => <Text strong style={{ color: r.em_alerta ? "#B91C1C" : "#111827" }}>{Number(v || 0)}</Text> },
    { title: "Mínimo", dataIndex: "estoque_minimo" },
    { title: "Custo", dataIndex: "preco_custo", render: money },
    { title: "Venda", dataIndex: "preco_venda", render: (v, r) => <Text strong style={{ color: "#2563EB" }}>{money(v || r.preco_venda_sugerido)}</Text> },
    { title: "Markup", dataIndex: "markup_percentual", render: (v) => `${Number(v || 0).toFixed(2)}%` },
    {
      title: "Status",
      dataIndex: "em_alerta",
      render: (v, record) =>
        v ? <Tag color="red">Repor</Tag> : record.tipo_suprimento === "futuro" ? <Tag color="purple">Comprar sob demanda</Tag> : <Tag color="green">OK</Tag>,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Estoque</Title>
          <Text type="secondary">Produtos, formação de preço, alertas e movimentos ligados às ordens de serviço.</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={carregar}>Atualizar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo} style={btnPrimary}>Novo produto</Button>
        </Space>
      </div>

      {produtosAlerta.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${produtosAlerta.length} produto(s) precisam de atenção`}
          description="Produtos abaixo do mínimo, sem estoque ou marcados como compra futura aparecem destacados para reposição."
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Card><Statistic title="Produtos ativos" value={dashboard.produtos_total ?? produtos.length} prefix={<ShoppingOutlined />} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Alertas" value={dashboard.produtos_em_alerta ?? produtosAlerta.length} valueStyle={{ color: "#B91C1C" }} prefix={<AlertOutlined />} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Valor em estoque" value={Number(dashboard.valor_total_estoque ?? valorEstoque)} formatter={money} prefix={<StockOutlined />} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Movimentos hoje" value={dashboard.movimentacoes_hoje ?? 0} prefix={<ArrowUpOutlined />} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={17}>
          <Card title="Produtos cadastrados" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={produtos}
              columns={columns}
              scroll={{ x: 980 }}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={7}>
          <Card title="Últimas entradas e saídas">
            <Space direction="vertical" style={{ width: "100%" }}>
              {movimentacoes.map((movimento) => (
                <div key={movimento.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E5E7EB", paddingBottom: 10 }}>
                  <Space>
                    {movimento.tipo === "entrada" ? <ArrowUpOutlined style={{ color: "#10B981" }} /> : <ArrowDownOutlined style={{ color: "#EF4444" }} />}
                    <div>
                      <Text strong>{movimento.produto_nome}</Text>
                      <div><Text type="secondary">{movimento.motivo} • {Number(movimento.quantidade || 0)}</Text></div>
                    </div>
                  </Space>
                  <Text strong>{money(movimento.valor_total)}</Text>
                </div>
              ))}
              {!movimentacoes.length && <Text type="secondary">Nenhuma movimentação registrada.</Text>}
            </Space>
          </Card>
        </Col>
      </Row>

      <Drawer
        title={editing ? "Editar produto" : "Cadastrar produto"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        extra={<Button type="primary" onClick={salvarProduto} loading={saving} style={btnPrimary}>Salvar</Button>}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={16}><Form.Item name="nome" label="Nome do produto" rules={[{ required: true, message: "Informe o produto" }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="unidade_medida" label="Unidade"><Select options={unidades} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="categoria" label="Categoria"><Select allowClear options={categorias.map((c) => ({ value: c.id, label: c.nome }))} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="tipo_suprimento" label="Suprimento"><Select options={suprimentos} /></Form.Item></Col>
            <Col xs={24}><Form.Item name="descricao" label="Descrição"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>

          <Card size="small" title={<Space><CalculatorOutlined /> Formação automática de preço</Space>} style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              <Col xs={24} md={8}><Form.Item name="preco_custo" label="Preço de compra" rules={[{ required: true, message: "Informe o custo" }]}><InputNumber min={0} step={0.01} style={{ width: "100%" }} prefix="R$" /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="markup_percentual" label="Markup (%)"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="aliquota_impostos_percentual" label="Impostos (%)"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="despesas_operacionais_percentual" label="Despesas (%)"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="preco_manual" label="Preço manual" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="preco_venda" label="Preço de venda"><InputNumber disabled={!formValues.preco_manual} min={0} step={0.01} style={{ width: "100%" }} prefix="R$" placeholder={money(precoSugerido)} /></Form.Item></Col>
            </Row>
            <Alert
              type="info"
              showIcon
              message={`Preço sugerido: ${money(precoSugerido)}`}
              description={`Formação: custo ${money(formValues.preco_custo)} + markup/impostos/despesas (${Number((formValues.markup_percentual || 0) + (formValues.aliquota_impostos_percentual || 0) + (formValues.despesas_operacionais_percentual || 0)).toFixed(2)}%).`}
            />
          </Card>

          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item name="estoque_minimo" label="Estoque mínimo"><InputNumber min={0} step={1} style={{ width: "100%" }} /></Form.Item></Col>
            {!editing && <Col xs={24} md={8}><Form.Item name="estoque_inicial" label="Entrada inicial"><InputNumber min={0} step={1} style={{ width: "100%" }} /></Form.Item></Col>}
            <Col xs={24} md={8}><Form.Item name="localizacao" label="Localização"><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="ativo" label="Ativo" valuePropName="checked" initialValue><Switch /></Form.Item></Col>
          </Row>
        </Form>
      </Drawer>
    </Space>
  );
}
