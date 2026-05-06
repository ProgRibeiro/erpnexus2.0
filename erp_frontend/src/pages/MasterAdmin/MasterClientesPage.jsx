import { useEffect, useState } from "react";
import {
  Badge, Button, Card, Col, Drawer, Form, Input, message, Modal,
  Row, Select, Space, Table, Tag, Tooltip, Typography, Popconfirm,
} from "antd";
import {
  PlusOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined,
  EditOutlined, KeyOutlined, EyeOutlined, WarningOutlined,
} from "@ant-design/icons";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;
const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v) => moneyFmt.format(Number(v || 0));

const STATUS_COLORS = { ativo: "green", trial: "blue", suspenso: "red", cancelado: "default" };
const STATUS_LABELS = { ativo: "Ativo", trial: "Trial", suspenso: "Suspenso", cancelado: "Cancelado" };

export default function MasterClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState(undefined);
  const [filtroSistema, setFiltroSistema] = useState(undefined);
  const [busca, setBusca] = useState("");
  const [novaAssinaturaOpen, setNovaAssinaturaOpen] = useState(false);
  const [formCliente] = Form.useForm();
  const [formAssinatura] = Form.useForm();

  useEffect(() => { carregar(); carregarPlanos(); }, []);

  const carregar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      if (filtroSistema) params.sistema = filtroSistema;
      if (busca) params.busca = busca;
      const r = await masterApi.get("/clientes/", { params });
      setClientes(Array.isArray(r.data) ? r.data : r.data?.results || []);
    } catch { message.error("Erro ao carregar clientes."); }
    finally { setLoading(false); }
  };

  const carregarPlanos = async () => {
    try {
      const r = await masterApi.get("/planos/");
      setPlanos((Array.isArray(r.data) ? r.data : r.data?.results || []).map(p => ({
        value: p.id, label: `${p.sistema_display} — ${p.nome} (${fmt(p.valor_mensal)}/mês)`,
      })));
    } catch {}
  };

  const salvarCliente = async (values) => {
    try {
      if (clienteSelecionado?.id) {
        await masterApi.patch(`/clientes/${clienteSelecionado.id}/`, values);
        message.success("Cliente atualizado.");
      } else {
        await masterApi.post("/clientes/", values);
        message.success("Cliente criado.");
      }
      setDrawerOpen(false);
      setClienteSelecionado(null);
      formCliente.resetFields();
      carregar();
    } catch { message.error("Erro ao salvar cliente."); }
  };

  const bloquear = async (cliente) => {
    try {
      await masterApi.post(`/clientes/${cliente.id}/bloquear/`, { motivo: "Bloqueio por inadimplência." });
      message.success("Cliente suspenso.");
      carregar();
    } catch { message.error("Erro ao bloquear."); }
  };

  const desbloquear = async (cliente) => {
    try {
      await masterApi.post(`/clientes/${cliente.id}/desbloquear/`);
      message.success("Cliente reativado.");
      carregar();
    } catch { message.error("Erro ao desbloquear."); }
  };

  const resetarSenha = async (cliente) => {
    try {
      const r = await masterApi.post(`/clientes/${cliente.id}/resetar-senha/`);
      Modal.success({
        title: "Nova senha gerada",
        content: (
          <div>
            <p>A senha provisória do cliente <strong>{cliente.nome_empresa}</strong> é:</p>
            <div style={{ background: "#F1F5F9", padding: "12px 16px", borderRadius: 8, fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "#6366F1", textAlign: "center" }}>
              {r.data.nova_senha}
            </div>
            <p style={{ marginTop: 12, color: "#64748B", fontSize: 13 }}>Guarde e envie ao cliente. Ele deve alterar no primeiro acesso.</p>
          </div>
        ),
      });
    } catch { message.error("Erro ao resetar senha."); }
  };

  const abrirDetalhe = async (cliente) => {
    try {
      const r = await masterApi.get(`/clientes/${cliente.id}/`);
      setClienteSelecionado(r.data);
      setDetalheOpen(true);
    } catch {}
  };

  const criarAssinatura = async (values) => {
    if (!clienteSelecionado) return;
    try {
      await masterApi.post("/assinaturas/", { ...values, cliente: clienteSelecionado.id });
      message.success("Assinatura criada.");
      setNovaAssinaturaOpen(false);
      formAssinatura.resetFields();
      abrirDetalhe(clienteSelecionado);
    } catch { message.error("Erro ao criar assinatura."); }
  };

  const columns = [
    {
      title: "Empresa",
      dataIndex: "nome_empresa",
      key: "nome_empresa",
      render: (v, r) => (
        <div>
          <Text strong>{v}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.cnpj || r.email_responsavel}</Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v, r) => <Tag color={STATUS_COLORS[v]}>{r.status_display || STATUS_LABELS[v] || v}</Tag>,
    },
    {
      title: "Assinatura Ativa",
      key: "assinatura",
      render: (_, r) => {
        if (!r.assinatura_ativa) return <Text type="secondary">Sem assinatura</Text>;
        const a = r.assinatura_ativa;
        return (
          <div>
            <Tag color={a.sistema === "erp" ? "blue" : a.sistema === "facilities" ? "green" : "purple"}>
              {a.sistema_display}
            </Tag>
            <Text style={{ fontSize: 12 }}> {a.plano} • {fmt(a.valor)}/mês</Text>
          </div>
        );
      },
    },
    {
      title: "Vencimento",
      key: "vencimento",
      render: (_, r) => {
        const prox = r.assinatura_ativa?.proximo_vencimento;
        if (!prox) return "-";
        const venc = new Date(prox);
        const hoje = new Date();
        const dias = Math.ceil((venc - hoje) / 86400000);
        return (
          <div>
            <Text style={{ color: dias <= 7 ? "#EF4444" : dias <= 15 ? "#F59E0B" : "#10B981" }}>
              {prox} {dias <= 7 && <WarningOutlined />}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Inadimplência",
      key: "inadim",
      render: (_, r) => r.total_mensalidades_vencidas > 0
        ? <Badge count={r.total_mensalidades_vencidas} color="red" />
        : <CheckCircleOutlined style={{ color: "#10B981" }} />,
    },
    {
      title: "Ações",
      key: "acoes",
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalhes">
            <Button size="small" icon={<EyeOutlined />} onClick={() => abrirDetalhe(record)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              setClienteSelecionado(record);
              formCliente.setFieldsValue(record);
              setDrawerOpen(true);
            }} />
          </Tooltip>
          <Tooltip title="Resetar senha">
            <Button size="small" icon={<KeyOutlined />} onClick={() => resetarSenha(record)} />
          </Tooltip>
          {record.status !== "suspenso" ? (
            <Popconfirm title="Suspender este cliente?" onConfirm={() => bloquear(record)} okText="Sim" cancelText="Não">
              <Button size="small" danger icon={<StopOutlined />} />
            </Popconfirm>
          ) : (
            <Tooltip title="Reativar">
              <Button size="small" icon={<CheckCircleOutlined />} style={{ color: "#10B981", borderColor: "#10B981" }} onClick={() => desbloquear(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Clientes SaaS</Title>
          <Text type="secondary">Gerencie todos os clientes dos dois sistemas.</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: "#6366F1", borderColor: "#6366F1", borderRadius: 10 }}
          onClick={() => { setClienteSelecionado(null); formCliente.resetFields(); setDrawerOpen(true); }}
        >
          Novo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} sm={8}>
            <Input placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} onPressEnter={carregar} />
          </Col>
          <Col xs={24} sm={6}>
            <Select placeholder="Status" allowClear style={{ width: "100%" }} value={filtroStatus} onChange={v => { setFiltroStatus(v); }}>
              <Select.Option value="ativo">Ativo</Select.Option>
              <Select.Option value="trial">Trial</Select.Option>
              <Select.Option value="suspenso">Suspenso</Select.Option>
              <Select.Option value="cancelado">Cancelado</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select placeholder="Sistema" allowClear style={{ width: "100%" }} value={filtroSistema} onChange={v => setFiltroSistema(v)}>
              <Select.Option value="erp">ERP Nexus</Select.Option>
              <Select.Option value="facilities">Facilities SaaS</Select.Option>
              <Select.Option value="ambos">ERP + Facilities</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button block onClick={carregar}>Filtrar</Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <Table columns={columns} dataSource={clientes} loading={loading} rowKey="id" pagination={{ pageSize: 15 }} />
      </Card>

      {/* Drawer Novo/Editar Cliente */}
      <Drawer
        title={clienteSelecionado?.id ? "Editar Cliente" : "Novo Cliente"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" style={{ background: "#6366F1" }} onClick={() => formCliente.submit()}>
            Salvar
          </Button>
        }
      >
        <Form form={formCliente} layout="vertical" onFinish={salvarCliente}>
          <Form.Item name="nome_empresa" label="Nome da empresa" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="razao_social" label="Razão social">
            <Input />
          </Form.Item>
          <Form.Item name="cnpj" label="CNPJ">
            <Input placeholder="00.000.000/0000-00" />
          </Form.Item>
          <Form.Item name="nome_responsavel" label="Nome do responsável" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email_responsavel" label="E-mail responsável" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="telefone" label="Telefone">
            <Input />
          </Form.Item>
          <Form.Item name="login_admin" label="E-mail de login (admin do sistema)" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="trial">
            <Select>
              <Select.Option value="trial">Trial</Select.Option>
              <Select.Option value="ativo">Ativo</Select.Option>
              <Select.Option value="suspenso">Suspenso</Select.Option>
              <Select.Option value="cancelado">Cancelado</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Modal Detalhes + Assinaturas */}
      <Drawer
        title={`Detalhes — ${clienteSelecionado?.nome_empresa || ""}`}
        open={detalheOpen}
        onClose={() => setDetalheOpen(false)}
        width={560}
        extra={
          <Button icon={<PlusOutlined />} style={{ color: "#6366F1", borderColor: "#6366F1" }} onClick={() => setNovaAssinaturaOpen(true)}>
            Nova Assinatura
          </Button>
        }
      >
        {clienteSelecionado && (
          <div>
            <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
              <Row gutter={16}>
                <Col span={12}><Text type="secondary">CNPJ</Text><br /><Text strong>{clienteSelecionado.cnpj || "-"}</Text></Col>
                <Col span={12}><Text type="secondary">Status</Text><br /><Tag color={STATUS_COLORS[clienteSelecionado.status]}>{clienteSelecionado.status_display || clienteSelecionado.status}</Tag></Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={12}><Text type="secondary">E-mail responsável</Text><br /><Text>{clienteSelecionado.email_responsavel}</Text></Col>
                <Col span={12}><Text type="secondary">Login admin</Text><br /><Text code>{clienteSelecionado.login_admin}</Text></Col>
              </Row>
              {clienteSelecionado.observacoes && (
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">Observações</Text>
                  <div style={{ background: "#F8FAFC", padding: 8, borderRadius: 6, marginTop: 4, fontSize: 12, whiteSpace: "pre-wrap" }}>
                    {clienteSelecionado.observacoes}
                  </div>
                </div>
              )}
            </Card>

            <Title level={5}>Assinaturas</Title>
            {(clienteSelecionado.assinaturas || []).length === 0
              ? <Text type="secondary">Nenhuma assinatura.</Text>
              : (clienteSelecionado.assinaturas || []).map(a => (
                <Card key={a.id} size="small" style={{ marginBottom: 10, borderRadius: 10 }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Tag color={a.plano_sistema === "erp" ? "blue" : a.plano_sistema === "facilities" ? "green" : "purple"}>
                        {a.plano_sistema_display}
                      </Tag>
                      <Text strong> {a.plano_nome}</Text>
                    </Col>
                    <Tag color={{ ativo: "green", trial: "blue", vencido: "red", cancelado: "default", suspenso: "red" }[a.status]}>
                      {a.status_display}
                    </Tag>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col><Text type="secondary">Valor</Text><br /><Text strong>{moneyFmt.format(Number(a.valor_com_desconto))}/mês</Text></Col>
                    <Col><Text type="secondary">Desconto</Text><br /><Text>{a.desconto_percentual}%</Text></Col>
                    <Col><Text type="secondary">Próx. venc.</Text><br /><Text>{a.data_proximo_vencimento || "-"}</Text></Col>
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {a.pagamentos?.length || 0} mensalidades registradas •{" "}
                      Pago: {fmt(a.total_pago)} •{" "}
                      Pendente: {fmt(a.total_pendente)}
                    </Text>
                  </div>
                </Card>
              ))
            }
          </div>
        )}
      </Drawer>

      {/* Modal nova assinatura */}
      <Modal
        title="Nova Assinatura"
        open={novaAssinaturaOpen}
        onCancel={() => setNovaAssinaturaOpen(false)}
        onOk={() => formAssinatura.submit()}
        okText="Criar"
        okButtonProps={{ style: { background: "#6366F1" } }}
      >
        <Form form={formAssinatura} layout="vertical" onFinish={criarAssinatura} style={{ marginTop: 16 }}>
          <Form.Item name="plano" label="Plano" rules={[{ required: true }]}>
            <Select options={planos} placeholder="Selecione o plano" />
          </Form.Item>
          <Form.Item name="status" label="Status inicial" initialValue="trial">
            <Select>
              <Select.Option value="trial">Trial</Select.Option>
              <Select.Option value="ativo">Ativo</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="data_inicio" label="Data início" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="data_proximo_vencimento" label="Próx. vencimento">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="valor_negociado" label="Valor negociado (R$)" rules={[{ required: true }]}>
            <Input type="number" step="0.01" prefix="R$" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="desconto_percentual" label="Desconto (%)" initialValue={0}>
                <Input type="number" suffix="%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="motivo_desconto" label="Motivo desconto">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
