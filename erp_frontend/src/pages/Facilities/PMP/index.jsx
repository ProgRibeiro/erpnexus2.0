import { useState, useEffect } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag,
  Row, Col, Card, Typography, message, Space, Collapse, Switch, InputNumber, Skeleton, Empty,
} from "antd";
import { PlusOutlined, CheckOutlined, ToolOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

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

const tipoLabel = { preventiva: "Preventiva", preditiva: "Preditiva", corretiva: "Corretiva", emergencia: "Emergência" };
const periodicidadeLabel = {
  diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal",
  mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};

function statusPlano(proxima) {
  if (!proxima) return { cor: "default", label: "Sem data" };
  const diff = dayjs(proxima).diff(dayjs(), "day");
  if (diff < 0) return { cor: "red", label: "Vencido" };
  if (diff <= 7) return { cor: "orange", label: `Vence em ${diff}d` };
  return { cor: "green", label: "OK" };
}

export default function PMPPage() {
  const [planos, setPlanos] = useState([]);
  const [ativos, setAtivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [planoExecucao, setPlanoExecucao] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [execForm] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/facilities/planos/?ordering=proxima_execucao"),
      api.get("/facilities/ativos/"),
    ])
      .then(([p, a]) => {
        setPlanos(Array.isArray(p.data) ? p.data : (p.data?.results || []));
        setAtivos(Array.isArray(a.data) ? a.data : (a.data?.results || []));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        proxima_execucao: values.proxima_execucao ? values.proxima_execucao.format("YYYY-MM-DD") : null,
      };
      await api.post("/facilities/planos/", payload);
      message.success("Plano criado com sucesso!");
      setModalOpen(false);
      form.resetFields();
      carregar();
    } catch {
      message.error("Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  };

  const registrarExecucao = async (planoId) => {
    try {
      await api.post(`/facilities/planos/${planoId}/registrar_execucao/`);
      message.success("Execução registrada! Próxima data calculada.");
      carregar();
    } catch {
      message.error("Erro ao registrar execução.");
    }
  };

  const salvarExecucao = async (values) => {
    if (!planoExecucao?.id) return;
    try {
      await api.post(`/facilities/planos/${planoExecucao.id}/registrar_execucao/`, {
        observacoes: values.observacoes || "",
        assinatura_digital: values.assinatura_digital || "",
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        checklist_respostas: planoExecucao.checklist?.map((item) => ({
          item_id: item.id,
          descricao: item.descricao,
          executado: Boolean(values[`check_${item.id}`]),
        })) || [],
      });
      message.success("Execução registrada com evidências.");
      setPlanoExecucao(null);
      execForm.resetFields();
      carregar();
    } catch {
      message.error("Erro ao registrar execução.");
    }
  };

  // Agrupar planos por ativo
  const planosPorAtivo = planos.reduce((acc, p) => {
    const key = `${p.ativo_tag} — ${p.ativo_nome}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const columns = [
    { title: "Nome", dataIndex: "nome", key: "nome", render: (v) => <Text strong style={{ color: colors.texto }}>{v}</Text> },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 120,
      render: (t) => <Tag style={{ borderRadius: 999, fontWeight: 600 }}>{tipoLabel[t]}</Tag>,
    },
    {
      title: "Periodicidade",
      dataIndex: "periodicidade",
      key: "periodicidade",
      width: 130,
      render: (p) => periodicidadeLabel[p],
    },
    {
      title: "Última Execução",
      dataIndex: "ultima_execucao",
      key: "ultima_execucao",
      width: 150,
      render: (d) => d ? dayjs(d).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Próxima Execução",
      dataIndex: "proxima_execucao",
      key: "proxima_execucao",
      width: 160,
      render: (d) => {
        const s = statusPlano(d);
        return <Tag color={s.cor} style={{ borderRadius: 999, fontWeight: 600 }}>{d ? `${dayjs(d).format("DD/MM/YYYY")} (${s.label})` : s.label}</Tag>;
      },
    },
    {
      title: "Ativo",
      dataIndex: "ativo_plano",
      key: "ativo_plano",
      width: 80,
      render: (v) => <Tag color={v ? "green" : "default"} style={{ borderRadius: 999, fontWeight: 600 }}>{v ? "Sim" : "Não"}</Tag>,
    },
    {
      title: "Ações",
      key: "acoes",
      width: 160,
      render: (_, r) => (
        <Button
          size="small"
          icon={<CheckOutlined />}
          onClick={(e) => { e.stopPropagation(); setPlanoExecucao(r); }}
          style={{ borderColor: colors.verde, color: colors.verde, borderRadius: 8, fontWeight: 600 }}
        >
          Registrar Exec.
        </Button>
      ),
    },
  ];

  const checklistColumns = [
    { title: "#", dataIndex: "ordem", key: "ordem", width: 50 },
    { title: "Item", dataIndex: "descricao", key: "descricao" },
    {
      title: "Obrigatório",
      dataIndex: "obrigatorio",
      key: "obrigatorio",
      width: 110,
      render: (v) => <Tag color={v ? "red" : "default"} style={{ borderRadius: 999, fontWeight: 600 }}>{v ? "Sim" : "Não"}</Tag>,
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
                background: `${colors.roxo}14`,
                color: colors.roxo,
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
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>
                Manutenção Preventiva (PMP)
              </Title>
              <Text style={{ color: colors.textoSecundario }}>
                Planos e execuções programadas de manutenção
              </Text>
            </div>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ height: 40, paddingInline: 20, fontWeight: 600, borderRadius: 10 }}
          >
            Novo Plano
          </Button>
        </div>
      </Card>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: planos.length ? 8 : 20 }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : Object.keys(planosPorAtivo).length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum plano cadastrado" style={{ padding: "32px 0" }} />
        ) : (
          <Collapse accordion ghost>
            {Object.entries(planosPorAtivo).map(([ativoKey, planosList]) => (
              <Panel
                key={ativoKey}
                header={
                  <Space wrap>
                    <span style={{ fontWeight: 700, color: colors.texto }}>{ativoKey}</span>
                    <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>{planosList.length} planos</Tag>
                    {planosList.some((p) => statusPlano(p.proxima_execucao).cor === "red") && (
                      <Tag color="red" style={{ borderRadius: 999, fontWeight: 600 }}>Vencido</Tag>
                    )}
                    {planosList.some((p) => statusPlano(p.proxima_execucao).cor === "orange") && (
                      <Tag color="orange" style={{ borderRadius: 999, fontWeight: 600 }}>Vencendo</Tag>
                    )}
                  </Space>
                }
              >
                <Table
                  dataSource={planosList}
                  columns={columns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  expandable={{
                    expandedRowRender: (r) => (
                      r.checklist?.length > 0 ? (
                        <div style={{ padding: "8px 16px", background: colors.fundoSuave, borderRadius: 8 }}>
                          <Text strong style={{ fontSize: 13, color: colors.texto }}>Checklist:</Text>
                          <Table
                            dataSource={r.checklist}
                            columns={checklistColumns}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: colors.textoFraco, padding: "0 16px" }}>Sem itens no checklist</span>
                      )
                    ),
                  }}
                />
              </Panel>
            ))}
          </Collapse>
        )}
      </Card>

      <Modal
        title="Novo Plano de Manutenção"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        confirmLoading={saving}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={salvar} style={{ marginTop: 8 }}>
          <Form.Item name="ativo" label="Ativo" rules={[{ required: true }]}>
            <Select showSearch placeholder="Selecione o ativo" optionFilterProp="children">
              {ativos.map((a) => (
                <Option key={a.id} value={a.id}>{a.tag} — {a.nome}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="nome" label="Nome do Plano" rules={[{ required: true }]}>
            <Input placeholder="Ex: Manutenção Semestral HVAC" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(tipoLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="periodicidade" label="Periodicidade" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(periodicidadeLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="proxima_execucao" label="Próxima Execução">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="norma_referencia" label="Norma / Referência">
                <Input placeholder="PMOC, NBR 16401, NBR 5674" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="notificar_dias_antes" label="Avisar antes" initialValue={3}>
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gerar_relatorio_pmoc" label="Relatório PMOC" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descricao" label="Descrição">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={planoExecucao ? `Registrar execução — ${planoExecucao.nome}` : "Registrar execução"}
        open={!!planoExecucao}
        onCancel={() => { setPlanoExecucao(null); execForm.resetFields(); }}
        onOk={() => execForm.submit()}
        okText="Registrar"
        cancelText="Cancelar"
        width={680}
        okButtonProps={{ style: { background: colors.verde, borderColor: colors.verde } }}
      >
        <Form form={execForm} layout="vertical" onFinish={salvarExecucao}>
          <div style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.textoSecundario }}>Checklist digital</Text>
            <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
              {(planoExecucao?.checklist || []).length === 0 ? (
                <Text style={{ color: colors.textoSecundario }}>Sem itens cadastrados.</Text>
              ) : planoExecucao.checklist.map((item) => (
                <Form.Item key={item.id} name={`check_${item.id}`} valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Switch checkedChildren="OK" unCheckedChildren="Pendente" /> <span style={{ marginLeft: 8 }}>{item.descricao}</span>
                </Form.Item>
              ))}
            </Space>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="latitude" label="Latitude">
                <InputNumber style={{ width: "100%" }} step={0.0000001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="longitude" label="Longitude">
                <InputNumber style={{ width: "100%" }} step={0.0000001} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="assinatura_digital" label="Assinatura digital">
            <Input placeholder="Nome do responsável / protocolo" />
          </Form.Item>
          <Form.Item name="observacoes" label="Observações da execução">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
