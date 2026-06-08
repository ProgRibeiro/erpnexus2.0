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

const pageShellStyle = {
  width: "100%",
  minHeight: "100%",
  background: "#F8FAFC",
};

const heroStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const drawerHeaderStyle = {
  margin: "-24px -24px 20px",
  padding: "22px 24px",
  background: "#F8FAFC",
  borderBottom: "1px solid #E2E8F0",
};

const formPanelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 16,
};

const previewPanelStyle = {
  background: "#0F172A",
  borderRadius: 12,
  padding: 18,
  color: "#FFFFFF",
  height: "100%",
};

const supplyCardStyle = (active, color) => ({
  width: "100%",
  minHeight: 84,
  textAlign: "left",
  padding: 14,
  borderRadius: 12,
  border: `1px solid ${active ? color : "#E2E8F0"}`,
  background: active ? "#F8FAFC" : "#FFFFFF",
  cursor: "pointer",
  boxShadow: active ? "0 8px 20px rgba(15, 23, 42, 0.08)" : "none",
});

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

function arredondarMoeda(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatarErroApi(error) {
  const data = error?.response?.data;
  if (!data) return "Erro ao salvar produto";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const campo = Object.keys(data)[0];
  const valor = data[campo];
  const mensagem = Array.isArray(valor) ? valor[0] : valor;
  return campo ? `${campo}: ${mensagem}` : "Erro ao salvar produto";
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
  const [novaCategoria, setNovaCategoria] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [form] = Form.useForm();
  const formValues = Form.useWatch([], form) || {};

  const precoSugerido = useMemo(() => calcularPrecoSugerido(formValues), [formValues]);
  const precoVendaFinal = Number(formValues.preco_manual ? formValues.preco_venda || 0 : precoSugerido || 0);
  const margemEstimada =
    precoVendaFinal > 0
      ? Math.max(0, ((precoVendaFinal - Number(formValues.preco_custo || 0)) / precoVendaFinal) * 100)
      : 0;
  const tipoSuprimentoAtual = formValues.tipo_suprimento || "estoque";
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
        preco_custo: arredondarMoeda(values.preco_custo),
        preco_venda: arredondarMoeda(values.preco_manual ? values.preco_venda : precoSugerido),
        markup_percentual: arredondarMoeda(values.markup_percentual),
        aliquota_impostos_percentual: arredondarMoeda(values.aliquota_impostos_percentual),
        despesas_operacionais_percentual: arredondarMoeda(values.despesas_operacionais_percentual),
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
      message.error(formatarErroApi(error));
    } finally {
      setSaving(false);
    }
  };

  const cadastrarCategoria = async () => {
    const nome = novaCategoria.trim();
    if (!nome) {
      message.warning("Informe o nome da categoria");
      return;
    }

    setSalvandoCategoria(true);
    try {
      const categoria = await estoqueService.salvarCategoria({
        nome,
        descricao: "Categoria criada manualmente pelo cliente do ERP.",
        ativo: true,
      });
      setCategorias((current) => [...current, categoria].sort((a, b) => a.nome.localeCompare(b.nome)));
      form.setFieldValue("categoria", categoria.id);
      setNovaCategoria("");
      message.success("Categoria criada e selecionada");
    } catch {
      message.error("Erro ao criar categoria");
    } finally {
      setSalvandoCategoria(false);
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
    <Space direction="vertical" size={16} style={pageShellStyle}>
      <div style={heroStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <Title level={2} style={{ margin: 0, color: "#0F172A", fontWeight: 900 }}>Cadastro de itens</Title>
            <Text style={{ color: "#64748B" }}>
              Produtos, materiais, peças, formação de preço, estoque mínimo e compras sob demanda.
            </Text>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={carregar} style={{ borderRadius: 8 }}>Atualizar</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo} style={btnPrimary}>Cadastrar item</Button>
          </Space>
        </div>
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
          <Card title="Itens cadastrados" bodyStyle={{ padding: 0 }} style={{ borderRadius: 12 }}>
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
          <Card title="Últimas entradas e saídas" style={{ borderRadius: 12 }}>
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
        title={null}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={980}
        bodyStyle={{ background: "#F8FAFC", padding: 24 }}
        extra={<Button type="primary" onClick={salvarProduto} loading={saving} style={btnPrimary}>Salvar item</Button>}
      >
        <div style={drawerHeaderStyle}>
          <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
            <div>
              <Title level={3} style={{ margin: 0, color: "#0F172A", fontWeight: 900 }}>
                {editing ? "Editar item do estoque" : "Novo item do estoque"}
              </Title>
              <Text style={{ color: "#64748B" }}>
                Cadastre materiais e peças com preço, estoque, localização e regras de reposição.
              </Text>
            </div>
            <Tag color={tipoSuprimentoAtual === "futuro" ? "purple" : "blue"} style={{ borderRadius: 999, padding: "4px 12px", fontWeight: 700 }}>
              {tipoSuprimentoAtual === "futuro" ? "Sob compra" : "Estoque"}
            </Tag>
          </Space>
        </div>

        <Form form={form} layout="vertical">
          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} lg={16}>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div style={formPanelStyle}>
                  <Text strong style={{ display: "block", color: "#0F172A", marginBottom: 14 }}>
                    Identificação do item
                  </Text>
                  <Row gutter={12}>
                    <Col xs={24} md={16}>
                      <Form.Item name="nome" label="Nome do item" rules={[{ required: true, message: "Informe o produto" }]}>
                        <Input placeholder="Ex.: Capacitor 35+5 uF, bomba de dreno, cabo PP 3x2,5mm" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="unidade_medida" label="Unidade">
                        <Select options={unidades} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="categoria" label="Categoria">
                        <Select
                          allowClear
                          showSearch
                          placeholder="Selecione ou cadastre"
                          optionFilterProp="label"
                          options={categorias.map((c) => ({ value: c.id, label: c.nome }))}
                          dropdownRender={(menu) => (
                            <>
                              {menu}
                              <div style={{ borderTop: "1px solid #E5E7EB", display: "flex", gap: 8, padding: 8 }}>
                                <Input
                                  placeholder="Nova categoria"
                                  value={novaCategoria}
                                  onChange={(event) => setNovaCategoria(event.target.value)}
                                  onPressEnter={cadastrarCategoria}
                                />
                                <Button type="primary" loading={salvandoCategoria} onClick={cadastrarCategoria} style={btnPrimary}>
                                  Criar
                                </Button>
                              </div>
                            </>
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="ativo" label="Status" valuePropName="checked" initialValue>
                        <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="descricao" label="Descrição técnica / comercial">
                        <Input.TextArea rows={4} placeholder="Detalhe aplicação, compatibilidade, observações técnicas e quando usar este item em orçamento." />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div style={formPanelStyle}>
                  <Text strong style={{ display: "block", color: "#0F172A", marginBottom: 14 }}>
                    Suprimento
                  </Text>
                  <Form.Item name="tipo_suprimento" style={{ marginBottom: 0 }}>
                    <Row gutter={12}>
                      <Col xs={24} md={12}>
                        <button
                          type="button"
                          style={supplyCardStyle(tipoSuprimentoAtual === "estoque", "#3B82F6")}
                          onClick={() => form.setFieldValue("tipo_suprimento", "estoque")}
                        >
                          <Space align="start">
                            <StockOutlined style={{ color: "#3B82F6", fontSize: 22, marginTop: 2 }} />
                            <div>
                              <Text strong style={{ color: "#0F172A" }}>Alocado no estoque</Text>
                              <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                                Controla saldo, mínimo, localização e entrada inicial.
                              </div>
                            </div>
                          </Space>
                        </button>
                      </Col>
                      <Col xs={24} md={12}>
                        <button
                          type="button"
                          style={supplyCardStyle(tipoSuprimentoAtual === "futuro", "#8B5CF6")}
                          onClick={() => form.setFieldValue("tipo_suprimento", "futuro")}
                        >
                          <Space align="start">
                            <ShoppingOutlined style={{ color: "#8B5CF6", fontSize: 22, marginTop: 2 }} />
                            <div>
                              <Text strong style={{ color: "#0F172A" }}>Sob compra</Text>
                              <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                                Item usado no orçamento e comprado após aprovação.
                              </div>
                            </div>
                          </Space>
                        </button>
                      </Col>
                    </Row>
                  </Form.Item>
                </div>

                <div style={formPanelStyle}>
                  <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 14 }}>
                    <Text strong style={{ color: "#0F172A" }}>
                      Formação de preço
                    </Text>
                    <CalculatorOutlined style={{ color: "#3B82F6", fontSize: 20 }} />
                  </Space>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item name="preco_custo" label="Preço de compra" rules={[{ required: true, message: "Informe o custo" }]}>
                        <InputNumber min={0} step={0.01} style={{ width: "100%" }} prefix="R$" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="markup_percentual" label="Markup (%)">
                        <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="aliquota_impostos_percentual" label="Impostos (%)">
                        <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="despesas_operacionais_percentual" label="Despesas (%)">
                        <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="preco_manual" label="Preço manual" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="preco_venda" label="Preço de venda">
                        <InputNumber
                          disabled={!formValues.preco_manual}
                          min={0}
                          step={0.01}
                          style={{ width: "100%" }}
                          prefix="R$"
                          placeholder={money(precoSugerido)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Alert
                    type="info"
                    showIcon
                    message={`Preço sugerido: ${money(precoSugerido)}`}
                    description={`Custo ${money(formValues.preco_custo)} + composição ${Number((formValues.markup_percentual || 0) + (formValues.aliquota_impostos_percentual || 0) + (formValues.despesas_operacionais_percentual || 0)).toFixed(2)}%.`}
                    style={{ borderRadius: 10 }}
                  />
                </div>

                <div style={formPanelStyle}>
                  <Text strong style={{ display: "block", color: "#0F172A", marginBottom: 14 }}>
                    Estoque e localização
                  </Text>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item name="estoque_minimo" label="Estoque mínimo">
                        <InputNumber min={0} step={1} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    {!editing && (
                      <Col xs={24} md={8}>
                        <Form.Item name="estoque_inicial" label="Entrada inicial">
                          <InputNumber min={0} step={1} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                    )}
                    <Col xs={24} md={editing ? 16 : 8}>
                      <Form.Item name="localizacao" label="Localização">
                        <Input placeholder="Ex.: Prateleira A3, veículo técnico, almoxarifado central" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              </Space>
            </Col>

            <Col xs={24} lg={8}>
              <div style={previewPanelStyle}>
                <Text style={{ color: "#CBD5E1", fontSize: 12, textTransform: "uppercase", fontWeight: 800 }}>
                  Prévia comercial
                </Text>
                <Title level={4} style={{ color: "#FFFFFF", marginTop: 8, marginBottom: 4 }}>
                  {formValues.nome || "Item sem nome"}
                </Title>
                <Text style={{ color: "#94A3B8" }}>
                  {categorias.find((categoria) => categoria.id === formValues.categoria)?.nome || "Sem categoria"}
                </Text>

                <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
                    <Text style={{ color: "#CBD5E1" }}>Preço de venda</Text>
                    <div style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                      {money(precoVendaFinal)}
                    </div>
                  </div>
                  <Row gutter={12}>
                    <Col span={12}>
                      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 }}>
                        <Text style={{ color: "#CBD5E1" }}>Custo</Text>
                        <div style={{ color: "#FFFFFF", fontWeight: 800, marginTop: 4 }}>
                          {money(formValues.preco_custo)}
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 }}>
                        <Text style={{ color: "#CBD5E1" }}>Margem</Text>
                        <div style={{ color: "#10B981", fontWeight: 900, marginTop: 4 }}>
                          {margemEstimada.toFixed(1)}%
                        </div>
                      </div>
                    </Col>
                  </Row>
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
                    <Text style={{ color: "#CBD5E1" }}>Operação</Text>
                    <div style={{ color: "#FFFFFF", fontWeight: 800, marginTop: 4 }}>
                      {tipoSuprimentoAtual === "futuro" ? "Compra sob demanda" : "Controle em estoque"}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
                      Mínimo: {Number(formValues.estoque_minimo || 0)} {formValues.unidade_medida || "un"}
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </Space>
  );
}
