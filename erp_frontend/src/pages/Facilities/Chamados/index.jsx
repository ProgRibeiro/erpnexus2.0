import { useState, useEffect } from "react";
import {
  Row, Col, Card, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, message, Spin, Badge, Divider, Tooltip, Rate, InputNumber,
} from "antd";
import {
  PlusOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined,
  LinkOutlined, CopyOutlined, CarOutlined, ToolOutlined, MessageOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import api from "../../../services/api";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const { Title, Text } = Typography;
const { Option } = Select;

const prioridadeCor = {
  baixa: "blue", media: "gold", alta: "orange", critica: "red", emergencia: "magenta",
};
const prioridadeLabel = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica", emergencia: "Emergência",
};
const statusCor = {
  aberto: "#EF4444",
  aguardando_orcamento: "#F59E0B",
  aguardando_aprovacao: "#F97316",
  em_rota: "#06B6D4",
  em_atendimento: "#3B82F6",
  em_execucao: "#3B82F6",
  resolvido: "#10B981",
  concluido: "#10B981",
  fechado: "#64748B",
  cancelado: "#6B7280",
};
const statusLabel = {
  aberto: "Aberto",
  aguardando_orcamento: "Ag. Orçamento",
  aguardando_aprovacao: "Ag. Aprovação",
  em_rota: "Em Rota",
  em_atendimento: "Em Atendimento",
  em_execucao: "Em Execução",
  resolvido: "Resolvido",
  concluido: "Concluído",
  fechado: "Fechado",
  cancelado: "Cancelado",
};

const colunas = [
  { key: "aberto", label: "Aberto", color: "#EF4444", statuses: ["aberto"] },
  { key: "aguardando", label: "Aguardando", color: "#F59E0B", statuses: ["aguardando_orcamento", "aguardando_aprovacao"] },
  { key: "em_rota", label: "Em Rota", color: "#06B6D4", statuses: ["em_rota", "em_atendimento"] },
  { key: "em_execucao", label: "Em Execução", color: "#3B82F6", statuses: ["em_execucao"] },
  { key: "concluido", label: "Concluído", color: "#10B981", statuses: ["concluido", "resolvido", "fechado"] },
];

const borderColor = (prioridade) => {
  const map = { baixa: "#3B82F6", media: "#F59E0B", alta: "#F97316", critica: "#EF4444", emergencia: "#A855F7" };
  return map[prioridade] || "#D1D5DB";
};

