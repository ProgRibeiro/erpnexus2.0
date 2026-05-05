import { useState, useEffect } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag,
  Row, Col, Card, Typography, message, Space, Collapse,
} from "antd";
import { PlusOutlined, CheckOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

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
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

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

  // Agrupar planos por ativo
  const planosPorAtivo = planos.reduce((acc, p) => {
    const key = `${p.ativo_tag} — ${p.ativo_nome}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const columns = [
    { title: "Nome", dataIndex: "nome", key: "nome" },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 120,
      render: (t) => <Tag>{tipoLabel[t]}</Tag>,
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
        return <Tag color={s.cor}>{d ? `${dayjs(d).format("DD/MM/YYYY")} (${s.label})` : s.label}</Tag>;
      },
    },
    {
      title: "Ativo",
      dataIndex: "ativo_plano",
      key: "ativo_plano",
      width: 80,
      render: (v) => <Tag color={v ? "green" : "default"}>{v ? "Sim" : "Não"}</Tag>,
    },
    {
      title: "Ações",
      key: "acoes",
      width: 160,
      render: (_, r) => (
        <Button
          size="small"
          icon={<CheckOutlined />}
          onClick={(e) => { e.stopPropagation(); registrarExecucao(r.id); }}
          style={{ borderColor: "#10B981", color: "#10B981" }}
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
      render: (v) => <Tag color={v ? "red" : "default"}>{v ? "Sim" : "Não"}</Tag>,
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Manutenção Preventiva (PMP)</Title>
          <Text type="secondary">Planos e execuções programadas de manutenção</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 8 }}
          >
            Novo Plano
          </Button>
        </Col>
      </Row>

      <Card style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Carregando...</div>
        ) : Object.keys(planosPorAtivo).length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF" }}>Nenhum plano cadastrado</div>
        ) : (
          <Collapse accordion ghost>
            {Object.entries(planosPorAtivo).map(([ativoKey, planosList]) => (
              <Panel
                key={ativoKey}
                header={
                  <Space>
                    <span style={{ fontWeight: 600 }}>{ativoKey}</span>
                    <Tag color="blue">{planosList.length} planos</Tag>
                    {planosList.some((p) => statusPlano(p.proxima_execucao).cor === "red") && (
                      <Tag color="red">Vencido</Tag>
                    )}
                    {planosList.some((p) => statusPlano(p.proxima_execucao).cor === "orange") && (
                      <Tag color="orange">Vencendo</Tag>
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
                        <div style={{ padding: "8px 16px", background: "#F9FAFB", borderRadius: 8 }}>
                          <Text strong style={{ fontSize: 13 }}>Checklist:</Text>
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
                        <span style={{ color: "#9CA3AF", padding: "0 16px" }}>Sem itens no checklist</span>
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
        okButtonProps={{ style: { background: "#3B82F6", borderColor: "#3B82F6" } }}
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
          <Form.Item name="descricao" label="Descrição">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
