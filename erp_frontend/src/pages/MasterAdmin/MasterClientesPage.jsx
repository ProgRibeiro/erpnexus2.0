import { useEffect, useState } from "react";
import {
  Badge, Button, Card, Col, Drawer, Empty, Form, Input, message, Modal,
  Row, Select, Space, Table, Tag, Tabs, Typography, Popconfirm, Skeleton,
} from "antd";
import { PlusOutlined, MoreOutlined, CheckCircleOutlined } from "@ant-design/icons";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;
const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v) => moneyFmt.format(Number(v || 0));

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

const STATUS_COLORS = { ativo: "green", trial: "blue", suspenso: "red", cancelado: "default" };
const STATUS_LABELS = { ativo: "Ativo", trial: "Trial", suspenso: "Suspenso", cancelado: "Cancelado" };
const SISTEMA_COLORS = { erp: "blue", facilities: "green", ambos: "purple" };
const SISTEMA_LABELS = { erp: "ERP", facilities: "Facilities", ambos: "Ambos" };
const PGTO_STATUS_COLORS = { pendente: "orange", pago: "green", vencido: "red", cancelado: "default" };
const PGTO_STATUS_LABELS = { pendente: "Pendente", pago: "Pago", vencido: "Vencido", cancelado: "Cancelado" };

function avatarColor(name) {
  const palette = [colors.azul, colors.verde, colors.laranja, colors.vermelho, "#0E7490", colors.roxo, "#2563EB"];
  const i = (name || "?").charCodeAt(0) % palette.length;
  return palette[i];
}

