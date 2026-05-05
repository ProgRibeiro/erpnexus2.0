import { useState, useEffect } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag,
  Space, Typography, Card, Row, Col, message, InputNumber,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const statusCor = {
  operacional: "green",
  em_manutencao: "orange",
  inativo: "default",
  sucateado: "red",
};
const statusLabel = {
  operacional: "Operacional",
  em_manutencao: "Em Manutenção",
  inativo: "Inativo",
  sucateado: "Sucateado",
};
const categoriaLabel = {
  hvac: "HVAC",
  eletrica: "Elétrica",
  hidraulica: "Hidráulica",
  civil: "Civil",
  ti: "TI",
  seguranca: "Segurança",
  outro: "Outro",
};

export default function AtivosPage() {
  const navigate = useNavigate();
  const [ativos, setAtivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [form] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroCategoria) params.append("categoria", filtroCategoria);
    if (filtroStatus) params.append("status", filtroStatus);
    if (busca) params.append("search", busca);
    api.get(`/facilities/ativos/?${params}`)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.results || []);
        setAtivos(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroCategoria, filtroStatus, busca]);

  const salvar = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        data_instalacao: values.data_instalacao ? values.data_instalacao.format("YYYY-MM-DD") : null,
      };
      await api.post("/facilities/ativos/", payload);
      message.success("Ativo cadastrado com sucesso!");
      setModalOpen(false);
      form.resetFields();
      carregar();
    } catch {
      message.error("Erro ao salvar ativo.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "TAG",
      dataIndex: "tag",
      key: "tag",
      width: 120,
      render: (t) => <span style={{ fontWeight: 600, fontFamily: "monospace", color: "#3B82F6" }}>{t}</span>,
    },
    { title: "Nome", dataIndex: "nome", key: "nome", ellipsis: true },
    {
      title: "Categoria",
      dataIndex: "categoria",
      key: "categoria",
      width: 130,
      render: (c) => categoriaLabel[c] || c,
    },
    {
      title: "Localização",
      key: "local",
      width: 180,
      render: (_, r) =>
        [r.localizacao_predio, r.localizacao_andar, r.localizacao_sala].filter(Boolean).join(" / ") || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (s) => <Tag color={statusCor[s]}>{statusLabel[s]}</Tag>,
    },
    {
      title: "Instalação",
      dataIndex: "data_instalacao",
      key: "data_instalacao",
      width: 120,
      render: (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Vida Útil",
      dataIndex: "vida_util_anos",
      key: "vida_util_anos",
      width: 100,
      render: (v) => (v ? `${v} anos` : "-"),
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Ativos</Title>
          <Text type="secondary">Cadastro e gestão de equipamentos</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 8 }}
          >
            Novo Ativo
          </Button>
        </Col>
      </Row>

      <Card style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Buscar por TAG, nome, fabricante..."
              prefix={<SearchOutlined />}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col>
            <Select
              placeholder="Categoria"
              allowClear
              style={{ width: 150 }}
              onChange={setFiltroCategoria}
            >
              {Object.entries(categoriaLabel).map(([v, l]) => (
                <Option key={v} value={v}>{l}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 160 }}
              onChange={setFiltroStatus}
            >
              {Object.entries(statusLabel).map(([v, l]) => (
                <Option key={v} value={v}>{l}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <Table
          dataSource={ativos}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          onRow={(r) => ({ onClick: () => navigate(`/facilities/ativos/${r.id}`), style: { cursor: "pointer" } })}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />
      </Card>

      <Modal
        title="Novo Ativo"
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
              <Form.Item name="tag" label="TAG" rules={[{ required: true, message: "Informe a TAG" }]}>
                <Input placeholder="EX: TAG-001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="nome" label="Nome" rules={[{ required: true, message: "Informe o nome" }]}>
                <Input placeholder="Nome do equipamento" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoria" label="Categoria" rules={[{ required: true }]}>
                <Select placeholder="Selecione">
                  {Object.entries(categoriaLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="operacional">
                <Select>
                  {Object.entries(statusLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="localizacao_predio" label="Prédio">
                <Input placeholder="Prédio A" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="localizacao_andar" label="Andar">
                <Input placeholder="2º Andar" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="localizacao_sala" label="Sala">
                <Input placeholder="Sala 210" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="fabricante" label="Fabricante">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="modelo" label="Modelo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="numero_serie" label="Nº de Série">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="data_instalacao" label="Data Instalação">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="vida_util_anos" label="Vida Útil (anos)">
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="custo_aquisicao" label="Custo Aquisição (R$)">
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descricao" label="Descrição">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
