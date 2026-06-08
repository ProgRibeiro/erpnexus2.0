import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  InboxOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { moneyFormatter, normalizeList, pageStyle, panelStyle } from "./shared";

const { Dragger } = Upload;
const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

function buildFormData(values, files) {
  const formData = new FormData();
  formData.append("cliente", values.cliente || "");
  formData.append("descricao", values.descricao || "");
  formData.append("email_texto", values.email_texto || "");
  formData.append("observacoes_foto", values.observacoes_foto || "");
  files.forEach((file) => {
    formData.append("fotos", file.originFileObj || file);
  });
  return formData;
}

function formatTipo(tipo) {
  const map = {
    hvac: "HVAC",
    refrigeracao: "Refrigeração",
    eletrica: "Elétrica",
    civil: "Civil",
    manutencao: "Manutenção",
    instalacao: "Instalação",
    outro: "Outro",
  };
  return map[tipo] || tipo || "-";
}

export default function OrcamentoInteligente() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [sugestao, setSugestao] = useState(null);

  useEffect(() => {
    buscarClientes("");
  }, []);

  async function buscarClientes(search) {
    try {
      setClientesLoading(true);
      const response = await api.get("/clientes/", { params: search ? { search } : {} });
      setClientes(normalizeList(response.data));
    } catch {
      setClientes([]);
    } finally {
      setClientesLoading(false);
    }
  }

  async function analisar() {
    try {
      const values = await form.validateFields();
      setAnalisando(true);
      const response = await api.post("/ordens/motor-orcamento/analisar/", buildFormData(values, files), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSugestao(response.data);
      message.success("Sugestão gerada.");
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.detail || "Não foi possível analisar a entrada.");
    } finally {
      setAnalisando(false);
    }
  }

  async function criarOrcamento() {
    try {
      const values = await form.validateFields();
      setCriando(true);
      const response = await api.post("/ordens/motor-orcamento/criar/", buildFormData(values, files), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("Orçamento rascunho criado.");
      navigate(`/orcamentos/${response.data?.ordem?.id}`);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.detail || "Não foi possível criar o orçamento.");
    } finally {
      setCriando(false);
    }
  }

  const clienteOptions = useMemo(
    () =>
      clientes.map((cliente) => ({
        label: cliente.nome || cliente.razao_social || `Cliente #${cliente.id}`,
        value: cliente.id,
      })),
    [clientes],
  );

  const columns = [
    {
      title: "Origem",
      dataIndex: "origem_tipo",
      width: 110,
      render: (value) => {
        const color = value === "produto" ? "blue" : value === "servico" ? "green" : "default";
        return <Tag color={color}>{value === "produto" ? "Produto" : value === "servico" ? "Serviço" : "Avulso"}</Tag>;
      },
    },
    {
      title: "Descrição",
      dataIndex: "descricao",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          {record.motivo_sugestao && (
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>{record.motivo_sugestao}</div>
          )}
        </div>
      ),
    },
    {
      title: "Qtd",
      dataIndex: "quantidade",
      align: "right",
      width: 90,
      render: (value) => Number(value || 0).toLocaleString("pt-BR"),
    },
    {
      title: "Unitário",
      dataIndex: "valor_unitario",
      align: "right",
      width: 130,
      render: (value) => moneyFormatter.format(Number(value || 0)),
    },
    {
      title: "Total",
      align: "right",
      width: 130,
      render: (_, record) => moneyFormatter.format(Number(record.quantidade || 0) * Number(record.valor_unitario || 0)),
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/orcamentos")} />
          <div>
            <Title level={1} style={{ margin: 0, fontSize: 24, color: "#1E293B" }}>
              Orçamento Inteligente
            </Title>
            <Text style={{ color: "#6B7280" }}>Motor local integrado a clientes, serviços, estoque e financeiro</Text>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={criando}
          disabled={!sugestao}
          onClick={criarOrcamento}
          style={{ background: "#3B82F6", borderRadius: 8, fontWeight: 700 }}
        >
          Criar orçamento
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card bordered={false} style={panelStyle} title="Entrada">
            <Form form={form} layout="vertical">
              <Form.Item name="cliente" label="Cliente" rules={[{ required: true, message: "Selecione um cliente." }]}>
                <Select
                  showSearch
                  allowClear
                  filterOption={false}
                  loading={clientesLoading}
                  options={clienteOptions}
                  placeholder="Selecione o cliente"
                  onSearch={buscarClientes}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                name="descricao"
                label="Descrição do pedido"
                rules={[{ required: true, message: "Informe uma descrição para o motor trabalhar." }]}
              >
                <TextArea rows={5} placeholder="Ex.: limpeza de 2 splits, um deles com vazamento no dreno" />
              </Form.Item>

              <Form.Item name="email_texto" label="Texto do e-mail">
                <TextArea rows={5} placeholder="Cole aqui o e-mail do cliente" />
              </Form.Item>

              <Form.Item name="observacoes_foto" label="Observações da foto">
                <TextArea rows={3} placeholder="Ex.: condensadora oxidada, evaporadora pingando, quadro com disjuntor desarmado" />
              </Form.Item>

              <Dragger
                multiple
                accept="image/*"
                fileList={files}
                beforeUpload={() => false}
                onChange={({ fileList }) => setFiles(fileList)}
                style={{ borderRadius: 10 }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Fotos do chamado</p>
              </Dragger>

              <Button
                block
                type="primary"
                icon={<FileSearchOutlined />}
                loading={analisando}
                onClick={analisar}
                style={{ background: "#3B82F6", borderRadius: 8, fontWeight: 700, marginTop: 16 }}
              >
                Analisar e sugerir
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card bordered={false} style={panelStyle} title="Sugestão">
            {!sugestao ? (
              <div style={{ padding: "44px 12px", textAlign: "center", color: "#6B7280" }}>
                <ThunderboltOutlined style={{ color: "#3B82F6", fontSize: 34, marginBottom: 12 }} />
                <Paragraph style={{ margin: 0 }}>Preencha os dados e gere uma sugestão.</Paragraph>
              </div>
            ) : (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={8}>
                    <Card size="small" bordered style={{ borderRadius: 10 }}>
                      <Text type="secondary">Tipo</Text>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{formatTipo(sugestao.tipo_servico)}</div>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card size="small" bordered style={{ borderRadius: 10 }}>
                      <Text type="secondary">Subtotal</Text>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{moneyFormatter.format(Number(sugestao.subtotal || 0))}</div>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card size="small" bordered style={{ borderRadius: 10 }}>
                      <Text type="secondary">Confiança</Text>
                      <Progress percent={Number(sugestao.confianca || 0)} size="small" strokeColor="#3B82F6" />
                    </Card>
                  </Col>
                </Row>

                <Alert
                  type="info"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message={sugestao.descricao_servico}
                  description="O orçamento será criado como rascunho para revisão antes do envio ao cliente."
                />

                {sugestao.avisos?.map((aviso) => (
                  <Alert key={aviso} type="warning" showIcon message={aviso} />
                ))}

                <Table
                  columns={columns}
                  dataSource={sugestao.itens || []}
                  rowKey={(record, index) => `${record.origem_tipo}-${record.codigo_referencia}-${index}`}
                  pagination={false}
                  scroll={{ x: 760 }}
                />
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
