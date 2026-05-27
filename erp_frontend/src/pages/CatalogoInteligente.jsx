import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  InboxOutlined,
  MessageOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

const { Dragger } = Upload;
const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: 24,
};

const panelStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function buildFormData(values, files) {
  const formData = new FormData();
  formData.append("texto", values.texto || "");
  formData.append("markup_padrao", values.markup_padrao ?? "");
  formData.append("despesas_padrao", values.despesas_padrao ?? "");
  if (files[0]) formData.append("arquivo", files[0].originFileObj || files[0]);
  return formData;
}

export default function CatalogoInteligentePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [files, setFiles] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [ensinando, setEnsinando] = useState(false);
  const [mensagemMotor, setMensagemMotor] = useState("");
  const [respostaMotor, setRespostaMotor] = useState(null);
  const [memorias, setMemorias] = useState([]);
  const [dashboardMemoria, setDashboardMemoria] = useState(null);
  const [carregandoMemoria, setCarregandoMemoria] = useState(false);
  const [aprendendoOS, setAprendendoOS] = useState(false);
  const [resultado, setResultado] = useState(null);

  const itens = resultado?.itens || [];
  const resumo = resultado?.resumo || {};

  const totais = useMemo(() => {
    return {
      produtos: itens.filter((item) => item.tipo === "produto").length,
      servicos: itens.filter((item) => item.tipo === "servico").length,
      valor: itens.reduce((sum, item) => sum + Number(item.preco_venda || 0), 0),
    };
  }, [itens]);

  useEffect(() => {
    carregarMemoria();
  }, []);

  function normalizarLista(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  }

  async function carregarMemoria() {
    setCarregandoMemoria(true);
    try {
      const [listaResponse, dashboardResponse] = await Promise.all([
        api.get("/estoque/motor-inteligencia/", { params: { ordering: "-atualizado_em" } }),
        api.get("/estoque/motor-inteligencia/dashboard/"),
      ]);
      setMemorias(normalizarLista(listaResponse.data).slice(0, 8));
      setDashboardMemoria(dashboardResponse.data);
    } catch (error) {
      message.error("Não foi possível carregar a memória do motor.");
    } finally {
      setCarregandoMemoria(false);
    }
  }

  async function aprenderComOS() {
    setAprendendoOS(true);
    try {
      const response = await api.post("/estoque/motor-inteligencia/aprender-os/", { limite: 25 });
      message.success(`Motor aprendeu ${response.data.total || 0} registro(s) das OS concluídas.`);
      carregarMemoria();
    } catch (error) {
      message.error(error?.response?.data?.detail || "Não foi possível aprender com as OS concluídas.");
    } finally {
      setAprendendoOS(false);
    }
  }

  async function revisarMemoria(id, acao) {
    try {
      await api.post(`/estoque/motor-inteligencia/${id}/${acao}/`);
      message.success(acao === "aprovar" ? "Aprendizado aprovado." : "Aprendizado rejeitado.");
      carregarMemoria();
    } catch (error) {
      message.error("Não foi possível revisar o aprendizado.");
    }
  }

  async function analisar() {
    const values = await form.validateFields();
    if (!values.texto && files.length === 0) {
      message.warning("Cole um texto ou envie uma planilha.");
      return;
    }

    setAnalisando(true);
    try {
      const response = await api.post("/estoque/motor-catalogo/analisar/", buildFormData(values, files), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResultado(response.data);
      message.success("Catálogo analisado.");
    } catch (error) {
      message.error(error?.response?.data?.detail || "Não foi possível analisar a lista.");
    } finally {
      setAnalisando(false);
    }
  }

  async function criarItens() {
    if (!itens.length) {
      message.warning("Gere uma prévia antes de criar.");
      return;
    }
    setCriando(true);
    try {
      const response = await api.post("/estoque/motor-catalogo/criar/", { itens });
      const data = response.data;
      message.success(
        `Criado/atualizado: ${data.produtos_criados + data.produtos_atualizados} produto(s) e ${data.servicos_criados + data.servicos_atualizados} serviço(s).`,
      );
      setResultado((current) => ({ ...current, criacao: data }));
    } catch (error) {
      message.error(error?.response?.data?.detail || "Não foi possível criar os itens.");
    } finally {
      setCriando(false);
    }
  }

  async function conversarComMotor() {
    if (!mensagemMotor.trim()) {
      message.warning("Digite uma regra ou pergunta para o motor.");
      return;
    }
    setEnsinando(true);
    try {
      const response = await api.post("/estoque/motor-inteligencia/chat/", {
        mensagem: mensagemMotor,
        contexto: { escopo: "orcamento" },
      });
      setRespostaMotor(response.data);
      setMensagemMotor("");
      message.success(response.data.acao === "aprendido" ? "Motor aprendeu a regra." : "Motor respondeu com a memória atual.");
      carregarMemoria();
    } catch (error) {
      message.error(error?.response?.data?.detail || "Não foi possível conversar com o motor.");
    } finally {
      setEnsinando(false);
    }
  }

  const columns = [
    {
      title: "Tipo",
      dataIndex: "tipo",
      width: 105,
      render: (value) => <Tag color={value === "servico" ? "green" : "blue"}>{value === "servico" ? "Serviço" : "Produto"}</Tag>,
    },
    {
      title: "Nome",
      dataIndex: "nome",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ color: "#6B7280", fontSize: 12 }}>{record.motivo}</div>
        </div>
      ),
    },
    { title: "Categoria", dataIndex: "categoria", width: 160 },
    { title: "Unidade", dataIndex: "unidade_medida", width: 90 },
    {
      title: "Custo",
      dataIndex: "preco_custo",
      align: "right",
      width: 120,
      render: (value) => moneyFormatter.format(Number(value || 0)),
    },
    {
      title: "Venda",
      dataIndex: "preco_venda",
      align: "right",
      width: 120,
      render: (value) => <Text strong>{moneyFormatter.format(Number(value || 0))}</Text>,
    },
    {
      title: "Impostos",
      dataIndex: "aliquota_impostos_percentual",
      align: "right",
      width: 105,
      render: (value) => `${Number(value || 0).toFixed(2)}%`,
    },
    {
      title: "Markup",
      dataIndex: "markup_percentual",
      align: "right",
      width: 100,
      render: (value) => `${Number(value || 0).toFixed(2)}%`,
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div>
          <Title level={1} style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
            Motor de Catálogo
          </Title>
          <Text style={{ color: "#6B7280" }}>Crie produtos e serviços em lote a partir de texto, CSV ou planilha.</Text>
        </div>
        <Space wrap>
          <Button onClick={() => navigate("/estoque")} icon={<DatabaseOutlined />}>Estoque</Button>
          <Button onClick={() => navigate("/servicos")} icon={<CheckCircleOutlined />}>Serviços</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card bordered={false} style={panelStyle} title="Entrada">
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  markup_padrao: 35,
                  despesas_padrao: 8,
                  texto: "Limpeza química de split; tipo: serviço; categoria: hvac; venda: 280\nCapacitor 45uF; tipo: produto; categoria: Ar condicionado / HVAC; custo: 38; markup: 60\nRelé térmico compressor; produto; custo: 72; venda: 145",
                }}
              >
                <Form.Item label="Lista ou texto da IA" name="texto">
                  <TextArea
                    rows={10}
                    placeholder="Cole aqui uma lista. Ex.: Produto; categoria; custo; venda; unidade"
                  />
                </Form.Item>

                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Markup padrão (%)" name="markup_padrao">
                      <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Despesas padrão (%)" name="despesas_padrao">
                      <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Dragger
                  maxCount={1}
                  accept=".xlsx,.xls,.xlsm,.csv,.txt,.tsv"
                  fileList={files}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setFiles(fileList)}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">Planilha, CSV ou TXT</p>
                </Dragger>

                <Button
                  block
                  type="primary"
                  icon={<FileSearchOutlined />}
                  loading={analisando}
                  onClick={analisar}
                  style={{ background: "#3B82F6", borderRadius: 8, fontWeight: 700, marginTop: 16 }}
                >
                  Analisar catálogo
                </Button>
              </Form>
            </Card>

            <Card bordered={false} style={panelStyle} title="Ensinar o motor">
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Text type="secondary">
                  Escreva uma regra. Ex.: Quando o cliente falar split pingando, sugira limpeza de dreno e revisão de bandeja.
                </Text>
                <TextArea
                  rows={4}
                  value={mensagemMotor}
                  onChange={(event) => setMensagemMotor(event.target.value)}
                  placeholder="Quando acontecer X, sugira Y"
                />
                <Button
                  block
                  icon={<MessageOutlined />}
                  loading={ensinando}
                  onClick={conversarComMotor}
                  style={{ borderRadius: 8, fontWeight: 700 }}
                >
                  Enviar para a memória
                </Button>
                {respostaMotor && (
                  <Alert
                    type={respostaMotor.acao === "aprendido" ? "success" : "info"}
                    showIcon
                    message={respostaMotor.resposta}
                  />
                )}
                {(respostaMotor?.sugestoes || []).length > 0 && (
                  <List
                    size="small"
                    dataSource={respostaMotor.sugestoes}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={2}>
                          <Text strong>{item.titulo}</Text>
                          <Text type="secondary">{item.resposta}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            </Card>

            <Card
              bordered={false}
              style={panelStyle}
              title="Memória do ERP"
              extra={
                <Button size="small" icon={<ReloadOutlined />} loading={carregandoMemoria} onClick={carregarMemoria}>
                  Atualizar
                </Button>
              }
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Row gutter={[8, 8]}>
                  <Col span={8}>
                    <Text type="secondary">Ativos</Text>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{dashboardMemoria?.ativos || 0}</div>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Pendentes</Text>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#F59E0B" }}>{dashboardMemoria?.pendentes || 0}</div>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Total</Text>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{dashboardMemoria?.total || 0}</div>
                  </Col>
                </Row>

                <Button block icon={<ThunderboltOutlined />} loading={aprendendoOS} onClick={aprenderComOS}>
                  Aprender com OS concluídas
                </Button>

                {memorias.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem memórias registradas" />
                ) : (
                  <List
                    size="small"
                    loading={carregandoMemoria}
                    dataSource={memorias}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                          <Space wrap>
                            <Text strong>{item.titulo}</Text>
                            <Tag color={item.status_revisao === "aprovado" ? "green" : item.status_revisao === "rejeitado" ? "red" : "gold"}>
                              {item.status_revisao}
                            </Tag>
                            <Tag>{item.origem}</Tag>
                          </Space>
                          <Text type="secondary">{item.resposta}</Text>
                          {item.status_revisao === "pendente" && (
                            <Space>
                              <Button size="small" type="primary" onClick={() => revisarMemoria(item.id, "aprovar")}>
                                Aprovar
                              </Button>
                              <Button size="small" danger onClick={() => revisarMemoria(item.id, "rejeitar")}>
                                Rejeitar
                              </Button>
                            </Space>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            </Card>
          </Space>
        </Col>

        <Col xs={24} xl={15}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <Card bordered={false} style={panelStyle}>
                  <Text type="secondary">Produtos</Text>
                  <div style={{ color: "#2563EB", fontSize: 26, fontWeight: 900 }}>{totais.produtos}</div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card bordered={false} style={panelStyle}>
                  <Text type="secondary">Serviços</Text>
                  <div style={{ color: "#15803D", fontSize: 26, fontWeight: 900 }}>{totais.servicos}</div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card bordered={false} style={panelStyle}>
                  <Text type="secondary">Valor de venda</Text>
                  <div style={{ color: "#111827", fontSize: 24, fontWeight: 900 }}>{moneyFormatter.format(totais.valor)}</div>
                </Card>
              </Col>
            </Row>

            <Card
              bordered={false}
              style={panelStyle}
              title="Prévia"
              extra={
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  loading={criando}
                  disabled={!itens.length}
                  onClick={criarItens}
                  style={{ background: "#3B82F6", borderRadius: 8, fontWeight: 700 }}
                >
                  Criar em lote
                </Button>
              }
            >
              {!itens.length ? (
                <div style={{ color: "#6B7280", padding: "48px 12px", textAlign: "center" }}>
                  <ThunderboltOutlined style={{ color: "#3B82F6", fontSize: 34, marginBottom: 12 }} />
                  <Paragraph>Envie uma lista para ver a separação automática.</Paragraph>
                </div>
              ) : (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Alert
                    type="info"
                    showIcon
                    message={`Regime fiscal: ${resumo.fiscal?.regime_tributario || "-"}`}
                    description={`Serviços usam ISS padrão de ${resumo.fiscal?.aliquota_servico || "0"}%. Produtos usam carga fiscal padrão de ${resumo.fiscal?.aliquota_produto || "0"}% + despesas e margem.`}
                  />
                  {resultado?.avisos?.map((aviso) => <Alert key={aviso} type="warning" showIcon message={aviso} />)}
                  {resultado?.criacao && (
                    <Alert
                      type="success"
                      showIcon
                      message="Itens gravados"
                      description={`${resultado.criacao.produtos_criados} produtos criados, ${resultado.criacao.produtos_atualizados} atualizados, ${resultado.criacao.servicos_criados} serviços criados e ${resultado.criacao.servicos_atualizados} atualizados.`}
                    />
                  )}
                  <Table columns={columns} dataSource={itens} rowKey={(item) => `${item.tipo}-${item.linha}-${item.nome}`} scroll={{ x: 980 }} pagination={{ pageSize: 10 }} />
                </Space>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
