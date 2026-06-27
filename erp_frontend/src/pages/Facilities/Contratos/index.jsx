import { useState, useEffect } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag,
  Row, Col, Card, Typography, message, Alert, Rate, InputNumber, Space,
} from "antd";
import { PlusOutlined, WarningOutlined, FileProtectOutlined } from "@ant-design/icons";
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

const statusCor = { ativo: "green", vencendo: "gold", vencido: "red", rescindido: "default" };
const statusLabel = { ativo: "Ativo", vencendo: "Vencendo", vencido: "Vencido", rescindido: "Rescindido" };
const periodicidadeLabel = {
  diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal",
  mensal: "Mensal", trimestral: "Trimestral",
};

export default function ContratosFacilities() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const carregar = () => {
    setLoading(true);
    api.get("/facilities/contratos/?ordering=data_fim")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : (r.data?.results || []);
        setContratos(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        data_inicio: values.data_inicio?.format("YYYY-MM-DD"),
        data_fim: values.data_fim?.format("YYYY-MM-DD"),
      };
      await api.post("/facilities/contratos/", payload);
      message.success("Contrato cadastrado!");
      setModalOpen(false);
      form.resetFields();
      carregar();
    } catch {
      message.error("Erro ao salvar contrato.");
    } finally {
      setSaving(false);
    }
  };

  const hoje = dayjs();
  const em30Dias = hoje.add(30, "day");
  const vencendo = contratos.filter(
    (c) => c.status === "ativo" && dayjs(c.data_fim).isBefore(em30Dias) && dayjs(c.data_fim).isAfter(hoje)
  );

  const columns = [
    {
      title: "Fornecedor",
      dataIndex: "fornecedor_nome",
      key: "fornecedor_nome",
      ellipsis: true,
      render: (v) => <Text strong style={{ color: colors.texto }}>{v}</Text>,
    },
    { title: "CNPJ", dataIndex: "fornecedor_cnpj", key: "fornecedor_cnpj", width: 160 },
    { title: "Tipo de Serviço", dataIndex: "tipo_servico", key: "tipo_servico" },
    {
      title: "Valor Mensal",
      dataIndex: "valor_mensal",
      key: "valor_mensal",
      width: 140,
      render: (v) => v
        ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "-",
    },
    {
      title: "Início",
      dataIndex: "data_inicio",
      key: "data_inicio",
      width: 110,
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    {
      title: "Vencimento",
      dataIndex: "data_fim",
      key: "data_fim",
      width: 130,
      render: (d) => {
        const diff = dayjs(d).diff(hoje, "day");
        const cor = diff < 0 ? "red" : diff < 30 ? "orange" : "default";
        return <Tag color={cor} style={{ borderRadius: 999, fontWeight: 600 }}>{dayjs(d).format("DD/MM/YYYY")}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s) => <Tag color={statusCor[s]} style={{ borderRadius: 999, fontWeight: 600 }}>{statusLabel[s]}</Tag>,
    },
    {
      title: "Avaliação",
      dataIndex: "avaliacao_fornecedor",
      key: "avaliacao_fornecedor",
      width: 150,
      render: (v) => v ? <Rate disabled defaultValue={v} count={5} style={{ fontSize: 14 }} /> : "-",
    },
  ];

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
                background: "#EC489914",
                color: "#EC4899",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <FileProtectOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>Contratos Terceirizados</Title>
              <Text style={{ color: colors.textoSecundario }}>
                Gestão de contratos com prestadores externos
              </Text>
            </div>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ height: 40, paddingInline: 20, fontWeight: 600, borderRadius: 10 }}
          >
            Novo Contrato
          </Button>
        </div>
      </Card>

      {vencendo.length > 0 && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          message={`${vencendo.length} contrato(s) vencendo nos próximos 30 dias!`}
          description={vencendo.map((c) => (
            <div key={c.id}>
              <strong>{c.fornecedor_nome}</strong> — {c.tipo_servico} — vence em{" "}
              {dayjs(c.data_fim).format("DD/MM/YYYY")}
            </div>
          ))}
          showIcon
          style={{ borderRadius: 12 }}
        />
      )}

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={contratos}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: "Nenhum contrato cadastrado" }}
        />
      </Card>

      <Modal
        title="Novo Contrato"
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
            <Col span={16}>
              <Form.Item name="fornecedor_nome" label="Fornecedor" rules={[{ required: true }]}>
                <Input placeholder="Nome da empresa" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fornecedor_cnpj" label="CNPJ">
                <Input placeholder="00.000.000/0000-00" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tipo_servico" label="Tipo de Serviço" rules={[{ required: true }]}>
                <Input placeholder="Ex: Limpeza, Segurança, Jardinagem" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="periodicidade_servico" label="Periodicidade" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(periodicidadeLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="valor_mensal" label="Valor Mensal (R$)">
                <InputNumber style={{ width: "100%" }} min={0} step={0.01} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="data_inicio" label="Data Início" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="data_fim" label="Data Vencimento" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="ativo">
                <Select>
                  {Object.entries(statusLabel).map(([v, l]) => (
                    <Option key={v} value={v}>{l}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="avaliacao_fornecedor" label="Avaliação">
                <Rate count={5} />
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
