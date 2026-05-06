import { useState, useEffect, useCallback } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import api from "../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

const ROLE_CONFIG = {
  tecnico:      { label: "Técnico",       color: "blue" },
  admin:        { label: "Administrador", color: "red" },
  gestor:       { label: "Gestor",        color: "purple" },
  financeiro:   { label: "Financeiro",    color: "gold" },
  comercial:    { label: "Comercial",     color: "orange" },
  estoquista:   { label: "Estoquista",    color: "cyan" },
  suporte:      { label: "Suporte",       color: "geekblue" },
  vendedor_loja:{ label: "Vendedor",      color: "lime" },
  gerente_loja: { label: "Gerente Loja",  color: "volcano" },
};

const STATUS_CONFIG = {
  ativo:     { label: "Ativo",     badgeStatus: "success" },
  inativo:   { label: "Inativo",   badgeStatus: "error" },
  bloqueado: { label: "Bloqueado", badgeStatus: "warning" },
  ferias:    { label: "Férias",    badgeStatus: "processing" },
  afastado:  { label: "Afastado",  badgeStatus: "default" },
};

const TIPO_CONTRATACAO = [
  { value: "clt",          label: "CLT" },
  { value: "pj",           label: "PJ" },
  { value: "estagiario",   label: "Estagiário" },
  { value: "terceirizado", label: "Terceirizado" },
  { value: "freelancer",   label: "Freelancer" },
];

const AVATAR_COLORS = ["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#EF4444","#6366F1"];

function getInitials(first, last) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

function avatarColor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
}

