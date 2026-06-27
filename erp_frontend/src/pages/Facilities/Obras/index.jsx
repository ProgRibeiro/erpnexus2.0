import { useState, useEffect } from "react";
import {
  Row, Col, Card, Button, Modal, Form, Input, Select, DatePicker,
  Tag, Typography, message, Progress, InputNumber, Space, Skeleton, Empty,
} from "antd";
import { PlusOutlined, ProjectOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../../services/api";

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
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Space align="start">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#0EA5E914",
                color: "#0EA5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <ProjectOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>Obras e Projetos</Title>
              <Text style={{ color: colors.textoSecundario }}>
                Gestão de projetos de engenharia e obras
              </Text>
            </div>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ height: 40, paddingInline: 20, fontWeight: 600, borderRadius: 10 }}
          >
            Novo Projeto
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      ) : projetos.length === 0 ? (
        <Card bordered={false} style={{ ...panelStyle, textAlign: "center" }} bodyStyle={{ padding: 48 }}>
          <Empty description="Nenhum projeto cadastrado" />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {projetos.map((p) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
              <Card
                bordered={false}
                style={panelStyle}
                bodyStyle={{ padding: 20 }}
                onClick={() => navigate(`/facilities/obras/${p.id}`)}
                hoverable
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span
                    style={{
                      fontFamily: "monospace", fontWeight: 700, fontSize: 13,
                      color: colors.azul, background: "#EFF6FF",
                      padding: "2px 8px", borderRadius: 6,
                    }}
                  >
                    {p.codigo}
                  </span>
                  <Tag color={statusCor[p.status]} style={{ borderRadius: 999, fontWeight: 600 }}>{statusLabel[p.status]}</Tag>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: colors.texto }}>{p.nome}</div>
                <div style={{ color: colors.textoSecundario, fontSize: 13, marginBottom: 12 }}>{tipoLabel[p.tipo]}</div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.textoFraco }}>Conclusão</Text>
                    <Text style={{ fontSize: 12, fontWeight: 700, color: colors.texto }}>{Number(p.percentual_concluido).toFixed(0)}%</Text>
                  </div>
                  <Progress
                    percent={Number(p.percentual_concluido)}
                    showInfo={false}
                    strokeColor={colors.azul}
                    trailColor="#E5E7EB"
                    size="small"
                  />
                </div>

                <div style={{ borderTop: `1px solid ${colors.borda}`, paddingTop: 10, marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 11, color: colors.textoFraco }}>Previsto</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: colors.texto }}>
                        R$ {Number(p.orcamento_previsto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: colors.textoFraco }}>Realizado</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: Number(p.orcamento_realizado) > Number(p.orcamento_previsto) ? colors.vermelho : colors.verde }}>
                        R$ {Number(p.orcamento_realizado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>

                {p.data_fim_prevista && (
                  <div style={{ marginTop: 10, fontSize: 12, color: colors.textoFraco }}>
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
