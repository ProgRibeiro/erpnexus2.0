import { useState, useEffect, useCallback } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Form,
  message,
  Spin,
} from "antd";
import {
  AlertOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
  MessageOutlined,
  SendOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import api from "../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

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

const PRIORIDADE_CONFIG = {
  critica: { color: "#EF4444", label: "Crítica" },
  alta:    { color: "#F59E0B", label: "Alta" },
  media:   { color: "#F59E0B", label: "Média" },
  baixa:   { color: "#3B82F6", label: "Baixa" },
};

const STATUS_CONFIG = {
  aberto:         { color: "red",     label: "Aberto" },
  em_atendimento: { color: "orange",  label: "Em Atendimento" },
  aguardando:     { color: "gold",    label: "Aguardando" },
  resolvido:      { color: "green",   label: "Resolvido" },
  fechado:        { color: "default", label: "Fechado" },
};

function calcularSLA(aberto_em, sla_horas) {
  const abertura = new Date(aberto_em);
  const prazo = new Date(abertura.getTime() + sla_horas * 3600 * 1000);
  const agora = new Date();
  const diffMs = prazo - agora;
  const vencido = diffMs < 0;
  const diffH = Math.abs(Math.floor(diffMs / 3600000));
  const diffMin = Math.abs(Math.floor((diffMs % 3600000) / 60000));
  return { vencido, texto: vencido ? `Vencido há ${diffH}h ${diffMin}min` : `${diffH}h ${diffMin}min restantes` };
}

export default function ChamadosExternosPage() {
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalChamado, setModalChamado] = useState(null);
  const [chat, setChat] = useState([]);
  const [chatTexto, setChatTexto] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [formObs] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchChamados = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/facilities/chamados/?ordering=-aberto_em");
      setChamados(res.data.results ?? res.data);
    } catch {
      message.error("Erro ao carregar chamados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChamados(); }, [fetchChamados]);

  const chamadosFiltrados = chamados.filter((c) => {
    if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
    if (filtroPrioridade !== "todos" && c.prioridade !== filtroPrioridade) return false;
    if (busca) {
      const b = busca.toLowerCase();
      if (
        !c.titulo?.toLowerCase().includes(b) &&
        !c.numero?.toLowerCase().includes(b) &&
        !c.solicitante_nome?.toLowerCase().includes(b) &&
        !c.local?.toLowerCase().includes(b)
      ) return false;
    }
    return true;
  });

  const abertos = chamados.filter((c) => c.status === "aberto" || c.status === "em_atendimento").length;

  const handleAcao = async (id, novoStatus) => {
    setActionLoading(true);
    try {
      const obs = formObs.getFieldValue("observacao") || "";
      await api.patch(`/facilities/chamados/${id}/`, { status: novoStatus, comentario_avaliacao: obs });
      message.success("Chamado atualizado com sucesso!");
      setModalChamado(null);
      formObs.resetFields();
      fetchChamados();
    } catch {
      message.error("Erro ao atualizar chamado");
    } finally {
      setActionLoading(false);
    }
  };

  const abrirDetalhes = async (chamado) => {
    setModalChamado(chamado);
    formObs.resetFields();
    setChatTexto("");
    await carregarChat(chamado.id);
  };

  const carregarChat = async (id) => {
    try {
      setChatLoading(true);
      const response = await api.get(`/facilities/chamados/${id}/chat-plataforma/`);
      setChat(response.data.results ?? response.data);
    } catch {
      message.error("Erro ao carregar chat da plataforma");
    } finally {
      setChatLoading(false);
    }
  };

  const enviarChat = async () => {
    if (!modalChamado || !chatTexto.trim()) return;
    try {
      setChatLoading(true);
      await api.post(`/facilities/chamados/${modalChamado.id}/chat-plataforma/`, {
        mensagem: chatTexto.trim(),
      });
      setChatTexto("");
      await carregarChat(modalChamado.id);
    } catch {
      message.error("Erro ao enviar mensagem");
    } finally {
      setChatLoading(false);
    }
  };

  const gerarOS = async () => {
    if (!modalChamado) return;
    try {
      setActionLoading(true);
      const response = await api.post(`/facilities/chamados/${modalChamado.id}/gerar-os/`);
      message.success(`OS ${response.data.ordem_servico_numero || response.data.ordem_servico_id} vinculada ao chamado.`);
      await fetchChamados();
      const atualizado = { ...modalChamado, ordem_servico_id: response.data.ordem_servico_id, status: "em_atendimento" };
      setModalChamado(atualizado);
      await carregarChat(modalChamado.id);
    } catch {
      message.error("Erro ao gerar OS do prestador");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
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
            <AlertOutlined />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 24, fontWeight: 800 }}>
              Chamados de Clientes{" "}
              {abertos > 0 && (
                <Badge count={abertos} style={{ backgroundColor: colors.vermelho, marginLeft: 8 }} />
              )}
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Chamados recebidos de clientes que utilizam o módulo Facilities
            </Text>
          </div>
        </Space>
      </Card>

      {/* Filtros */}
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: colors.textoFraco }} />}
              placeholder="Buscar por título, número, cliente ou local..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Select value={filtroStatus} onChange={setFiltroStatus} style={{ width: "100%" }}>
              <Option value="todos">Todos os status</Option>
              <Option value="aberto">Aberto</Option>
              <Option value="em_atendimento">Em Atendimento</Option>
              <Option value="aguardando">Aguardando</Option>
              <Option value="resolvido">Resolvido</Option>
              <Option value="fechado">Fechado</Option>
            </Select>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Select value={filtroPrioridade} onChange={setFiltroPrioridade} style={{ width: "100%" }}>
              <Option value="todos">Todas as prioridades</Option>
              <Option value="critica">Crítica</Option>
              <Option value="alta">Alta</Option>
              <Option value="media">Média</Option>
              <Option value="baixa">Baixa</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={4}>
            <Button onClick={fetchChamados} style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}>
              Atualizar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Lista */}
      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <div style={{ textAlign: "center", padding: 80 }}>
            <Spin size="large" />
          </div>
        </Card>
      ) : chamadosFiltrados.length === 0 ? (
        <Card bordered={false} style={panelStyle}>
          <Empty
            image={<AlertOutlined style={{ fontSize: 64, color: "#CBD5E1" }} />}
            description={
              <span style={{ color: colors.textoFraco, fontSize: 16 }}>
                Nenhum chamado recebido de clientes
              </span>
            }
            style={{ padding: "32px 0" }}
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {chamadosFiltrados.map((c) => {
            const sla = calcularSLA(c.aberto_em, c.sla_horas || 8);
            const prioConf = PRIORIDADE_CONFIG[c.prioridade] || PRIORIDADE_CONFIG.media;
            const statusConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.aberto;

            return (
              <Card
                key={c.id}
                bordered={false}
                style={{
                  ...panelStyle,
                  borderLeft: `4px solid ${prioConf.color}`,
                  cursor: "pointer",
                  transition: "0.2s ease",
                }}
                bodyStyle={{ padding: "20px 24px" }}
                onClick={() => abrirDetalhes(c)}
                onMouseEnter={(event) => {
                  event.currentTarget.style.boxShadow = "0 18px 40px rgba(15, 23, 42, 0.09)";
                  event.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.boxShadow = "0 14px 36px rgba(15, 23, 42, 0.05)";
                  event.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Row align="middle" gutter={[16, 12]}>
                  <Col xs={24} md={16}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Space wrap>
                        <Tag
                          style={{
                            background: prioConf.color,
                            color: "#fff",
                            border: "none",
                            fontWeight: 600,
                            borderRadius: 999,
                          }}
                        >
                          {prioConf.label}
                        </Tag>
                        <Tag color={statusConf.color} style={{ borderRadius: 999, fontWeight: 600 }}>
                          {statusConf.label}
                        </Tag>
                        <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600 }}>
                          #{c.numero}
                        </Text>
                      </Space>

                      <Text strong style={{ fontSize: 16, color: colors.texto }}>{c.titulo}</Text>

                      <Space wrap>
                        <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                          <UserOutlined style={{ marginRight: 4 }} />
                          {c.solicitante_nome}
                          {c.solicitante_email && ` · ${c.solicitante_email}`}
                        </Text>
                        {c.local && (
                          <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                            <EnvironmentOutlined style={{ marginRight: 4 }} />
                            {c.local}
                          </Text>
                        )}
                      </Space>

                      <Text
                        style={{
                          fontSize: 12,
                          color: sla.vencido ? colors.vermelho : colors.textoFraco,
                          fontWeight: sla.vencido ? 700 : 500,
                        }}
                      >
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        SLA: {sla.texto}
                      </Text>
                    </Space>
                  </Col>

                  <Col xs={24} md={8}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {(c.status === "aberto") && (
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          style={{
                            background: colors.verde,
                            borderColor: colors.verde,
                            borderRadius: 8,
                            width: "100%",
                            fontWeight: 600,
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAcao(c.id, "em_atendimento");
                          }}
                          loading={actionLoading}
                        >
                          Aceitar
                        </Button>
                      )}
                      <Button
                        type="primary"
                        style={{ borderRadius: 8, width: "100%", fontWeight: 600 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          abrirDetalhes(c);
                        }}
                      >
                        Ver Detalhes
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Detalhe */}
      <Modal
        open={!!modalChamado}
        onCancel={() => { setModalChamado(null); formObs.resetFields(); }}
        title={
          <Space>
            <AlertOutlined style={{ color: colors.azul }} />
            <span>#{modalChamado?.numero} — {modalChamado?.titulo}</span>
          </Space>
        }
        footer={null}
        width={700}
      >
        {modalChamado && (() => {
          const sla = calcularSLA(modalChamado.aberto_em, modalChamado.sla_horas || 8);
          const prioConf = PRIORIDADE_CONFIG[modalChamado.prioridade] || PRIORIDADE_CONFIG.media;
          const statusConf = STATUS_CONFIG[modalChamado.status] || STATUS_CONFIG.aberto;
          return (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600 }}>Prioridade</Text>
                  <div>
                    <Tag style={{ background: prioConf.color, color: "#fff", border: "none", borderRadius: 999, fontWeight: 600 }}>
                      {prioConf.label}
                    </Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600 }}>Status</Text>
                  <div><Tag color={statusConf.color} style={{ borderRadius: 999, fontWeight: 600 }}>{statusConf.label}</Tag></div>
                </Col>
              </Row>

              <div>
                <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600 }}>Descrição</Text>
                <div
                  style={{
                    background: colors.fundoSuave,
                    border: `1px solid ${colors.borda}`,
                    padding: "12px 16px",
                    borderRadius: 10,
                    marginTop: 4,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: colors.textoSecundario,
                  }}
                >
                  {modalChamado.descricao || "Sem descrição"}
                </div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600 }}>Solicitante</Text>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.texto }}>{modalChamado.solicitante_nome}</div>
                  {modalChamado.solicitante_email && (
                    <div style={{ fontSize: 13, color: colors.textoSecundario }}>{modalChamado.solicitante_email}</div>
                  )}
                  {modalChamado.solicitante_ramal && (
                    <div style={{ fontSize: 13, color: colors.textoSecundario }}>Ramal: {modalChamado.solicitante_ramal}</div>
                  )}
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600 }}>Local</Text>
                  <div style={{ fontSize: 14, color: colors.texto }}>{modalChamado.local || "—"}</div>
                  {modalChamado.ativo_tag && (
                    <>
                      <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600, display: "block", marginTop: 8 }}>Ativo vinculado</Text>
                      <div style={{ fontSize: 14 }}>
                        <Tag style={{ borderRadius: 999 }}>{modalChamado.ativo_tag}</Tag> {modalChamado.ativo_nome}
                      </div>
                    </>
                  )}
                </Col>
              </Row>

              <div>
                <Text
                  style={{
                    fontSize: 13,
                    color: sla.vencido ? colors.vermelho : colors.textoFraco,
                    fontWeight: sla.vencido ? 700 : 500,
                  }}
                >
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  SLA: {sla.texto}
                </Text>
              </div>

              <Card
                size="small"
                title={<Space><MessageOutlined /> Chat entre sistemas</Space>}
                extra={modalChamado.ordem_servico_id ? <Tag color="blue" style={{ borderRadius: 999 }}>OS #{modalChamado.ordem_servico_id}</Tag> : null}
                style={{ borderRadius: 12, border: `1px solid ${colors.borda}` }}
              >
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {chat.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem mensagens ainda" />
                    ) : chat.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          alignSelf: item.origem_sistema === "prestador" ? "flex-end" : "flex-start",
                          maxWidth: "86%",
                          background: item.origem_sistema === "prestador" ? "#EFF6FF" : colors.fundoSuave,
                          border: `1px solid ${colors.borda}`,
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <Text strong style={{ fontSize: 12, color: colors.texto }}>
                          {item.usuario_nome || item.origem_sistema}
                        </Text>
                        <div style={{ fontSize: 13, color: colors.textoSecundario, marginTop: 2 }}>{item.mensagem}</div>
                        <Text style={{ fontSize: 11, color: colors.textoFraco }}>
                          {new Date(item.criado_em).toLocaleString("pt-BR")}
                        </Text>
                      </div>
                    ))}
                  </div>
                  <Input.TextArea
                    rows={2}
                    value={chatTexto}
                    onChange={(event) => setChatTexto(event.target.value)}
                    placeholder="Responder para o contratante ou equipe do prestador..."
                  />
                  <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
                    <Button icon={<ToolOutlined />} loading={actionLoading} onClick={gerarOS} style={{ borderRadius: 8, fontWeight: 600 }}>
                      {modalChamado.ordem_servico_id ? "OS já vinculada" : "Gerar OS no ERP"}
                    </Button>
                    <Button type="primary" icon={<SendOutlined />} loading={chatLoading} onClick={enviarChat} style={{ borderRadius: 8, fontWeight: 600 }}>
                      Enviar mensagem
                    </Button>
                  </Space>
                </Space>
              </Card>

              {modalChamado.foto_antes && (
                <div>
                  <Text style={{ fontSize: 12, color: colors.textoFraco, fontWeight: 600 }}>Foto (antes)</Text>
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={modalChamado.foto_antes}
                      alt="Antes"
                      style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${colors.borda}` }}
                    />
                  </div>
                </div>
              )}

              <Form form={formObs} layout="vertical">
                <Form.Item name="observacao" label="Observação / Resposta">
                  <Input.TextArea rows={3} placeholder="Digite sua observação ou resposta..." />
                </Form.Item>
              </Form>

              <Row gutter={12}>
                {modalChamado.status === "aberto" && (
                  <Col xs={24} sm={8}>
                    <Button
                      block
                      type="primary"
                      style={{ background: colors.verde, borderColor: colors.verde, borderRadius: 8, fontWeight: 600 }}
                      loading={actionLoading}
                      onClick={() => handleAcao(modalChamado.id, "em_atendimento")}
                    >
                      Aceitar Chamado
                    </Button>
                  </Col>
                )}
                {(modalChamado.status === "aberto" || modalChamado.status === "em_atendimento") && (
                  <Col xs={24} sm={8}>
                    <Button
                      block
                      type="primary"
                      style={{ borderRadius: 8, fontWeight: 600 }}
                      loading={actionLoading}
                      onClick={() => handleAcao(modalChamado.id, "resolvido")}
                    >
                      Resolver
                    </Button>
                  </Col>
                )}
                {modalChamado.status === "aberto" && (
                  <Col xs={24} sm={8}>
                    <Button
                      block
                      danger
                      style={{ borderRadius: 8, fontWeight: 600 }}
                      icon={<CloseOutlined />}
                      loading={actionLoading}
                      onClick={() => handleAcao(modalChamado.id, "fechado")}
                    >
                      Recusar
                    </Button>
                  </Col>
                )}
              </Row>
            </Space>
          );
        })()}
      </Modal>
    </div>
  );
}
