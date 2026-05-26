import { useEffect, useMemo, useState } from "react";
import {
  BankOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";

import financeiroService from "../../services/financeiro";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: 24,
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function ContasTab({ contas, loading, onEdit }) {
  return (
    <Table
      rowKey="id"
      dataSource={contas}
      loading={loading}
      scroll={{ x: 900 }}
      columns={[
        { title: "Nome", dataIndex: "nome", render: (value) => <strong>{value}</strong> },
        { title: "Banco", dataIndex: "banco", render: (value) => value || "-" },
        { title: "Agência", dataIndex: "agencia", render: (value) => value || "-" },
        { title: "Conta", dataIndex: "conta", render: (value) => value || "-" },
        { title: "Tipo", dataIndex: "tipo", render: (value) => <Tag>{value}</Tag> },
        { title: "Saldo inicial", dataIndex: "saldo_inicial", align: "right", render: money },
        { title: "Saldo atual", dataIndex: "saldo_atual", align: "right", render: money },
        { title: "Ativa", dataIndex: "ativo", render: (value) => (value ? <Tag color="green">Sim</Tag> : <Tag>Não</Tag>) },
        { title: "Ações", width: 110, render: (_, record) => <Button onClick={() => onEdit(record)}>Editar</Button> },
      ]}
    />
  );
}

function CategoriasTab({ categorias, loading, onEdit }) {
  return (
    <Table
      rowKey="id"
      dataSource={categorias}
      loading={loading}
      scroll={{ x: 720 }}
      columns={[
        { title: "Nome", dataIndex: "nome", render: (value) => <strong>{value}</strong> },
        {
          title: "Tipo",
          dataIndex: "tipo",
          render: (value) => (
            <Tag color={value === "receita" ? "green" : "red"}>
              {value === "receita" ? "Receita" : "Despesa"}
            </Tag>
          ),
        },
        {
          title: "Cor",
          dataIndex: "cor",
          render: (value) => (
            <Space>
              <span style={{ background: value, borderRadius: 4, display: "inline-block", height: 16, width: 16 }} />
              {value}
            </Space>
          ),
        },
        { title: "Ícone", dataIndex: "icone", render: (value) => value || "-" },
        { title: "Categoria pai", dataIndex: "pai", render: (value) => categorias.find((item) => item.id === value)?.nome || "-" },
        { title: "Ações", width: 110, render: (_, record) => <Button onClick={() => onEdit(record)}>Editar</Button> },
      ]}
    />
  );
}

function TransferenciasTab({ transferencias, loading, onEdit }) {
  return (
    <Table
      rowKey="id"
      dataSource={transferencias}
      loading={loading}
      scroll={{ x: 860 }}
      columns={[
        { title: "Data", dataIndex: "data", width: 120, render: formatDate },
        { title: "Origem", dataIndex: "conta_origem_nome" },
        { title: "Destino", dataIndex: "conta_destino_nome" },
        { title: "Descrição", dataIndex: "descricao", render: (value) => value || "-" },
        { title: "Valor", dataIndex: "valor", align: "right", render: money },
        { title: "Ações", width: 110, render: (_, record) => <Button onClick={() => onEdit(record)}>Editar</Button> },
      ]}
    />
  );
}

export default function ContasBancariasPage() {
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState("contas");
  const [modalType, setModalType] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const carregar = async () => {
    setLoading(true);
    try {
      const [contasData, categoriasData, transferenciasData] = await Promise.all([
        financeiroService.listarContas(),
        financeiroService.listarCategorias(),
        financeiroService.listarTransferencias(),
      ]);
      setContas(contasData);
      setCategorias(categoriasData);
      setTransferencias(transferenciasData);
    } catch (error) {
      message.error("Erro ao carregar cadastros financeiros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const resumo = useMemo(() => {
    const saldo = contas.reduce((total, conta) => total + Number(conta.saldo_atual ?? conta.saldo_inicial ?? 0), 0);
    return {
      saldo,
      contasAtivas: contas.filter((conta) => conta.ativo).length,
      categoriasReceita: categorias.filter((categoria) => categoria.tipo === "receita").length,
      categoriasDespesa: categorias.filter((categoria) => categoria.tipo === "despesa").length,
    };
  }, [contas, categorias]);

  const abrir = (type, record = null) => {
    setModalType(type);
    setEditing(record);
    if (type === "conta") {
      form.setFieldsValue(record || { tipo: "corrente", ativo: true, saldo_inicial: 0 });
    }
    if (type === "categoria") {
      form.setFieldsValue(record || { tipo: "despesa", cor: "#3B82F6" });
    }
    if (type === "transferencia") {
      form.setFieldsValue({
        ...(record || { data: dayjs(), valor: 0 }),
        data: record?.data ? dayjs(record.data) : dayjs(),
      });
    }
  };

  const fechar = () => {
    setModalType(null);
    setEditing(null);
    form.resetFields();
  };

  const salvar = async (values) => {
    try {
      if (modalType === "conta") {
        await financeiroService.salvarConta(values, editing?.id);
        message.success("Conta salva");
      }
      if (modalType === "categoria") {
        await financeiroService.salvarCategoria(values, editing?.id);
        message.success("Categoria salva");
      }
      if (modalType === "transferencia") {
        await financeiroService.salvarTransferencia(
          { ...values, data: values.data?.format("YYYY-MM-DD") },
          editing?.id
        );
        message.success("Transferência salva");
      }
      fechar();
      carregar();
    } catch (error) {
      message.error("Não foi possível salvar");
    }
  };

  const tabs = [
    {
      key: "contas",
      label: "Contas bancárias",
      children: <ContasTab contas={contas} loading={loading} onEdit={(record) => abrir("conta", record)} />,
    },
    {
      key: "categorias",
      label: "Categorias",
      children: <CategoriasTab categorias={categorias} loading={loading} onEdit={(record) => abrir("categoria", record)} />,
    },
    {
      key: "transferencias",
      label: "Transferências",
      children: <TransferenciasTab transferencias={transferencias} loading={loading} onEdit={(record) => abrir("transferencia", record)} />,
    },
  ];

  return (
    <div style={pageStyle}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>Cadastros financeiros</Typography.Title>
          <Typography.Text type="secondary">Contas, categorias e transferências usadas nos lançamentos.</Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<BankOutlined />} onClick={() => { setActiveKey("contas"); abrir("conta"); }}>Nova conta</Button>
          <Button icon={<FolderOpenOutlined />} onClick={() => { setActiveKey("categorias"); abrir("categoria"); }}>Nova categoria</Button>
          <Button type="primary" icon={<SwapOutlined />} onClick={() => { setActiveKey("transferencias"); abrir("transferencia"); }}>Nova transferência</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}><Card style={cardStyle}><Statistic title="Saldo em contas" value={resumo.saldo} precision={2} prefix="R$" /></Card></Col>
        <Col xs={24} md={6}><Card style={cardStyle}><Statistic title="Contas ativas" value={resumo.contasAtivas} /></Card></Col>
        <Col xs={24} md={6}><Card style={cardStyle}><Statistic title="Categorias de receita" value={resumo.categoriasReceita} /></Card></Col>
        <Col xs={24} md={6}><Card style={cardStyle}><Statistic title="Categorias de despesa" value={resumo.categoriasDespesa} /></Card></Col>
      </Row>

      <Card style={cardStyle}>
        <Tabs activeKey={activeKey} onChange={setActiveKey} items={tabs} />
      </Card>

      <Modal
        open={Boolean(modalType)}
        title={editing ? "Editar cadastro" : "Novo cadastro"}
        onCancel={fechar}
        onOk={() => form.submit()}
        okText="Salvar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={salvar}>
          {modalType === "conta" && (
            <>
              <Form.Item name="nome" label="Nome" rules={[{ required: true, message: "Informe o nome da conta" }]}><Input /></Form.Item>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="banco" label="Banco"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="tipo" label="Tipo"><Select options={["corrente", "poupanca", "caixa", "investimento"].map((value) => ({ value, label: value }))} /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="agencia" label="Agência"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="conta" label="Conta"><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="saldo_inicial" label="Saldo inicial"><InputNumber precision={2} style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="ativo" label="Ativa" valuePropName="checked"><Switch /></Form.Item>
            </>
          )}

          {modalType === "categoria" && (
            <>
              <Form.Item name="nome" label="Nome" rules={[{ required: true, message: "Informe o nome da categoria" }]}><Input /></Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                    <Select options={[{ value: "receita", label: "Receita" }, { value: "despesa", label: "Despesa" }]} />
                  </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="cor" label="Cor"><Input type="color" /></Form.Item></Col>
              </Row>
              <Form.Item name="pai" label="Categoria pai">
                <Select allowClear options={categorias.filter((item) => item.id !== editing?.id).map((item) => ({ value: item.id, label: item.nome }))} />
              </Form.Item>
              <Form.Item name="icone" label="Ícone/atalho"><Input placeholder="Ex: nf, boleto, fornecedor" /></Form.Item>
            </>
          )}

          {modalType === "transferencia" && (
            <>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="conta_origem" label="Conta origem" rules={[{ required: true }]}>
                    <Select options={contas.map((conta) => ({ value: conta.id, label: conta.nome }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="conta_destino" label="Conta destino" rules={[{ required: true }]}>
                    <Select options={contas.map((conta) => ({ value: conta.id, label: conta.nome }))} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item name="valor" label="Valor" rules={[{ required: true }]}><InputNumber precision={2} min={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col span={12}><Form.Item name="data" label="Data" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
              </Row>
              <Form.Item name="descricao" label="Descrição"><Input /></Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
