import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import servicoService from "../../services/servicoService";

const { Text, Title } = Typography;

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

const btnStyle = {
  fontWeight: 600,
  height: 40,
  borderRadius: 10,
};

function SummaryCard({ color, icon, label, value }) {
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

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const categoriasOpcoes = [
  { label: "HVAC", value: "hvac" },
  { label: "Refrigeração", value: "refrigeracao" },
  { label: "Elétrica", value: "eletrica" },
  { label: "Civil", value: "civil" },
  { label: "Manutenção", value: "manutencao" },
  { label: "Instalação", value: "instalacao" },
];

const tributacaoOpcoes = [
  { label: "ISS", value: "iss" },
  { label: "ICMS", value: "icms" },
  { label: "PIS/COFINS", value: "pis_cofins" },
];

const unidadeMedidaOpcoes = [
  { label: "Hora", value: "hora" },
  { label: "Dia", value: "dia" },
  { label: "Unitário", value: "uni" },
  { label: "Lote", value: "lote" },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function ServicosPage() {
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState([]);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [form] = Form.useForm();
  const [filtros, setFiltros] = useState({
    busca: "",
    categoria: undefined,
    tributacao: undefined,
  });

  useEffect(() => {
    carregarServicos();
  }, [filtros]);

  const carregarServicos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtros.busca) params.search = filtros.busca;
      if (filtros.categoria) params.categoria = filtros.categoria;
      if (filtros.tributacao) params.tributacao = filtros.tributacao;

      const data = await servicoService.listar(params);
      setServicos(normalizeList(data));
    } catch {
      setServicos([]);
      message.error("Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  };

  const resumo = useMemo(() => {
    return {
      total: servicos.length,
      ativos: servicos.filter((s) => s.ativo).length,
      porCategoria: categoriasOpcoes.reduce((acc, cat) => {
        acc[cat.value] = servicos.filter((s) => s.categoria === cat.value).length;
        return acc;
      }, {}),
    };
  }, [servicos]);

  const abrirDrawer = (servico = null) => {
    if (servico) {
      setServicoSelecionado(servico);
      form.setFieldsValue(servico);
    } else {
      setServicoSelecionado(null);
      form.resetFields();
    }
    setDrawerAberto(true);
  };

  const salvarServico = async (values) => {
    setSalvando(true);
    try {
      if (servicoSelecionado) {
        await servicoService.atualizar(servicoSelecionado.id, values);
        message.success("Serviço atualizado com sucesso!");
      } else {
        await servicoService.criar(values);
        message.success("Serviço criado com sucesso!");
      }
      setDrawerAberto(false);
      setServicoSelecionado(null);
      form.resetFields();
      carregarServicos();
    } catch {
      message.error("Erro ao salvar serviço");
    } finally {
      setSalvando(false);
    }
  };

  const deletarServico = async (id) => {
    try {
      await servicoService.deletar(id);
      message.success("Serviço deletado com sucesso!");
      carregarServicos();
    } catch {
      message.error("Erro ao deletar serviço");
    }
  };

  const colunas = [
    {
      title: "Código",
      dataIndex: "codigo",
      width: 120,
      render: (text) => <Text strong style={{ color: colors.texto }}>{text}</Text>,
    },
    {
      title: "Nome",
      dataIndex: "nome",
      render: (text) => <Text style={{ color: colors.texto }}>{text}</Text>,
    },
    {
      title: "Categoria",
      dataIndex: "categoria",
      width: 130,
      render: (text) => {
        const cat = categoriasOpcoes.find((c) => c.value === text);
        return <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>{cat?.label || text}</Tag>;
      },
    },
    {
      title: "Preço",
      dataIndex: "preco_padrao",
      width: 130,
      align: "right",
      render: (text) => <Text strong style={{ color: colors.verde }}>{moneyFormatter.format(text)}</Text>,
    },
    {
      title: "Tributação",
      dataIndex: "tributacao",
      width: 120,
      render: (text) => {
        const trib = tributacaoOpcoes.find((t) => t.value === text);
        return <Tag color="orange" style={{ borderRadius: 6, fontWeight: 600 }}>{trib?.label || text}</Tag>;
      },
    },
    {
      title: "Unidade",
      dataIndex: "unidade_medida",
      width: 100,
      render: (text) => {
        const uni = unidadeMedidaOpcoes.find((u) => u.value === text);
        return <Text style={{ color: colors.textoFraco }}>{uni?.label || text}</Text>;
      },
    },
    {
      title: "Status",
      dataIndex: "ativo",
      width: 100,
      render: (ativo) => (
        <Badge
          status={ativo ? "success" : "error"}
          text={ativo ? "Ativo" : "Inativo"}
        />
      ),
    },
    {
      title: "Ações",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => abrirDrawer(record)}
              style={{ color: colors.azul }}
            />
          </Tooltip>
          <Tooltip title="Deletar">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => deletarServico(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: "#F8FAFC",
            headerColor: "#6B7280",
            rowHoverBg: "#F3F6FA",
          },
        },
      }}
    >
      <div style={pageStyle}>
        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
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
                <ToolOutlined />
              </div>
              <div>
                <Title level={1} style={{ margin: 0, fontSize: 26, fontWeight: 800, color: colors.texto }}>
                  Serviços
                </Title>
                <Text style={{ color: colors.textoSecundario }}>
                  Catálogo de serviços, preços e regras de tributação
                </Text>
              </div>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => abrirDrawer()}
              style={btnStyle}
            >
              Novo Serviço
            </Button>
          </div>
        </Card>

        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} lg={6}>
            <SummaryCard color={colors.azul} icon={<FileTextOutlined />} label="Total de serviços" value={resumo.total} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <SummaryCard color={colors.verde} icon={<CheckCircleOutlined />} label="Ativos" value={resumo.ativos} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <SummaryCard color={colors.laranja} icon={<ToolOutlined />} label="HVAC" value={resumo.porCategoria.hvac || 0} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <SummaryCard
              color={colors.roxo}
              icon={<FileTextOutlined />}
              label="Outras categorias"
              value={resumo.total - (resumo.porCategoria.hvac || 0)}
            />
          </Col>
        </Row>

        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} lg={10}>
                <Input
                  allowClear
                  prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                  placeholder="Buscar por código ou nome"
                  value={filtros.busca}
                  onChange={(e) =>
                    setFiltros((f) => ({ ...f, busca: e.target.value }))
                  }
                  style={{ borderRadius: 8, height: 40 }}
                />
              </Col>
              <Col xs={24} sm={12} lg={5}>
                <Select
                  allowClear
                  placeholder="Categoria"
                  options={categoriasOpcoes}
                  value={filtros.categoria}
                  onChange={(value) =>
                    setFiltros((f) => ({ ...f, categoria: value }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} lg={5}>
                <Select
                  allowClear
                  placeholder="Tributação"
                  options={tributacaoOpcoes}
                  value={filtros.tributacao}
                  onChange={(value) =>
                    setFiltros((f) => ({ ...f, tributacao: value }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} lg={4}>
                <Button
                  onClick={() => setFiltros({ busca: "", categoria: undefined, tributacao: undefined })}
                  style={{ borderRadius: 8, fontWeight: 700, width: "100%" }}
                >
                  Limpar
                </Button>
              </Col>
            </Row>

            <Table
              columns={colunas}
              dataSource={servicos}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 20 }}
              locale={{
                emptyText: (
                  <Empty description="Nenhum serviço encontrado" style={{ margin: "44px 0" }}>
                    <Button type="primary" onClick={() => abrirDrawer()} style={btnStyle}>
                      Criar primeiro serviço
                    </Button>
                  </Empty>
                ),
              }}
            />
          </Space>
        </Card>
      </div>

      <Drawer
        title={servicoSelecionado ? "Editar Serviço" : "Novo Serviço"}
        placement="right"
        onClose={() => setDrawerAberto(false)}
        open={drawerAberto}
        width={480}
      >
        <Spin spinning={salvando}>
          <Form form={form} layout="vertical" onFinish={salvarServico}>
            <Form.Item
              label="Nome"
              name="nome"
              rules={[{ required: true, message: "Nome é obrigatório" }]}
            >
              <Input placeholder="Nome do serviço" />
            </Form.Item>

            <Form.Item label="Descrição" name="descricao">
              <Input.TextArea rows={3} placeholder="Descrição detalhada" />
            </Form.Item>

            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Categoria"
                  name="categoria"
                  rules={[{ required: true, message: "Selecione a categoria" }]}
                >
                  <Select placeholder="Selecione" options={categoriasOpcoes} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Unidade"
                  name="unidade_medida"
                  initialValue="uni"
                >
                  <Select options={unidadeMedidaOpcoes} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Preço Padrão (R$)"
                  name="preco_padrao"
                  rules={[{ required: true, message: "Preço é obrigatório" }]}
                >
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Tributação"
                  name="tributacao"
                  initialValue="iss"
                >
                  <Select options={tributacaoOpcoes} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Código LC 116 (ISS)" name="codigo_lc116">
              <Input placeholder="Ex: 01.00" />
            </Form.Item>

            <Form.Item name="ativo" valuePropName="checked" initialValue={true}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" />
                <span>Ativo</span>
              </div>
            </Form.Item>

            <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 24 }}>
              <Button onClick={() => setDrawerAberto(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" style={btnStyle} loading={salvando}>
                {servicoSelecionado ? "Atualizar" : "Criar"} Serviço
              </Button>
            </Space>
          </Form>
        </Spin>
      </Drawer>
    </ConfigProvider>
  );
}
