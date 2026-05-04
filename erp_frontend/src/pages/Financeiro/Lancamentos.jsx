import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
  Drawer,
  Form,
  InputNumber,
  Upload,
  Alert,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  FileTextOutlined,
  BankOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import financeiroService from "../../services/financeiro";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: "24px",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const filterStyle = {
  ...cardStyle,
  marginBottom: 16,
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const safeValue = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function normFile(event) {
  return Array.isArray(event) ? event : event?.fileList || [];
}

function getStatusColor(status) {
  const statusConfig = {
    pendente: { color: "#EA8C55", background: "#FEF3C7" },
    pago: { color: "#16a34a", background: "#DCFCE7" },
    atrasado: { color: "#dc2626", background: "#FEE2E2" },
    cancelado: { color: "#9CA3AF", background: "#F3F4F6" },
  };
  return statusConfig[status] || statusConfig.pendente;
}

function StatusBadge({ status }) {
  const config = getStatusColor(status);
  const labels = {
    pendente: "Pendente",
    pago: "Pago",
    atrasado: "Atrasado",
    cancelado: "Cancelado",
  };
  return (
    <span
      style={{
        background: config.background,
        color: config.color,
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {labels[status] || status}
    </span>
  );
}

function TipoBadge({ tipo }) {
  const config = {
    receita: { color: "#16a34a", background: "#DCFCE7" },
    despesa: { color: "#dc2626", background: "#FEE2E2" },
  };
  const current = config[tipo] || config.receita;
  const labels = {
    receita: "Receita",
    despesa: "Despesa",
  };
  return (
    <span
      style={{
        background: current.background,
        color: current.color,
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {labels[tipo] || tipo}
    </span>
  );
}

function FormularioLancamento({
  visible,
  loading,
  lancamento,
  contas,
  categorias,
  onSave,
  onClose,
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && lancamento) {
      form.setFieldsValue({
        ...lancamento,
        data_vencimento: lancamento.data_vencimento
          ? dayjs(lancamento.data_vencimento)
          : null,
        data_pagamento: lancamento.data_pagamento
          ? dayjs(lancamento.data_pagamento)
          : null,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, lancamento, form]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        data_vencimento: values.data_vencimento?.format("YYYY-MM-DD"),
        data_pagamento: values.data_pagamento?.format("YYYY-MM-DD"),
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={lancamento ? "Editar Lançamento" : "Novo Lançamento"}
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
      bodyStyle={{ paddingBottom: 80 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="Descrição"
          name="descricao"
          rules={[{ required: true, message: "Descrição é obrigatória" }]}
        >
          <Input placeholder="Digite a descrição" />
        </Form.Item>

        <Form.Item
          label="Tipo"
          name="tipo"
          rules={[{ required: true, message: "Tipo é obrigatório" }]}
        >
          <Select
            options={[
              { label: "Receita", value: "receita" },
              { label: "Despesa", value: "despesa" },
            ]}
            placeholder="Selecione o tipo"
          />
        </Form.Item>

        <Form.Item
          label="Categoria"
          name="categoria"
          rules={[{ required: true, message: "Categoria é obrigatória" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={(categorias || []).map((c) => ({
              label: c.nome,
              value: c.id,
            }))}
            placeholder="Selecione a categoria"
          />
        </Form.Item>

        <Form.Item
          label="Valor"
          name="valor"
          rules={[{ required: true, message: "Valor é obrigatório" }]}
        >
          <InputNumber
            prefix="R$"
            step={0.01}
            min={0}
            style={{ width: "100%" }}
            placeholder="0.00"
          />
        </Form.Item>

        <Form.Item
          label="Conta Bancária"
          name="conta_bancaria"
          rules={[{ required: true, message: "Conta é obrigatória" }]}
        >
          <Select
            options={(contas || []).map((c) => ({
              label: c.nome,
              value: c.id,
            }))}
            placeholder="Selecione a conta"
          />
        </Form.Item>

        <Form.Item
          label="Data de Vencimento"
          name="data_vencimento"
          rules={[{ required: true, message: "Data é obrigatória" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Data de Pagamento" name="data_pagamento">
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Observações" name="observacoes">
          <Input.TextArea rows={3} placeholder="Digite observações opcionais" />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%" }} size="small">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              style={{ flex: 1, borderRadius: 8 }}
            >
              Salvar
            </Button>
            <Button onClick={onClose} style={{ borderRadius: 8 }}>
              Cancelar
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  );
}

function BaixaPagamentoModal({ visible, lancamento, contas, onConfirm, onClose }) {
  const [form] = Form.useForm();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible && lancamento) {
      form.setFieldsValue({
        conta_bancaria: lancamento.conta_bancaria,
        data_pagamento: dayjs(),
        arquivos: [],
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, lancamento, form]);

  const handleSubmit = async (values) => {
    setConfirming(true);
    try {
      const formData = new FormData();
      formData.append("conta_bancaria", values.conta_bancaria);
      formData.append("data_pagamento", values.data_pagamento.format("YYYY-MM-DD"));
      (values.arquivos || []).forEach((arquivo) => {
        formData.append("arquivos", arquivo.originFileObj || arquivo);
      });
      await onConfirm(lancamento.id, formData);
      form.resetFields();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      title={lancamento?.tipo === "despesa" ? "Dar baixa em conta a pagar" : "Dar baixa em conta a receber"}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {lancamento && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${lancamento.descricao} - ${formatMoney(lancamento.valor)}`}
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Conta onde caiu/saiu o dinheiro"
          name="conta_bancaria"
          rules={[{ required: true, message: "Selecione a conta" }]}
        >
          <Select
            options={(contas || []).map((c) => ({ label: c.nome, value: c.id }))}
            placeholder="Selecione a conta"
          />
        </Form.Item>
        <Form.Item
          label="Data do pagamento"
          name="data_pagamento"
          rules={[{ required: true, message: "Informe a data" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="Comprovantes"
          name="arquivos"
          valuePropName="fileList"
          getValueFromEvent={normFile}
        >
          <Upload beforeUpload={() => false} multiple maxCount={6}>
            <Button icon={<UploadOutlined />}>Anexar comprovante</Button>
          </Upload>
        </Form.Item>
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={confirming} icon={<CheckCircleOutlined />}>
            Confirmar baixa
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}

function ImportarExtratoModal({ visible, contas, onImport, onClose }) {
  const [form] = Form.useForm();
  const [importing, setImporting] = useState(false);

  const handleSubmit = async (values) => {
    setImporting(true);
    try {
      await onImport({
        conta_bancaria: values.conta_bancaria,
        arquivo: values.arquivo?.[0],
      });
      form.resetFields();
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      title="Importar extrato bancário"
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Conta bancária"
          name="conta_bancaria"
          rules={[{ required: true, message: "Selecione a conta do extrato" }]}
        >
          <Select
            options={(contas || []).map((c) => ({ label: c.nome, value: c.id }))}
            placeholder="Selecione a conta"
          />
        </Form.Item>
        <Form.Item
          label="Arquivo CSV ou XLSX"
          name="arquivo"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: "Anexe o extrato" }]}
        >
          <Upload beforeUpload={() => false} maxCount={1} accept=".csv,.xlsx">
            <Button icon={<UploadOutlined />}>Selecionar extrato</Button>
          </Upload>
        </Form.Item>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="O sistema procura colunas como data, descricao, valor e documento. Valores positivos viram receitas; negativos viram despesas."
        />
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={importing} icon={<BankOutlined />}>
            Importar e conciliar
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}

export default function LancamentosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters] = useState({
    busca: "",
    tipo: undefined,
    categoria: undefined,
    status: undefined,
    periodo: null,
  });
  const [formVisible, setFormVisible] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [baixaVisible, setBaixaVisible] = useState(false);
  const [baixaLancamento, setBaixaLancamento] = useState(null);
  const [importVisible, setImportVisible] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const recarregarLancamentos = () => {
    setReloadKey((current) => current + 1);
  };

  // Carrega dados iniciais
  useEffect(() => {
    const carregar = async () => {
      try {
        const [contasList, categoriasList] = await Promise.all([
          financeiroService.listarContas(),
          financeiroService.listarCategorias(),
        ]);
        setContas(contasList);
        setCategorias(categoriasList);
      } catch (error) {
        message.error("Erro ao carregar configurações");
      }
    };
    carregar();
  }, []);

  // Carrega lançamentos
  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const params = {
          page: pagination.current,
          page_size: pagination.pageSize,
        };

        if (filters.busca) params.search = filters.busca;
        if (filters.tipo) params.tipo = filters.tipo;
        if (filters.categoria) params.categoria = filters.categoria;
        if (filters.status) params.status = filters.status;
        if (filters.periodo?.[0])
          params.data_vencimento_inicio = filters.periodo[0].format("YYYY-MM-DD");
        if (filters.periodo?.[1])
          params.data_vencimento_fim = filters.periodo[1].format("YYYY-MM-DD");

        const data = await financeiroService.listarLancamentos(params);
        setLancamentos(Array.isArray(data) ? data : []);
      } catch (error) {
        message.error("Erro ao carregar lançamentos");
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [filters, pagination, reloadKey]);

  const handleSaveLancamento = async (payload) => {
    try {
      if (selectedLancamento) {
        await financeiroService.atualizarLancamento(
          selectedLancamento.id,
          payload
        );
        message.success("Lançamento atualizado com sucesso");
      } else {
        await financeiroService.criarLancamento(payload);
        message.success("Lançamento criado com sucesso");
      }
      setFormVisible(false);
      setSelectedLancamento(null);
      setPagination({ current: 1, pageSize: 20 });
      recarregarLancamentos();
    } catch (error) {
      message.error(
        selectedLancamento ? "Erro ao atualizar" : "Erro ao criar lançamento"
      );
    }
  };

  const handleConfirmarPagamento = async (id, payload) => {
    try {
      await financeiroService.confirmarPagamento(id, payload);
      message.success("Baixa registrada com sucesso");
      setBaixaVisible(false);
      setBaixaLancamento(null);
      setPagination({ current: 1, pageSize: 20 });
      recarregarLancamentos();
    } catch (error) {
      message.error("Erro ao dar baixa no lançamento");
    }
  };

  const handleImportarExtrato = async (payload) => {
    try {
      const resultado = await financeiroService.importarExtrato(payload);
      message.success(
        `Extrato importado: ${resultado.conciliados} conciliado(s), ${resultado.criados} criado(s), ${resultado.ignorados} ignorado(s).`
      );
      setImportVisible(false);
      setPagination({ current: 1, pageSize: 20 });
      recarregarLancamentos();
    } catch (error) {
      message.error("Erro ao importar extrato");
    }
  };

  const handleDeleteLancamento = (id) => {
    Modal.confirm({
      title: "Deletar Lançamento",
      content:
        "Tem certeza que deseja deletar este lançamento? Esta ação não pode ser desfeita.",
      okText: "Deletar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await financeiroService.removerLancamento(id);
          message.success("Lançamento deletado");
          setPagination({ current: 1, pageSize: 20 });
          recarregarLancamentos();
        } catch (error) {
          message.error("Erro ao deletar lançamento");
        }
      },
    });
  };

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPagination({ current: 1, pageSize: 20 });
  };

  const clearFilters = () => {
    setFilters({
      busca: "",
      tipo: undefined,
      categoria: undefined,
      status: undefined,
      periodo: null,
    });
    setPagination({ current: 1, pageSize: 20 });
  };

  const columns = [
    {
      title: "Data",
      dataIndex: "data_vencimento",
      key: "data_vencimento",
      width: 110,
      render: formatDate,
    },
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 100,
      render: (tipo) => <TipoBadge tipo={tipo} />,
    },
    {
      title: "Categoria",
      dataIndex: "categoria_nome",
      key: "categoria_nome",
      width: 140,
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      width: 120,
      align: "right",
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Ações",
      key: "acoes",
      width: 160,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Visualizar">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setDetailsData(record);
                setDetailsVisible(true);
              }}
              style={{ color: "#3B82F6" }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedLancamento(record);
                setFormVisible(true);
              }}
              style={{ color: "#374151" }}
            />
          </Tooltip>
          {record.status !== "pago" && (
            <Tooltip title="Dar baixa">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setBaixaLancamento(record);
                  setBaixaVisible(true);
                }}
                style={{ color: "#16a34a" }}
              />
            </Tooltip>
          )}
          <Tooltip title="Deletar">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteLancamento(record.id)}
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: "#F8FAFC",
            headerColor: "#6B7280",
            rowHoverBg: "#F3F6FA",
          },
        },
      }}
    >
      <div style={pageStyle}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Title level={1} style={{ color: "#111827", fontSize: 24, fontWeight: 800, margin: 0 }}>
            Lançamentos
          </Title>
          <Space>
            <Button
              icon={<BankOutlined />}
              onClick={() => setImportVisible(true)}
              style={{ height: 40, borderRadius: 8, fontWeight: 600 }}
            >
              Importar extrato
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedLancamento(null);
                setFormVisible(true);
              }}
              style={{
                background: "#3B82F6",
                borderColor: "#3B82F6",
                color: "#ffffff",
                height: "40px",
                paddingLeft: "20px",
                paddingRight: "20px",
                fontWeight: 500,
                fontSize: "14px",
                borderRadius: "8px",
              }}
            >
              Novo Lançamento
            </Button>
          </Space>
        </div>

        {/* Filtros */}
        <Card bordered={false} style={filterStyle} bodyStyle={{ padding: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} lg={5}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
                placeholder="Buscar descrição"
                value={filters.busca}
                onChange={(event) => updateFilter("busca", event.target.value)}
                style={{ borderRadius: 8, height: 40 }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Select
                allowClear
                options={[
                  { label: "Receita", value: "receita" },
                  { label: "Despesa", value: "despesa" },
                ]}
                placeholder="Tipo"
                value={filters.tipo}
                onChange={(value) => updateFilter("tipo", value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={(categorias || []).map((c) => ({
                  label: c.nome,
                  value: c.id,
                }))}
                placeholder="Categoria"
                value={filters.categoria}
                onChange={(value) => updateFilter("categoria", value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Select
                allowClear
                options={[
                  { label: "Pendente", value: "pendente" },
                  { label: "Pago", value: "pago" },
                  { label: "Atrasado", value: "atrasado" },
                  { label: "Cancelado", value: "cancelado" },
                ]}
                placeholder="Status"
                value={filters.status}
                onChange={(value) => updateFilter("status", value)}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <RangePicker
                format="DD/MM/YYYY"
                value={filters.periodo}
                onChange={(value) => updateFilter("periodo", value)}
                style={{ borderRadius: 8, width: "100%" }}
              />
            </Col>
            <Col xs={24}>
              <Button onClick={clearFilters} style={{ borderRadius: 8, fontWeight: 700 }}>
                Limpar filtros
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Tabela */}
        <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 0 }}>
          <Skeleton
            active
            loading={loading && lancamentos.length === 0}
            paragraph={{ rows: 10 }}
            title={false}
          >
            <Table
              columns={columns}
              dataSource={lancamentos}
              rowKey="id"
              loading={loading && lancamentos.length > 0}
              locale={{
                emptyText: (
                  <Empty description="Nenhum lançamento encontrado" style={{ margin: "44px 0" }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setSelectedLancamento(null);
                        setFormVisible(true);
                      }}
                      style={{
                        background: "#3B82F6",
                        borderColor: "#3B82F6",
                        color: "#ffffff",
                        height: "40px",
                        paddingLeft: "20px",
                        paddingRight: "20px",
                        fontWeight: 500,
                        fontSize: "14px",
                        borderRadius: "8px",
                      }}
                    >
                      Criar primeiro lançamento
                    </Button>
                  </Empty>
                ),
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              }}
              scroll={{ x: 1200 }}
            />
          </Skeleton>
        </Card>

        {/* Formulário */}
        <FormularioLancamento
          visible={formVisible}
          loading={loading}
          lancamento={selectedLancamento}
          contas={contas}
          categorias={categorias}
          onSave={handleSaveLancamento}
          onClose={() => {
            setFormVisible(false);
            setSelectedLancamento(null);
          }}
        />

        <BaixaPagamentoModal
          visible={baixaVisible}
          lancamento={baixaLancamento}
          contas={contas}
          onConfirm={handleConfirmarPagamento}
          onClose={() => {
            setBaixaVisible(false);
            setBaixaLancamento(null);
          }}
        />

        <ImportarExtratoModal
          visible={importVisible}
          contas={contas}
          onImport={handleImportarExtrato}
          onClose={() => setImportVisible(false)}
        />

        {/* Drawer de detalhes */}
        <Drawer
          title="Detalhes do Lançamento"
          placement="right"
          onClose={() => setDetailsVisible(false)}
          open={detailsVisible}
          width={450}
        >
          {detailsData && (
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Descrição
                </Text>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
                  {detailsData.descricao}
                </div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tipo
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <TipoBadge tipo={detailsData.tipo} />
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Status
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <StatusBadge status={detailsData.status} />
                  </div>
                </Col>
              </Row>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Categoria
                </Text>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {detailsData.categoria_nome}
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Conta
                </Text>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {detailsData.conta_nome}
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Valor
                </Text>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    marginTop: 4,
                    color: detailsData.tipo === "receita" ? "#16a34a" : "#dc2626",
                  }}
                >
                  {formatMoney(detailsData.valor)}
                </div>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Vencimento
                  </Text>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    {formatDate(detailsData.data_vencimento)}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Pagamento
                  </Text>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    {detailsData.data_pagamento
                      ? formatDate(detailsData.data_pagamento)
                      : "-"}
                  </div>
                </Col>
              </Row>

              {detailsData.observacoes && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Observações
                  </Text>
                  <div
                    style={{
                      fontSize: 14,
                      marginTop: 4,
                      background: "#F3F4F6",
                      padding: 12,
                      borderRadius: 6,
                    }}
                  >
                    {detailsData.observacoes}
                  </div>
                </div>
              )}

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Comprovantes
                </Text>
                <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
                  {(detailsData.anexos || []).length === 0 ? (
                    <Text type="secondary">Nenhum comprovante anexado.</Text>
                  ) : (
                    detailsData.anexos.map((anexo) => (
                      <Button
                        key={anexo.id}
                        icon={<FileTextOutlined />}
                        href={anexo.arquivo_url || anexo.arquivo}
                        target="_blank"
                        rel="noreferrer"
                        style={{ justifyContent: "flex-start", width: "100%" }}
                      >
                        {anexo.nome_original}
                      </Button>
                    ))
                  )}
                </Space>
              </div>
            </Space>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
}
