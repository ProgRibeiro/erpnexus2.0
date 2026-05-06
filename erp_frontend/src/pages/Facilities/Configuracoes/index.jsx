import { useState, useEffect } from "react";
import {
  Row, Col, Card, Tabs, Table, Button, Form, Input, Select,
  Modal, Typography, Space, Tag, Divider, Spin, message, Tooltip,
  InputNumber, Switch, Badge,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, BuildOutlined,
  TeamOutlined, EnvironmentOutlined, CheckCircleOutlined,
  SafetyCertificateOutlined, ShopOutlined, SettingOutlined,
  DollarOutlined, UserOutlined,
} from "@ant-design/icons";
import api from "../../../services/api";

const { Title, Text } = Typography;

const TIPOS_UNIDADE = [
  { value: "loja_shopping", label: "Loja Shopping" },
  { value: "escritorio", label: "Escritório" },
  { value: "fabrica", label: "Fábrica" },
  { value: "centro_distribuicao", label: "Centro de Distribuição" },
  { value: "outlet", label: "Outlet" },
];

const TIPOS_EMPRESA = [
  { value: "matriz", label: "Matriz" },
  { value: "regional", label: "Regional" },
  { value: "unidade", label: "Unidade" },
];

const STATUS_TENANT = {
  trial: { color: "blue", label: "Trial" },
  ativo: { color: "green", label: "Ativo" },
  suspenso: { color: "orange", label: "Suspenso" },
  cancelado: { color: "red", label: "Cancelado" },
};

// ─── Hook genérico de dados ────────────────────────────────────────────────

