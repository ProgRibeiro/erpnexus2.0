import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  InputNumber,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
  Skeleton,
  Tooltip,
  DatePicker,
} from "antd";
import {
  TrophyOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
  SendOutlined,
  MessageOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ToolOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  PaperClipOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

const CONDICAO_PGTO = [
  { value: "a_vista", label: "À Vista" },
  { value: "30_dias", label: "30 dias" },
  { value: "50_50", label: "50% entrada / 50% conclusão" },
  { value: "30_60", label: "30/60 dias" },
  { value: "30_60_90", label: "30/60/90 dias" },
  { value: "parcelado", label: "Parcelado (negociável)" },
];

const UNIDADES = ["un", "m²", "m³", "m", "h", "kg", "cj", "serviço", "vb"];

const STATUS_CONFIG = {
  rascunho: { color: "default", label: "Rascunho" },
  publicada: { color: "blue", label: "Publicada" },
  em_analise: { color: "orange", label: "Em Análise" },
  concluida: { color: "green", label: "Concluída" },
  cancelada: { color: "red", label: "Cancelada" },
};

function calcularCountdown(prazo) {
  if (!prazo) return null;
  const diff = new Date(prazo) - new Date();
  if (diff <= 0) return { vencido: true, texto: "Prazo encerrado" };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0)
    return {
      vencido: false,
      texto: `${d}d ${h % 24}h restantes`,
      urgente: d < 2,
    };
  return { vencido: false, texto: `${h}h restantes`, urgente: true };
}

