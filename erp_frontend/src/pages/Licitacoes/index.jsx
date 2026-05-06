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
  message,
  Spin,
  Tooltip,
  DatePicker,
} from "antd";
import {
  TrophyOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
  SendOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ToolOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../services/api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
  rascunho:   { color: "default", label: "Rascunho" },
  publicada:  { color: "blue",    label: "Publicada" },
  em_analise: { color: "orange",  label: "Em Análise" },
  concluida:  { color: "green",   label: "Concluída" },
  cancelada:  { color: "red",     label: "Cancelada" },
};

function calcularCountdown(prazo) {
  if (!prazo) return null;
  const diff = new Date(prazo) - new Date();
  if (diff <= 0) return { vencido: true, texto: "Prazo encerrado" };
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return { vencido: false, texto: `${d}d ${h % 24}h restantes`, urgente: d < 2 };
  return { vencido: false, texto: `${h}h restantes`, urgente: true };
}

export default function LicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalProposta, setModalProposta] = useState(null);
  const [propostaLoading, setPropostaLoading] = useState(false);
  const [itens, setItens] = useState([{ descricao: "", qtd: 1, unidade: "un", valor_unit: 0 }]);
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

  useEffect(() => { fetchLicitacoes(); }, [fetchLicitacoes]);

  const filtradas = licitacoes.filter((l) =>
    filtroStatus === "todos" || l.status === filtroStatus
  );

  const totalItens = itens.reduce((sum, i) => sum + (i.qtd || 0) * (i.valor_unit || 0), 0);

  const adicionarItem = () =>
    setItens((prev) => [...prev, { descricao: "", qtd: 1, unidade: "un", valor_unit: 0 }]);

  const removerItem = (idx) =>
    setItens((prev) => prev.filter((_, i) => i !== idx));

  const atualizarItem = (idx, campo, valor) =>
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)));

  const abrirModal = (l) => {
    setModalProposta(l);
    setItens([{ descricao: l.titulo || "", qtd: 1, unidade: "serviço", valor_unit: 0 }]);
    form.resetFields();
  };

  const handleEnviarProposta = async (values) => {
    if (!modalProposta) return;
    if (itens.some((i) => !i.descricao.trim())) {
      message.error("Preencha a descrição de todos os itens.");
      return;
    }
    setPropostaLoading(true);
    try {
      await api.post(`/facilities/licitacoes/${modalProposta.id}/propostas/`, {
        valor: totalItens,
        prazo_execucao_dias: values.prazo_execucao_dias,
        condicao_pagamento: values.condicao_pagamento,
        validade_proposta: values.validade_proposta ? values.validade_proposta.format("YYYY-MM-DD") : null,
        observacoes: values.observacoes || "",
        itens_orcamento: itens,
      });
      message.success("Proposta enviada com sucesso!");
      setModalProposta(null);
      form.resetFields();
      fetchLicitacoes();
    } catch {
      message.error("Erro ao enviar proposta");
    } finally {
      setPropostaLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", background: "#F4F6F9", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TrophyOutlined style={{ fontSize: 28, color: "#3B82F6" }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>Licitações</Title>
            <Text type="secondary">Licitações abertas de clientes para prestação de serviço</Text>
          </div>
        </div>
        <Button onClick={fetchLicitacoes}>Atualizar</Button>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: 20, borderRadius: 12 }}>
        <Select value={filtroStatus} onChange={setFiltroStatus} style={{ width: 220 }}>
          <Option value="todos">Todos os status</Option>
          <Option value="publicada">Aberta</Option>
          <Option value="em_analise">Em Análise</Option>
          <Option value="concluida">Concluída / Ganha</Option>
          <Option value="cancelada">Cancelada</Option>
        </Select>
      </Card>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>
      ) : filtradas.length === 0 ? (
        <Empty
          image={<TrophyOutlined style={{ fontSize: 64, color: "#CBD5E1" }} />}
          description={<span style={{ color: "#94A3B8", fontSize: 16 }}>Nenhuma licitação disponível no momento</span>}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtradas.map((l) => {
            const countdown = calcularCountdown(l.prazo_propostas);
            const statusConf = STATUS_CONFIG[l.status] || STATUS_CONFIG.publicada;
            const jaEnviou = l.minha_proposta != null;

            return (
              <Card
                key={l.id}
                style={{ borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "none" }}
                bodyStyle={{ padding: "20px 24px" }}
              >
                <Row align="middle" gutter={[16, 12]}>
                  <Col xs={24} md={16}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Space wrap>
                        <Tag color={statusConf.color} style={{ borderRadius: 6 }}>{statusConf.label}</Tag>
                        <Tag color="blue" style={{ borderRadius: 6 }}>{l.tipo_servico}</Tag>
                      </Space>
                      <Text strong style={{ fontSize: 16 }}>{l.titulo}</Text>
                      {l.descricao && (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {String(l.descricao).slice(0, 140)}{l.descricao.length > 140 ? "..." : ""}
                        </Text>
                      )}
                      <Space wrap>
                        {l.valor_maximo && (
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            <DollarOutlined style={{ marginRight: 4 }} />
                            Máx: R$ {Number(l.valor_maximo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </Text>
                        )}
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          <TeamOutlined style={{ marginRight: 4 }} />
                          {l.propostas_count ?? (l.propostas?.length ?? 0)} proposta(s)
                        </Text>
                        {l.prazo_execucao && (
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            Prazo execução: {l.prazo_execucao} dias
                          </Text>
                        )}
                      </Space>
                      {countdown && (
                        <Text style={{ fontSize: 12, color: countdown.vencido ? "#EF4444" : countdown.urgente ? "#F59E0B" : "#64748B", fontWeight: countdown.urgente || countdown.vencido ? 600 : 400 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {countdown.texto}
                        </Text>
                      )}
                    </Space>
                  </Col>

                  <Col xs={24} md={8} style={{ textAlign: "right" }}>
                    {jaEnviou ? (
                      <Tooltip title="Você já enviou proposta para esta licitação">
                        <Button icon={<EyeOutlined />} style={{ borderRadius: 8, width: "100%" }}>Ver Proposta</Button>
                      </Tooltip>
                    ) : l.status === "publicada" ? (
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        style={{ background: "#10B981", borderColor: "#10B981", borderRadius: 8, width: "100%" }}
                        onClick={() => abrirModal(l)}
                      >
                        Enviar Proposta
                      </Button>
                    ) : (
                      <Tag color={statusConf.color}>{statusConf.label}</Tag>
                    )}
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
        onCancel={() => { setModalProposta(null); form.resetFields(); }}
        title={null}
        footer={null}
        width={780}
        styles={{ body: { padding: 0 } }}
      >
        {modalProposta && (
          <div>
            {/* Cabeçalho do modal */}
            <div style={{ background: "linear-gradient(135deg,#0F172A,#1E293B)", borderRadius: "8px 8px 0 0", padding: "20px 24px" }}>
              <Space>
                <SendOutlined style={{ color: "#10B981", fontSize: 18 }} />
                <span style={{ color: "#F1F5F9", fontSize: 16, fontWeight: 600 }}>Enviar Proposta</span>
              </Space>
            </div>

            {/* Detalhes da licitação */}
            <div style={{ padding: "20px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Detalhes do Serviço</Text>
              <div style={{ marginTop: 10 }}>
                <Space wrap style={{ marginBottom: 8 }}>
                  <Tag color="blue" style={{ borderRadius: 6 }}>
                    <ToolOutlined style={{ marginRight: 4 }} />
                    {modalProposta.tipo_servico}
                  </Tag>
                  {modalProposta.valor_maximo && (
                    <Tag color="green" style={{ borderRadius: 6 }}>
                      <DollarOutlined style={{ marginRight: 4 }} />
                      Máx: R$ {Number(modalProposta.valor_maximo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Tag>
                  )}
                  {modalProposta.prazo_execucao && (
                    <Tag color="orange" style={{ borderRadius: 6 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      Prazo: {modalProposta.prazo_execucao} dias
                    </Tag>
                  )}
                </Space>
                <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>{modalProposta.titulo}</Text>
                {modalProposta.descricao && (
                  <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>{modalProposta.descricao}</Paragraph>
                )}
                {modalProposta.requisitos && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "#FEF3C7", borderRadius: 8, border: "1px solid #FDE68A" }}>
                    <Text style={{ fontSize: 12 }}>
                      <InfoCircleOutlined style={{ marginRight: 6, color: "#D97706" }} />
                      <strong>Requisitos:</strong> {modalProposta.requisitos}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            {/* Formulário */}
            <div style={{ padding: "20px 24px" }}>
              <Form form={form} layout="vertical" onFinish={handleEnviarProposta}>

                {/* Itens do orçamento */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Text strong>
                      <FileTextOutlined style={{ marginRight: 6, color: "#3B82F6" }} />
                      Itens do Orçamento
                    </Text>
                    <Button size="small" icon={<PlusOutlined />} onClick={adicionarItem} style={{ borderRadius: 6 }}>
                      Adicionar item
                    </Button>
                  </div>

                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
                    {/* Cabeçalho da tabela */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 110px 36px", gap: 8, padding: "8px 12px", background: "#F1F5F9", borderBottom: "1px solid #E2E8F0" }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Descrição do Item / Serviço</Text>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Qtd</Text>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Unidade</Text>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Valor Unit.</Text>
                      <span />
                    </div>
                    {/* Linhas */}
                    {itens.map((item, idx) => (
                      <div
                        key={idx}
                        style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 110px 36px", gap: 8, padding: "8px 12px", borderBottom: idx < itens.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center" }}
                      >
                        <Input
                          value={item.descricao}
                          onChange={(e) => atualizarItem(idx, "descricao", e.target.value)}
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
                          {UNIDADES.map((u) => <Option key={u} value={u}>{u}</Option>)}
                        </Select>
                        <InputNumber
                          value={item.valor_unit}
                          min={0}
                          precision={2}
                          onChange={(v) => atualizarItem(idx, "valor_unit", v ?? 0)}
                          size="small"
                          style={{ width: "100%", borderRadius: 6 }}
                          formatter={(v) => `R$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                          parser={(v) => v.replace(/R\$\s?|\./g, "").replace(",", ".")}
                        />
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={itens.length === 1}
                          onClick={() => removerItem(idx)}
                          style={{ border: "none", background: "transparent", padding: 0 }}
                        />
                      </div>
                    ))}
                    {/* Total */}
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                      <Text strong style={{ fontSize: 15 }}>
                        Total:{" "}
                        <span style={{ color: "#10B981", fontSize: 16 }}>
                          R$ {totalItens.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                      <InputNumber style={{ width: "100%" }} min={1} placeholder="Ex: 30" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="condicao_pagamento" label="Condição de Pagamento">
                      <Select placeholder="Selecione..." allowClear>
                        {CONDICAO_PGTO.map((c) => <Option key={c.value} value={c.value}>{c.label}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="validade_proposta" label="Validade da Proposta">
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

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                  <Button onClick={() => setModalProposta(null)}>Cancelar</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={propostaLoading}
                    icon={<SendOutlined />}
                    style={{ background: "#10B981", borderColor: "#10B981", borderRadius: 8, minWidth: 160 }}
                  >
                    Enviar Proposta
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