export default function MasterClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscaText, setBuscaText] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [sistemaFiltro, setSistemaFiltro] = useState("");

  const [drawerDetalhe, setDrawerDetalhe] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  const [drawerNovo, setDrawerNovo] = useState(false);
  const [formNovo] = Form.useForm();
  const [savingNovo, setSavingNovo] = useState(false);

  const [modalDesconto, setModalDesconto] = useState(null);
  const [formDesconto] = Form.useForm();
  const [savingDesconto, setSavingDesconto] = useState(false);

  const [modalPagamento, setModalPagamento] = useState(null);
  const [formPagamento] = Form.useForm();
  const [savingPagamento, setSavingPagamento] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await masterApi.get("/clientes/");
      setClientes(Array.isArray(r.data) ? r.data : r.data.results || []);
    } catch {
      message.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const abrirDetalhe = async (id) => {
    setDrawerDetalhe(true);
    setLoadingDetalhe(true);
    try {
      const r = await masterApi.get(`/clientes/${id}/`);
      setClienteSel(r.data);
    } catch {
      message.error("Erro ao carregar detalhes.");
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const handleBloquear = async (id) => {
    try {
      await masterApi.post(`/clientes/${id}/bloquear/`, { motivo: "Bloqueio pelo administrador." });
      message.success("Cliente bloqueado.");
      load();
      if (clienteSel && clienteSel.id === id) abrirDetalhe(id);
    } catch { message.error("Erro ao bloquear."); }
  };

  const handleDesbloquear = async (id) => {
    try {
      await masterApi.post(`/clientes/${id}/desbloquear/`, {});
      message.success("Cliente desbloqueado.");
      load();
      if (clienteSel && clienteSel.id === id) abrirDetalhe(id);
    } catch { message.error("Erro ao desbloquear."); }
  };

  const handleCancelar = async (id) => {
    try {
      await masterApi.post(`/clientes/${id}/cancelar/`, { motivo: "Cancelamento pelo administrador." });
      message.success("Cliente cancelado.");
      load();
      if (clienteSel && clienteSel.id === id) abrirDetalhe(id);
    } catch { message.error("Erro ao cancelar."); }
  };

  const handleNovoCliente = async (values) => {
    setSavingNovo(true);
    try {
      await masterApi.post("/clientes/", values);
      message.success("Cliente criado com sucesso!");
      setDrawerNovo(false);
      formNovo.resetFields();
      load();
    } catch { message.error("Erro ao criar cliente."); }
    finally { setSavingNovo(false); }
  };

  const handleDesconto = async (values) => {
    setSavingDesconto(true);
    try {
      await masterApi.post(`/assinaturas/${modalDesconto.assinaturaId}/aplicar-desconto/`, values);
      message.success("Desconto aplicado!");
      setModalDesconto(null);
      formDesconto.resetFields();
      if (clienteSel) abrirDetalhe(clienteSel.id);
    } catch { message.error("Erro ao aplicar desconto."); }
    finally { setSavingDesconto(false); }
  };

  const handleConfirmarPagamento = async (values) => {
    setSavingPagamento(true);
    try {
      await masterApi.post(`/pagamentos/${modalPagamento.pagamentoId}/confirmar-pagamento/`, {
        forma: values.forma,
        data_pagamento: values.data_pagamento,
      });
      message.success("Pagamento confirmado!");
      setModalPagamento(null);
      formPagamento.resetFields();
      if (clienteSel) abrirDetalhe(clienteSel.id);
    } catch { message.error("Erro ao confirmar pagamento."); }
    finally { setSavingPagamento(false); }
  };

  const clientesFiltrados = clientes.filter((c) => {
    if (buscaText && !c.nome_empresa?.toLowerCase().includes(buscaText.toLowerCase()) &&
        !c.email_responsavel?.toLowerCase().includes(buscaText.toLowerCase())) return false;
    if (statusFiltro && c.status !== statusFiltro) return false;
    if (sistemaFiltro && c.assinatura_ativa?.sistema !== sistemaFiltro) return false;
    return true;
  });

  const totalAtivos = clientes.filter((c) => c.status === "ativo").length;
  const totalTrial = clientes.filter((c) => c.status === "trial").length;
  const totalSuspensos = clientes.filter((c) => c.status === "suspenso").length;

  const hoje = new Date().toISOString().slice(0, 10);

  const columns = [
    {
      title: "Cliente", key: "cliente",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${avatarColor(r.nome_empresa)}, ${avatarColor(r.nome_empresa)}99)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 14,
          }}>
            {(r.nome_empresa || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: colors.texto }}>{r.nome_empresa}</div>
            <div style={{ fontSize: 11, color: colors.textoFraco }}>{r.email_responsavel}</div>
          </div>
        </div>
      ),
    },
    {
      title: "CNPJ", dataIndex: "cnpj", key: "cnpj",
      render: (v) => <Text style={{ fontSize: 12 }}>{v || "—"}</Text>,
    },
    {
      title: "Sistema", key: "sistema",
      render: (_, r) => r.assinatura_ativa
        ? <Tag color={SISTEMA_COLORS[r.assinatura_ativa.sistema] || "default"} style={{ fontSize: 11 }}>
            {SISTEMA_LABELS[r.assinatura_ativa.sistema] || r.assinatura_ativa.sistema}
          </Tag>
        : <Text style={{ color: colors.textoFraco, fontSize: 12 }}>—</Text>,
    },
    {
      title: "Plano / MRR", key: "plano",
      render: (_, r) => r.assinatura_ativa
        ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.texto }}>{r.assinatura_ativa.plano}</div>
            <div style={{ fontSize: 11, color: colors.verde, fontWeight: 600 }}>{fmt(r.assinatura_ativa.valor)}</div>
          </div>
        )
        : <Text style={{ color: colors.textoFraco, fontSize: 12 }}>—</Text>,
    },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (v, r) => <Tag color={STATUS_COLORS[v] || "default"}>{r.status_display || STATUS_LABELS[v] || v}</Tag>,
    },
    {
      title: "Próx. Venc.", key: "venc",
      render: (_, r) => {
        const d = r.assinatura_ativa?.proximo_vencimento;
        if (!d) return <Text style={{ color: colors.textoFraco, fontSize: 12 }}>—</Text>;
        const overdue = d < hoje;
        const close = !overdue && d <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        return (
          <Text style={{ fontSize: 12, color: overdue ? colors.vermelho : close ? colors.laranja : colors.textoSecundario }}>
            {d}
          </Text>
        );
      },
    },
    {
      title: "Ações", key: "acoes",
      render: (_, r) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button size="small" onClick={() => abrirDetalhe(r.id)} style={{ fontSize: 12, borderRadius: 6 }}>Detalhes</Button>
          {r.status === "suspenso" ? (
            <Popconfirm title="Desbloquear cliente?" onConfirm={() => handleDesbloquear(r.id)} okText="Sim" cancelText="Não">
              <Button size="small" style={{ fontSize: 12, color: colors.azul, borderColor: colors.azul, borderRadius: 6 }}>Desbloquear</Button>
            </Popconfirm>
          ) : r.status !== "cancelado" ? (
            <Popconfirm title="Bloquear cliente?" onConfirm={() => handleBloquear(r.id)} okText="Sim" cancelText="Não">
              <Button size="small" danger style={{ fontSize: 12, borderRadius: 6 }}>Bloquear</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const pgtoColums = [
    { title: "Referência", dataIndex: "referencia", key: "ref", width: 90 },
    { title: "Valor", dataIndex: "valor_cobrado", key: "valor", render: (v) => fmt(v) },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (v, r) => <Tag color={PGTO_STATUS_COLORS[v] || "default"}>{r.status_display || PGTO_STATUS_LABELS[v] || v}</Tag>,
    },
    { title: "Vencimento", dataIndex: "data_vencimento", key: "venc" },
    { title: "Pagamento", dataIndex: "data_pagamento", key: "pgto", render: (v) => v || "—" },
    {
      title: "Forma", dataIndex: "forma_pagamento", key: "forma",
      render: (v, r) => r.forma_display || v || "—",
    },
    {
      title: "Ação", key: "acao",
      render: (_, r) => r.status !== "pago" ? (
        <Button
          size="small" icon={<CheckCircleOutlined />} type="primary"
          style={{ fontSize: 11, background: colors.verde, borderColor: colors.verde, borderRadius: 6 }}
          onClick={() => {
            setModalPagamento({ pagamentoId: r.id });
            formPagamento.setFieldsValue({ data_pagamento: hoje, forma: "pix" });
          }}
        >
          Confirmar
        </Button>
      ) : null,
    },
  ];

  const allPagamentos = clienteSel
    ? (clienteSel.assinaturas || []).flatMap((a) => (a.pagamentos || []))
    : [];

  return (
    <div style={{ padding: 28, background: colors.fundoSuave, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Title level={4} style={{ margin: 0, color: colors.texto }}>Clientes SaaS</Title>
          <Badge count={clientes.length} style={{ background: colors.azul }} showZero />
        </div>
        <Button
          type="primary" icon={<PlusOutlined />}
          style={{
            background: `linear-gradient(135deg, ${colors.azul}, ${colors.roxo})`, border: "none",
            borderRadius: 8, fontWeight: 600, transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 10px 22px rgba(59, 130, 246, 0.28)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          onClick={() => setDrawerNovo(true)}
        >
          Novo Cliente
        </Button>
      </div>

      {/* KPI Mini */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: "Total", value: clientes.length, color: colors.azul },
          { label: "Ativos", value: totalAtivos, color: colors.verde },
          { label: "Trial", value: totalTrial, color: colors.laranja },
          { label: "Suspensos", value: totalSuspensos, color: colors.vermelho },
        ].map((k) => (
          <Col key={k.label} xs={12} sm={12} md={6}>
            <div
              style={{
                background: "#fff", border: `1px solid ${colors.borda}`, borderRadius: 14,
                padding: "14px 18px", textAlign: "center",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.07)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.04)";
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 12, color: colors.textoSecundario, fontWeight: 500 }}>{k.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap",
        background: "#fff", border: `1px solid ${colors.borda}`, borderRadius: 14,
        padding: "14px 18px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
      }}>
        <Input.Search
          placeholder="Buscar empresa ou email..."
          value={buscaText}
          onChange={(e) => setBuscaText(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Status" allowClear value={statusFiltro || undefined}
          onChange={(v) => setStatusFiltro(v || "")} style={{ width: 130 }}
        >
          <Select.Option value="ativo">Ativo</Select.Option>
          <Select.Option value="trial">Trial</Select.Option>
          <Select.Option value="suspenso">Suspenso</Select.Option>
          <Select.Option value="cancelado">Cancelado</Select.Option>
        </Select>
        <Select
          placeholder="Sistema" allowClear value={sistemaFiltro || undefined}
          onChange={(v) => setSistemaFiltro(v || "")} style={{ width: 130 }}
        >
          <Select.Option value="erp">ERP</Select.Option>
          <Select.Option value="facilities">Facilities</Select.Option>
          <Select.Option value="ambos">Ambos</Select.Option>
        </Select>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: "#fff", borderRadius: 16, border: `1px solid ${colors.borda}`,
          overflow: "hidden", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Table
          columns={columns}
          dataSource={clientesFiltrados}
          rowKey="id"
          loading={{ spinning: loading, tip: "Carregando clientes..." }}
          size="middle"
          pagination={{ pageSize: 15 }}
          onRow={(r) => ({
            style: { cursor: "pointer", transition: "background 0.2s ease" },
            onClick: () => abrirDetalhe(r.id),
            onMouseEnter: (e) => { e.currentTarget.style.background = colors.fundoSuave; },
            onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
          })}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhum cliente encontrado"
                style={{ padding: "32px 0" }}
              />
            ),
          }}
          scroll={{ x: 900 }}
        />
      </div>

      {/* Drawer Detalhe */}
      <Drawer
        title={null}
        open={drawerDetalhe}
        onClose={() => setDrawerDetalhe(false)}
        width={680}
        bodyStyle={{ padding: 0 }}
      >
        {loadingDetalhe ? (
          <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : clienteSel ? (
          <div>
            {/* Header drawer */}
            <div style={{
              padding: "24px 24px 20px",
              background: "linear-gradient(135deg, #0B1220, #1E293B)",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${avatarColor(clienteSel.nome_empresa)}, ${avatarColor(clienteSel.nome_empresa)}99)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 22,
              }}>
                {(clienteSel.nome_empresa || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>{clienteSel.nome_empresa}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Tag color={STATUS_COLORS[clienteSel.status] || "default"} style={{ margin: 0 }}>
                    {clienteSel.status_display || STATUS_LABELS[clienteSel.status]}
                  </Tag>
                  {clienteSel.cnpj && <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{clienteSel.cnpj}</Text>}
                </div>
              </div>
            </div>

            <div style={{ padding: "0 24px 24px" }}>
              <Tabs
                defaultActiveKey="info"
                items={[
                  {
                    key: "info",
                    label: "Informações",
                    children: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                          ["Empresa", clienteSel.nome_empresa],
                          ["Razão Social", clienteSel.razao_social],
                          ["CNPJ", clienteSel.cnpj],
                          ["Responsável", clienteSel.nome_responsavel],
                          ["Email", clienteSel.email_responsavel],
                          ["Telefone", clienteSel.telefone],
                          ["Login Admin", clienteSel.login_admin],
                          ["Observações", clienteSel.observacoes],
                        ].map(([label, value]) => value ? (
                          <div key={label} style={{ display: "flex", gap: 12 }}>
                            <Text style={{ color: colors.textoFraco, fontSize: 12, width: 110, flexShrink: 0 }}>{label}</Text>
                            <Text style={{ fontSize: 13, color: colors.texto }}>{value}</Text>
                          </div>
                        ) : null)}
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          {clienteSel.status !== "cancelado" && (
                            clienteSel.status === "suspenso" ? (
                              <Popconfirm title="Desbloquear cliente?" onConfirm={() => handleDesbloquear(clienteSel.id)}>
                                <Button type="primary" size="small" style={{ background: colors.azul, borderColor: colors.azul }}>Desbloquear</Button>
                              </Popconfirm>
                            ) : (
                              <Popconfirm title="Bloquear cliente?" onConfirm={() => handleBloquear(clienteSel.id)}>
                                <Button danger size="small">Bloquear</Button>
                              </Popconfirm>
                            )
                          )}
                          {clienteSel.status !== "cancelado" && (
                            <Popconfirm title="Cancelar cliente?" onConfirm={() => handleCancelar(clienteSel.id)}>
                              <Button danger size="small" ghost>Cancelar</Button>
                            </Popconfirm>
                          )}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "assinaturas",
                    label: "Assinaturas",
                    children: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {(clienteSel.assinaturas || []).map((a) => (
                          <div key={a.id} style={{
                            border: `1px solid ${colors.borda}`, borderRadius: 12, padding: 16,
                            background: colors.fundoSuave,
                            transition: "border-color 0.2s ease",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <Text strong style={{ fontSize: 14 }}>{a.plano_nome}</Text>
                                <Tag color={SISTEMA_COLORS[a.plano_sistema] || "default"} style={{ marginLeft: 8, fontSize: 11 }}>
                                  {SISTEMA_LABELS[a.plano_sistema] || a.plano_sistema}
                                </Tag>
                              </div>
                              <Tag color={STATUS_COLORS[a.status] || "default"}>{a.status_display || a.status}</Tag>
                            </div>
                            <div style={{ display: "flex", gap: 24, marginTop: 10, flexWrap: "wrap" }}>
                              <div>
                                <Text style={{ fontSize: 11, color: colors.textoFraco }}>Valor</Text>
                                <div style={{ fontSize: 14, fontWeight: 700, color: colors.verde }}>{fmt(a.valor_com_desconto)}</div>
                              </div>
                              <div>
                                <Text style={{ fontSize: 11, color: colors.textoFraco }}>Início</Text>
                                <div style={{ fontSize: 13, color: colors.texto }}>{a.data_inicio}</div>
                              </div>
                              {a.desconto_percentual > 0 && (
                                <div>
                                  <Text style={{ fontSize: 11, color: colors.textoFraco }}>Desconto</Text>
                                  <div style={{ fontSize: 13, color: colors.laranja }}>{a.desconto_percentual}%</div>
                                </div>
                              )}
                            </div>
                            <Button
                              size="small" style={{ marginTop: 10, fontSize: 11, borderRadius: 6 }}
                              onClick={() => {
                                setModalDesconto({ assinaturaId: a.id });
                                formDesconto.setFieldsValue({ percentual: a.desconto_percentual, motivo: a.motivo_desconto });
                              }}
                            >
                              Aplicar Desconto
                            </Button>
                          </div>
                        ))}
                        {(!clienteSel.assinaturas || clienteSel.assinaturas.length === 0) && (
                          <Text style={{ color: colors.textoFraco }}>Nenhuma assinatura encontrada.</Text>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "pagamentos",
                    label: "Pagamentos",
                    children: (
                      <div style={{ overflowX: "auto" }}>
                        <Table
                          columns={pgtoColums}
                          dataSource={allPagamentos}
                          rowKey="id"
                          size="small"
                          pagination={false}
                          scroll={{ x: 600 }}
                        />
                      </div>
                    ),
                  },
                  {
                    key: "atividade",
                    label: "Atividade",
                    children: (
                      <div style={{ padding: "20px 0", textAlign: "center", color: colors.textoFraco }}>
                        Histórico de atividade em breve.
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Drawer Novo Cliente */}
      <Drawer
        title="Novo Cliente"
        open={drawerNovo}
        onClose={() => setDrawerNovo(false)}
        width={480}
        footer={
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setDrawerNovo(false)} style={{ marginRight: 8 }}>Cancelar</Button>
            <Button
              type="primary" loading={savingNovo}
              style={{ background: `linear-gradient(135deg, ${colors.azul}, ${colors.roxo})`, border: "none" }}
              onClick={() => formNovo.submit()}
            >
              Criar Cliente
            </Button>
          </div>
        }
      >
        <Form form={formNovo} layout="vertical" onFinish={handleNovoCliente}>
          <Form.Item name="nome_empresa" label="Nome da Empresa" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cnpj" label="CNPJ">
            <Input />
          </Form.Item>
          <Form.Item name="nome_responsavel" label="Responsável" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email_responsavel" label="Email Responsável" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="telefone" label="Telefone">
            <Input />
          </Form.Item>
          <Form.Item name="login_admin" label="Login Admin (Email)" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="trial">
            <Select>
              <Select.Option value="trial">Trial</Select.Option>
              <Select.Option value="ativo">Ativo</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Modal Desconto */}
      <Modal
        title="Aplicar Desconto"
        open={!!modalDesconto}
        onCancel={() => setModalDesconto(null)}
        onOk={() => formDesconto.submit()}
        confirmLoading={savingDesconto}
        okText="Aplicar"
      >
        <Form form={formDesconto} layout="vertical" onFinish={handleDesconto}>
          <Form.Item name="percentual" label="Desconto (%)" rules={[{ required: true }]}>
            <Input type="number" min={0} max={100} suffix="%" />
          </Form.Item>
          <Form.Item name="motivo" label="Motivo">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Confirmar Pagamento */}
      <Modal
        title="Confirmar Pagamento"
        open={!!modalPagamento}
        onCancel={() => setModalPagamento(null)}
        onOk={() => formPagamento.submit()}
        confirmLoading={savingPagamento}
        okText="Confirmar"
      >
        <Form form={formPagamento} layout="vertical" onFinish={handleConfirmarPagamento}>
          <Form.Item name="data_pagamento" label="Data do Pagamento" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="forma" label="Forma de Pagamento" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="pix">PIX</Select.Option>
              <Select.Option value="boleto">Boleto</Select.Option>
              <Select.Option value="cartao">Cartão</Select.Option>
              <Select.Option value="transferencia">Transferência</Select.Option>
              <Select.Option value="dinheiro">Dinheiro</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}