export default function LicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalProposta, setModalProposta] = useState(null);
  const [propostaLoading, setPropostaLoading] = useState(false);
  const [arquivoProposta, setArquivoProposta] = useState([]);
  const [modalDetalheProposta, setModalDetalheProposta] = useState(null);
  const [modalChat, setModalChat] = useState(null);
  const [chat, setChat] = useState([]);
  const [chatTexto, setChatTexto] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [itens, setItens] = useState([
    { descricao: "", qtd: 1, unidade: "un", valor_unit: 0 },
  ]);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [form] = Form.useForm();

  const fetchLicitacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/facilities/licitacoes/");
      setLicitacoes(res.data.results ?? res.data);
    } catch {
      message.error("Erro ao carregar licitações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLicitacoes();
  }, [fetchLicitacoes]);

  const filtradas = licitacoes.filter(
    (l) => filtroStatus === "todos" || l.status === filtroStatus,
  );

  const totalItens = itens.reduce(
    (sum, i) => sum + (i.qtd || 0) * (i.valor_unit || 0),
    0,
  );

  const adicionarItem = () =>
    setItens((prev) => [
      ...prev,
      { descricao: "", qtd: 1, unidade: "un", valor_unit: 0 },
    ]);

  const removerItem = (idx) =>
    setItens((prev) => prev.filter((_, i) => i !== idx));

  const atualizarItem = (idx, campo, valor) =>
    setItens((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)),
    );

  const abrirModal = (l) => {
    setModalProposta(l);
    setItens([
      { descricao: l.titulo || "", qtd: 1, unidade: "serviço", valor_unit: 0 },
    ]);
    form.resetFields();
    setArquivoProposta([]);
    // Gera chave de idempotência única por abertura de modal
    setIdempotencyKey(crypto.randomUUID());
  };

  const abrirChat = async (licitacao) => {
    setModalChat(licitacao);
    setChatTexto("");
    await carregarChat(licitacao.id);
  };

  const carregarChat = async (id) => {
    try {
      setChatLoading(true);
      const response = await api.get(`/facilities/licitacoes/${id}/chat-plataforma/`);
      setChat(response.data.results ?? response.data);
    } catch {
      message.error("Erro ao carregar chat da licitação");
    } finally {
      setChatLoading(false);
    }
  };

  const enviarChat = async () => {
    if (!modalChat || !chatTexto.trim()) return;
    try {
      setChatLoading(true);
      await api.post(`/facilities/licitacoes/${modalChat.id}/chat-plataforma/`, {
        mensagem: chatTexto.trim(),
      });
      setChatTexto("");
      await carregarChat(modalChat.id);
    } catch {
      message.error("Erro ao enviar mensagem");
    } finally {
      setChatLoading(false);
    }
  };

  const handleEnviarProposta = async (values) => {
    if (!modalProposta) return;

    // 1. Validação local antes de enviar
    if (!itens.length) {
      message.error("Adicione ao menos um item");
      return;
    }
    if (itens.some((i) => !i.descricao.trim())) {
      message.error("Preencha a descrição de todos os itens.");
      return;
    }
    if (totalItens <= 0) {
      message.error("O valor total da proposta deve ser maior que zero.");
      return;
    }
    if (modalProposta.valor_maximo && totalItens > modalProposta.valor_maximo) {
      message.error(
        `Valor acima do máximo permitido (R$ ${Number(modalProposta.valor_maximo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
      );
      return;
    }

    setPropostaLoading(true);

    try {
      const payload = new FormData();
      payload.append("valor", String(totalItens));
      payload.append("prazo_execucao_dias", String(values.prazo_execucao_dias));
      payload.append("condicao_pagamento", values.condicao_pagamento || "");
      payload.append(
        "validade_proposta",
        values.validade_proposta ? values.validade_proposta.format("YYYY-MM-DD") : "",
      );
      payload.append("observacoes", values.observacoes || "");
      payload.append(
        "itens_orcamento",
        JSON.stringify(
          itens.map((it, idx) => ({
            descricao: it.descricao,
            quantidade: it.qtd,
            unidade: it.unidade,
            valor_unitario: it.valor_unit,
            valor_total: it.qtd * it.valor_unit,
            ordem: idx,
          })),
        ),
      );
      if (arquivoProposta[0]?.originFileObj) {
        payload.append("arquivo_proposta", arquivoProposta[0].originFileObj);
      }

      await api.post(
        `/facilities/licitacoes/${modalProposta.id}/propostas/`,
        payload,
        {
          headers: { "X-Idempotency-Key": idempotencyKey },
          timeout: 30000,
        },
      );

      message.success("Proposta enviada com sucesso!");
      setModalProposta(null);
      setArquivoProposta([]);
      form.resetFields();
      fetchLicitacoes();
    } catch (err) {
      // 5. Tratamento específico de erros
      if (err.response) {
        const { codigo, erro } = err.response.data || {};

        switch (codigo) {
          case "LICITACAO_ENCERRADA":
            message.error("Licitação já foi encerrada");
            break;
          case "PROPOSTA_DUPLICADA":
            message.warning("Você já enviou proposta para esta licitação");
            break;
          case "VALOR_ACIMA_MAXIMO":
            message.error(erro || "Valor acima do máximo permitido");
            break;
          case "VALIDACAO_FALHOU":
            message.error(`Validação falhou: ${erro}`);
            break;
          case "LICITACAO_NAO_ENCONTRADA":
            message.error("Licitação não encontrada");
            break;
          default:
            message.error(erro || "Erro ao enviar proposta. Tente novamente.");
        }
      } else if (err.code === "ECONNABORTED") {
        // Timeout — pode ter chegado, oferecer retry
        Modal.confirm({
          title: "Conexão lenta",
          content:
            "Não confirmamos o envio. A conexão expirou. Deseja verificar se a proposta foi recebida?",
          onOk: () => {
            // Aqui poderia haver uma lógica de verificação por idempotencyKey
            message.info("Verificando status...");
            fetchLicitacoes();
          },
        });
      } else {
        message.error("Sem conexão. Verifique sua internet e tente novamente.");
      }
    } finally {
      setPropostaLoading(false);
    }
  };

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
                background: `${colors.azul}14`,
                color: colors.azul,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <TrophyOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>Licitações</Title>
              <Text style={{ color: colors.textoSecundario }}>
                Licitações abertas de clientes para prestação de serviço
              </Text>
            </div>
          </Space>
          <Button onClick={fetchLicitacoes} style={{ borderRadius: 10, height: 40, paddingInline: 18, fontWeight: 600 }}>
            Atualizar
          </Button>
        </div>
      </Card>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 18 }}>
        <Select
          value={filtroStatus}
          onChange={setFiltroStatus}
          style={{ width: 220 }}
        >
          <Option value="todos">Todos os status</Option>
          <Option value="publicada">Aberta</Option>
          <Option value="em_analise">Em Análise</Option>
          <Option value="concluida">Concluída / Ganha</Option>
          <Option value="cancelada">Cancelada</Option>
        </Select>
      </Card>

      {/* Lista */}
      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : filtradas.length === 0 ? (
        <Card bordered={false} style={{ ...panelStyle, textAlign: "center" }} bodyStyle={{ padding: 48 }}>
          <Empty
            image={<TrophyOutlined style={{ fontSize: 64, color: colors.textoFraco }} />}
            description={
              <span style={{ color: colors.textoFraco, fontSize: 16 }}>
                Nenhuma licitação disponível no momento
              </span>
            }
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtradas.map((l) => {
            const countdown = calcularCountdown(l.prazo_propostas);
            const statusConf =
              STATUS_CONFIG[l.status] || STATUS_CONFIG.publicada;
            const jaEnviou = l.minha_proposta != null;

            return (
              <Card
                key={l.id}
                bordered={false}
                style={panelStyle}
                bodyStyle={{ padding: "20px 24px" }}
                hoverable
              >
                <Row align="middle" gutter={[16, 12]}>
                  <Col xs={24} md={16}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Space wrap>
                        <Tag
                          color={statusConf.color}
                          style={{ borderRadius: 999, fontWeight: 600 }}
                        >
                          {statusConf.label}
                        </Tag>
                        <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>
                          {l.tipo_servico}
                        </Tag>
                      </Space>
                      <Text strong style={{ fontSize: 16, color: colors.texto }}>
                        {l.titulo}
                      </Text>
                      {l.descricao && (
                        <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                          {String(l.descricao).slice(0, 140)}
                          {l.descricao.length > 140 ? "..." : ""}
                        </Text>
                      )}
                      <Space wrap>
                        {l.valor_maximo && (
                          <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                            <DollarOutlined style={{ marginRight: 4 }} />
                            Máx: R${" "}
                            {Number(l.valor_maximo).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        )}
                        <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                          <TeamOutlined style={{ marginRight: 4 }} />
                          {l.propostas_count ?? l.propostas?.length ?? 0}{" "}
                          proposta(s)
                        </Text>
                        {l.prazo_execucao && (
                          <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            Prazo execução: {l.prazo_execucao} dias
                          </Text>
                        )}
                      </Space>
                      {countdown && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: countdown.vencido
                              ? colors.vermelho
                              : countdown.urgente
                                ? colors.laranja
                                : colors.textoFraco,
                            fontWeight:
                              countdown.urgente || countdown.vencido
                                ? 700
                                : 400,
                          }}
                        >
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {countdown.texto}
                        </Text>
                      )}
                    </Space>
                  </Col>

                  <Col xs={24} md={8} style={{ textAlign: "right" }}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {jaEnviou ? (
                        <Tooltip title="Você já enviou proposta para esta licitação">
                          <Button
                            icon={<EyeOutlined />}
                            onClick={() => setModalDetalheProposta(l.minha_proposta)}
                            style={{ borderRadius: 10, width: "100%", fontWeight: 600 }}
                          >
                            Ver Proposta
                          </Button>
                        </Tooltip>
                      ) : l.status === "publicada" ? (
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          style={{
                            background: colors.verde,
                            borderColor: colors.verde,
                            borderRadius: 10,
                            width: "100%",
                            fontWeight: 600,
                          }}
                          onClick={() => abrirModal(l)}
                        >
                          Enviar Proposta
                        </Button>
                      ) : (
                        <Tag color={statusConf.color} style={{ borderRadius: 999, fontWeight: 600 }}>{statusConf.label}</Tag>
                      )}
                      <Button
                        icon={<MessageOutlined />}
                        style={{ borderRadius: 10, width: "100%", fontWeight: 600 }}
                        onClick={() => abrirChat(l)}
                      >
                        Chat da licitação
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      )}

      {/* ============ Modal Orçamento Completo ============ */}
      <Modal
        open={!!modalProposta}
        onCancel={() => {
          setModalProposta(null);
          setArquivoProposta([]);
          form.resetFields();
        }}
        title={null}
        footer={null}
        width={780}
        styles={{ body: { padding: 0 } }}
      >
        {modalProposta && (
          <div>
            {/* Cabeçalho do modal */}
            <div
              style={{
                background: "linear-gradient(135deg,#0F172A,#1E293B)",
                borderRadius: "16px 16px 0 0",
                padding: "20px 24px",
              }}
            >
              <Space>
                <SendOutlined style={{ color: colors.verde, fontSize: 18 }} />
                <span
                  style={{ color: "#F1F5F9", fontSize: 16, fontWeight: 700 }}
                >
                  Enviar Proposta
                </span>
              </Space>
            </div>

            {/* Detalhes da licitação */}
            <div
              style={{
                padding: "20px 24px",
                background: colors.fundoSuave,
                borderBottom: `1px solid ${colors.borda}`,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: colors.textoFraco,
                  fontWeight: 700,
                }}
              >
                Detalhes do Serviço
              </Text>
              <div style={{ marginTop: 10 }}>
                <Space wrap style={{ marginBottom: 8 }}>
                  <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>
                    <ToolOutlined style={{ marginRight: 4 }} />
                    {modalProposta.tipo_servico}
                  </Tag>
                  {modalProposta.valor_maximo && (
                    <Tag color="green" style={{ borderRadius: 999, fontWeight: 600 }}>
                      <DollarOutlined style={{ marginRight: 4 }} />
                      Máx: R${" "}
                      {Number(modalProposta.valor_maximo).toLocaleString(
                        "pt-BR",
                        { minimumFractionDigits: 2 },
                      )}
                    </Tag>
                  )}
                  {modalProposta.prazo_execucao && (
                    <Tag color="orange" style={{ borderRadius: 999, fontWeight: 600 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      Prazo: {modalProposta.prazo_execucao} dias
                    </Tag>
                  )}
                </Space>
                <Text
                  strong
                  style={{ fontSize: 15, display: "block", marginBottom: 6, color: colors.texto }}
                >
                  {modalProposta.titulo}
                </Text>
                {modalProposta.descricao && (
                  <Paragraph
                    style={{ fontSize: 13, margin: 0, color: colors.textoSecundario }}
                  >
                    {modalProposta.descricao}
                  </Paragraph>
                )}
                {modalProposta.requisitos && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#FEF3C7",
                      borderRadius: 8,
                      border: "1px solid #FDE68A",
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>
                      <InfoCircleOutlined
                        style={{ marginRight: 6, color: colors.laranja }}
                      />
                      <strong>Requisitos:</strong> {modalProposta.requisitos}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            {/* Formulário */}
            <div style={{ padding: "20px 24px" }}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleEnviarProposta}
              >
                {/* Itens do orçamento */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Text strong style={{ color: colors.texto }}>
                      <FileTextOutlined
                        style={{ marginRight: 6, color: colors.azul }}
                      />
                      Itens do Orçamento
                    </Text>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={adicionarItem}
                      style={{ borderRadius: 8, fontWeight: 600 }}
                    >
                      Adicionar item
                    </Button>
                  </div>

                  <div
                    style={{
                      border: `1px solid ${colors.borda}`,
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {/* Cabeçalho da tabela */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 60px 90px 110px 36px",
                        gap: 8,
                        padding: "8px 12px",
                        background: colors.fundoSuave,
                        borderBottom: `1px solid ${colors.borda}`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.textoFraco,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Descrição do Item / Serviço
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.textoFraco,
                          textTransform: "uppercase",
                        }}
                      >
                        Qtd
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.textoFraco,
                          textTransform: "uppercase",
                        }}
                      >
                        Unidade
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.textoFraco,
                          textTransform: "uppercase",
                        }}
                      >
                        Valor Unit.
                      </Text>
                      <span />
                    </div>
                    {/* Linhas */}
                    {itens.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 60px 90px 110px 36px",
                          gap: 8,
                          padding: "8px 12px",
                          borderBottom:
                            idx < itens.length - 1
                              ? `1px solid ${colors.fundoSuave}`
                              : "none",
                          alignItems: "center",
                        }}
                      >
                        <Input
                          value={item.descricao}
                          onChange={(e) =>
                            atualizarItem(idx, "descricao", e.target.value)
                          }
                          placeholder="Ex: Instalação de ar-condicionado"
                          size="small"
                          style={{ borderRadius: 6 }}
                        />
                        <InputNumber
                          value={item.qtd}
                          min={0}
                          onChange={(v) => atualizarItem(idx, "qtd", v ?? 0)}
                          size="small"
                          style={{ width: "100%", borderRadius: 6 }}
                        />
                        <Select
                          value={item.unidade}
                          onChange={(v) => atualizarItem(idx, "unidade", v)}
                          size="small"
                          style={{ width: "100%" }}
                        >
                          {UNIDADES.map((u) => (
                            <Option key={u} value={u}>
                              {u}
                            </Option>
                          ))}
                        </Select>
                        <InputNumber
                          value={item.valor_unit}
                          min={0}
                          precision={2}
                          onChange={(v) =>
                            atualizarItem(idx, "valor_unit", v ?? 0)
                          }
                          size="small"
                          style={{ width: "100%", borderRadius: 6 }}
                          formatter={(v) =>
                            `R$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                          }
                          parser={(v) =>
                            v.replace(/R\$\s?|\./g, "").replace(",", ".")
                          }
                        />
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={itens.length === 1}
                          onClick={() => removerItem(idx)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                          }}
                        />
                      </div>
                    ))}
                    {/* Total */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        padding: "10px 12px",
                        background: colors.fundoSuave,
                        borderTop: `1px solid ${colors.borda}`,
                      }}
                    >
                      <Text strong style={{ fontSize: 15, color: colors.texto }}>
                        Total:{" "}
                        <span style={{ color: colors.verde, fontSize: 16 }}>
                          R${" "}
                          {totalItens.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </Text>
                    </div>
                  </div>
                </div>

                <Divider style={{ margin: "16px 0" }} />

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="prazo_execucao_dias"
                      label="Prazo de execução (dias)"
                      rules={[{ required: true, message: "Informe o prazo" }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={1}
                        placeholder="Ex: 30"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="condicao_pagamento"
                      label="Condição de Pagamento"
                    >
                      <Select placeholder="Selecione..." allowClear>
                        {CONDICAO_PGTO.map((c) => (
                          <Option key={c.value} value={c.value}>
                            {c.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="validade_proposta"
                      label="Validade da Proposta"
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        placeholder="Selecione..."
                        disabledDate={(d) => d && d.isBefore(dayjs(), "day")}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="observacoes" label="Observações / Diferencial">
                  <TextArea
                    rows={3}
                    placeholder="Descreva seu diferencial, experiência, certificações ou condições especiais..."
                  />
                </Form.Item>

                <Form.Item label="Anexo da proposta">
                  <Upload
                    beforeUpload={() => false}
                    maxCount={1}
                    fileList={arquivoProposta}
                    onChange={({ fileList }) => setArquivoProposta(fileList)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  >
                    <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Anexar arquivo</Button>
                  </Upload>
                  <Text style={{ display: "block", marginTop: 6, fontSize: 12, color: colors.textoFraco }}>
                    Envie PDF, planilha ou documento complementar com a proposta formal.
                  </Text>
                </Form.Item>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    paddingTop: 4,
                  }}
                >
                  <Button
                    onClick={() => setModalProposta(null)}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={propostaLoading}
                    icon={<SendOutlined />}
                    style={{
                      background: colors.verde,
                      borderColor: colors.verde,
                      borderRadius: 8,
                      minWidth: 160,
                      fontWeight: 600,
                    }}
                  >
                    Enviar Proposta
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!modalChat}
        onCancel={() => setModalChat(null)}
        title={<Space><MessageOutlined /> Chat da licitação</Space>}
        footer={null}
        width={680}
      >
        {modalChat && (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Card size="small" bordered={false} style={{ ...panelStyle, boxShadow: "none" }}>
              <Text strong style={{ color: colors.texto }}>{modalChat.titulo}</Text>
              <div style={{ color: colors.textoSecundario, fontSize: 13, marginTop: 4 }}>
                Comunicação entre ERP do contratante e ERP do prestador.
              </div>
            </Card>
            <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
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
                  <Text strong style={{ fontSize: 12, color: colors.texto }}>{item.usuario_nome || item.origem_sistema}</Text>
                  <div style={{ fontSize: 13, color: colors.textoSecundario, marginTop: 2 }}>{item.mensagem}</div>
                  <Text style={{ fontSize: 11, color: colors.textoFraco }}>
                    {new Date(item.criado_em).toLocaleString("pt-BR")}
                  </Text>
                </div>
              ))}
            </div>
            <Input.TextArea
              rows={3}
              value={chatTexto}
              onChange={(event) => setChatTexto(event.target.value)}
              placeholder="Enviar pergunta, alinhamento técnico ou negociação para a outra ponta..."
            />
            <div style={{ textAlign: "right" }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={chatLoading}
                onClick={enviarChat}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Enviar mensagem
              </Button>
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        open={!!modalDetalheProposta}
        onCancel={() => setModalDetalheProposta(null)}
        title={
          <Space>
            <FileTextOutlined style={{ color: colors.azul }} />
            <span>Minha proposta enviada</span>
          </Space>
        }
        footer={[
          <Button key="fechar" onClick={() => setModalDetalheProposta(null)} style={{ borderRadius: 8, fontWeight: 600 }}>
            Fechar
          </Button>,
        ]}
        width={820}
      >
        {modalDetalheProposta && (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Card size="small" bordered={false} style={panelStyle}>
                  <Text style={{ color: colors.textoFraco, fontSize: 12 }}>Valor total</Text>
                  <Title level={4} style={{ margin: 0, color: colors.verde }}>
                    R$ {Number(modalDetalheProposta.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </Title>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" bordered={false} style={panelStyle}>
                  <Text style={{ color: colors.textoFraco, fontSize: 12 }}>Prazo</Text>
                  <Title level={4} style={{ margin: 0, color: colors.texto }}>
                    {modalDetalheProposta.prazo_execucao_dias} dias
                  </Title>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" bordered={false} style={panelStyle}>
                  <Text style={{ color: colors.textoFraco, fontSize: 12 }}>Status</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag
                      color={modalDetalheProposta.status === "aceita" ? "green" : modalDetalheProposta.status === "recusada" ? "red" : "blue"}
                      style={{ borderRadius: 999, fontWeight: 600 }}
                    >
                      {modalDetalheProposta.status}
                    </Tag>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ border: "1px solid #EEF2F7", borderRadius: 12, overflow: "hidden" }}>
              <Table
                size="small"
                rowKey={(row, idx) => `${row.ordem ?? idx}-${row.descricao}`}
                pagination={false}
                dataSource={modalDetalheProposta.itens_orcamento || []}
                columns={[
                  { title: "Item cotado", dataIndex: "descricao", ellipsis: true },
                  { title: "Qtd", dataIndex: "quantidade", width: 80 },
                  { title: "Un.", dataIndex: "unidade", width: 90 },
                  {
                    title: "Valor unit.",
                    dataIndex: "valor_unitario",
                    width: 130,
                    render: (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                  },
                  {
                    title: "Total",
                    dataIndex: "valor_total",
                    width: 130,
                    render: (v, row) => {
                      const total = v ?? Number(row.quantidade || 0) * Number(row.valor_unitario || 0);
                      return `R$ ${Number(total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                    },
                  },
                ]}
              />
            </div>

            {modalDetalheProposta.observacoes && (
              <Card size="small" bordered={false} style={panelStyle} title="Observações">
                <Paragraph style={{ margin: 0, color: colors.textoSecundario }}>{modalDetalheProposta.observacoes}</Paragraph>
              </Card>
            )}

            {modalDetalheProposta.arquivo_proposta && (
              <Button
                icon={<PaperClipOutlined />}
                href={modalDetalheProposta.arquivo_proposta}
                target="_blank"
                rel="noreferrer"
                style={{ borderRadius: 8 }}
              >
                Abrir anexo da proposta
              </Button>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
