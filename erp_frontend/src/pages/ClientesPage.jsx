import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  Divider,
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
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import clienteService from "../services/clienteService";

const { Text, Title } = Typography;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: 24,
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const btnStyle = {
  background: "#1B4F8A",
  borderColor: "#1B4F8A",
  color: "#ffffff",
  fontWeight: 500,
  height: "38px",
  borderRadius: "8px",
};

const maskCNPJ = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
};

const maskPhone = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 15);
};

const maskCEP = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 9);
};

const segmentOptions = [
  { label: "Indústria", value: "industria" },
  { label: "Comércio", value: "comercio" },
  { label: "Residencial", value: "residencial" },
  { label: "Condomínio", value: "condominio" },
  { label: "Serviços", value: "servicos" },
  { label: "Governo", value: "governo" },
];

const statusOptions = [
  { label: "Ativo", value: "ativo" },
  { label: "Inativo", value: "inativo" },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function ClientesPage() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [form] = Form.useForm();
  const [consultandoCNPJ, setConsultandoCNPJ] = useState(false);
  const [cnpjValido, setCnpjValido] = useState(false);
  const [cnpjErro, setCnpjErro] = useState(false);

  const [filtros, setFiltros] = useState({
    busca: "",
    segmento: undefined,
    status: undefined,
  });

  useEffect(() => {
    carregarClientes();
  }, [filtros]);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtros.busca) params.search = filtros.busca;
      if (filtros.segmento) params.segmento = filtros.segmento;
      if (filtros.status) params.status = filtros.status;

      const data = await clienteService.listar(params);
      setClientes(normalizeList(data));
    } catch {
      setClientes([]);
      message.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const resumo = useMemo(() => {
    return {
      total: clientes.length,
      ativos: clientes.filter((c) => c.status === "ativo").length,
      porSegmento: segmentOptions.reduce((acc, seg) => {
        acc[seg.value] = clientes.filter((c) => c.segmento === seg.value).length;
        return acc;
      }, {}),
    };
  }, [clientes]);

  const consultarCNPJ = async () => {
    const cnpj = form.getFieldValue("cnpj");
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      message.warning("CNPJ deve ter 14 dígitos");
      return;
    }

    setConsultandoCNPJ(true);
    setCnpjValido(false);
    setCnpjErro(false);

    try {
      const response = await clienteService.consultarCNPJ(cnpjLimpo);
      const data = response;

      form.setFieldsValue({
        razao_social: data.razao_social || "",
      });
      setCnpjValido(true);
      message.success("CNPJ consultado com sucesso!");
    } catch {
      setCnpjErro(true);
      message.error("CNPJ não encontrado");
    } finally {
      setConsultandoCNPJ(false);
    }
  };

  const consultarCEP = async (cepValue) => {
    const cepLimpo = cepValue.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        form.setFieldsValue({
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: data.uf || "",
        });
      } else {
        message.error("CEP não encontrado");
      }
    } catch {
      message.error("Erro ao consultar CEP");
    }
  };

  const abrirDrawer = (cliente = null) => {
    if (cliente) {
      setClienteSelecionado(cliente);
      form.setFieldsValue(cliente);
    } else {
      setClienteSelecionado(null);
      form.resetFields();
      setCnpjValido(false);
      setCnpjErro(false);
    }
    setDrawerAberto(true);
  };

  const salvarCliente = async (values) => {
    setSalvando(true);
    try {
      if (clienteSelecionado) {
        await clienteService.atualizar(clienteSelecionado.id, values);
        message.success("Cliente atualizado com sucesso!");
      } else {
        await clienteService.criar(values);
        message.success("Cliente criado com sucesso!");
      }
      setDrawerAberto(false);
      setClienteSelecionado(null);
      form.resetFields();
      carregarClientes();
    } catch {
      message.error("Erro ao salvar cliente");
    } finally {
      setSalvando(false);
    }
  };

  const deletarCliente = async (id) => {
    try {
      await clienteService.deletar(id);
      message.success("Cliente deletado com sucesso!");
      carregarClientes();
    } catch {
      message.error("Erro ao deletar cliente");
    }
  };

  const colunas = [
    {
      title: "Nome",
      dataIndex: "nome",
      render: (text, record) => (
        <div>
          <Text strong>{text || record.nome_fantasia}</Text>
          <div style={{ color: "#6B7280", fontSize: 12 }}>{record.cnpj_cpf}</div>
        </div>
      ),
    },
    {
      title: "Telefone",
      dataIndex: "telefone",
      render: (text) => <Text>{text || "-"}</Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (text) => <Text>{text || "-"}</Text>,
    },
    {
      title: "Cidade",
      dataIndex: "cidade",
      render: (text) => <Text>{text || "-"}</Text>,
    },
    {
      title: "Segmento",
      dataIndex: "segmento",
      render: (text) => {
        const seg = segmentOptions.find((s) => s.value === text);
        return <Tag color="blue">{seg?.label || text || "-"}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status) => (
        <Badge
          status={status === "ativo" ? "success" : "error"}
          text={status === "ativo" ? "Ativo" : "Inativo"}
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
              style={{ color: "#1B4F8A" }}
            />
          </Tooltip>
          <Tooltip title="Deletar">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => deletarCliente(record.id)}
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
        <div style={{ marginBottom: 24 }}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Title level={1} style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
                Clientes
              </Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => abrirDrawer()}
                style={btnStyle}
              >
                Novo Cliente
              </Button>
            </div>
          </Card>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              style={panelStyle}
              bodyStyle={{ padding: 16 }}
            >
              <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
                TOTAL DE CLIENTES
              </Text>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1B4F8A", marginTop: 8 }}>
                {resumo.total}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              style={panelStyle}
              bodyStyle={{ padding: 16 }}
            >
              <Text style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
                ATIVOS
              </Text>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#15803D", marginTop: 8 }}>
                {resumo.ativos}
              </div>
            </Card>
          </Col>
        </Row>

        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} lg={10}>
                <Input
                  allowClear
                  prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                  placeholder="Buscar por nome ou CNPJ"
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
                  placeholder="Segmento"
                  options={segmentOptions}
                  value={filtros.segmento}
                  onChange={(value) =>
                    setFiltros((f) => ({ ...f, segmento: value }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} lg={5}>
                <Select
                  allowClear
                  placeholder="Status"
                  options={statusOptions}
                  value={filtros.status}
                  onChange={(value) =>
                    setFiltros((f) => ({ ...f, status: value }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} lg={4}>
                <Button
                  onClick={() =>
                    setFiltros({ busca: "", segmento: undefined, status: undefined })
                  }
                  style={{ borderRadius: 8, fontWeight: 700, width: "100%" }}
                >
                  Limpar
                </Button>
              </Col>
            </Row>

            <Table
              columns={colunas}
              dataSource={clientes}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
              locale={{
                emptyText: (
                  <Empty description="Nenhum cliente encontrado" style={{ margin: "44px 0" }}>
                    <Button type="primary" onClick={() => abrirDrawer()} style={btnStyle}>
                      Criar primeiro cliente
                    </Button>
                  </Empty>
                ),
              }}
            />
          </Space>
        </Card>
      </div>

      <Drawer
        title={clienteSelecionado ? "Editar Cliente" : "Novo Cliente"}
        placement="right"
        onClose={() => setDrawerAberto(false)}
        open={drawerAberto}
        width={480}
      >
        <Spin spinning={salvando}>
          <Form form={form} layout="vertical" onFinish={salvarCliente}>
            <div
              style={{
                background: "#EBF2FB",
                border: "1px solid #BFDBFE",
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Text strong style={{ display: "block", marginBottom: 12 }}>
                CNPJ da empresa
              </Text>

              {consultandoCNPJ ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <Spin tip="Consultando Receita Federal..." />
                </div>
              ) : (
                <>
                  <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col flex={1}>
                      <Form.Item name="cnpj_cpf" style={{ marginBottom: 0 }}>
                        <Input
                          placeholder="XX.XXX.XXX/XXXX-XX"
                          onChange={(e) => {
                            const masked = maskCNPJ(e.target.value);
                            form.setFieldValue("cnpj_cpf", masked);
                          }}
                          maxLength={18}
                        />
                      </Form.Item>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        onClick={consultarCNPJ}
                        style={btnStyle}
                      >
                        Consultar
                      </Button>
                    </Col>
                  </Row>

                  {cnpjValido && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircleOutlined style={{ color: "#22c55e", fontSize: 16 }} />
                      <span style={{ color: "#22c55e" }}>CNPJ válido</span>
                    </div>
                  )}

                  {cnpjErro && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CloseCircleOutlined style={{ color: "#ef4444", fontSize: 16 }} />
                      <span style={{ color: "#ef4444" }}>CNPJ não encontrado</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <Text strong style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 12 }}>
              IDENTIFICAÇÃO
            </Text>

            <Form.Item
              label="Nome Fantasia"
              name="nome_fantasia"
              rules={[{ required: true, message: "Nome fantasia é obrigatório" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Razão Social" name="razao_social">
              <Input disabled style={{ background: "#F4F6F9" }} />
            </Form.Item>

            <Form.Item label="Segmento" name="segmento">
              <Select placeholder="Selecione" options={segmentOptions} allowClear />
            </Form.Item>

            <Divider />

            <Text strong style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 12 }}>
              CONTATO
            </Text>

            <Form.Item label="Email" name="email">
              <Input type="email" placeholder="email@empresa.com" />
            </Form.Item>

            <Form.Item label="Telefone" name="telefone">
              <Input
                placeholder="(XX) XXXXX-XXXX"
                onChange={(e) => {
                  form.setFieldValue("telefone", maskPhone(e.target.value));
                }}
                maxLength={15}
              />
            </Form.Item>

            <Form.Item label="WhatsApp" name="whatsapp">
              <Input
                placeholder="(XX) XXXXX-XXXX"
                onChange={(e) => {
                  form.setFieldValue("whatsapp", maskPhone(e.target.value));
                }}
                maxLength={15}
              />
            </Form.Item>

            <Divider />

            <Text strong style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 12 }}>
              ENDEREÇO
            </Text>

            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col flex={1}>
                <Form.Item label="CEP" name="cep" style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="XXXXX-XXX"
                    onChange={(e) => {
                      const masked = maskCEP(e.target.value);
                      form.setFieldValue("cep", masked);
                    }}
                    maxLength={9}
                  />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item label=" " style={{ marginBottom: 0 }}>
                  <Button
                    onClick={() => {
                      const cep = form.getFieldValue("cep");
                      if (cep) consultarCEP(cep);
                    }}
                    disabled={
                      !form.getFieldValue("cep") ||
                      form.getFieldValue("cep").replace(/\D/g, "").length !== 8
                    }
                  >
                    Buscar
                  </Button>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Logradouro" name="logradouro">
              <Input />
            </Form.Item>

            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item label="Número" name="numero">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Complemento" name="complemento">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Bairro" name="bairro">
              <Input />
            </Form.Item>

            <Row gutter={12}>
              <Col xs={24} sm={16}>
                <Form.Item label="Cidade" name="cidade">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="UF" name="uf">
                  <Input maxLength={2} />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Form.Item name="status" valuePropName="checked" initialValue="ativo">
              <Checkbox>Ativo</Checkbox>
            </Form.Item>

            <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 24 }}>
              <Button onClick={() => setDrawerAberto(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" style={btnStyle} loading={salvando}>
                {clienteSelecionado ? "Atualizar" : "Criar"} Cliente
              </Button>
            </Space>
          </Form>
        </Spin>
      </Drawer>
    </ConfigProvider>
  );
}
