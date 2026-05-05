import { useState, useEffect } from "react";
import {
  Row, Col, Card, Tag, Button, Spin, Tabs, Table, Typography,
  Space, Progress, Statistic, Modal, Form, Input, Select, DatePicker,
  message, InputNumber,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
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
const faseStatusCor = { pendente: "default", em_andamento: "blue", concluida: "green" };
const faseStatusLabel = { pendente: "Pendente", em_andamento: "Em Andamento", concluida: "Concluída" };
const climaLabel = { sol: "☀️ Sol", nublado: "⛅ Nublado", chuva: "🌧️ Chuva", vento: "💨 Vento" };
const bmStatusCor = { rascunho: "default", enviado: "blue", aprovado: "green", reprovado: "red" };

export default function ObraDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalFase, setModalFase] = useState(false);
  const [modalDiario, setModalDiario] = useState(false);
  const [modalBM, setModalBM] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formFase] = Form.useForm();
  const [formDiario] = Form.useForm();
  const [formBM] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    api.get(`/facilities/projetos/${id}/`)
      .then((r) => setProjeto(r.data))
      .catch(() => message.error("Erro ao carregar projeto"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [id]);

  const salvarFase = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        projeto: parseInt(id),
        data_inicio: values.data_inicio?.format("YYYY-MM-DD") || null,
        data_fim: values.data_fim?.format("YYYY-MM-DD") || null,
      };
      await api.post("/facilities/fases/", payload);
      message.success("Fase adicionada!");
      setModalFase(false);
      formFase.resetFields();
      carregar();
    } catch {
      message.error("Erro ao salvar fase.");
    } finally {
      setSaving(false);
    }
  };

  const salvarDiario = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        projeto: parseInt(id),
        data: values.data?.format("YYYY-MM-DD") || dayjs().format("YYYY-MM-DD"),
      };
      await api.post("/facilities/diarios/", payload);
      message.success("Registro adicionado!");
      setModalDiario(false);
      formDiario.resetFields();
      carregar();
    } catch {
      message.error("Erro ao salvar registro.");
    } finally {
      setSaving(false);
    }
  };

  const salvarBM = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        projeto: parseInt(id),
        mes_referencia: values.mes_referencia?.format("YYYY-MM-DD") || null,
      };
      await api.post("/facilities/boletins/", payload);
      message.success("Boletim criado!");
      setModalBM(false);
      formBM.resetFields();
      carregar();
    } catch {
      message.error("Erro ao salvar BM.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;
  if (!projeto) return null;

  const fasesCols = [
    { title: "Ordem", dataIndex: "ordem", key: "ordem", width: 70 },
    { title: "Fase", dataIndex: "nome", key: "nome" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (s) => <Tag color={faseStatusCor[s]}>{faseStatusLabel[s]}</Tag>,
    },
    {
      title: "Início",
      dataIndex: "data_inicio",
      key: "data_inicio",
      width: 120,
      render: (d) => d ? dayjs(d).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Fim",
      dataIndex: "data_fim",
      key: "data_fim",
      width: 120,
      render: (d) => d ? dayjs(d).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Progresso",
      dataIndex: "percentual_concluido",
      key: "percentual_concluido",
      width: 160,
      render: (v) => <Progress percent={Number(v)} size="small" strokeColor="#3B82F6" />,
    },
  ];

  const diarioCols = [
    {
      title: "Data",
      dataIndex: "data",
      key: "data",
      width: 120,
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    {
      title: "Clima",
      dataIndex: "clima",
      key: "clima",
      width: 110,
      render: (c) => climaLabel[c] || "-",
    },
    {
      title: "Equipe",
      dataIndex: "equipe_presente",
      key: "equipe_presente",
      width: 80,
      render: (v) => `${v} pessoas`,
    },
    { title: "Atividades", dataIndex: "atividades_realizadas", key: "atividades_realizadas", ellipsis: true },
    { title: "Ocorrências", dataIndex: "ocorrencias", key: "ocorrencias", ellipsis: true, render: (v) => v || "-" },
    {
      title: "Registrado por",
      dataIndex: "registrado_por_nome",
      key: "registrado_por_nome",
      width: 150,
      render: (v) => v || "-",
    },
  ];

  const bmCols = [
    { title: "Nº BM", dataIndex: "numero", key: "numero", width: 100 },
    {
      title: "Mês Ref.",
      dataIndex: "mes_referencia",
      key: "mes_referencia",
      width: 120,
      render: (d) => dayjs(d).format("MM/YYYY"),
    },
    {
      title: "% Executado",
      dataIndex: "percentual_executado",
      key: "percentual_executado",
      width: 140,
      render: (v) => <Progress percent={Number(v)} size="small" strokeColor="#10B981" />,
    },
    {
      title: "Valor Medido",
      dataIndex: "valor_medido",
      key: "valor_medido",
      width: 140,
      render: (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s) => <Tag color={bmStatusCor[s]}>{s.toUpperCase()}</Tag>,
    },
  ];

  const tabItems = [
    {
      key: "fases",
      label: `Fases (${projeto.fases?.length || 0})`,
      children: (
        <div>
          <div style={{ textAlign: "right", marginBottom: 12 }}>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setModalFase(true)}
              style={{ borderRadius: 8 }}
            >
              Nova Fase
            </Button>
          </div>
          <Table
            dataSource={projeto.fases || []}
            columns={fasesCols}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: "Nenhuma fase cadastrada" }}
          />
        </div>
      ),
    },
    {
      key: "diario",
      label: `Diário de Obra (${projeto.diarios?.length || 0})`,
      children: (
        <div>
          <div style={{ textAlign: "right", marginBottom: 12 }}>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setModalDiario(true)}
              style={{ borderRadius: 8 }}
            >
              Novo Registro
            </Button>
          </div>
          <Table
            dataSource={projeto.diarios || []}
            columns={diarioCols}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: "Nenhum registro no diário" }}
          />
        </div>
      ),
    },
    {
      key: "boletins",
      label: `Boletins de Medição (${projeto.boletins?.length || 0})`,
      children: (
        <div>
          <div style={{ textAlign: "right", marginBottom: 12 }}>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setModalBM(true)}
              style={{ borderRadius: 8 }}
            >
              Novo BM
            </Button>
          </div>
          <Table
            dataSource={projeto.boletins || []}
            columns={bmCols}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: "Nenhum boletim cadastrado" }}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/facilities/obras")}>
          Voltar
        </Button>
      </Space>

      <Card style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center" size={16}>
              <span
                style={{
                  fontFamily: "monospace", fontWeight: 700, fontSize: 16,
                  color: "#3B82F6", background: "#EFF6FF",
                  padding: "4px 12px", borderRadius: 8,
                }}
              >
                {projeto.codigo}
              </span>
              <div>
                <Title level={4} style={{ margin: 0 }}>{projeto.nome}</Title>
                <Text type="secondary">{projeto.descricao}</Text>
              </div>
              <Tag color={statusCor[projeto.status]} style={{ fontSize: 13 }}>
                {statusLabel[projeto.status]}
              </Tag>
            </Space>
          </Col>
          {projeto.responsavel_nome && (
            <Col>
              <Text type="secondary">Responsável: <strong>{projeto.responsavel_nome}</strong></Text>
            </Col>
          )}
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          {
            title: "Orçamento Previsto",
            value: `R$ ${Number(projeto.orcamento_previsto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            color: "#3B82F6",
          },
          {
            title: "Orçamento Realizado",
            value: `R$ ${Number(projeto.orcamento_realizado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            color: Number(projeto.orcamento_realizado) > Number(projeto.orcamento_previsto) ? "#EF4444" : "#10B981",
          },
          {
            title: "% Concluído",
            value: `${Number(projeto.percentual_concluido || 0).toFixed(1)}%`,
            color: "#8B5CF6",
          },
          {
            title: "Previsão de Conclusão",
            value: projeto.data_fim_prevista ? dayjs(projeto.data_fim_prevista).format("DD/MM/YYYY") : "-",
            color: "#F59E0B",
          },
        ].map((kpi) => (
          <Col xs={12} sm={6} key={kpi.title}>
            <Card
              style={{ borderRadius: 12, border: "none", background: "#F9FAFB" }}
              bodyStyle={{ padding: "16px 20px" }}
            >
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{kpi.title}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ marginRight: 8 }}>Progresso geral:</Text>
        <Progress
          percent={Number(projeto.percentual_concluido || 0)}
          strokeColor="#3B82F6"
          style={{ maxWidth: 400 }}
        />
      </div>

      <Card style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <Tabs items={tabItems} />
      </Card>

      {/* Modal Fase */}
      <Modal
        title="Nova Fase"
        open={modalFase}
        onCancel={() => { setModalFase(false); formFase.resetFields(); }}
        onOk={() => formFase.submit()}
        okText="Salvar"
        confirmLoading={saving}
        okButtonProps={{ style: { background: "#3B82F6", borderColor: "#3B82F6" } }}
      >
        <Form form={formFase} layout="vertical" onFinish={salvarFase}>
          <Form.Item name="nome" label="Nome da Fase" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ordem" label="Ordem" initialValue={1}>
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="data_inicio" label="Data Início">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="data_fim" label="Data Fim">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Status" initialValue="pendente">
            <Select>
              {Object.entries(faseStatusLabel).map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Diário */}
      <Modal
        title="Novo Registro no Diário"
        open={modalDiario}
        onCancel={() => { setModalDiario(false); formDiario.resetFields(); }}
        onOk={() => formDiario.submit()}
        okText="Salvar"
        confirmLoading={saving}
        width={600}
        okButtonProps={{ style: { background: "#3B82F6", borderColor: "#3B82F6" } }}
      >
        <Form form={formDiario} layout="vertical" onFinish={salvarDiario}>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="data" label="Data" initialValue={dayjs()}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="clima" label="Clima">
                <Select allowClear>
                  {Object.entries(climaLabel).map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="equipe_presente" label="Equipe" initialValue={0}>
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="atividades_realizadas" label="Atividades Realizadas" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="ocorrencias" label="Ocorrências">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Boletim */}
      <Modal
        title="Novo Boletim de Medição"
        open={modalBM}
        onCancel={() => { setModalBM(false); formBM.resetFields(); }}
        onOk={() => formBM.submit()}
        okText="Salvar"
        confirmLoading={saving}
        okButtonProps={{ style: { background: "#3B82F6", borderColor: "#3B82F6" } }}
      >
        <Form form={formBM} layout="vertical" onFinish={salvarBM}>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="numero" label="Número BM" rules={[{ required: true }]}>
                <Input placeholder="BM-001" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="mes_referencia" label="Mês Referência" rules={[{ required: true }]}>
                <DatePicker picker="month" style={{ width: "100%" }} format="MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="percentual_executado" label="% Executado" initialValue={0}>
                <InputNumber style={{ width: "100%" }} min={0} max={100} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="valor_medido" label="Valor Medido (R$)" initialValue={0}>
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
