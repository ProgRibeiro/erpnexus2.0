import { useEffect, useState } from "react";
import {
  Button, Card, Col, Drawer, Form, Input, message, Popconfirm,
  Row, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from "@ant-design/icons";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;
const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const SISTEMAS = [
  { value: "erp", label: "ERP Nexus" },
  { value: "facilities", label: "Facilities SaaS" },
  { value: "ambos", label: "ERP + Facilities" },
];
const SISTEMA_COLORS = { erp: "blue", facilities: "green", ambos: "purple" };

export default function MasterPlanosPage() {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form] = Form.useForm();

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await masterApi.get("/planos/");
      setPlanos(Array.isArray(r.data) ? r.data : r.data?.results || []);
    } catch { message.error("Erro ao carregar planos."); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const abrirEditar = (plano) => {
    setEditando(plano);
    form.setFieldsValue({
      ...plano,
      recursos_inclusos: Array.isArray(plano.recursos_inclusos)
        ? plano.recursos_inclusos.join(", ")
        : plano.recursos_inclusos,
    });
    setDrawerOpen(true);
  };

  const salvar = async (values) => {
    const payload = {
      ...values,
      recursos_inclusos: typeof values.recursos_inclusos === "string"
        ? values.recursos_inclusos.split(",").map(s => s.trim()).filter(Boolean)
        : values.recursos_inclusos || [],
    };
    try {
      if (editando?.id) {
        await masterApi.patch(`/planos/${editando.id}/`, payload);
        message.success("Plano atualizado.");
      } else {
        await masterApi.post("/planos/", payload);
        message.success("Plano criado.");
      }
      setDrawerOpen(false);
      setEditando(null);
      form.resetFields();
      carregar();
    } catch { message.error("Erro ao salvar plano."); }
  };

  const excluir = async (id) => {
    try {
      await masterApi.delete(`/planos/${id}/`);
      message.success("Plano excluído.");
      carregar();
    } catch { message.error("Não foi possível excluir."); }
  };

  const columns = [
    {
      title: "Sistema",
      dataIndex: "sistema",
      key: "sistema",
      render: (v, r) => <Tag color={SISTEMA_COLORS[v]}>{r.sistema_display || v}</Tag>,
    },
    { title: "Nome", dataIndex: "nome", key: "nome", render: (v) => <Text strong>{v}</Text> },
    { title: "Descrição", dataIndex: "descricao", key: "descricao", ellipsis: true },
    {
      title: "Valor Mensal",
      dataIndex: "valor_mensal",
      key: "valor",
      render: (v) => <Text strong style={{ color: "#6366F1" }}>{moneyFmt.format(Number(v))}</Text>,
    },
    {
      title: "Limites",
      key: "limites",
      render: (_, r) => (
        <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
          <Text type="secondary">Usuários: <b>{r.limite_usuarios}</b></Text>
          <Text type="secondary">Unidades: <b>{r.limite_unidades}</b></Text>
          <Text type="secondary">Chamados/mês: <b>{r.limite_chamados_mes}</b></Text>
        </Space>
      ),
    },
    {
      title: "Recursos",
      dataIndex: "recursos_inclusos",
      key: "recursos",
      render: (v) => (
        <Space wrap>
          {(Array.isArray(v) ? v : []).map(r => <Tag key={r} style={{ fontSize: 11 }}>{r}</Tag>)}
        </Space>
      ),
    },
    {
      title: "Ativo",
      dataIndex: "ativo",
      key: "ativo",
      render: (v) => v
        ? <CheckCircleOutlined style={{ color: "#10B981", fontSize: 18 }} />
        : <Text type="secondary">—</Text>,
    },
    {
      title: "Ações",
      key: "acoes",
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(record)} />
          <Popconfirm title="Excluir este plano?" onConfirm={() => excluir(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Planos</Title>
          <Text type="secondary">Gerencie os planos disponíveis para ERP Nexus e Facilities SaaS.</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: "#6366F1", borderColor: "#6366F1", borderRadius: 10 }}
          onClick={abrirNovo}
        >
          Novo Plano
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <Table columns={columns} dataSource={planos} loading={loading} rowKey="id" pagination={{ pageSize: 20 }} />
      </Card>

      <Drawer
        title={editando ? "Editar Plano" : "Novo Plano"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" style={{ background: "#6366F1" }} onClick={() => form.submit()}>
            Salvar
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={salvar}>
          <Form.Item name="sistema" label="Sistema" rules={[{ required: true }]}>
            <Select options={SISTEMAS} />
          </Form.Item>
          <Form.Item name="nome" label="Nome do plano" rules={[{ required: true }]}>
            <Input placeholder="Ex: Profissional" />
          </Form.Item>
          <Form.Item name="descricao" label="Descrição">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="valor_mensal" label="Valor mensal (R$)" rules={[{ required: true }]}>
            <Input type="number" step="0.01" prefix="R$" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="limite_usuarios" label="Limite usuários" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="limite_unidades" label="Limite unidades" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="limite_chamados_mes" label="Chamados/mês" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="recursos_inclusos"
            label="Recursos inclusos (separados por vírgula)"
            extra="Ex: dashboard, sla, portal_b2b, mobile, bi"
          >
            <Input.TextArea rows={2} placeholder="dashboard, sla, mobile" />
          </Form.Item>
          <Form.Item name="ativo" label="Ativo" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
