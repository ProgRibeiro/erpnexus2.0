import { useEffect, useState } from "react";
import { Button, Card, Col, Divider, Form, Input, InputNumber, Row, Select, Space, Spin, Table, Tag, Typography, message } from "antd";
import api from "../../services/api";

const { Text, Title } = Typography;

const btnStyle = { background: "#3B82F6", borderColor: "#3B82F6", color: "#fff", fontWeight: 500, height: "38px", borderRadius: "8px" };

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

  if (loading) return <Spin />;

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", padding: 24 }}>
      <Title level={2}>Fiscal</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card style={{ borderRadius: 12, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)" }} bodyStyle={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                Configuração Fiscal
              </Title>
              <Button type="primary" onClick={() => setEditando(!editando)} style={btnStyle}>
                {editando ? "Cancelar" : "Editar"}
              </Button>
            </div>

            <Form form={form} layout="vertical" disabled={!editando} onFinish={salvarConfig}>
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
          <Card style={{ borderRadius: 12, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)" }} bodyStyle={{ padding: 20 }}>
            <Title level={4} style={{ marginTop: 0 }}>
              Calculadora de Impostos
            </Title>

            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Valor Serviços</span>
                  <InputNumber value={valores.valor_servicos} onChange={(v) => setValores((s) => ({ ...s, valor_servicos: v || 0 }))} min={0} style={{ width: "100%", marginTop: 4 }} />
                </Col>
                <Col xs={24} sm={12}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Valor Materiais</span>
                  <InputNumber value={valores.valor_materiais} onChange={(v) => setValores((s) => ({ ...s, valor_materiais: v || 0 }))} min={0} style={{ width: "100%", marginTop: 4 }} />
                </Col>
              </Row>

              <Button onClick={calcularImpostos} style={btnStyle} block>
                Calcular
              </Button>

              {calculo && (
                <div style={{ background: "#f8f9fa", padding: 12, borderRadius: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>Regime:</Text> <Tag>{calculo.regime}</Tag>
                  </div>
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ fontSize: 12 }}>
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
                    <div style={{ fontWeight: 600, color: "#3B82F6", fontSize: 14 }}>
                      Total Impostos: R$ {calculo.total_impostos?.toFixed(2)}
                    </div>
                    <div style={{ fontWeight: 600, color: "#3B82F6", fontSize: 16 }}>
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
        <Card style={{ marginTop: 16, borderRadius: 12, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)" }} bodyStyle={{ padding: 20 }}>
          <Title level={4}>Tabela de Impostos - Lucro Presumido</Title>
          <Table
            dataSource={impostos}
            rowKey="id"
            columns={[
              { title: "Descrição", dataIndex: "descricao" },
              { title: "PIS", dataIndex: "pis", render: (v) => `${v}%` },
              { title: "COFINS", dataIndex: "cofins", render: (v) => `${v}%` },
              { title: "IRPJ Serviços", dataIndex: "irpj_servicos", render: (v) => `${v}%` },
              { title: "CSLL Serviços", dataIndex: "csll_servicos", render: (v) => `${v}%` },
            ]}
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
}
