import { useEffect, useMemo, useState } from "react";
import {
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
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { BankOutlined, DollarOutlined, PlusOutlined, TeamOutlined, UploadOutlined } from "@ant-design/icons";

import api from "../../services/api";

const { Text, Title } = Typography;
const { TextArea } = Input;

const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const btnPrimaryStyle = {
  fontWeight: 600,
  height: 38,
  borderRadius: 8,
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return "Não foi possível salvar o terceirizado.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const firstField = Object.keys(data)[0];
  const firstError = firstField ? data[firstField] : null;
  if (Array.isArray(firstError)) return `${firstField}: ${firstError.join(" ")}`;
  if (typeof firstError === "string") return `${firstField}: ${firstError}`;
  return "Não foi possível salvar o terceirizado.";
}

export default function TerceirosPage() {
  const [terceiros, setTerceiros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [terceiroSelecionado, setTerceiroSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [form] = Form.useForm();

  const carregar = async () => {
    try {
      setLoading(true);
      const response = await api.get("/terceiros/terceirizados/");
      setTerceiros(normalizeList(response.data));
    } catch {
      message.error("Erro ao carregar terceirizados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const resumo = useMemo(() => {
    const pendente = terceiros.reduce((sum, terceiro) => sum + Number(terceiro.total_pendente || 0), 0);
    return {
      ativos: terceiros.filter((terceiro) => terceiro.status === "ativo").length,
      pendente,
    };
  }, [terceiros]);

  const abrirDrawer = (terceiro = null) => {
    setTerceiroSelecionado(terceiro);
    form.resetFields();
    form.setFieldsValue(terceiro || { status: "ativo", tipo_pessoa: "juridica", markup_padrao: 0 });
    setDrawerAberto(true);
  };

  const salvar = async (values) => {
    const payload = {
      ...values,
      documento: onlyDigits(values.documento),
      estado_base: String(values.estado_base || "").toUpperCase(),
      atende_estados: String(values.atende_estados || "").toUpperCase(),
    };
    try {
      setSalvando(true);
      if (terceiroSelecionado) {
        await api.patch(`/terceiros/terceirizados/${terceiroSelecionado.id}/`, payload);
      } else {
        await api.post("/terceiros/terceirizados/", payload);
      }
      message.success("Terceirizado salvo.");
      setDrawerAberto(false);
      carregar();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  };

  const anexarComprovante = async (lancamentoId, file) => {
    const formData = new FormData();
    formData.append("arquivo", file);
    try {
      await api.post(`/terceiros/pagamentos/${lancamentoId}/comprovantes/`, formData);
      message.success("Comprovante anexado.");
      carregar();
    } catch {
      message.error("Erro ao anexar comprovante.");
    }
    return false;
  };

  const columns = [
    {
      title: "Terceirizado",
      dataIndex: "nome",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: colors.texto }}>{record.nome_fantasia || record.nome}</Text>
          <Text style={{ color: colors.textoFraco, fontSize: 12 }}>{record.documento || "Sem documento"}</Text>
        </Space>
      ),
    },
    {
      title: "Base",
      render: (_, record) => <Text style={{ color: colors.textoSecundario }}>{[record.cidade_base, record.estado_base].filter(Boolean).join(" / ") || "-"}</Text>,
    },
    {
      title: "Especialidades",
      dataIndex: "especialidades",
      render: (value) => <Text style={{ color: colors.textoSecundario }}>{value || "-"}</Text>,
    },
    {
      title: "PIX / Banco",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text style={{ color: colors.textoSecundario }}>{record.chave_pix || "Sem PIX"}</Text>
          <Text style={{ color: colors.textoFraco, fontSize: 12 }}>{record.banco || record.conta ? `${record.banco} ${record.agencia || ""} ${record.conta || ""}` : "Sem dados bancários"}</Text>
        </Space>
      ),
    },
    {
      title: "Pendente",
      dataIndex: "total_pendente",
      render: (value) => <Text strong style={{ color: colors.laranja }}>{moneyFormatter.format(Number(value || 0))}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => <Tag color={value === "ativo" ? "green" : "default"} style={{ borderRadius: 999, fontWeight: 600 }}>{value === "ativo" ? "Ativo" : "Inativo"}</Tag>,
    },
    {
      title: "Ações",
      width: 120,
      render: (_, record) => (
        <Button type="link" onClick={() => abrirDrawer(record)} style={{ fontWeight: 600 }}>
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
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
              <TeamOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 24, fontWeight: 800 }}>
                Terceirizados
              </Title>
              <Text style={{ color: colors.textoSecundario }}>Cadastro, custos internos, pagamentos e portal de execução.</Text>
            </div>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} style={btnPrimaryStyle} onClick={() => abrirDrawer()}>
            Novo terceirizado
          </Button>
        </div>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textoFraco, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                  Ativos
                </div>
                <div style={{ fontSize: 32, lineHeight: 1, fontWeight: 700, color: colors.texto }}>{resumo.ativos}</div>
              </div>
              <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: `${colors.azul}14`, display: "flex", alignItems: "center", justifyContent: "center", color: colors.azul, fontSize: 20 }}>
                <TeamOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textoFraco, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                  Pagamentos Pendentes
                </div>
                <div style={{ fontSize: 32, lineHeight: 1, fontWeight: 700, color: colors.texto }}>{moneyFormatter.format(resumo.pendente)}</div>
              </div>
              <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: `${colors.laranja}14`, display: "flex", alignItems: "center", justifyContent: "center", color: colors.laranja, fontSize: 20 }}>
                <DollarOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
        <Table
          columns={columns}
          dataSource={terceiros}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: (record) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text strong style={{ color: colors.texto }}>Pagamentos pendentes para este terceiro</Text>
                <Table
                  size="small"
                  pagination={false}
                  rowKey="id"
                  dataSource={record.pagamentos_pendentes || []}
                  columns={[
                    { title: "Descrição", dataIndex: "descricao" },
                    { title: "OS", dataIndex: "os_numero" },
                    { title: "Vencimento", dataIndex: "data_vencimento" },
                    { title: "Valor", dataIndex: "valor", render: (value) => moneyFormatter.format(Number(value || 0)) },
                    {
                      title: "Comprovante",
                      render: (_, lancamento) => (
                        <Upload beforeUpload={(file) => anexarComprovante(lancamento.id, file)} showUploadList={false}>
                          <Button size="small" icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Anexar</Button>
                        </Upload>
                      ),
                    },
                  ]}
                />
              </Space>
            ),
          }}
        />
      </Card>

      <Drawer
        title={terceiroSelecionado ? "Editar terceirizado" : "Novo terceirizado"}
        placement="right"
        width={620}
        open={drawerAberto}
        onClose={() => setDrawerAberto(false)}
      >
        <Form layout="vertical" form={form} onFinish={salvar}>
          <Title level={5} style={{ color: colors.texto }}>Dados cadastrais</Title>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Nome / responsável" name="nome" rules={[{ required: true, message: "Informe o nome" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Nome fantasia" name="nome_fantasia">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Razão social" name="razao_social">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Documento CPF/CNPJ" name="documento">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Tipo de pessoa" name="tipo_pessoa">
                <Select options={[{ value: "juridica", label: "Jurídica" }, { value: "fisica", label: "Física" }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Email" name="email">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="WhatsApp" name="whatsapp">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Especialidades" name="especialidades">
                <Input placeholder="HVAC, elétrica, civil, refrigeração..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Cidade base" name="cidade_base">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="UF base" name="estado_base">
                <Input maxLength={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="UFs atendidas" name="atende_estados">
                <Input placeholder="SP, RJ, MG" />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ color: colors.texto }}><BankOutlined /> Dados de pagamento</Title>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Chave PIX" name="chave_pix">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Tipo chave PIX" name="tipo_chave_pix">
                <Select allowClear options={["cpf", "cnpj", "email", "telefone", "aleatoria"].map((value) => ({ value, label: value.toUpperCase() }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Banco" name="banco">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Agência" name="agencia">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Conta" name="conta">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Markup padrão sobre custo (%)" name="markup_padrao">
                <InputNumber min={0} step={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Status" name="status">
                <Select options={[{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }, { value: "bloqueado", label: "Bloqueado" }]} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Observações internas" name="observacoes">
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setDrawerAberto(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={salvando} style={btnPrimaryStyle}>
              Salvar terceirizado
            </Button>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
}
