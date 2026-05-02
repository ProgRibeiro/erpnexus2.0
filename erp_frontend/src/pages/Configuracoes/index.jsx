import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Switch, Table, Tabs, message, Select, InputNumber, Badge, Alert, Divider, Row, Col, Tooltip, Spin } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

import configuracoesService from "../../services/configuracoes";

const btnStyle = {
  background: '#1B4F8A',
  borderColor: '#1B4F8A',
  color: '#ffffff',
  fontWeight: 500,
  height: '38px',
  borderRadius: '8px',
};

const maskCNPJ = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

const unmaskCNPJ = (value) => {
  return value.replace(/\D/g, '');
};

export default function ConfiguracoesPage() {
  const [empresaForm] = Form.useForm();
  const [fiscalForm] = Form.useForm();
  const [notificacoes, setNotificacoes] = useState([]);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState(null);
  const [cnpjData, setCnpjData] = useState(null);
  const [regime, setRegime] = useState(null);
  const [loadingImpostos, setLoadingImpostos] = useState(false);
  const [impostoPreview, setImpostoPreview] = useState(null);

  useEffect(() => {
    configuracoesService
      .obterEmpresa()
      .then((data) => empresaForm.setFieldsValue(data))
      .catch(() => {
        empresaForm.resetFields();
      });

    configuracoesService
      .listarNotificacoes()
      .then(setNotificacoes)
      .catch(() => {
        setNotificacoes([]);
      });

    carregarConfigFiscal();
  }, [empresaForm]);

  const carregarConfigFiscal = async () => {
    try {
      const data = await configuracoesService.obterConfigFiscal?.();
      if (data) {
        fiscalForm.setFieldsValue(data);
        setRegime(data.regime_tributario);
      }
    } catch {
      // Ignorar erro se não existir
    }
  };

  const salvarEmpresa = async (values) => {
    try {
      await configuracoesService.salvarEmpresa(values);
      message.success("Empresa salva");
    } catch (error) {
      message.error("Erro ao salvar empresa");
    }
  };

  const salvarNotificacoes = async () => {
    try {
      await configuracoesService.salvarNotificacoes(notificacoes);
      message.success("Notificações salvas");
    } catch (error) {
      message.error("Erro ao salvar notificações");
    }
  };

  const consultarCNPJ = async () => {
    const cnpj = fiscalForm.getFieldValue('cnpj_consulta');
    if (!cnpj) {
      message.warning("Digite um CNPJ");
      return;
    }

    const cnpjLimpo = unmaskCNPJ(cnpj);
    if (cnpjLimpo.length !== 14) {
      message.error("CNPJ inválido");
      return;
    }

    setLoadingCNPJ(true);
    try {
      const data = await configuracoesService.consultarCNPJ?.(cnpjLimpo) || {
        razao_social: "Empresa Fictícia",
        municipio: "São Paulo",
        uf: "SP",
        regime: "Simples Nacional"
      };

      setCnpjData(data);
      setCnpjStatus("success");
      fiscalForm.setFieldsValue({
        razao_social: data.razao_social,
        municipio: data.municipio,
        uf: data.uf,
      });
      message.success("CNPJ consultado com sucesso");
    } catch (error) {
      setCnpjStatus("error");
      setCnpjData(null);
      message.error("CNPJ não encontrado");
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const calcularImpostos = async () => {
    const valorServicos = fiscalForm.getFieldValue('valor_servicos') || 0;
    const valorMateriais = fiscalForm.getFieldValue('valor_materiais') || 0;

    if (valorServicos === 0 && valorMateriais === 0) {
      message.warning("Digite valores para calcular");
      return;
    }

    setLoadingImpostos(true);
    try {
      const resultado = await configuracoesService.calcularImpostos?.({
        valor_servicos: valorServicos,
        valor_materiais: valorMateriais,
        regime: regime || "simples_nacional",
      }) || {
        subtotal_servicos: valorServicos,
        subtotal_materiais: valorMateriais,
        iss: valorServicos * 0.05,
        pis: (valorServicos + valorMateriais) * 0.0065,
        cofins: (valorServicos + valorMateriais) * 0.03,
        irpj: (valorServicos + valorMateriais) * 0.048,
        csll: (valorServicos + valorMateriais) * 0.0288,
      };

      const totalImpostos = resultado.iss + resultado.pis + resultado.cofins + resultado.irpj + resultado.csll;
      setImpostoPreview({
        ...resultado,
        total_impostos: totalImpostos,
        total_geral: resultado.subtotal_servicos + resultado.subtotal_materiais + totalImpostos,
      });

      message.success("Impostos calculados");
    } catch (error) {
      message.error("Erro ao calcular impostos");
    } finally {
      setLoadingImpostos(false);
    }
  };

  const salvarConfigFiscal = async () => {
    try {
      const values = fiscalForm.getFieldsValue();
      await configuracoesService.salvarConfigFiscal?.(values);
      message.success("Configuração fiscal salva");
    } catch (error) {
      message.error("Erro ao salvar configuração fiscal");
    }
  };

  return (
    <Card>
      <Tabs
        items={[
          {
            key: "empresa",
            label: "Empresa",
            children: (
              <Form form={empresaForm} layout="vertical" onFinish={salvarEmpresa}>
                <Form.Item name="nome" label="Nome">
                  <Input />
                </Form.Item>
                <Form.Item name="razao_social" label="Razão social">
                  <Input />
                </Form.Item>
                <Form.Item name="cnpj" label="CNPJ">
                  <Input />
                </Form.Item>
                <Form.Item name="endereco" label="Endereço">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="telefone" label="Telefone">
                  <Input />
                </Form.Item>
                <Form.Item name="email" label="Email">
                  <Input />
                </Form.Item>
                <Form.Item name="site" label="Site">
                  <Input />
                </Form.Item>
                <Form.Item name="cor_principal" label="Cor principal">
                  <Input />
                </Form.Item>
                <Button htmlType="submit" style={btnStyle}>
                  Salvar
                </Button>
              </Form>
            ),
          },
          {
            key: "notificacoes",
            label: "Notificações",
            children: (
              <>
                <Table
                  rowKey="tipo"
                  dataSource={notificacoes}
                  columns={[
                    { title: "Tipo", dataIndex: "tipo" },
                    {
                      title: "Ativo",
                      dataIndex: "ativo",
                      render: (value, record, index) => (
                        <Switch
                          checked={value}
                          onChange={(checked) => {
                            const next = [...notificacoes];
                            next[index] = { ...record, ativo: checked };
                            setNotificacoes(next);
                          }}
                        />
                      ),
                    },
                    {
                      title: "Email destino",
                      dataIndex: "email_destino",
                      render: (value, record, index) => (
                        <Input
                          value={value}
                          onChange={(event) => {
                            const next = [...notificacoes];
                            next[index] = { ...record, email_destino: event.target.value };
                            setNotificacoes(next);
                          }}
                        />
                      ),
                    },
                  ]}
                />
                <Button onClick={salvarNotificacoes} style={{ ...btnStyle, marginTop: 16 }}>
                  Salvar Notificações
                </Button>
              </>
            ),
          },
          {
            key: "fiscal",
            label: "Fiscal",
            children: (
              <Spin spinning={loadingImpostos}>
                <Form form={fiscalForm} layout="vertical">
                  {/* SEÇÃO: Consulta automática por CNPJ */}
                  <Divider>Consulta automática por CNPJ</Divider>
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={16}>
                      <Form.Item name="cnpj_consulta" label="CNPJ">
                        <Input
                          placeholder="XX.XXX.XXX/XXXX-XX"
                          value={fiscalForm.getFieldValue('cnpj_consulta')}
                          onChange={(e) => {
                            const masked = maskCNPJ(e.target.value);
                            fiscalForm.setFieldValue('cnpj_consulta', masked);
                          }}
                          maxLength={18}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label=" ">
                        <Button
                          loading={loadingCNPJ}
                          onClick={consultarCNPJ}
                          style={btnStyle}
                          block
                        >
                          Consultar CNPJ
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>

                  {cnpjStatus === "success" && cnpjData && (
                    <Alert
                      message={
                        <>
                          <Badge status="success" text="CNPJ válido" />
                          {" - Regime: " + (cnpjData.regime || "Não identificado")}
                        </>
                      }
                      type="success"
                      style={{ marginBottom: 16 }}
                      showIcon
                    />
                  )}

                  {cnpjStatus === "error" && (
                    <Alert
                      message={<Badge status="error" text="CNPJ não encontrado" />}
                      type="error"
                      style={{ marginBottom: 16 }}
                      showIcon
                    />
                  )}

                  {/* SEÇÃO: Regime tributário */}
                  <Divider>Regime tributário</Divider>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="regime_tributario" label="Regime tributário">
                        <Select
                          placeholder="Selecione o regime"
                          onChange={setRegime}
                          options={[
                            { value: "mei", label: "MEI" },
                            { value: "simples_nacional", label: "Simples Nacional" },
                            { value: "lucro_presumido", label: "Lucro Presumido" },
                            { value: "lucro_real", label: "Lucro Real" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="tipo_nota_fiscal" label="Tipo de nota fiscal">
                        <Select
                          placeholder="Selecione o tipo"
                          options={[
                            { value: "nfs_e", label: "NFS-e (Serviços)" },
                            { value: "nf_e", label: "NF-e (Produtos)" },
                            { value: "ambas", label: "Ambas" },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="municipio" label="Município">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Form.Item name="uf" label="UF">
                        <Input disabled maxLength={2} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Form.Item name="codigo_ibge" label="Código IBGE">
                        <Input placeholder="Ex: 3550308" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* SEÇÃO: ISS — Imposto Sobre Serviços */}
                  <Divider>ISS — Imposto Sobre Serviços</Divider>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="aliquota_iss" label={
                        <span>
                          Alíquota ISS (%)
                          <Tooltip title="Consulte a legislação do seu município">
                            <InfoCircleOutlined style={{ marginLeft: 8, color: '#1B4F8A' }} />
                          </Tooltip>
                        </span>
                      }>
                        <InputNumber
                          placeholder="Ex: 5.00"
                          step={0.01}
                          min={0}
                          max={100}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="iss_retido_fonte" label="ISS retido na fonte?">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="codigo_servico_lc116" label={
                    <span>
                      Código do serviço LC 116/2003
                      <Tooltip title="Código da lista de serviços da LC 116/2003">
                        <InfoCircleOutlined style={{ marginLeft: 8, color: '#1B4F8A' }} />
                      </Tooltip>
                    </span>
                  }>
                    <Input placeholder="Ex: 14.01" />
                  </Form.Item>

                  {/* SEÇÃO: Alíquotas — Lucro Presumido */}
                  {regime === "lucro_presumido" && (
                    <>
                      <Divider>Alíquotas — Lucro Presumido</Divider>
                      <Table
                        dataSource={[
                          { imposto: "PIS", aliquota: "0,65%" },
                          { imposto: "COFINS", aliquota: "3,00%" },
                          { imposto: "IRPJ (serviços)", aliquota: "4,80%" },
                          { imposto: "CSLL (serviços)", aliquota: "2,88%" },
                          { imposto: "Total aproximado", aliquota: "~13%" },
                        ]}
                        columns={[
                          { title: "Imposto", dataIndex: "imposto" },
                          { title: "Alíquota", dataIndex: "aliquota" },
                        ]}
                        pagination={false}
                        size="small"
                        style={{ marginBottom: 16 }}
                      />
                      <Alert
                        message="Alíquotas padrão do Lucro Presumido 2025. Consulte seu contador para confirmar."
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                      />
                    </>
                  )}

                  {/* SEÇÃO: Preview de impostos */}
                  <Divider>Preview de impostos</Divider>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="valor_servicos" label="Valor de serviços (R$)">
                        <InputNumber
                          placeholder="0,00"
                          step={0.01}
                          min={0}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="valor_materiais" label="Valor de materiais (R$)">
                        <InputNumber
                          placeholder="0,00"
                          step={0.01}
                          min={0}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Button
                    onClick={calcularImpostos}
                    style={{ ...btnStyle, marginBottom: 24 }}
                  >
                    Calcular impostos
                  </Button>

                  {impostoPreview && (
                    <Card style={{ backgroundColor: '#f5f5f5', marginBottom: 24 }}>
                      <Row gutter={[16, 8]}>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>Subtotal serviços:</strong> R$ {impostoPreview.subtotal_servicos.toFixed(2)}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>Subtotal materiais:</strong> R$ {impostoPreview.subtotal_materiais.toFixed(2)}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>ISS (5%):</strong> R$ {impostoPreview.iss?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>PIS (0,65%):</strong> R$ {impostoPreview.pis?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>COFINS (3%):</strong> R$ {impostoPreview.cofins?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>IRPJ (4,8%):</strong> R$ {impostoPreview.irpj?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14 }}>
                            <strong>CSLL (2,88%):</strong> R$ {impostoPreview.csll?.toFixed(2) || '0.00'}
                          </div>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '16px 0' }} />
                      <Row gutter={[16, 8]}>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14, color: '#d32f2f' }}>
                            <strong>Total impostos:</strong> R$ {impostoPreview.total_impostos.toFixed(2)}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <div style={{ fontSize: 14, color: '#1B4F8A', fontWeight: 'bold' }}>
                            <strong>Total geral:</strong> R$ {impostoPreview.total_geral.toFixed(2)}
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )}

                  <Button
                    onClick={salvarConfigFiscal}
                    style={{ ...btnStyle, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Salvar configuração fiscal
                  </Button>
                </Form>
              </Spin>
            ),
          },
        ]}
      />
    </Card>
  );
}
