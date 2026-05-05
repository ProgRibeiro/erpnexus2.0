import { useState, useEffect } from "react";
import {
  Row, Col, Card, Button, Modal, Form, Input, Select, DatePicker,
  Tag, Typography, message, Progress, InputNumber,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const statusCor = {
  planejamento: "blue", em_andamento: "green",
  pausado: "orange", concluido: "default", cancelado: "red",
};
const statusLabel = {
  planejamento: "Planejamento", em_andamento: "Em Andamento",
  pausado: "Pausado", concluido: "Concluído", cancelado: "Cancelado",
};
const tipoLabel = {
  construcao: "Construção", reforma: "Reforma",
  instalacao: "Instalação", ampliacao: "Ampliação", outro: "Outro",
};

export default function ObrasPage() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    api.get("/facilities/projetos/")
      .then((r) => setProjetos(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        data_inicio_prevista: values.data_inicio_prevista?.format("YYYY-MM-DD") || null,
        data_fim_prevista: values.data_fim_prevista?.format("YYYY-MM-DD") || null,
      };
      await api.post("/facilities/projetos/", payload);
      message.success("Projeto criado!");
      setModalOpen(false);
      form.resetFields();
      carregar();
    } catch {
      message.error("Erro ao salvar projeto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Obras e Projetos</Title>
          <Text type="secondary">Gestão de projetos de engenharia e obras</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 8 }}
          >
            Novo Projeto
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Carregando...</div>
      ) : projetos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>Nenhum projeto cadastrado</div>
      ) : (
        <Row gutter={[16, 16]}>
          {projetos.map((p) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
              <Card
                style={{
                  borderRadius: 14,
                  boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s",
                }}
                bodyStyle={{ padding: 20 }}
                onClick={() => navigate(`/facilities/obras/${p.id}`)}
                hoverable
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span
                    style={{
                      fontFamily: "monospace", fontWeight: 700, fontSize: 13,
                      color: "#3B82F6", background: "#EFF6FF",
                      padding: "2px 8px", borderRadius: 6,
                    }}
                  >
                    {p.codigo}
                  </span>
                  <Tag color={statusCor[p.status]}>{statusLabel[p.status]}</Tag>
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "#111827" }}>{p.nome}</div>
                <div style={{ color: "#6B7280", fontSize: 13, marginBottom: 12 }}>{tipoLabel[p.tipo]}</div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Conclusão</Text>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>{Number(p.percentual_concluido).toFixed(0)}%</Text>
                  </div>
                  <Progress
                    percent={Number(p.percentual_concluido)}
                    showInfo={false}
                    strokeColor="#3B82F6"
                    trailColor="#E5E7EB"
                    size="small"
                  />
                </div>

                <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 10, marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>Previsto</div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        R$ {Number(p.orcamento_previsto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>Realizado</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: Number(p.orcamento_realizado) > Number(p.orcamento_previsto) ? "#EF4444" : "#10B981" }}>
                        R$ {Number(p.orcamento_realizado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>

                {p.data_fim_prevista && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#9CA3AF" }}>
                    Previsão fim: {dayjs(p.data_fim_prevista).format("DD/MM/YYYY")}
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="Novo Projeto / Obra"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        confirmLoading={saving}
        width={700}
        okButtonProps={{ style: { background: "#3B82F6", borderColor: "#3B82F6" } }}
      >
        <Form form={form} layout="vertical" onFinish={salvar} style={{ marginTop: 8 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="codigo" label="Código" rules={[{ required: true }]}>
                <Input placeholder="OBRA-2025-001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="nome" label="Nome do Projeto" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(tipoLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="planejamento">
                <Select>
                  {Object.entries(statusLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="data_inicio_prevista" label="Início Previsto">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="data_fim_prevista" label="Fim Previsto">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="orcamento_previsto" label="Orçamento Previsto (R$)">
            <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
          </Form.Item>
          <Form.Item name="descricao" label="Descrição">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
