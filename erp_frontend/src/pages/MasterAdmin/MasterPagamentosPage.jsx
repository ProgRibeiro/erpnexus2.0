import { useEffect, useState } from "react";
import {
  Button, Col, Form, Input, message, Modal, Row, Select, Table, Tag, Typography, Skeleton,
} from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import masterApi from "../../services/masterApi";

const { Title, Text } = Typography;
const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v) => moneyFmt.format(Number(v || 0));

const STATUS_COLORS = { pendente: "orange", pago: "green", vencido: "red", cancelado: "default" };
const STATUS_LABELS = { pendente: "Pendente", pago: "Pago", vencido: "Vencido", cancelado: "Cancelado" };
const SISTEMA_COLORS = { erp: "blue", facilities: "green", ambos: "purple" };
const SISTEMA_LABELS = { erp: "ERP", facilities: "Facilities", ambos: "Ambos" };

export default function MasterPagamentosPage() {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [buscaText, setBuscaText] = useState("");
  const [sistemaFiltro, setSistemaFiltro] = useState("");

  const [modalPagamento, setModalPagamento] = useState(null);
  const [formPagamento] = Form.useForm();
  const [savingPagamento, setSavingPagamento] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);

  const load = async () => {
    setLoading(true);
    try {
      const r = await masterApi.get("/pagamentos/");
      const data = Array.isArray(r.data) ? r.data : r.data.results || [];
      setPagamentos(data);
    } catch {
      message.error("Erro ao carregar pagamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleConfirmar = async (values) => {
    setSavingPagamento(true);
    try {
      await masterApi.post(`/pagamentos/${modalPagamento.pagamentoId}/confirmar-pagamento/`, {
        forma: values.forma,
        data_pagamento: values.data_pagamento,
      });
      message.success("Pagamento confirmado!");
      setModalPagamento(null);
      formPagamento.resetFields();
      load();
    } catch { message.error("Erro ao confirmar pagamento."); }
    finally { setSavingPagamento(false); }
  };

  const pagFiltrados = pagamentos.filter((p) => {
    if (statusFiltro && p.status !== statusFiltro) return false;
    if (sistemaFiltro) {
      const sistema = p.assinatura?.plano_sistema || "";
      if (sistema !== sistemaFiltro) return false;
    }
    if (buscaText) {
      const nome = p.assinatura?.cliente?.nome_empresa || p.assinatura?.cliente_nome || "";
      if (!nome.toLowerCase().includes(buscaText.toLowerCase())) return false;
    }
    return true;
  });

  const recebidoMes = pagamentos
    .filter((p) => p.status === "pago" && p.referencia === mesAtual)
    .reduce((s, p) => s + Number(p.valor_cobrado || 0), 0);
  const totalPendente = pagamentos
    .filter((p) => p.status === "pendente")
    .reduce((s, p) => s + Number(p.valor_cobrado || 0), 0);
  const totalVencido = pagamentos
    .filter((p) => p.status === "vencido")
    .reduce((s, p) => s + Number(p.valor_cobrado || 0), 0);
  const inadimplencia = pagamentos.length
    ? ((pagamentos.filter((p) => p.status === "vencido").length / pagamentos.length) * 100).toFixed(1)
    : "0.0";

  const CARD_STYLE = {
    background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
    padding: "16px 20px", textAlign: "center",
  };

  const columns = [
    {
      title: "Cliente", key: "cliente",
      render: (_, r) => {
        const nome = r.assinatura?.cliente?.nome_empresa || r.assinatura?.cliente_nome || "—";
        return <Text strong style={{ fontSize: 13 }}>{nome}</Text>;
      },
    },
    {
      title: "Plano", key: "plano",
      render: (_, r) => {
        const plano = r.assinatura?.plano_nome || r.assinatura?.plano || "—";
        const sistema = r.assinatura?.plano_sistema || "";
        return (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{plano}</div>
            {sistema && (
              <Tag color={SISTEMA_COLORS[sistema] || "default"} style={{ fontSize: 10, marginTop: 2 }}>
                {SISTEMA_LABELS[sistema] || sistema}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Referência", dataIndex: "referencia", key: "ref",
      render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Valor", dataIndex: "valor_cobrado", key: "valor",
      render: (v) => <Text strong style={{ fontSize: 13, color: "#0F172A" }}>{fmt(v)}</Text>,
    },
    {
      title: "Vencimento", dataIndex: "data_vencimento", key: "venc",
      render: (v) => {
        const overdue = v && v < hoje;
        return <Text style={{ fontSize: 12, color: overdue ? "#EF4444" : "#374151" }}>{v || "—"}</Text>;
      },
    },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (v, r) => <Tag color={STATUS_COLORS[v] || "default"}>{r.status_display || STATUS_LABELS[v] || v}</Tag>,
    },
    {
      title: "Forma", dataIndex: "forma_pagamento", key: "forma",
      render: (v, r) => <Text style={{ fontSize: 12 }}>{r.forma_display || v || "—"}</Text>,
    },
    {
      title: "Ação", key: "acao",
      render: (_, r) => r.status !== "pago" ? (
        <Button
          size="small" icon={<CheckCircleOutlined />} type="primary"
          style={{ fontSize: 11, background: "#10B981", borderColor: "#10B981" }}
          onClick={() => {
            setModalPagamento({ pagamentoId: r.id });
            formPagamento.setFieldsValue({ data_pagamento: hoje, forma: "pix" });
          }}
        >
          Confirmar
        </Button>
      ) : null,
    },
  ];

  return (
    <div style={{ padding: 28, background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, color: "#0F172A" }}>Pagamentos</Title>
      </div>

      {/* KPI */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <div style={CARD_STYLE}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>{fmt(recebidoMes)}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Recebido este mês</div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={CARD_STYLE}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F59E0B" }}>{fmt(totalPendente)}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Pendente</div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={CARD_STYLE}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#EF4444" }}>{fmt(totalVencido)}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Vencido</div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={CARD_STYLE}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#EF4444" }}>{inadimplencia}%</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Inadimplência</div>
          </div>
        </Col>
      </Row>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Input.Search
          placeholder="Buscar cliente..."
          value={buscaText}
          onChange={(e) => setBuscaText(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          placeholder="Status" allowClear value={statusFiltro || undefined}
          onChange={(v) => setStatusFiltro(v || "")} style={{ width: 130 }}
        >
          <Select.Option value="pendente">Pendente</Select.Option>
          <Select.Option value="pago">Pago</Select.Option>
          <Select.Option value="vencido">Vencido</Select.Option>
          <Select.Option value="cancelado">Cancelado</Select.Option>
        </Select>
        <Select
          placeholder="Sistema" allowClear value={sistemaFiltro || undefined}
          onChange={(v) => setSistemaFiltro(v || "")} style={{ width: 130 }}
        >
          <Select.Option value="erp">ERP</Select.Option>
          <Select.Option value="facilities">Facilities</Select.Option>
          <Select.Option value="ambos">Ambos</Select.Option>
        </Select>
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={pagFiltrados}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 20 }}
        />
      </div>

      {/* Modal Confirmar Pagamento */}
      <Modal
        title="Confirmar Pagamento"
        open={!!modalPagamento}
        onCancel={() => setModalPagamento(null)}
        onOk={() => formPagamento.submit()}
        confirmLoading={savingPagamento}
        okText="Confirmar"
        okButtonProps={{ style: { background: "#10B981", borderColor: "#10B981" } }}
      >
        <Form form={formPagamento} layout="vertical" onFinish={handleConfirmar}>
          <Form.Item name="data_pagamento" label="Data do Pagamento" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="forma" label="Forma de Pagamento" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="pix">PIX</Select.Option>
              <Select.Option value="boleto">Boleto</Select.Option>
              <Select.Option value="cartao">Cartão</Select.Option>
              <Select.Option value="transferencia">Transferência</Select.Option>
              <Select.Option value="dinheiro">Dinheiro</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}