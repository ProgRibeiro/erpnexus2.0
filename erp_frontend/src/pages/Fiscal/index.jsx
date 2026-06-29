import { useEffect, useState } from "react";
import { Button, Card, Col, Divider, Form, Input, InputNumber, Row, Select, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import { CalculatorOutlined, FileProtectOutlined } from "@ant-design/icons";
import api from "../../services/api";
import GuiaLucroPresumido from "./components/GuiaLucroPresumido";

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

const btnStyle = { fontWeight: 600, height: "38px", borderRadius: "8px" };

const regimeOpcoes = [
  { label: "MEI", value: "mei" },
  { label: "Simples Nacional", value: "simples_nacional" },
  { label: "Lucro Presumido", value: "lucro_presumido" },
  { label: "Lucro Real", value: "lucro_real" },
];

const tipoNotaOpcoes = [
  { label: "NFS-e", value: "nfse" },
  { label: "NF-e", value: "nfe" },
  { label: "Ambas", value: "ambas" },
];

export default function FiscalPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form] = Form.useForm();
  const [calculo, setCalculo] = useState(null);
  const [impostos, setImpostos] = useState([]);
  const [valores, setValores] = useState({ valor_servicos: 0, valor_materiais: 0 });

  useEffect(() => {
    carregarConfig();
    carregarImpostos();
  }, []);

  const carregarConfig = async () => {
    try {
      const response = await api.get("/fiscal/configuracao/");
      setConfig(response.data);
      form.setFieldsValue(response.data);
    } catch {
      message.error("Erro ao carregar configuração fiscal");
    } finally {
      setLoading(false);
    }
  };

  const carregarImpostos = async () => {
    try {
      const response = await api.get("/fiscal/tabelas-impostos/");
      setImpostos(response.data.results || response.data);
    } catch {
      setImpostos([]);
    }
  };

  const salvarConfig = async (values) => {
    setSalvando(true);
    try {
      const response = await api.patch("/fiscal/configuracao/", values);
      setConfig(response.data);
      setEditando(false);
      message.success("Configuração fiscal atualizada!");
    } catch {
      message.error("Erro ao salvar configuração");
    } finally {
      setSalvando(false);
    }
  };

  const calcularImpostos = async () => {
    try {
      const response = await api.post("/fiscal/calcular-impostos/", valores);
      setCalculo(response.data);
    } catch {
      message.error("Erro ao calcular impostos");
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
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
            <FileProtectOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 24, fontWeight: 800 }}>
              Fiscal
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Configuração tributária, calculadora de impostos e validação fiscal
            </Text>
          </div>
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0, color: colors.texto }}>
                Configuração Fiscal
              </Title>
              <Button type="primary" onClick={() => setEditando(!editando)} style={btnStyle}>
                {editando ? "Cancelar" : "Editar"}
              </Button>
            </div>

            <Form
              form={form}
              layout="vertical"
              disabled={!editando}
              onFinish={salvarConfig}
              onValuesChange={(_, allValues) => setConfig((current) => ({ ...(current || {}), ...allValues }))}
            >
              <Form.Item label="Regime Tributário" name="regime_tributario">
                <Select options={regimeOpcoes} />
              </Form.Item>

              <Form.Item label="Tipo de Nota" name="tipo_nota">
                <Select options={tipoNotaOpcoes} />
              </Form.Item>

              <Form.Item label="CNPJ" name="cnpj">
                <Input />
              </Form.Item>

              <Form.Item label="Razão Social" name="razao_social">
                <Input />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Município" name="municipio">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="UF" name="uf">
                    <Input maxLength={2} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="ISS Alíquota (%)" name="aliquota_iss">
                <InputNumber min={0} max={100} step={0.01} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item label="Código LC 116" name="codigo_servico_lc116">
                <Input />
              </Form.Item>

              {editando && (
                <Button type="primary" htmlType="submit" style={btnStyle} loading={salvando} block>
                  Salvar
                </Button>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0, color: colors.texto }}>
              <CalculatorOutlined style={{ marginRight: 8, color: colors.azul }} />
              Calculadora de Impostos
            </Title>

            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textoFraco, textTransform: "uppercase", letterSpacing: "0.04em" }}>Valor Serviços</span>
                  <InputNumber value={valores.valor_servicos} onChange={(v) => setValores((s) => ({ ...s, valor_servicos: v || 0 }))} min={0} style={{ width: "100%", marginTop: 4 }} />
                </Col>
                <Col xs={24} sm={12}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.textoFraco, textTransform: "uppercase", letterSpacing: "0.04em" }}>Valor Materiais</span>
                  <InputNumber value={valores.valor_materiais} onChange={(v) => setValores((s) => ({ ...s, valor_materiais: v || 0 }))} min={0} style={{ width: "100%", marginTop: 4 }} />
                </Col>
              </Row>

              <Button type="primary" onClick={calcularImpostos} style={btnStyle} block>
                Calcular
              </Button>

              {calculo && (
                <div style={{ background: colors.fundoSuave, border: `1px solid ${colors.borda}`, padding: 16, borderRadius: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ color: colors.texto }}>Regime:</Text>{" "}
                    <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>{calculo.regime}</Tag>
                  </div>
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ fontSize: 13, color: colors.textoSecundario, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div>Subtotal Serviços: R$ {calculo.subtotal_servicos?.toFixed(2)}</div>
                    <div>Subtotal Materiais: R$ {calculo.subtotal_materiais?.toFixed(2)}</div>
                    <div>Subtotal: R$ {calculo.subtotal?.toFixed(2)}</div>
                    <Divider style={{ margin: "8px 0" }} />
                    <div>ISS: R$ {calculo.iss?.toFixed(2)}</div>
                    <div>PIS: R$ {calculo.pis?.toFixed(2)}</div>
                    <div>COFINS: R$ {calculo.cofins?.toFixed(2)}</div>
                    <div>IRPJ: R$ {calculo.irpj?.toFixed(2)}</div>
                    <div>CSLL: R$ {calculo.csll?.toFixed(2)}</div>
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ fontWeight: 700, color: colors.azul, fontSize: 14 }}>
                      Total Impostos: R$ {calculo.total_impostos?.toFixed(2)}
                    </div>
                    <div style={{ fontWeight: 700, color: colors.azul, fontSize: 16 }}>
                      Total Geral: R$ {calculo.total_geral?.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {config?.regime_tributario === "lucro_presumido" && (
        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
          <Title level={4} style={{ color: colors.texto }}>Tabela de Impostos - Lucro Presumido</Title>
          <div style={{ border: `1px solid ${colors.borda}`, borderRadius: 12, overflow: "hidden" }}>
            <Table
              dataSource={impostos}
              rowKey="id"
              locale={{ emptyText: "Nenhuma tabela de impostos cadastrada" }}
              columns={[
                { title: "Descrição", dataIndex: "descricao" },
                { title: "PIS", dataIndex: "pis", render: (v) => `${v}%` },
                { title: "COFINS", dataIndex: "cofins", render: (v) => `${v}%` },
                { title: "IRPJ Serviços", dataIndex: "irpj_servicos", render: (v) => `${v}%` },
                { title: "CSLL Serviços", dataIndex: "csll_servicos", render: (v) => `${v}%` },
              ]}
              pagination={false}
            />
          </div>
        </Card>
      )}

      <GuiaLucroPresumido
        config={config || {}}
        valorReferencia={valores.valor_servicos || 10000}
      />
    </div>
  );
}