export default function ChamadosFacilities() {
  const [chamados, setChamados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalDetalhe, setModalDetalhe] = useState(null);
  const [modalRecusar, setModalRecusar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [obsRecusa, setObsRecusa] = useState("");
  const [chat, setChat] = useState([]);
  const [mensagemChat, setMensagemChat] = useState("");
  const [valorCustoExtra, setValorCustoExtra] = useState(null);
  const [descricaoCustoExtra, setDescricaoCustoExtra] = useState("");
  const [avaliacao, setAvaliacao] = useState(0);
  const [nps, setNps] = useState(null);
  const [comentarioAvaliacao, setComentarioAvaliacao] = useState("");
  const [form] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/facilities/chamados/"),
      Promise.resolve({ data: [] }),
      Promise.resolve({ data: [] }),
    ])
      .then(([c, u, p]) => {
        setChamados(Array.isArray(c.data) ? c.data : (c.data?.results || []));
        setUnidades(Array.isArray(u.data) ? u.data : (u.data?.results || []));
        setPrestadores(Array.isArray(p.data) ? p.data : (p.data?.results || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const abrirDetalhe = async (chamado) => {
    setModalDetalhe(chamado);
    setAvaliacao(chamado.avaliacao_prestador || chamado.avaliacao || 0);
    setNps(chamado.nps || null);
    setComentarioAvaliacao(chamado.comentario_avaliacao || "");
    try {
      const r = await api.get(`/facilities/chamados/${chamado.id}/chat-plataforma/`);
      setChat(Array.isArray(r.data) ? r.data : (r.data?.results || []));
    } catch {
      setChat([]);
    }
  };

  const executarAcao = async (acao, sucesso) => {
    if (!modalDetalhe?.id) return;
    try {
      const r = await api.post(`/facilities/chamados/${modalDetalhe.id}/${acao}/`);
      message.success(sucesso);
      setModalDetalhe(r.data);
      carregar();
      abrirDetalhe(r.data);
    } catch {
      message.error("Não foi possível atualizar o chamado.");
    }
  };

  const enviarMensagem = async () => {
    if (!modalDetalhe?.id || !mensagemChat.trim()) return;
    try {
      const r = await api.post(`/facilities/chamados/${modalDetalhe.id}/chat-plataforma/`, { mensagem: mensagemChat });
      setChat((atual) => [...atual, r.data]);
      setMensagemChat("");
    } catch {
      message.error("Erro ao enviar comentário.");
    }
  };

  const solicitarCustoExtra = async () => {
    if (!modalDetalhe?.id || !valorCustoExtra) {
      message.warning("Informe o valor do custo extra.");
      return;
    }
    try {
      const r = await api.post(`/facilities/chamados/${modalDetalhe.id}/solicitar-custo-extra/`, {
        valor: valorCustoExtra,
        descricao: descricaoCustoExtra,
      });
      message.success("Custo extra enviado para aprovação.");
      setValorCustoExtra(null);
      setDescricaoCustoExtra("");
      setModalDetalhe(r.data);
      carregar();
      abrirDetalhe(r.data);
    } catch {
      message.error("Erro ao solicitar custo extra.");
    }
  };

  const avaliarChamado = async () => {
    if (!modalDetalhe?.id) return;
    try {
      const r = await api.post(`/facilities/chamados/${modalDetalhe.id}/avaliar/`, {
        avaliacao,
        nps,
        comentario_avaliacao: comentarioAvaliacao,
      });
      message.success("Avaliação salva.");
      setModalDetalhe(r.data);
      carregar();
    } catch {
      message.error("Erro ao salvar avaliação.");
    }
  };

  const salvar = async (values) => {
    setSaving(true);
    try {
      await api.post("/facilities/chamados/", {
        titulo: values.tipo_servico,
        descricao: values.descricao,
        prioridade: values.prioridade,
        local: values.local || "",
        solicitante_nome: values.solicitante_nome || "Admin Teste",
        solicitante_email: values.solicitante_email || "admin@admin.com",
        sla_horas: values.sla_horas || 24,
      });
      message.success("Chamado aberto com sucesso!");
      setModalNovo(false);
      form.resetFields();
      carregar();
    } catch {
      message.error("Erro ao abrir chamado.");
    } finally {
      setSaving(false);
    }
  };

  const aprovarOrcamento = async (chamadoId) => {
    try {
      await api.post(`/facilities/chamados/${chamadoId}/aprovar-custo-extra/`);
      message.success("Orçamento aprovado!");
      setModalDetalhe(null);
      carregar();
    } catch {
      message.error("Erro ao aprovar orçamento.");
    }
  };

  const recusarOrcamento = async (chamadoId) => {
    try {
      await api.post(`/facilities/chamados/${chamadoId}/recusar-custo-extra/`, { observacao: obsRecusa });
      message.success("Orçamento recusado.");
      setModalRecusar(false);
      setModalDetalhe(null);
      setObsRecusa("");
      carregar();
    } catch {
      message.error("Erro ao recusar orçamento.");
    }
  };

  const getChamadosDaColuna = (col) =>
    chamados.filter((c) => col.statuses.includes(c.status));

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Chamados — Portal Contratante</Title>
          <Text type="secondary">Gestão de chamados SaaS por status e orçamento</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalNovo(true)}
            style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 8 }}
          >
            Novo Chamado
          </Button>
        </Col>
      </Row>

      <Row gutter={16}>
        {colunas.map((col) => {
          const lista = getChamadosDaColuna(col);
          return (
            <Col xs={24} md={12} lg={6} key={col.key}>
              <div style={{ background: "#F3F4F6", borderRadius: 14, padding: 16, minHeight: 400 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 600, fontSize: 15 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, display: "inline-block" }} />
                  {col.label}
                  <Badge count={lista.length} style={{ background: col.color, marginLeft: 4 }} />
                </div>

                <Space direction="vertical" style={{ width: "100%" }} size={10}>
                  {lista.length === 0 && (
                    <div style={{ textAlign: "center", color: "#9CA3AF", padding: 32 }}>Nenhum chamado</div>
                  )}
                  {lista.map((c) => (
                    <Card
                      key={c.id}
                      style={{
                        borderRadius: 10, cursor: "pointer",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                        borderLeft: `4px solid ${borderColor(c.prioridade)}`,
                      }}
                      bodyStyle={{ padding: "12px 14px" }}
                      onClick={() => abrirDetalhe(c)}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: "#6B7280", marginBottom: 2 }}>{c.numero}</div>
                      <div style={{ fontWeight: 500, marginBottom: 6, color: "#111827", fontSize: 13 }}>
                        {c.titulo || c.tipo_servico || "Sem tipo"}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <Tag color={prioridadeCor[c.prioridade]} style={{ fontSize: 11 }}>
                          {prioridadeLabel[c.prioridade] || c.prioridade}
                        </Tag>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>
                          <ClockCircleOutlined /> {dayjs(c.aberto_em || c.abertura).fromNow()}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <Tag color={c.sla_estourado ? "red" : "green"} style={{ margin: 0 }}>
                          SLA {c.sla_estourado ? "estourado" : `${c.sla_horas || 24}h`}
                        </Tag>
                        {c.custo_extra_status && c.custo_extra_status !== "sem_custo" && (
                          <Tag color={c.custo_extra_status === "aprovado" ? "green" : c.custo_extra_status === "recusado" ? "red" : "orange"} style={{ margin: 0 }}>
                            Extra {c.custo_extra_status}
                          </Tag>
                        )}
                      </div>
                      {c.valor_orcado && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>
                          R$ {Number(c.valor_orcado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </Card>
                  ))}
                </Space>
              </div>
            </Col>
          );
        })}
      </Row>

      <Modal
        title="Novo Chamado"
        open={modalNovo}
        onCancel={() => { setModalNovo(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Abrir Chamado"
        cancelText="Cancelar"
        confirmLoading={saving}
        width={660}
        okButtonProps={{ style: { background: "#3B82F6", borderColor: "#3B82F6" } }}
      >
        <Form form={form} layout="vertical" onFinish={salvar} style={{ marginTop: 8 }}>
          <Form.Item name="tipo_servico" label="Tipo de Serviço" rules={[{ required: true, message: "Informe o tipo de serviço" }]}>
            <Input placeholder="Ex: Elétrica, HVAC, Civil..." />
          </Form.Item>
          <Form.Item name="descricao" label="Descrição detalhada" rules={[{ required: true, message: "Descreva o problema" }]}>
            <Input.TextArea rows={3} placeholder="Descreva o problema com detalhes" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="prioridade" label="Prioridade" initialValue="media">
                <Select>
                  {Object.entries(prioridadeLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="local" label="Local">
                <Input placeholder="Unidade, prédio, andar, sala ou ativo" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="solicitante_nome" label="Solicitante">
                <Input placeholder="Nome de quem abriu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sla_horas" label="SLA (horas)" initialValue={24}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          {unidades.length > 0 && (
            <Form.Item name="unidade_id" label="Unidade">
              <Select showSearch placeholder="Selecione a unidade" optionFilterProp="children">
                  {unidades.map((u) => (
                    <Option key={u.id} value={u.id}>{u.nome} {u.codigo_interno ? `(${u.codigo_interno})` : ""}</Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          <Divider style={{ margin: "8px 0 14px" }}>Prestador de Serviço</Divider>

          <Form.Item
            name="prestador_id"
            label="Selecionar Prestador (opcional)"
            help="Escolha um prestador cadastrado na plataforma ou envie o chamado por link externo"
          >
            <Select
              showSearch
              allowClear
              placeholder="Selecionar prestador cadastrado..."
              optionFilterProp="children"
            >
              {prestadores.map((p) => (
                <Option key={p.id} value={p.id}>{p.nome} {p.cnpj ? `— CNPJ: ${p.cnpj}` : ""}</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{
            background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8,
            padding: "10px 14px", marginTop: 4, fontSize: 13, color: "#0369A1",
          }}>
            <strong>Prestador sem ERP?</strong> Após abrir o chamado, você poderá copiar o link e enviar via{" "}
            <strong>e-mail</strong> ou <strong>WhatsApp</strong> para o prestador externo responder sem login.
          </div>
        </Form>
      </Modal>

      {/* Modal Detalhe */}
      {modalDetalhe && (
        <Modal
          title={`Chamado ${modalDetalhe.numero}`}
          open={!!modalDetalhe}
          onCancel={() => setModalDetalhe(null)}
          footer={null}
          width={620}
        >
          <div style={{ padding: "8px 0" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Tag color={prioridadeCor[modalDetalhe.prioridade]}>{prioridadeLabel[modalDetalhe.prioridade] || modalDetalhe.prioridade}</Tag>
              <Tag color="default" style={{ background: statusCor[modalDetalhe.status] + "20", color: statusCor[modalDetalhe.status], border: `1px solid ${statusCor[modalDetalhe.status]}40` }}>
                {statusLabel[modalDetalhe.status] || modalDetalhe.status}
              </Tag>
              <Tag color={modalDetalhe.sla_estourado ? "red" : "green"}>
                SLA {modalDetalhe.sla_estourado ? "estourado" : `${modalDetalhe.sla_horas || 24}h`}
              </Tag>
            </div>

            <Space wrap style={{ marginBottom: 14 }}>
              <Button icon={<CarOutlined />} onClick={() => executarAcao("em-rota", "Chamado marcado em rota.")}>
                Em rota
              </Button>
              <Button icon={<ToolOutlined />} onClick={() => executarAcao("iniciar-execucao", "Execução iniciada.")}>
                Iniciar execução
              </Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={() => executarAcao("concluir", "Chamado concluído.")} style={{ background: "#10B981", borderColor: "#10B981" }}>
                Concluir
              </Button>
            </Space>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tipo de serviço</Text>
              <div style={{ fontWeight: 600, color: "#111827" }}>{modalDetalhe.titulo || modalDetalhe.tipo_servico || "-"}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Descrição</Text>
              <div style={{ color: "#374151" }}>{modalDetalhe.descricao || "-"}</div>
            </div>

            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Abertura</Text>
                <div style={{ fontWeight: 500 }}>{dayjs(modalDetalhe.aberto_em || modalDetalhe.abertura).format("DD/MM/YYYY HH:mm")}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Unidade</Text>
                <div style={{ fontWeight: 500 }}>{modalDetalhe.local || modalDetalhe.unidade_nome || modalDetalhe.unidade_id || "-"}</div>
              </Col>
            </Row>

            <Divider style={{ margin: "10px 0" }} />
            <div style={{ marginBottom: 10 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Prestador</Text>
              <div style={{ fontWeight: 500, color: "#111827" }}>
                {modalDetalhe.tenant_prestador_nome || "Não atribuído"}
              </div>
            </div>

            {/* Link externo para prestador sem ERP */}
            <div style={{
              background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
              padding: "10px 14px", marginBottom: 12, fontSize: 13,
            }}>
              <div style={{ fontWeight: 600, color: "#15803D", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <LinkOutlined /> Link externo — prestador sem ERP
              </div>
              <div style={{ color: "#374151", marginBottom: 8 }}>
                Copie o link e envie por <strong>e-mail</strong> ou <strong>WhatsApp</strong> para o prestador responder sem login:
              </div>
              <Space>
                <Input
                  readOnly
                  value={`${window.location.origin}/chamado-externo/${modalDetalhe.numero}`}
                  style={{ width: 280, fontSize: 12 }}
                />
                <Tooltip title="Copiar link">
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/chamado-externo/${modalDetalhe.numero}`);
                      message.success("Link copiado!");
                    }}
                  />
                </Tooltip>
                <Tooltip title="Enviar via WhatsApp">
                  <Button
                    style={{ background: "#25D366", borderColor: "#25D366", color: "#fff" }}
                    onClick={() => {
                      const link = `${window.location.origin}/chamado-externo/${modalDetalhe.numero}`;
                      const texto = encodeURIComponent(`Olá! Você recebeu um chamado de serviço (${modalDetalhe.numero}).\nTipo: ${modalDetalhe.titulo || modalDetalhe.tipo_servico}\nAcesse: ${link}`);
                      window.open(`https://wa.me/?text=${texto}`, "_blank");
                    }}
                  >
                    WhatsApp
                  </Button>
                </Tooltip>
              </Space>
            </div>

            {(modalDetalhe.valor_orcado || modalDetalhe.valor_executado) && (
              <>
                <Divider style={{ margin: "12px 0" }} />
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  {modalDetalhe.valor_orcado && (
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Valor Orçado</Text>
                      <div style={{ fontWeight: 700, color: "#F59E0B", fontSize: 16 }}>
                        R$ {Number(modalDetalhe.valor_orcado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </Col>
                  )}
                  {modalDetalhe.valor_executado && (
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Valor Executado</Text>
                      <div style={{ fontWeight: 700, color: "#10B981", fontSize: 16 }}>
                        R$ {Number(modalDetalhe.valor_executado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </Col>
                  )}
                </Row>
              </>
            )}

            {["aguardando_orcamento", "aguardando_aprovacao"].includes(modalDetalhe.status) && (
              <>
                <Divider style={{ margin: "12px 0" }} />
                <Space>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    style={{ background: "#10B981", borderColor: "#10B981" }}
                    onClick={() => aprovarOrcamento(modalDetalhe.id)}
                  >
                    Aprovar Orçamento
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setModalRecusar(true)}
                  >
                    Recusar Orçamento
                  </Button>
                </Space>
              </>
            )}

            <Divider style={{ margin: "14px 0" }}>Custo extra</Divider>
            <Row gutter={10}>
              <Col span={9}>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={valorCustoExtra}
                  onChange={setValorCustoExtra}
                  placeholder="Valor"
                  style={{ width: "100%" }}
                />
              </Col>
              <Col span={10}>
                <Input value={descricaoCustoExtra} onChange={(e) => setDescricaoCustoExtra(e.target.value)} placeholder="Motivo / escopo" />
              </Col>
              <Col span={5}>
                <Button onClick={solicitarCustoExtra} block>Enviar</Button>
              </Col>
            </Row>
            {modalDetalhe.custo_extra_status && modalDetalhe.custo_extra_status !== "sem_custo" && (
              <Space wrap style={{ marginTop: 10 }}>
                <Tag color={modalDetalhe.custo_extra_status === "aprovado" ? "green" : modalDetalhe.custo_extra_status === "recusado" ? "red" : "orange"}>
                  {modalDetalhe.custo_extra_status}
                </Tag>
                <Button size="small" onClick={() => api.post(`/facilities/chamados/${modalDetalhe.id}/aprovar-custo-extra/`).then((r) => { message.success("Custo extra aprovado."); setModalDetalhe(r.data); carregar(); })}>
                  Aprovar extra
                </Button>
                <Button size="small" danger onClick={() => api.post(`/facilities/chamados/${modalDetalhe.id}/recusar-custo-extra/`, { observacao: "Recusado pelo contratante" }).then((r) => { message.success("Custo extra recusado."); setModalDetalhe(r.data); carregar(); })}>
                  Recusar extra
                </Button>
              </Space>
            )}

            <Divider style={{ margin: "14px 0" }}>Chat e comentários</Divider>
            <Space direction="vertical" style={{ width: "100%" }}>
              <div style={{ maxHeight: 150, overflow: "auto", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
                {chat.length === 0 ? (
                  <Text type="secondary">Nenhum comentário ainda.</Text>
                ) : chat.map((m) => (
                  <div key={m.id} style={{ marginBottom: 8 }}>
                    <Text strong>{m.usuario_nome || "Usuário"}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{m.criado_em ? dayjs(m.criado_em).format("DD/MM HH:mm") : ""}</Text>
                    <div style={{ color: "#374151" }}>{m.mensagem}</div>
                  </div>
                ))}
              </div>
              <Input.Search
                enterButton={<MessageOutlined />}
                value={mensagemChat}
                onChange={(e) => setMensagemChat(e.target.value)}
                onSearch={enviarMensagem}
                placeholder="Adicionar comentário ao chamado"
              />
            </Space>

            {["concluido", "resolvido", "fechado"].includes(modalDetalhe.status) && (
              <>
                <Divider style={{ margin: "14px 0" }}>Avaliação</Divider>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Rate value={avaliacao} onChange={setAvaliacao} />
                  <InputNumber min={0} max={10} value={nps} onChange={setNps} placeholder="NPS 0-10" style={{ width: 140 }} />
                  <Input.TextArea rows={2} value={comentarioAvaliacao} onChange={(e) => setComentarioAvaliacao(e.target.value)} placeholder="Comentário da avaliação" />
                  <Button type="primary" onClick={avaliarChamado} style={{ background: "#3B82F6", borderColor: "#3B82F6" }}>Salvar avaliação</Button>
                </Space>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Recusar Orçamento */}
      <Modal
        title="Recusar Orçamento"
        open={modalRecusar}
        onCancel={() => { setModalRecusar(false); setObsRecusa(""); }}
        onOk={() => recusarOrcamento(modalDetalhe?.id)}
        okText="Confirmar Recusa"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text>Informe o motivo da recusa (opcional):</Text>
        </div>
        <Input.TextArea
          rows={3}
          value={obsRecusa}
          onChange={(e) => setObsRecusa(e.target.value)}
          placeholder="Motivo da recusa..."
        />
      </Modal>
    </div>
  );
}
