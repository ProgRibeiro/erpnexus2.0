import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import { CalculatorOutlined, FileProtectOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
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

const anexoSimplesOpcoes = [
  { label: "Anexo III", value: "anexo_iii" },
  { label: "Anexo IV", value: "anexo_iv" },
];

const regimesReformaOpcoes = [
  { label: "Simples Nacional", value: "SN" },
  { label: "Lucro Presumido", value: "LP" },
  { label: "Lucro Real", value: "LR" },
  { label: "MEI", value: "MEI" },
];

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const percent = (value) =>
  `${(Number(value || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const alertaFiscalColor = {
  ok: "green",
  perto_sublimite: "gold",
  acima_sublimite: "orange",
  perto_teto: "volcano",
  acima_teto: "red",
};

const alertaFiscalLabel = {
  ok: "Dentro dos limites",
  perto_sublimite: "Perto do sublimite",
  acima_sublimite: "Acima do sublimite",
  perto_teto: "Perto do teto",
  acima_teto: "Acima do teto",
};

const regimeLegadoParaReforma = (regime) => ({
  mei: "MEI",
  simples_nacional: "SN",
  lucro_presumido: "LP",
  lucro_real: "LR",
}[regime] || "LP");

const normalizeConfigForm = (data) => ({
  ...(data || {}),
  data_abertura_simples: data?.data_abertura_simples ? dayjs(data.data_abertura_simples) : null,
});

export default function FiscalPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form] = Form.useForm();
  const [reformaForm] = Form.useForm();
  const [simplesForm] = Form.useForm();
  const [calculo, setCalculo] = useState(null);
  const [impostos, setImpostos] = useState([]);
  const [valores, setValores] = useState({ valor_servicos: 0, valor_materiais: 0 });
  const [regrasReforma, setRegrasReforma] = useState([]);
  const [reformaResultado, setReformaResultado] = useState(null);
  const [calculandoReforma, setCalculandoReforma] = useState(false);
  const [sincronizandoCnpj, setSincronizandoCnpj] = useState(false);
  const [simplesLoading, setSimplesLoading] = useState(false);
  const [simplesAtual, setSimplesAtual] = useState(null);
  const [simplesHistorico, setSimplesHistorico] = useState([]);
  const [faturamentosSimples, setFaturamentosSimples] = useState([]);
  const [previsaoSimples, setPrevisaoSimples] = useState([]);
  const [cenarioPrevisao, setCenarioPrevisao] = useState({ meses: 6, crescimento_mensal: 0 });

  useEffect(() => {
    carregarConfig();
    carregarImpostos();
    carregarRegrasReforma();
    carregarPainelSimples();
  }, []);

  const carregarConfig = async () => {
    try {
      const response = await api.get("/fiscal/configuracao/");
      setConfig(response.data);
      form.setFieldsValue(normalizeConfigForm(response.data));
      reformaForm.setFieldsValue({
        regime_emitente: regimeLegadoParaReforma(response.data?.regime_tributario),
        uf_destino: response.data?.uf || "",
        codigo_municipio: response.data?.codigo_municipio_ibge || "",
      });
    } catch {
      message.error("Erro ao carregar configuração fiscal");
    } finally {
      setLoading(false);
    }
  };

  const carregarRegrasReforma = async () => {
    try {
      const response = await api.get("/fiscal/regras/tabelas/");
      setRegrasReforma(response.data || []);
    } catch {
      setRegrasReforma([]);
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

  const carregarPainelSimples = async (cenario = cenarioPrevisao) => {
    setSimplesLoading(true);
    try {
      const [apuracao, faturamentos, previsao] = await Promise.all([
        api.get("/fiscal/simples/apuracao/"),
        api.get("/fiscal/simples/faturamentos/"),
        api.get("/fiscal/simples/previsao/", { params: cenario }),
      ]);
      setSimplesAtual(apuracao.data?.atual || null);
      setSimplesHistorico(apuracao.data?.historico || []);
      setFaturamentosSimples(faturamentos.data || []);
      setPrevisaoSimples(previsao.data?.previsao || []);
    } catch {
      message.error("Erro ao carregar painel do Simples Nacional.");
    } finally {
      setSimplesLoading(false);
    }
  };

  const salvarReceitaSimples = async (values) => {
    setSimplesLoading(true);
    try {
      await api.post("/fiscal/simples/faturamentos/", {
        competencia: values.competencia?.format("YYYY-MM-01"),
        receita_bruta: values.receita_bruta || 0,
        origem: "manual",
        observacoes: values.observacoes || "",
      });
      simplesForm.resetFields();
      await carregarPainelSimples();
      message.success("Receita mensal salva e DAS estimado recalculado.");
    } catch {
      message.error("Erro ao salvar receita mensal.");
      setSimplesLoading(false);
    }
  };

  const atualizarPrevisao = async (values) => {
    const novoCenario = {
      meses: values.meses || 6,
      crescimento_mensal: values.crescimento_mensal || 0,
    };
    setCenarioPrevisao(novoCenario);
    await carregarPainelSimples(novoCenario);
  };

  const salvarConfig = async (values) => {
    setSalvando(true);
    try {
      const response = await api.patch("/fiscal/configuracao/", {
        ...values,
        data_abertura_simples: values.data_abertura_simples?.format("YYYY-MM-DD") || values.data_abertura_simples,
      });
      setConfig(response.data);
      form.setFieldsValue(normalizeConfigForm(response.data));
      reformaForm.setFieldsValue({
        regime_emitente: regimeLegadoParaReforma(response.data?.regime_tributario),
        uf_destino: response.data?.uf || "",
        codigo_municipio: response.data?.codigo_municipio_ibge || "",
      });
      setReformaResultado(null);
      carregarPainelSimples();
      setEditando(false);
      message.success("Configuração fiscal atualizada e motor sincronizado.");
    } catch {
      message.error("Erro ao salvar configuração");
    } finally {
      setSalvando(false);
    }
  };

  const sincronizarCnpjCadastrado = async () => {
    setSincronizandoCnpj(true);
    try {
      const cnpjAtual = form.getFieldValue("cnpj") || config?.cnpj;
      const response = await api.post("/fiscal/sincronizar-cnpj-cadastrado/", { cnpj: cnpjAtual });
      const novaConfig = response.data?.configuracao;
      if (novaConfig) {
        setConfig(novaConfig);
        form.setFieldsValue(normalizeConfigForm(novaConfig));
        reformaForm.setFieldsValue({
          regime_emitente: regimeLegadoParaReforma(novaConfig.regime_tributario),
          uf_destino: novaConfig.uf || "",
          codigo_municipio: novaConfig.codigo_municipio_ibge || "",
        });
      }
      setReformaResultado(null);
      message.success("CNPJ sincronizado e motor fiscal atualizado.");
    } catch (error) {
      message.error(error.response?.data?.detail || "Erro ao sincronizar CNPJ cadastrado.");
    } finally {
      setSincronizandoCnpj(false);
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

  const calcularReformaTributaria = async (values) => {
    setCalculandoReforma(true);
    try {
      const payload = {
        valor_servicos: values.valor_servicos || 0,
        valor_materiais: values.valor_materiais || 0,
        regime_emitente: values.regime_emitente,
        data_emissao: values.data_emissao?.format("YYYY-MM-DD") || dayjs().format("YYYY-MM-DD"),
        ncm_ou_servico: values.ncm_ou_servico || "GERAL",
        uf_destino: values.uf_destino || config?.uf || "",
        codigo_municipio: values.codigo_municipio || config?.codigo_municipio_ibge || "",
        salvar_snapshot: Boolean(values.salvar_snapshot),
        referencia: values.referencia || "Simulação fiscal",
      };
      const response = await api.post("/fiscal/reforma/calcular/", payload);
      setReformaResultado(response.data?.resultado || null);
      message.success("Cálculo da Reforma Tributária concluído.");
    } catch {
      message.error("Erro ao calcular Reforma Tributária.");
    } finally {
      setCalculandoReforma(false);
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

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }} loading={simplesLoading}>
        <Space align="start" style={{ marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.verde}14`,
              color: colors.verde,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <CalculatorOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: colors.texto }}>
              Painel Simples Nacional
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Monitore faturamento mensal, RBT12, DAS estimado e previsão dos próximos meses
            </Text>
          </div>
        </Space>

        <Alert
          type={simplesAtual?.alerta === "ok" ? "success" : "warning"}
          showIcon
          style={{ borderRadius: 12, marginBottom: 18 }}
          message={`Status: ${alertaFiscalLabel[simplesAtual?.alerta] || "Sem apuração"}`}
          description="A apuração usa o RBT12 proporcional enquanto a empresa tiver menos de 12 meses e muda automaticamente para os últimos 12 meses reais depois disso."
        />

        <Row gutter={[16, 16]} style={{ marginBottom: 18 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Text type="secondary">RBT12 atual</Text>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.texto }}>{money(simplesAtual?.rbt12)}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Text type="secondary">DAS estimado do mês</Text>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.azul }}>{money(simplesAtual?.das_estimado)}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Text type="secondary">Alíquota efetiva</Text>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.texto }}>{percent(simplesAtual?.aliquota_efetiva)}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Text type="secondary">Faixa / teto usado</Text>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Tag color={alertaFiscalColor[simplesAtual?.alerta] || "default"} style={{ borderRadius: 999, fontWeight: 700 }}>
                  Faixa {simplesAtual?.faixa || "-"}
                </Tag>
                <Text strong>{percent(simplesAtual?.percentual_teto)}</Text>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]}>
          <Col xs={24} lg={8}>
            <Card size="small" style={{ borderRadius: 12 }} title="Lançar receita do mês">
              <Form
                form={simplesForm}
                layout="vertical"
                initialValues={{ competencia: dayjs(), receita_bruta: 0 }}
                onFinish={salvarReceitaSimples}
              >
                <Form.Item label="Competência" name="competencia" rules={[{ required: true }]}>
                  <DatePicker picker="month" format="MM/YYYY" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="Receita bruta do mês" name="receita_bruta" rules={[{ required: true }]}>
                  <InputNumber min={0} step={100} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="Observações" name="observacoes">
                  <Input.TextArea rows={2} placeholder="Ex.: valor conferido com NFS-e / contador" />
                </Form.Item>
                <Button type="primary" htmlType="submit" style={btnStyle} block>
                  Salvar e recalcular
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card size="small" style={{ borderRadius: 12 }} title="Previsão futura">
              <Form
                layout="inline"
                initialValues={cenarioPrevisao}
                onFinish={atualizarPrevisao}
                style={{ marginBottom: 12, rowGap: 8 }}
              >
                <Form.Item label="Meses" name="meses">
                  <InputNumber min={1} max={24} />
                </Form.Item>
                <Form.Item label="Crescimento mensal (%)" name="crescimento_mensal">
                  <InputNumber min={-100} max={100} step={0.5} />
                </Form.Item>
                <Form.Item>
                  <Button htmlType="submit" style={btnStyle}>Atualizar previsão</Button>
                </Form.Item>
              </Form>
              <Table
                size="small"
                rowKey="competencia"
                dataSource={previsaoSimples}
                pagination={false}
                scroll={{ x: 900 }}
                columns={[
                  { title: "Mês", dataIndex: "competencia", render: (v) => dayjs(v).format("MM/YYYY") },
                  { title: "Receita prevista", dataIndex: "receita_prevista", render: money },
                  { title: "RBT12", dataIndex: "rbt12", render: money },
                  { title: "Alíquota efetiva", dataIndex: "aliquota_efetiva", render: percent },
                  { title: "DAS previsto", dataIndex: "das_estimado", render: (v) => <Text strong>{money(v)}</Text> },
                  { title: "Alerta", dataIndex: "alerta", render: (v) => <Tag color={alertaFiscalColor[v] || "default"}>{alertaFiscalLabel[v] || v}</Tag> },
                ]}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          <Col xs={24} lg={12}>
            <Table
              size="small"
              title={() => "Faturamentos mensais lançados"}
              rowKey="id"
              dataSource={faturamentosSimples}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: "Competência", dataIndex: "competencia", render: (v) => dayjs(v).format("MM/YYYY") },
                { title: "Receita bruta", dataIndex: "receita_bruta", render: money },
                { title: "Origem", dataIndex: "origem", render: (v) => <Tag>{v}</Tag> },
              ]}
            />
          </Col>
          <Col xs={24} lg={12}>
            <Table
              size="small"
              title={() => "Histórico de apuração"}
              rowKey="id"
              dataSource={simplesHistorico}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: "Competência", dataIndex: "competencia", render: (v) => dayjs(v).format("MM/YYYY") },
                { title: "RBT12", dataIndex: "rbt12", render: money },
                { title: "DAS", dataIndex: "das_estimado", render: money },
                { title: "Alerta", dataIndex: "alerta", render: (v) => <Tag color={alertaFiscalColor[v] || "default"}>{alertaFiscalLabel[v] || v}</Tag> },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <Title level={4} style={{ margin: 0, color: colors.texto }}>
                Configuração Fiscal
              </Title>
              <Space wrap>
                <Button onClick={sincronizarCnpjCadastrado} loading={sincronizandoCnpj} style={btnStyle}>
                  Sincronizar CNPJ
                </Button>
                <Button type="primary" onClick={() => setEditando(!editando)} style={btnStyle}>
                  {editando ? "Cancelar" : "Editar"}
                </Button>
              </Space>
            </div>

            <Form
              form={form}
              layout="vertical"
              disabled={!editando}
              onFinish={salvarConfig}
              onValuesChange={(changedValues, allValues) => {
                setConfig((current) => ({ ...(current || {}), ...allValues }));
                if (changedValues.regime_tributario) {
                  reformaForm.setFieldValue("regime_emitente", regimeLegadoParaReforma(changedValues.regime_tributario));
                  setReformaResultado(null);
                }
              }}
            >
              <Form.Item label="Regime Tributário" name="regime_tributario">
                <Select options={regimeOpcoes} />
              </Form.Item>

              <Form.Item label="Tipo de Nota" name="tipo_nota">
                <Select options={tipoNotaOpcoes} />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Data de abertura no Simples" name="data_abertura_simples">
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Anexo do Simples" name="anexo_simples">
                    <Select options={anexoSimplesOpcoes} />
                  </Form.Item>
                </Col>
              </Row>

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
              <Alert
                type="success"
                showIcon
                style={{ borderRadius: 12 }}
                message={`Motor usando regime: ${config?.regime_tributario || "não configurado"}`}
                description="Quando você troca Lucro Presumido, Simples Nacional, Lucro Real ou MEI e salva, o cálculo fiscal, a OS, o orçamento e o simulador da reforma passam a seguir esse regime."
              />
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
                  {calculo.perfil_regime && (
                    <Alert
                      type="success"
                      showIcon
                      style={{ borderRadius: 12, marginBottom: 10 }}
                      message={`Perfil aplicado: ${calculo.perfil_regime.nome}`}
                      description={`${calculo.perfil_regime.modelo_apuracao} — ${calculo.perfil_regime.calculo_nota}`}
                    />
                  )}
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ fontSize: 13, color: colors.textoSecundario, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div>Subtotal Serviços: {money(calculo.subtotal_servicos)}</div>
                    <div>Subtotal Materiais: {money(calculo.subtotal_materiais)}</div>
                    <div>Subtotal: {money(calculo.subtotal)}</div>
                    <Divider style={{ margin: "8px 0" }} />
                    <div>ISS: {money(calculo.iss)}</div>
                    <div>PIS: {money(calculo.pis)}</div>
                    <div>COFINS: {money(calculo.cofins)}</div>
                    <div>IRPJ: {money(calculo.irpj)}</div>
                    <div>CSLL: {money(calculo.csll)}</div>
                    {calculo.aliquotas?.das !== undefined && (
                      <div>DAS estimado: {calculo.aliquotas.das}%</div>
                    )}
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ fontWeight: 700, color: colors.azul, fontSize: 14 }}>
                      Total Impostos: {money(calculo.total_impostos)}
                    </div>
                    <div style={{ fontWeight: 700, color: colors.azul, fontSize: 16 }}>
                      Total Geral: {money(calculo.total_geral)}
                    </div>
                  </div>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <Space align="start" style={{ marginBottom: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.roxo}12`,
              color: colors.roxo,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: colors.texto }}>
              Motor Reforma Tributária 2026-2033
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Simule CBS/IBS, veja obrigatoriedade por regime e confira as regras versionadas.
            </Text>
          </div>
        </Space>

        <Alert
          type="info"
          showIcon
          style={{ borderRadius: 12, marginBottom: 18 }}
          message="Arquitetura preparada para coexistência dos tributos antigos e novos"
          description="PIS, COFINS, ISS e ICMS continuam coexistindo com CBS/IBS/IS. As regras abaixo são versionadas por vigência e podem ser atualizadas sem alterar código."
        />

        <Row gutter={[20, 20]}>
          <Col xs={24} lg={10}>
            <Form
              form={reformaForm}
              layout="vertical"
              initialValues={{
                data_emissao: dayjs("2026-08-03"),
                regime_emitente: regimeLegadoParaReforma(config?.regime_tributario),
                valor_servicos: 1000,
                valor_materiais: 0,
                ncm_ou_servico: "GERAL",
                uf_destino: config?.uf || "",
                codigo_municipio: config?.codigo_municipio_ibge || "",
              }}
              onFinish={calcularReformaTributaria}
            >
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Data da operação" name="data_emissao" rules={[{ required: true }]}>
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Regime emitente" name="regime_emitente" rules={[{ required: true }]}>
                    <Select options={regimesReformaOpcoes} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Valor serviços" name="valor_servicos">
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Valor materiais" name="valor_materiais">
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="NCM / serviço" name="ncm_ou_servico">
                    <Input placeholder="GERAL, NCM ou código serviço" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="UF destino" name="uf_destino">
                    <Input maxLength={2} placeholder="SP" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Código município IBGE" name="codigo_municipio">
                <Input placeholder="Opcional" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={calculandoReforma} style={btnStyle} block>
                Calcular CBS/IBS
              </Button>
            </Form>
          </Col>

          <Col xs={24} lg={14}>
            {reformaResultado ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={8}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <Text type="secondary">Base cálculo</Text>
                      <div style={{ fontSize: 20, fontWeight: 800, color: colors.texto }}>{money(reformaResultado.base_calculo)}</div>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <Text type="secondary">Total tributos</Text>
                      <div style={{ fontSize: 20, fontWeight: 800, color: colors.azul }}>{money(reformaResultado.total_tributos)}</div>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <Text type="secondary">Obrigatório produção</Text>
                      <div>
                        <Tag color={reformaResultado.ibs_cbs?.obrigatorio_em_producao ? "red" : "blue"} style={{ borderRadius: 999, fontWeight: 700 }}>
                          {reformaResultado.ibs_cbs?.obrigatorio_em_producao ? "Sim" : "Ainda não"}
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Space wrap>
                  <Tag color={reformaResultado.ibs_cbs?.destacar ? "green" : "default"} style={{ borderRadius: 999, fontWeight: 700 }}>
                    {reformaResultado.ibs_cbs?.destacar ? "Destacar IBS/CBS" : "Não destacar IBS/CBS"}
                  </Tag>
                  <Tag color={reformaResultado.ibs_cbs?.carater_informativo ? "gold" : "blue"} style={{ borderRadius: 999, fontWeight: 700 }}>
                    {reformaResultado.ibs_cbs?.carater_informativo ? "Caráter informativo" : "Cobrança efetiva"}
                  </Tag>
                  <Tag color="purple" style={{ borderRadius: 999, fontWeight: 700 }}>
                    Motor {reformaResultado.versao_motor}
                  </Tag>
                </Space>

                <Table
                  size="small"
                  rowKey="codigo"
                  pagination={false}
                  dataSource={Object.values(reformaResultado.tributos || {})}
                  columns={[
                    { title: "Tributo", dataIndex: "codigo", width: 90 },
                    { title: "Base", dataIndex: "base", render: money },
                    { title: "Alíquota", dataIndex: "aliquota", render: (v) => `${v}%` },
                    { title: "Valor", dataIndex: "valor", render: (v) => <Text strong>{money(v)}</Text> },
                    { title: "Fonte", dataIndex: "fonte_normativa", ellipsis: true, render: (v, row) => v || row.observacao || "—" },
                  ]}
                />
              </div>
            ) : (
              <div style={{ minHeight: 260, border: `1px dashed ${colors.borda}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textoFraco, textAlign: "center", padding: 24 }}>
                Preencha a simulação para ver CBS, IBS, obrigatoriedade e caráter informativo.
              </div>
            )}
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <Title level={4} style={{ color: colors.texto, marginTop: 0 }}>
          Regras fiscais versionadas
        </Title>
        <Table
          size="small"
          rowKey="id"
          dataSource={regrasReforma}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Nenhuma regra fiscal versionada cadastrada" }}
          columns={[
            { title: "Tributo", dataIndex: "codigo_tributo", width: 100 },
            { title: "Escopo", dataIndex: "ncm_ou_servico", render: (v, row) => [v, row.uf_municipio, row.regime_tributario].filter(Boolean).join(" · ") || "GERAL" },
            { title: "Alíquota", dataIndex: "aliquota", render: (v) => `${v}%` },
            { title: "Vigência início", dataIndex: "vigencia_inicio", render: (v) => v ? dayjs(v).format("DD/MM/YYYY") : "—" },
            { title: "Vigência fim", dataIndex: "vigencia_fim", render: (v) => v ? dayjs(v).format("DD/MM/YYYY") : <Tag color="green">Vigente</Tag> },
            { title: "Fonte normativa", dataIndex: "fonte_normativa", ellipsis: true },
          ]}
        />
      </Card>

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
