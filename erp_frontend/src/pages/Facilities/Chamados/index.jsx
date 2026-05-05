import { useState, useEffect } from "react";
import {
  Row, Col, Card, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, message, Spin, Badge, Divider, InputNumber,
} from "antd";
import {
  PlusOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined,
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
  em_execucao: "#3B82F6",
  concluido: "#10B981",
  cancelado: "#6B7280",
};
const statusLabel = {
  aberto: "Aberto",
  aguardando_orcamento: "Ag. Orçamento",
  aguardando_aprovacao: "Ag. Aprovação",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const colunas = [
  { key: "aberto", label: "Aberto", color: "#EF4444", statuses: ["aberto"] },
  { key: "aguardando", label: "Aguardando", color: "#F59E0B", statuses: ["aguardando_orcamento", "aguardando_aprovacao"] },
  { key: "em_execucao", label: "Em Execução", color: "#3B82F6", statuses: ["em_execucao"] },
  { key: "concluido", label: "Concluído", color: "#10B981", statuses: ["concluido"] },
];

const borderColor = (prioridade) => {
  const map = { baixa: "#3B82F6", media: "#F59E0B", alta: "#F97316", critica: "#EF4444", emergencia: "#A855F7" };
  return map[prioridade] || "#D1D5DB";
};

export default function ChamadosFacilities() {
  const [chamados, setChamados] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalDetalhe, setModalDetalhe] = useState(null);
  const [modalRecusar, setModalRecusar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [obsRecusa, setObsRecusa] = useState("");
  const [form] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/portal/contratante/chamados/"),
      api.get("/portal/contratante/unidades/"),
    ])
      .then(([c, u]) => {
        setChamados(Array.isArray(c.data) ? c.data : (c.data?.results || []));
        setUnidades(Array.isArray(u.data) ? u.data : (u.data?.results || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (values) => {
    setSaving(true);
    try {
      await api.post("/portal/contratante/chamados/", values);
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
      await api.post(`/portal/contratante/chamados/${chamadoId}/aprovar-orcamento/`);
      message.success("Orçamento aprovado!");
      setModalDetalhe(null);
      carregar();
    } catch {
      message.error("Erro ao aprovar orçamento.");
    }
  };

  const recusarOrcamento = async (chamadoId) => {
    try {
      await api.post(`/portal/contratante/chamados/${chamadoId}/recusar-orcamento/`, { observacao: obsRecusa });
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
                      onClick={() => setModalDetalhe(c)}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: "#6B7280", marginBottom: 2 }}>{c.numero}</div>
                      <div style={{ fontWeight: 500, marginBottom: 6, color: "#111827", fontSize: 13 }}>
                        {c.tipo_servico || "Sem tipo"}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <Tag color={prioridadeCor[c.prioridade]} style={{ fontSize: 11 }}>
                          {prioridadeLabel[c.prioridade] || c.prioridade}
                        </Tag>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>
                          <ClockCircleOutlined /> {dayjs(c.abertura).fromNow()}
                        </span>
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

      {/* Modal Novo Chamado */}
      <Modal
        title="Novo Chamado"
        open={modalNovo}
        onCancel={() => { setModalNovo(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Abrir Chamado"
        cancelText="Cancelar"
        confirmLoading={saving}
        width={640}
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
              <Form.Item name="unidade_id" label="Unidade" rules={[{ required: true, message: "Selecione a unidade" }]}>
                <Select showSearch placeholder="Selecione a unidade" optionFilterProp="children">
                  {unidades.map((u) => (
                    <Option key={u.id} value={u.id}>{u.nome} {u.codigo_interno ? `(${u.codigo_interno})` : ""}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
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
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tipo de serviço</Text>
              <div style={{ fontWeight: 600, color: "#111827" }}>{modalDetalhe.tipo_servico || "-"}</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Descrição</Text>
              <div style={{ color: "#374151" }}>{modalDetalhe.descricao || "-"}</div>
            </div>

            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Abertura</Text>
                <div style={{ fontWeight: 500 }}>{dayjs(modalDetalhe.abertura).format("DD/MM/YYYY HH:mm")}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Unidade</Text>
                <div style={{ fontWeight: 500 }}>{modalDetalhe.unidade_nome || modalDetalhe.unidade_id || "-"}</div>
              </Col>
            </Row>

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