function useDados(endpoint, deps = []) {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    try {
      setLoading(true);
      const res = await api.get(endpoint);
      setDados(res.data?.results ?? res.data ?? []);
    } catch {
      message.error(`Erro ao carregar ${endpoint}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, deps);

  return { dados, loading, recarregar: carregar };
}

// ─── Aba: Informações do Tenant ────────────────────────────────────────────

function AbaInfoTenant() {
  const { dados: tenants, loading, recarregar } = useDados("/saas/tenants/");
  const { dados: planos } = useDados("/saas/planos/");
  const [form] = Form.useForm();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);

  const abrirNovo = () => { form.resetFields(); setEditando(null); setModalAberto(true); };
  const abrirEdicao = (reg) => { form.setFieldsValue(reg); setEditando(reg); setModalAberto(true); };

  const salvar = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editando) {
        await api.patch(`/saas/tenants/${editando.id}/`, vals);
        message.success("Tenant atualizado");
      } else {
        await api.post("/saas/tenants/", vals);
        message.success("Tenant criado");
      }
      setModalAberto(false);
      recarregar();
    } catch (e) {
      if (e?.errorFields) return;
      message.error("Erro ao salvar tenant");
    } finally { setSaving(false); }
  };

  const excluir = async (id) => {
    try {
      await api.delete(`/saas/tenants/${id}/`);
      message.success("Tenant desativado");
      recarregar();
    } catch { message.error("Erro ao desativar"); }
  };

  const cols = [
    { title: "Empresa", dataIndex: "nome", key: "nome", render: (v, r) => (
      <Space direction="vertical" size={0}>
        <Text strong>{v}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.cnpj}</Text>
      </Space>
    )},
    { title: "Plano", dataIndex: "plano", key: "plano", render: (v) => (
      <Tag color="purple">{v}</Tag>
    )},
    { title: "Status", dataIndex: "status", key: "status", render: (v) => {
      const s = STATUS_TENANT[v] ?? { color: "default", label: v };
      return <Badge status={s.color === "green" ? "success" : s.color === "red" ? "error" : "processing"} text={s.label} />;
    }},
    { title: "Limite Usuários", dataIndex: "limite_usuarios", key: "limite_usuarios" },
    { title: "Limite Unidades", dataIndex: "limite_unidades", key: "limite_unidades" },
    { title: "Ações", key: "acoes", render: (_, r) => (
      <Space>
        <Tooltip title="Editar"><Button icon={<EditOutlined />} size="small" onClick={() => abrirEdicao(r)} /></Tooltip>
        <Tooltip title="Desativar"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => excluir(r.id)} /></Tooltip>
      </Space>
    )},
  ];

  return (
    <div>
      <Space className="mb-4" style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo}>Novo Tenant</Button>
      </Space>
      <Table columns={cols} dataSource={tenants} rowKey="id" loading={loading} size="middle" pagination={{ pageSize: 10 }} />

      <Modal title={editando ? "Editar Tenant" : "Novo Tenant"} open={modalAberto} onOk={salvar}
        onCancel={() => setModalAberto(false)} confirmLoading={saving} width={640}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="nome" label="Nome" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="cnpj" label="CNPJ" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="razao_social" label="Razão Social"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
              <Select options={[
                { value: "contratante", label: "Contratante" },
                { value: "prestador", label: "Prestador" },
                { value: "ambos", label: "Ambos" },
              ]} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="plano" label="Plano" rules={[{ required: true }]}>
              <Select options={[
                { value: "basico", label: "Básico" },
                { value: "profissional", label: "Profissional" },
                { value: "enterprise", label: "Enterprise" },
              ]} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="Status" initialValue="ativo">
              <Select options={Object.entries(STATUS_TENANT).map(([v, s]) => ({ value: v, label: s.label }))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="limite_usuarios" label="Limite de Usuários" initialValue={10}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="limite_unidades" label="Limite de Unidades" initialValue={50}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="limite_chamados_mes" label="Chamados/Mês" initialValue={200}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="valor_mensalidade" label="Mensalidade (R$)">
              <InputNumber min={0} precision={2} prefix="R$" style={{ width: "100%" }} />
            </Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Aba: Empresas (Hierarquia) ─────────────────────────────────────────────

function AbaEmpresas() {
  const { dados: empresas, loading, recarregar } = useDados("/saas/empresas/");
  const { dados: tenants } = useDados("/saas/tenants/");
  const [form] = Form.useForm();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);

  const abrirNovo = () => { form.resetFields(); setEditando(null); setModalAberto(true); };
  const abrirEdicao = (r) => { form.setFieldsValue(r); setEditando(r); setModalAberto(true); };

  const salvar = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editando) {
        await api.patch(`/saas/empresas/${editando.id}/`, vals);
        message.success("Empresa atualizada");
      } else {
        await api.post("/saas/empresas/", vals);
        message.success("Empresa criada");
      }
      setModalAberto(false);
      recarregar();
    } catch (e) {
      if (e?.errorFields) return;
      message.error("Erro ao salvar empresa");
    } finally { setSaving(false); }
  };

  const excluir = async (id) => {
    await api.delete(`/saas/empresas/${id}/`);
    message.success("Empresa desativada");
    recarregar();
  };

  const NIVEL_COR = { 1: "gold", 2: "blue", 3: "green" };
  const NIVEL_LABEL = { 1: "Matriz", 2: "Regional", 3: "Unidade" };

  const cols = [
    { title: "Empresa", dataIndex: "nome", key: "nome", render: (v, r) => (
      <Space direction="vertical" size={0}>
        <Text strong>{v}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.cnpj}</Text>
      </Space>
    )},
    { title: "Nível", dataIndex: "nivel_hierarquia", key: "nivel_hierarquia", render: (v) => (
      <Tag color={NIVEL_COR[v] ?? "default"}>{NIVEL_LABEL[v] ?? v}</Tag>
    )},
    { title: "Tipo", dataIndex: "tipo", key: "tipo", render: (v) => <Tag>{v}</Tag> },
    { title: "Tenant", dataIndex: "tenant", key: "tenant", render: (id) => {
      const t = tenants.find(t => t.id === id);
      return t ? <Text type="secondary">{t.nome}</Text> : id;
    }},
    { title: "Ações", key: "acoes", render: (_, r) => (
      <Space>
        <Button icon={<EditOutlined />} size="small" onClick={() => abrirEdicao(r)} />
        <Button icon={<DeleteOutlined />} size="small" danger onClick={() => excluir(r.id)} />
      </Space>
    )},
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo}>Nova Empresa</Button>
      </Space>
      <Table columns={cols} dataSource={empresas} rowKey="id" loading={loading} size="middle" />
      <Modal title={editando ? "Editar Empresa" : "Nova Empresa"} open={modalAberto}
        onOk={salvar} onCancel={() => setModalAberto(false)} confirmLoading={saving} width={600}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="nome" label="Nome" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="cnpj" label="CNPJ"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="razao_social" label="Razão Social"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="tenant" label="Tenant" rules={[{ required: true }]}>
              <Select options={tenants.map(t => ({ value: t.id, label: t.nome }))} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
              <Select options={TIPOS_EMPRESA} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="nivel_hierarquia" label="Nível" initialValue={3}>
              <Select options={[
                { value: 1, label: "1 — Matriz" },
                { value: 2, label: "2 — Regional" },
                { value: 3, label: "3 — Unidade" },
              ]} />
            </Form.Item></Col>
            <Col span={24}><Form.Item name="empresa_pai" label="Empresa Pai (opcional)">
              <Select allowClear options={empresas.map(e => ({ value: e.id, label: e.nome }))} />
            </Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Aba: Níveis de Aprovação ──────────────────────────────────────────────

function AbaNiveisAprovacao() {
  const { dados: niveis, loading, recarregar } = useDados("/saas/niveis-aprovacao/");
  const { dados: tenants } = useDados("/saas/tenants/");
  const [form] = Form.useForm();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);

  const abrirNovo = () => { form.resetFields(); setEditando(null); setModalAberto(true); };
  const abrirEdicao = (r) => { form.setFieldsValue(r); setEditando(r); setModalAberto(true); };

  const salvar = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editando) {
        await api.patch(`/saas/niveis-aprovacao/${editando.id}/`, vals);
        message.success("Nível atualizado");
      } else {
        await api.post("/saas/niveis-aprovacao/", vals);
        message.success("Nível criado");
      }
      setModalAberto(false);
      recarregar();
    } catch (e) {
      if (e?.errorFields) return;
      message.error("Erro ao salvar nível");
    } finally { setSaving(false); }
  };

  const cols = [
    { title: "Ordem", dataIndex: "ordem", key: "ordem", width: 60, render: (v) => <Tag color="blue">{v}°</Tag> },
    { title: "Nome", dataIndex: "nome", key: "nome", render: (v) => <Text strong>{v}</Text> },
    { title: "Faixa de Valor", key: "faixa", render: (_, r) => (
      <Text>R$ {Number(r.valor_minimo).toLocaleString("pt-BR")} — R$ {Number(r.valor_maximo).toLocaleString("pt-BR")}</Text>
    )},
    { title: "3 Cotações?", dataIndex: "requer_3_cotacoes", key: "requer_3_cotacoes", render: (v) => (
      v ? <CheckCircleOutlined style={{ color: "#10B981" }} /> : <Text type="secondary">Não</Text>
    )},
    { title: "Tenant", dataIndex: "tenant", key: "tenant", render: (id) => {
      const t = tenants.find(t => t.id === id);
      return t ? <Text type="secondary">{t.nome}</Text> : <Text type="secondary">Global</Text>;
    }},
    { title: "Ações", key: "acoes", render: (_, r) => (
      <Space>
        <Button icon={<EditOutlined />} size="small" onClick={() => abrirEdicao(r)} />
      </Space>
    )},
  ];

  return (
    <div>
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Define as alçadas de aprovação por faixa de valor. Chamados e orçamentos acima do limite
        passam automaticamente pelo fluxo de aprovação correspondente.
      </Text>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo}>Novo Nível</Button>
      </Space>
      <Table columns={cols} dataSource={niveis} rowKey="id" loading={loading} size="middle" />
      <Modal title={editando ? "Editar Nível de Aprovação" : "Novo Nível de Aprovação"}
        open={modalAberto} onOk={salvar} onCancel={() => setModalAberto(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="nome" label="Nome (ex: Coordenador, Diretor)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="valor_minimo" label="Valor Mínimo (R$)" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} prefix="R$" style={{ width: "100%" }} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="valor_maximo" label="Valor Máximo (R$)" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} prefix="R$" style={{ width: "100%" }} />
            </Form.Item></Col>
          </Row>
          <Form.Item name="ordem" label="Ordem (prioridade)" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="requer_3_cotacoes" label="Requer 3 Cotações?" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="tenant" label="Tenant (deixe vazio para global)">
            <Select allowClear options={tenants.map(t => ({ value: t.id, label: t.nome }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Aba: Planos SaaS ──────────────────────────────────────────────────────

function AbaPlanosSaaS() {
  const { dados: planos, loading } = useDados("/saas/planos/");

  const COR_PLANO = { basico: "#6B7280", profissional: "#3B82F6", enterprise: "#7C3AED" };
  const ICONE_PLANO = { basico: "⭐", profissional: "💎", enterprise: "🏆" };

  return (
    <div>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Planos disponíveis na plataforma. Para criar ou editar planos, use o painel administrativo.
      </Text>
      {loading ? <Spin /> : (
        <Row gutter={[16, 16]}>
          {planos.map(p => (
            <Col xs={24} md={8} key={p.id}>
              <Card style={{ borderTop: `4px solid ${COR_PLANO[p.nome.toLowerCase().replace(" ", "")] ?? "#3B82F6"}` }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text style={{ fontSize: 28 }}>{ICONE_PLANO[p.nome.toLowerCase().replace(" ", "")]}</Text>
                  <Title level={4} style={{ margin: 0 }}>{p.nome}</Title>
                  <Title level={2} style={{ margin: 0, color: "#3B82F6" }}>
                    R$ {Number(p.valor_mensal).toLocaleString("pt-BR")}<span style={{ fontSize: 14, fontWeight: 400 }}>/mês</span>
                  </Title>
                  <Divider style={{ margin: "8px 0" }} />
                  <Space direction="vertical" size={4}>
                    <Text><UserOutlined /> até {p.limite_usuarios} usuários</Text>
                    <Text><EnvironmentOutlined /> até {p.limite_unidades} unidades</Text>
                    <Text><BuildOutlined /> até {p.limite_chamados_mes} chamados/mês</Text>
                  </Space>
                  {p.recursos_inclusos?.length > 0 && (
                    <>
                      <Divider style={{ margin: "8px 0" }} />
                      <Space wrap>
                        {p.recursos_inclusos.map(r => (
                          <Tag key={r} color="green" icon={<CheckCircleOutlined />}>{r}</Tag>
                        ))}
                      </Space>
                    </>
                  )}
                  <Tag color={p.ativo ? "green" : "red"}>{p.ativo ? "Ativo" : "Inativo"}</Tag>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

// ─── Aba: Prestadores Contratados ──────────────────────────────────────────

function AbaPrestadores() {
  const { dados: prestadores, loading, recarregar } = useDados("/saas/prestadores-contratados/");
  const { dados: tenants } = useDados("/saas/tenants/");
  const [form] = Form.useForm();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);

  const abrirNovo = () => { form.resetFields(); setEditando(null); setModalAberto(true); };
  const abrirEdicao = (r) => { form.setFieldsValue(r); setEditando(r); setModalAberto(true); };

  const salvar = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editando) {
        await api.patch(`/saas/prestadores-contratados/${editando.id}/`, vals);
        message.success("Prestador atualizado");
      } else {
        await api.post("/saas/prestadores-contratados/", vals);
        message.success("Prestador contratado adicionado");
      }
      setModalAberto(false);
      recarregar();
    } catch (e) {
      if (e?.errorFields) return;
      message.error("Erro ao salvar prestador contratado");
    } finally { setSaving(false); }
  };

  const cols = [
    { title: "Prestador", dataIndex: "tenant_prestador", key: "tenant_prestador", render: (id) => {
      const t = tenants.find(t => t.id === id);
      return <Text strong>{t?.nome ?? `Tenant #${id}`}</Text>;
    }},
    { title: "SLA Atendimento", dataIndex: "sla_atendimento_horas", key: "sla", render: (v) => `${v}h` },
    { title: "Valor/Hora", dataIndex: "valor_hora_padrao", key: "valor", render: (v) => (
      v ? `R$ ${Number(v).toLocaleString("pt-BR")}` : "—"
    )},
    { title: "Status", dataIndex: "ativo", key: "ativo", render: (v) => (
      <Badge status={v ? "success" : "error"} text={v ? "Ativo" : "Inativo"} />
    )},
    { title: "Ações", key: "acoes", render: (_, r) => (
      <Space>
        <Button icon={<EditOutlined />} size="small" onClick={() => abrirEdicao(r)} />
      </Space>
    )},
  ];

  return (
    <div>
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        Prestadores de serviço com contrato ativo. Podem receber chamados e orçamentos da plataforma.
      </Text>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo}>Adicionar Prestador</Button>
      </Space>
      <Table columns={cols} dataSource={prestadores} rowKey="id" loading={loading} size="middle" />
      <Modal title={editando ? "Editar Prestador Contratado" : "Adicionar Prestador Contratado"}
        open={modalAberto} onOk={salvar} onCancel={() => setModalAberto(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="tenant_contratante" label="Contratante" rules={[{ required: true }]}>
            <Select options={tenants.filter(t => t.tipo !== "prestador").map(t => ({ value: t.id, label: t.nome }))} />
          </Form.Item>
          <Form.Item name="tenant_prestador" label="Prestador" rules={[{ required: true }]}>
            <Select options={tenants.filter(t => t.tipo !== "contratante").map(t => ({ value: t.id, label: t.nome }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="sla_atendimento_horas" label="SLA Atendimento (h)" initialValue={4}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item></Col>
            <Col span={12}><Form.Item name="valor_hora_padrao" label="Valor/Hora (R$)">
              <InputNumber min={0} precision={2} prefix="R$" style={{ width: "100%" }} />
            </Form.Item></Col>
          </Row>
          <Form.Item name="ativo" label="Ativo?" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Aba: Categorias de Budget ─────────────────────────────────────────────

function AbaCategoriasBudget() {
  const { dados, loading, recarregar } = useDados("/saas/categorias-budget/");
  const [form] = Form.useForm();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);

  const abrirNovo = () => { form.resetFields(); setEditando(null); setModalAberto(true); };
  const abrirEdicao = (r) => { form.setFieldsValue(r); setEditando(r); setModalAberto(true); };

  const salvar = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editando) {
        await api.patch(`/saas/categorias-budget/${editando.id}/`, vals);
        message.success("Categoria atualizada");
      } else {
        await api.post("/saas/categorias-budget/", vals);
        message.success("Categoria criada");
      }
      setModalAberto(false);
      recarregar();
    } catch (e) {
      if (e?.errorFields) return;
      message.error("Erro ao salvar");
    } finally { setSaving(false); }
  };

  const cols = [
    { title: "Cor", dataIndex: "cor_hex", key: "cor", render: (v) => (
      <div style={{ width: 24, height: 24, background: v, borderRadius: 6, border: "1px solid #eee" }} />
    )},
    { title: "Nome", dataIndex: "nome", key: "nome", render: (v) => <Text strong>{v}</Text> },
    { title: "Status", dataIndex: "ativo", key: "ativo", render: (v) => (
      <Badge status={v ? "success" : "error"} text={v ? "Ativo" : "Inativo"} />
    )},
    { title: "Ações", key: "acoes", render: (_, r) => (
      <Space>
        <Button icon={<EditOutlined />} size="small" onClick={() => abrirEdicao(r)} />
      </Space>
    )},
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNovo}>Nova Categoria</Button>
      </Space>
      <Table columns={cols} dataSource={dados} rowKey="id" loading={loading} size="middle" />
      <Modal title={editando ? "Editar Categoria" : "Nova Categoria de Budget"}
        open={modalAberto} onOk={salvar} onCancel={() => setModalAberto(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="nome" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="cor_hex" label="Cor (hex)" rules={[{ required: true }]} initialValue="#3B82F6">
            <Input type="color" style={{ width: 80, padding: 2 }} />
          </Form.Item>
          <Form.Item name="ativo" label="Ativa?" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────

const ABAS = [
  {
    key: "tenant", label: (
      <Space><BuildOutlined /> Tenants</Space>
    ), children: <AbaInfoTenant />,
  },
  {
    key: "empresas", label: (
      <Space><TeamOutlined /> Empresas</Space>
    ), children: <AbaEmpresas />,
  },
  {
    key: "niveis", label: (
      <Space><SafetyCertificateOutlined /> Alçadas</Space>
    ), children: <AbaNiveisAprovacao />,
  },
  {
    key: "planos", label: (
      <Space><DollarOutlined /> Planos SaaS</Space>
    ), children: <AbaPlanosSaaS />,
  },
  {
    key: "prestadores", label: (
      <Space><ShopOutlined /> Prestadores</Space>
    ), children: <AbaPrestadores />,
  },
  {
    key: "categorias", label: (
      <Space><SettingOutlined /> Budget</Space>
    ), children: <AbaCategoriasBudget />,
  },
];

export default function FacilitiesConfiguracoesPage() {
  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={[0, 16]}>
        <Col span={24}>
          <Card>
            <Space align="start">
              <SettingOutlined style={{ fontSize: 32, color: "#3B82F6" }} />
              <div>
                <Title level={3} style={{ margin: 0 }}>Configurações do Facilities</Title>
                <Text type="secondary">
                  Gerencie tenants, estrutura de empresas, alçadas de aprovação, planos e prestadores contratados.
                  Essas configurações são independentes do ERP Nexus.
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Card bodyStyle={{ padding: 0 }}>
            <Tabs
              items={ABAS}
              tabBarStyle={{ padding: "0 24px", marginBottom: 0 }}
              tabBarGutter={32}
              style={{ padding: "0" }}
              tabPosition="top"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
