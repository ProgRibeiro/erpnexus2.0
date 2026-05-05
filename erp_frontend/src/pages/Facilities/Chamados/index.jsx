import { useState, useEffect } from "react";
import {
  Row, Col, Card, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, message, Spin, Badge, Divider,
} from "antd";
import {
  PlusOutlined, ClockCircleOutlined, UserOutlined, EnvironmentOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import api from "../../../services/api";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const { Title, Text } = Typography;
const { Option } = Select;

const prioridadeCor = { baixa: "blue", media: "gold", alta: "orange", critica: "red" };
const prioridadeLabel = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };
const colunas = [
  { key: "aberto", label: "Aberto", color: "#EF4444" },
  { key: "em_atendimento", label: "Em Atendimento", color: "#F59E0B" },
  { key: "resolvido", label: "Resolvido", color: "#10B981" },
];

export default function ChamadosFacilities() {
  const [chamados, setChamados] = useState([]);
  const [ativos, setAtivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalDetalhe, setModalDetalhe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.get("/facilities/chamados/?ordering=-aberto_em"),
      api.get("/facilities/ativos/?status=operacional"),
    ])
      .then(([c, a]) => {
        setChamados(Array.isArray(c.data) ? c.data : (c.data?.results || []));
        setAtivos(Array.isArray(a.data) ? a.data : (a.data?.results || []));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (values) => {
    setSaving(true);
    try {
      await api.post("/facilities/chamados/", values);
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

  const handleAcao = async (acao, chamadoId) => {
    try {
      await api.post(`/facilities/chamados/${chamadoId}/${acao}/`);
      message.success("Status atualizado!");
      setModalDetalhe(null);
      carregar();
    } catch {
      message.error("Erro ao atualizar chamado.");
    }
  };

  const getChamadosDaColuna = (status) =>
    chamados.filter((c) => c.status === status);

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Help Desk / Chamados</Title>
          <Text type="secondary">Gestão de solicitações internas de facilities</Text>
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
          const lista = getChamadosDaColuna(col.key);
          return (
            <Col xs={24} md={8} key={col.key}>
              <div
                style={{
                  background: "#F3F4F6",
                  borderRadius: 14,
                  padding: 16,
                  minHeight: 400,
                }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    marginBottom: 16, fontWeight: 600, fontSize: 15,
                  }}
                >
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: col.color, display: "inline-block",
                    }}
                  />
                  {col.label}
                  <Badge count={lista.length} style={{ background: col.color, marginLeft: 4 }} />
                </div>

                <Space direction="vertical" style={{ width: "100%" }} size={10}>
                  {lista.length === 0 && (
                    <div style={{ textAlign: "center", color: "#9CA3AF", padding: 32 }}>
                      Nenhum chamado
                    </div>
                  )}
                  {lista.map((c) => (
                    <Card
                      key={c.id}
                      style={{
                        borderRadius: 10,
                        cursor: "pointer",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                        borderLeft: `4px solid ${prioridadeCor[c.prioridade] === "red" ? "#EF4444" : prioridadeCor[c.prioridade] === "orange" ? "#F97316" : prioridadeCor[c.prioridade] === "gold" ? "#F59E0B" : "#3B82F6"}`,
                      }}
                      bodyStyle={{ padding: "12px 14px" }}
                      onClick={() => setModalDetalhe(c)}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{c.numero}</div>
                      <div style={{ fontWeight: 500, marginBottom: 8, color: "#111827" }}>{c.titulo}</div>
                      {c.ativo_tag && (
                        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                          🔧 {c.ativo_tag} — {c.ativo_nome}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Tag color={prioridadeCor[c.prioridade]} style={{ fontSize: 11 }}>
                          {prioridadeLabel[c.prioridade]}
                        </Tag>
                        {c.local && (
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                            <EnvironmentOutlined /> {c.local}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>
                          <ClockCircleOutlined /> {dayjs(c.aberto_em).fromNow()}
                        </span>
                      </div>
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
          <Form.Item name="titulo" label="Título" rules={[{ required: true }]}>
            <Input placeholder="Descreva brevemente o problema" />
          </Form.Item>
          <Form.Item name="descricao" label="Descrição detalhada" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
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
                <Input placeholder="Ex: Sala 210, 2º Andar" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="solicitante_nome" label="Solicitante" rules={[{ required: true }]}>
                <Input placeholder="Nome do solicitante" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ativo" label="Ativo Relacionado">
                <Select allowClear showSearch placeholder="Selecione (opcional)" optionFilterProp="children">
                  {ativos.map((a) => (
                    <Option key={a.id} value={a.id}>{a.tag} — {a.nome}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="solicitante_email" label="E-mail">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="solicitante_ramal" label="Ramal">
                <Input />
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
          width={600}
        >
          <div style={{ padding: "8px 0" }}>
            <Title level={5} style={{ margin: "0 0 8px" }}>{modalDetalhe.titulo}</Title>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Tag color={prioridadeCor[modalDetalhe.prioridade]}>{prioridadeLabel[modalDetalhe.prioridade]}</Tag>
              <Tag>{modalDetalhe.status?.replace("_", " ").toUpperCase()}</Tag>
            </div>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>{modalDetalhe.descricao}</Text>
            <Divider style={{ margin: "12px 0" }} />
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <Text type="secondary">Solicitante:</Text>
                <div style={{ fontWeight: 500 }}>
                  <UserOutlined style={{ marginRight: 4 }} />{modalDetalhe.solicitante_nome}
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Local:</Text>
                <div style={{ fontWeight: 500 }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />{modalDetalhe.local || "-"}
                </div>
              </Col>
            </Row>
            {modalDetalhe.ativo_tag && (
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Ativo: </Text>
                <Tag color="blue">{modalDetalhe.ativo_tag}</Tag>
                <span>{modalDetalhe.ativo_nome}</span>
              </div>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Aberto {dayjs(modalDetalhe.aberto_em).fromNow()} — {dayjs(modalDetalhe.aberto_em).format("DD/MM/YYYY HH:mm")}
            </Text>
            <Divider style={{ margin: "12px 0" }} />
            <Space>
              {modalDetalhe.status === "aberto" && (
                <Button
                  type="primary"
                  style={{ background: "#F59E0B", borderColor: "#F59E0B" }}
                  onClick={() => handleAcao("assumir", modalDetalhe.id)}
                >
                  Assumir
                </Button>
              )}
              {["aberto", "em_atendimento", "aguardando"].includes(modalDetalhe.status) && (
                <Button
                  type="primary"
                  style={{ background: "#10B981", borderColor: "#10B981" }}
                  onClick={() => handleAcao("resolver", modalDetalhe.id)}
                >
                  Resolver
                </Button>
              )}
              {modalDetalhe.status === "resolvido" && (
                <Button onClick={() => handleAcao("fechar", modalDetalhe.id)}>
                  Fechar Chamado
                </Button>
              )}
            </Space>
          </div>
        </Modal>
      )}
    </div>
  );
}