export default function EquipePage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRole, setFiltroRole] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");

  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalSenha, setModalSenha] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formNovo] = Form.useForm();
  const [formEditar] = Form.useForm();

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/");
      const lista = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
      setUsuarios(lista);
    } catch {
      message.error("Erro ao carregar equipe");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const filtrados = usuarios.filter((u) => {
    const matchRole   = filtroRole   === "todos" || u.role   === filtroRole;
    const matchStatus = filtroStatus === "todos" || u.status === filtroStatus;
    const nome = `${u.first_name || ""} ${u.last_name || ""} ${u.email || ""}`.toLowerCase();
    const matchBusca  = !busca || nome.includes(busca.toLowerCase());
    return matchRole && matchStatus && matchBusca;
  });

  const total    = usuarios.length;
  const ativos   = usuarios.filter((u) => u.status === "ativo" && u.is_active).length;
  const tecnicos = usuarios.filter((u) => u.role === "tecnico").length;

  const handleCriar = async (values) => {
    setSaving(true);
    try {
      const res = await api.post("/auth/", values);
      const senha = res.data.senha_temporaria;
      if (senha) {
        Modal.success({
          title: "Colaborador criado!",
          content: (
            <div>
              <p>Senha temporária gerada:</p>
              <code style={{ fontSize: 18, background: "#F1F5F9", padding: "8px 16px", borderRadius: 8, display: "block", textAlign: "center" }}>
                {senha}
              </code>
              <p style={{ marginTop: 8, color: "#64748B", fontSize: 12 }}>
                Entregue para o colaborador. Ele deve trocar no primeiro acesso.
              </p>
            </div>
          ),
        });
      } else {
        message.success("Colaborador criado com sucesso!");
      }
      setModalNovo(false);
      formNovo.resetFields();
      fetchUsuarios();
    } catch (err) {
      message.error(err?.response?.data?.error || "Erro ao criar colaborador");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async (values) => {
    if (!modalEditar) return;
    setSaving(true);
    try {
      await api.patch(`/auth/${modalEditar.id}/`, values);
      message.success("Dados atualizados!");
      setModalEditar(null);
      fetchUsuarios();
    } catch {
      message.error("Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleDesativar = async (id) => {
    try {
      await api.delete(`/auth/${id}/`);
      message.success("Usuário desativado");
      fetchUsuarios();
    } catch {
      message.error("Erro ao desativar");
    }
  };

  const handleResetarSenha = async () => {
    if (!modalSenha) return;
    setSaving(true);
    try {
      const res = await api.post(`/auth/${modalSenha.id}/resetar-senha/`);
      const nova = res.data.nova_senha_temporaria;
      setModalSenha(null);
      Modal.success({
        title: "Senha resetada",
        content: (
          <div>
            <p>Nova senha temporária para <strong>{modalSenha.first_name}</strong>:</p>
            <code style={{ fontSize: 18, background: "#F1F5F9", padding: "8px 16px", borderRadius: 8, display: "block", textAlign: "center" }}>
              {nova || "Verifique o sistema"}
            </code>
          </div>
        ),
      });
    } catch {
      message.error("Erro ao resetar senha");
    } finally {
      setSaving(false);
    }
  };

  const abrirEditar = (u) => {
    setModalEditar(u);
    formEditar.setFieldsValue({
      first_name:        u.first_name,
      last_name:         u.last_name,
      telefone:          u.telefone,
      whatsapp:          u.whatsapp,
      cargo:             u.cargo,
      departamento:      u.departamento,
      tipo_contratacao:  u.tipo_contratacao,
      role:              u.role,
    });
  };

  const columns = [
    {
      title: "Colaborador",
      key: "nome",
      render: (_, u) => (
        <Space>
          <Avatar
            size={38}
            style={{ background: avatarColor(u.id), fontWeight: 700, flexShrink: 0 }}
          >
            {getInitials(u.first_name, u.last_name)}
          </Avatar>
          <div>
            <Text strong style={{ display: "block", lineHeight: 1.3 }}>
              {u.first_name} {u.last_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Perfil",
      dataIndex: "role",
      render: (r) => {
        const c = ROLE_CONFIG[r] || { label: r, color: "default" };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: "Cargo",
      dataIndex: "cargo",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Contratação",
      dataIndex: "tipo_contratacao",
      render: (v) => {
        const t = TIPO_CONTRATACAO.find((x) => x.value === v);
        return t ? t.label : (v || "—");
      },
    },
    {
      title: "Telefone",
      dataIndex: "telefone",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      render: (_, u) => {
        const s = STATUS_CONFIG[u.status] || { label: u.status, badgeStatus: "default" };
        return <Badge status={s.badgeStatus} text={s.label} />;
      },
    },
    {
      title: "",
      key: "acoes",
      align: "right",
      render: (_, u) => (
        <Space>
          <Tooltip title="Editar dados">
            <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(u)} />
          </Tooltip>
          <Tooltip title="Resetar senha">
            <Button size="small" icon={<KeyOutlined />} onClick={() => setModalSenha(u)} />
          </Tooltip>
          {u.is_active && (
            <Popconfirm
              title="Desativar usuário?"
              description="O colaborador perderá acesso ao sistema."
              okText="Desativar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDesativar(u.id)}
            >
              <Tooltip title="Desativar acesso">
                <Button size="small" danger icon={<LockOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#F4F6F9", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Space size={12}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#3B82F618", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TeamOutlined style={{ fontSize: 22, color: "#3B82F6" }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>Equipe & Técnicos</Title>
            <Text type="secondary">Cadastro e gestão de colaboradores</Text>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 8 }}
          onClick={() => { setModalNovo(true); formNovo.resetFields(); }}
        >
          Novo Colaborador
        </Button>
      </div>

      {/* Métricas */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: "Total na equipe", value: total,    color: "#3B82F6", bg: "#EFF6FF", icon: <TeamOutlined /> },
          { label: "Ativos",          value: ativos,   color: "#10B981", bg: "#ECFDF5", icon: <CheckCircleOutlined /> },
          { label: "Técnicos",        value: tecnicos, color: "#8B5CF6", bg: "#F5F3FF", icon: <UserOutlined /> },
        ].map((m) => (
          <Col xs={8} key={m.label}>
            <Card style={{ borderRadius: 12, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Space>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", color: m.color, fontSize: 20 }}>
                  {m.icon}
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{m.label}</div>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filtros */}
      <Card style={{ marginBottom: 16, borderRadius: 12, border: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <Row gutter={12} align="middle">
          <Col flex="1">
            <Input
              placeholder="Buscar por nome ou e-mail..."
              prefix={<UserOutlined style={{ color: "#94A3B8" }} />}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col>
            <Select value={filtroRole} onChange={setFiltroRole} style={{ width: 170 }}>
              <Option value="todos">Todos os perfis</Option>
              {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select value={filtroStatus} onChange={setFiltroStatus} style={{ width: 155 }}>
              <Option value="todos">Todos os status</Option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Tabela */}
      <Card style={{ borderRadius: 12, border: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <Table
          dataSource={filtrados}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} colaboradores` }}
          locale={{ emptyText: "Nenhum colaborador encontrado" }}
        />
      </Card>

      {/* ===== Modal: Novo Colaborador ===== */}
      <Modal
        open={modalNovo}
        onCancel={() => setModalNovo(false)}
        title={<Space><PlusOutlined style={{ color: "#3B82F6" }} /><span>Novo Colaborador</span></Space>}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={formNovo} layout="vertical" onFinish={handleCriar} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="first_name" label="Nome" rules={[{ required: true, message: "Informe o nome" }]}>
                <Input placeholder="João" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Sobrenome">
                <Input placeholder="Silva" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label="E-mail" rules={[{ required: true, type: "email", message: "E-mail válido obrigatório" }]}>
            <Input placeholder="joao@empresa.com" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Perfil / Função" rules={[{ required: true }]} initialValue="tecnico">
                <Select>
                  {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tipo_contratacao" label="Tipo de contratação" initialValue="clt">
                <Select>
                  {TIPO_CONTRATACAO.map((t) => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="cargo" label="Cargo">
                <Input placeholder="Ex: Técnico de Refrigeração" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departamento" label="Departamento">
                <Input placeholder="Ex: Campo" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="telefone" label="Telefone">
                <Input placeholder="(11) 99999-9999" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="Senha inicial (opcional)">
                <Password placeholder="Gerada automaticamente se vazio" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "8px 0 16px" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setModalNovo(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving} style={{ background: "#3B82F6", borderColor: "#3B82F6" }}>
              Criar Colaborador
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ===== Modal: Editar ===== */}
      <Modal
        open={!!modalEditar}
        onCancel={() => setModalEditar(null)}
        title={<Space><EditOutlined style={{ color: "#3B82F6" }} /><span>Editar — {modalEditar?.first_name} {modalEditar?.last_name}</span></Space>}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={formEditar} layout="vertical" onFinish={handleEditar} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="first_name" label="Nome" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Sobrenome">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Perfil / Função">
                <Select>
                  {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tipo_contratacao" label="Tipo de contratação">
                <Select>
                  {TIPO_CONTRATACAO.map((t) => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="cargo" label="Cargo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departamento" label="Departamento">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="telefone" label="Telefone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="whatsapp" label="WhatsApp">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "8px 0 16px" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving} style={{ background: "#3B82F6", borderColor: "#3B82F6" }}>
              Salvar alterações
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ===== Modal: Resetar Senha ===== */}
      <Modal
        open={!!modalSenha}
        onCancel={() => setModalSenha(null)}
        title={<Space><KeyOutlined style={{ color: "#F59E0B" }} /><span>Resetar senha</span></Space>}
        footer={null}
        width={420}
      >
        <div style={{ padding: "12px 0 20px" }}>
          <Text type="secondary">
            Uma nova senha temporária será gerada para{" "}
            <strong>{modalSenha?.first_name} {modalSenha?.last_name}</strong>.
            Copie e entregue para o colaborador.
          </Text>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => setModalSenha(null)}>Cancelar</Button>
          <Button
            loading={saving}
            icon={<KeyOutlined />}
            style={{ background: "#F59E0B", borderColor: "#F59E0B", color: "#fff" }}
            onClick={handleResetarSenha}
          >
            Gerar nova senha
          </Button>
        </div>
      </Modal>
    </div>
  );
}
