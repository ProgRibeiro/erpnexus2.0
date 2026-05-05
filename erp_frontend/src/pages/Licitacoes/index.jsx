import { useState, useEffect, useCallback } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  InputNumber,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Spin,
  Tooltip,
} from "antd";
import {
  TrophyOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
  SendOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import api from "../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

  const filtradas = licitacoes.filter((l) => {
    if (filtroStatus === "todos") return true;
    return l.status === filtroStatus;
  });

  const handleEnviarProposta = async (values) => {
    if (!modalProposta) return;
    setPropostaLoading(true);
    try {
      await api.post(`/facilities/licitacoes/${modalProposta.id}/propostas/`, {
        valor: values.valor,
        prazo_execucao_dias: values.prazo_execucao_dias,
        observacoes: values.observacoes || "",
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
    <div style={{ padding: "24px", background: "#F8FAFC", minHeight: "100vh" }}>
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
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : filtradas.length === 0 ? (
        <Empty
          image={<TrophyOutlined style={{ fontSize: 64, color: "#CBD5E1" }} />}
          description={
            <span style={{ color: "#94A3B8", fontSize: 16 }}>
              Nenhuma licitação disponível no momento
            </span>
          }
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
                      </Space>

                      {countdown && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: countdown.vencido ? "#EF4444" : countdown.urgente ? "#F59E0B" : "#64748B",
                            fontWeight: countdown.urgente || countdown.vencido ? 600 : 400,
                          }}
                        >
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {countdown.texto}
                        </Text>
                      )}
                    </Space>
                  </Col>

                  <Col xs={24} md={8} style={{ textAlign: "right" }}>
                    {jaEnviou ? (
                      <Tooltip title="Você já enviou proposta para esta licitação">
                        <Button icon={<EyeOutlined />} style={{ borderRadius: 8, width: "100%" }}>
                          Ver Proposta
                        </Button>
                      </Tooltip>
                    ) : l.status === "publicada" ? (
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        style={{
                          background: "#10B981",
                          borderColor: "#10B981",
                          borderRadius: 8,
                          width: "100%",
                        }}
                        onClick={() => { setModalProposta(l); form.resetFields(); }}
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

      {/* Modal Enviar Proposta */}
      <Modal
        open={!!modalProposta}
        onCancel={() => { setModalProposta(null); form.resetFields(); }}
        title={
          <Space>
            <SendOutlined style={{ color: "#10B981" }} />
            <span>Enviar Proposta — {modalProposta?.titulo}</span>
          </Space>
        }
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleEnviarProposta} style={{ marginTop: 16 }}>
          <Form.Item
            name="valor"
            label="Valor da proposta (R$)"
            rules={[{ required: true, message: "Informe o valor" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={2}
              formatter={(v) => `R$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(v) => v.replace(/R\$\s?|(\.*)/g, "").replace(",", ".")}
              placeholder="0,00"
            />
          </Form.Item>

          <Form.Item
            name="prazo_execucao_dias"
            label="Prazo de execução (dias)"
            rules={[{ required: true, message: "Informe o prazo" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} placeholder="Ex: 30" />
          </Form.Item>

          <Form.Item name="observacoes" label="Observações / Diferencial">
            <TextArea rows={4} placeholder="Descreva seu diferencial, experiência ou condições especiais..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={propostaLoading}
              block
              style={{ background: "#10B981", borderColor: "#10B981", borderRadius: 8, height: 42 }}
            >
              Enviar Proposta
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
