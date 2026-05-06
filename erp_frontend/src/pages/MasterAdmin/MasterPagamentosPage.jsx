import { useEffect, useState } from "react";
import {
  Badge, Button, Card, Col, Drawer, Form, Input, message, Modal,
  Row, Select, Space, Table, Tag, Tooltip, Typography,
} from "antd";
import {
  CheckCircleOutlined, DollarCircleOutlined, PlusOutlined, WarningOutlined,
} from "@ant-design/icons";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;
const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v) => moneyFmt.format(Number(v || 0));

const STATUS_COLORS = { pendente: "orange", pago: "green", vencido: "red", cancelado: "default" };

export default function MasterPagamentosPage() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState(undefined);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [gerarOpen, setGerarOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [assinaturas, setAssinaturas] = useState([]);
  const [formConfirmar] = Form.useForm();
  const [formGerar] = Form.useForm();

  const carregar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      const r = await masterApi.get("/pagamentos/", { params });
      setDados(Array.isArray(r.data) ? r.data : r.data?.results || []);
    } catch { message.error("Erro ao carregar pagamentos."); }
    finally { setLoading(false); }
  };

  const carregarAssinaturas = async () => {
    try {
      const r = await masterApi.get("/assinaturas/");
      setAssinaturas((Array.isArray(r.data) ? r.data : r.data?.results || []).map(a => ({
        value: a.id,
        label: `${a.cliente_nome} — ${a.plano_nome} (${a.sistema_display})`,
      })));
    } catch {}
  };

  useEffect(() => { carregar(); carregarAssinaturas(); }, []);

  const confirmar = async (values) => {
    try {
      await masterApi.post(`/pagamentos/${itemSelecionado.id}/confirmar-pagamento/`, values);
      message.success("Pagamento confirmado!");
      setConfirmarOpen(false);
      formConfirmar.resetFields();
      carregar();
    } catch { message.error("Erro ao confirmar pagamento."); }
  };

  const gerar = async (values) => {
    try {
      await masterApi.post(`/assinaturas/${values.assinatura}/gerar-mensalidade/`, {
        referencia: values.referencia,
        data_vencimento: values.data_vencimento,
      });
      message.success("Mensalidade gerada!");
      setGerarOpen(false);
      formGerar.resetFields();
      carregar();
    } catch { message.error("Erro ao gerar mensalidade."); }
  };

  const columns = [
    {
      title: "Cliente / Plano",
      key: "cliente",
      render: (_, r) => (
        <div>
          <Text strong>{r.assinatura_cliente}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.assinatura_plano}</Text>
        </div>
      ),
    },
    { title: "Referência", dataIndex: "referencia", key: "referencia" },
    {
      title: "Valor",
      dataIndex: "valor_cobrado",
      key: "valor",
      render: (v) => <Text strong style={{ color: "#6366F1" }}>{fmt(v)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v, r) => <Tag color={STATUS_COLORS[v]}>{r.status_display || v}</Tag>,
    },
    {
      title: "Vencimento",
      dataIndex: "data_vencimento",
      key: "venc",
      render: (v) => {
        if (!v) return "-";
        const d = new Date(v);
        const hoje = new Date();
        const vencido = d < hoje;
        return <Text style={{ color: vencido ? "#EF4444" : undefined }}>{v}</Text>;
      },
    },
    { title: "Pagamento", dataIndex: "data_pagamento", key: "pgto", render: (v) => v || "—" },
    {
      title: "Método",
      dataIndex: "metodo_pagamento",
      key: "metodo",
      render: (v) => v || "—",
    },
    {
      title: "Ações",
      key: "acoes",
      render: (_, record) =>
        record.status !== "pago" ? (
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            style={{ background: "#10B981", borderColor: "#10B981" }}
            onClick={() => { setItemSelecionado(record); formConfirmar.setFieldsValue({ data_pagamento: new Date().toISOString().slice(0, 10), valor_pago: record.valor_cobrado }); setConfirmarOpen(true); }}
          >
            Confirmar
          </Button>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>Pago</Tag>
        ),
    },
  ];

  // Totais
  const totalPendente = dados.filter(d => d.status === "pendente").reduce((s, d) => s + Number(d.valor_cobrado || 0), 0);
  const totalVencido = dados.filter(d => d.status === "vencido").reduce((s, d) => s + Number(d.valor_cobrado || 0), 0);
  const totalPago = dados.filter(d => d.status === "pago").reduce((s, d) => s + Number(d.valor_cobrado || 0), 0);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Pagamentos</Title>
          <Text type="secondary">Mensalidades de todos os clientes.</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: "#6366F1", borderColor: "#6366F1", borderRadius: 10 }}
          onClick={() => setGerarOpen(true)}
        >
          Gerar Mensalidade
        </Button>
      </div>

      {/* Resumo */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: "Pendente", value: fmt(totalPendente), color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Vencido", value: fmt(totalVencido), color: "#EF4444", bg: "#FEF2F2" },
          { label: "Recebido (visível)", value: fmt(totalPago), color: "#10B981", bg: "#ECFDF5" },
        ].map(k => (
          <Col xs={24} sm={8} key={k.label}>
            <Card bordered={false} style={{ borderRadius: 14, background: k.bg, boxShadow: "none", border: `1px solid ${k.color}22` }}>
              <Text style={{ color: k.color, fontWeight: 600, fontSize: 13 }}>{k.label}</Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filtro */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <Row gutter={12} align="middle">
          <Col xs={24} sm={8}>
            <Select placeholder="Filtrar por status" allowClear style={{ width: "100%" }} value={filtroStatus} onChange={v => setFiltroStatus(v)}>
              <Select.Option value="pendente">Pendente</Select.Option>
              <Select.Option value="pago">Pago</Select.Option>
              <Select.Option value="vencido">Vencido</Select.Option>
              <Select.Option value="cancelado">Cancelado</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}><Button block onClick={carregar}>Filtrar</Button></Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <Table columns={columns} dataSource={dados} loading={loading} rowKey="id" pagination={{ pageSize: 20 }} />
      </Card>

      {/* Confirmar pagamento */}
      <Drawer
        title="Confirmar Pagamento"
        open={confirmarOpen}
        onClose={() => setConfirmarOpen(false)}
        width={400}
        extra={<Button type="primary" style={{ background: "#10B981" }} onClick={() => formConfirmar.submit()}>Confirmar</Button>}
      >
        {itemSelecionado && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Cliente: </Text><Text strong>{itemSelecionado.assinatura_cliente}</Text><br />
            <Text type="secondary">Referência: </Text><Text>{itemSelecionado.referencia}</Text><br />
            <Text type="secondary">Valor esperado: </Text><Text strong style={{ color: "#6366F1" }}>{fmt(itemSelecionado.valor_cobrado)}</Text>
          </div>
        )}
        <Form form={formConfirmar} layout="vertical" onFinish={confirmar}>
          <Form.Item name="data_pagamento" label="Data do pagamento" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="valor_pago" label="Valor recebido (R$)" rules={[{ required: true }]}>
            <Input type="number" step="0.01" prefix="R$" />
          </Form.Item>
          <Form.Item name="metodo_pagamento" label="Método de pagamento">
            <Select defaultValue="pix">
              <Select.Option value="pix">PIX</Select.Option>
              <Select.Option value="boleto">Boleto</Select.Option>
              <Select.Option value="transferencia">Transferência</Select.Option>
              <Select.Option value="cartao">Cartão</Select.Option>
              <Select.Option value="outro">Outro</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="comprovante_url" label="Link do comprovante (opcional)">
            <Input placeholder="URL ou número do comprovante" />
          </Form.Item>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Gerar mensalidade */}
      <Modal
        title="Gerar Nova Mensalidade"
        open={gerarOpen}
        onCancel={() => setGerarOpen(false)}
        onOk={() => formGerar.submit()}
        okText="Gerar"
        okButtonProps={{ style: { background: "#6366F1" } }}
      >
        <Form form={formGerar} layout="vertical" onFinish={gerar} style={{ marginTop: 16 }}>
          <Form.Item name="assinatura" label="Assinatura" rules={[{ required: true }]}>
            <Select options={assinaturas} placeholder="Selecione a assinatura" showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="referencia" label="Referência (mês/ano)" rules={[{ required: true }]}>
            <Input placeholder="Ex: 06/2025" />
          </Form.Item>
          <Form.Item name="data_vencimento" label="Data de vencimento" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
