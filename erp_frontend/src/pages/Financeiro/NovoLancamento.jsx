import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography, message } from "antd";
import { ArrowLeftOutlined, CloseOutlined, SaveOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import financeiroService from "../../services/financeiro";

const { Text, Title } = Typography;
const { TextArea } = Input;

const colors = {
  azul: "#3B82F6",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const pageStyle = {
  minHeight: "100vh",
  background: colors.fundoSuave,
  padding: 24,
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const sectionLabelStyle = {
  color: colors.textoSecundario,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const secondaryButtonStyle = {
  height: 40,
  borderRadius: 10,
  fontWeight: 600,
  background: "#FFFFFF",
  borderColor: colors.borda,
  color: colors.texto,
};

const primaryButtonStyle = {
  height: 40,
  borderRadius: 10,
  fontWeight: 600,
  paddingInline: 22,
  background: colors.azul,
  borderColor: colors.azul,
};

export default function NovoLancamentoPage() {
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const carregar = async () => {
      const [contasData, categoriasData] = await Promise.all([
        financeiroService.listarContas(),
        financeiroService.listarCategorias(),
      ]);
      setContas(contasData);
      setCategorias(categoriasData);
      if (id) {
        const lancamentos = await financeiroService.listarLancamentos();
        const lancamento = lancamentos.find((item) => String(item.id) === String(id));
        if (lancamento) {
          form.setFieldsValue(lancamento);
        }
      }
    };
    carregar();
  }, [id, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (id) {
        await financeiroService.atualizarLancamento(id, values);
      } else {
        await financeiroService.criarLancamento(values);
      }
      message.success("Lancamento salvo");
      navigate("/financeiro/lancamentos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <Space direction="vertical" size={20} style={{ width: "100%", maxWidth: 880, margin: "0 auto" }}>
        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Space align="center" size={12}>
              <Button
                shape="circle"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/financeiro/lancamentos")}
                style={{ borderColor: colors.borda }}
              />
              <div>
                <Text style={sectionLabelStyle}>Financeiro</Text>
                <Title level={3} style={{ margin: "2px 0 0", color: colors.texto, fontWeight: 800 }}>
                  {id ? "Editar lançamento" : "Novo lançamento"}
                </Title>
              </div>
            </Space>
          </div>
        </Card>

        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 24 }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            <Text style={{ ...sectionLabelStyle, display: "block", marginBottom: 12 }}>
              Identificação
            </Text>
            <Form.Item
              name="descricao"
              label="Descrição"
              rules={[{ required: true, message: "Informe a descrição do lançamento" }]}
            >
              <Input placeholder="Ex.: Pagamento de fornecedor" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="tipo"
                  label="Tipo"
                  rules={[{ required: true, message: "Selecione o tipo" }]}
                >
                  <Select
                    placeholder="Selecione"
                    options={[
                      { value: "receita", label: "Receita" },
                      { value: "despesa", label: "Despesa" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="valor"
                  label="Valor"
                  rules={[{ required: true, message: "Informe o valor" }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    prefix="R$"
                    style={{ width: "100%" }}
                    placeholder="0,00"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Text style={{ ...sectionLabelStyle, display: "block", margin: "8px 0 12px" }}>
              Datas e conta
            </Text>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="data_competencia"
                  label="Competência"
                  rules={[{ required: true, message: "Informe a data de competência" }]}
                >
                  <Input type="date" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="data_vencimento"
                  label="Vencimento"
                  rules={[{ required: true, message: "Informe a data de vencimento" }]}
                >
                  <Input type="date" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="conta_bancaria"
                  label="Conta bancária"
                  rules={[{ required: true, message: "Selecione a conta bancária" }]}
                >
                  <Select
                    placeholder="Selecione a conta"
                    options={contas.map((conta) => ({ value: conta.id, label: conta.nome }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="categoria" label="Categoria">
                  <Select
                    allowClear
                    placeholder="Selecione a categoria"
                    options={categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Text style={{ ...sectionLabelStyle, display: "block", margin: "8px 0 12px" }}>
              Informações complementares
            </Text>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="fornecedor_cliente" label="Fornecedor/cliente">
                  <Input placeholder="Nome do fornecedor ou cliente" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="numero_documento" label="Número do documento">
                  <Input placeholder="Ex.: NF, boleto ou contrato" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="observacoes" label="Observações" style={{ marginBottom: 8 }}>
              <TextArea rows={4} placeholder="Informações adicionais sobre o lançamento" />
            </Form.Item>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
                paddingTop: 20,
                borderTop: `1px solid ${colors.borda}`,
              }}
            >
              <Button
                icon={<CloseOutlined />}
                onClick={() => navigate("/financeiro/lancamentos")}
                style={secondaryButtonStyle}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={loading}
                style={primaryButtonStyle}
              >
                Salvar
              </Button>
            </div>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
