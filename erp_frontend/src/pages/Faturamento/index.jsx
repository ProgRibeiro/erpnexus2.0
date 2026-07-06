import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  DollarOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GroupOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../services/api";

const { Title, Text } = Typography;

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

const metricCardStyle = {
  ...panelStyle,
  minHeight: 124,
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function fmt(v) { return moneyFmt.format(Number(v || 0)); }

function SummaryCard({ color, icon, label, value }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: colors.textoFraco,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
          <div style={{ color: colors.texto, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
            {value}
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            background: `${color}14`,
            borderRadius: 12,
            color,
            display: "flex",
            height: 44,
            justifyContent: "center",
            width: 44,
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function applyMaskCNPJ(value) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatDocumento(value) {
  const digits = onlyDigits(value);
  if (digits.length === 14) return applyMaskCNPJ(digits);
  if (digits.length === 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
      .slice(0, 14);
  }
  return value || "";
}

function getClienteDocumento(record) {
  return record?.cliente_cnpj_cpf || record?.cliente_documento || record?.cliente?.cnpj_cpf || "";
}

const statusColors = {
  aberta: "blue",
  em_execucao: "processing",
  concluida: "success",
  faturada: "green",
  aprovada: "cyan",
};

const formaCobrancaOptions = [
  { label: "Boleto", value: "boleto" },
  { label: "Pix", value: "pix" },
  { label: "Cartão", value: "cartao" },
  { label: "Transferência", value: "transferencia" },
  { label: "Dinheiro", value: "dinheiro" },
];

function parseMoney(value) {
  return Number(String(value || 0).replace(/\./g, "").replace(",", ".")) || 0;
}

export default function FaturamentoPage() {
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ cliente: undefined, status: undefined, periodo: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrdens, setSelectedOrdens] = useState([]);
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form] = Form.useForm();
  const [drawerForm] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ordemFaturando, setOrdemFaturando] = useState(null);
  const [nfAnalysis, setNfAnalysis] = useState(null);
  const [analisandoNf, setAnalisandoNf] = useState(false);
  const [confirmandoFaturamento, setConfirmandoFaturamento] = useState(false);

  useEffect(() => {
    carregarOrdens();
    carregarClientes();
  }, []);

  const carregarOrdens = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.cliente) params.cliente = filters.cliente;
      if (filters.periodo) {
        params.data_inicio = filters.periodo[0].format("YYYY-MM-DD");
        params.data_fim = filters.periodo[1].format("YYYY-MM-DD");
      }
      // pendentes-faturamento agora retorna somente status=concluida
      const response = await api.get("/ordens/pendentes-faturamento/", { params });
      const data = response.data;
      setOrdens(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
    } catch {
      try {
        const response = await api.get("/ordens/", { params: { status: "concluida" } });
        const data = response.data;
        setOrdens(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
      } catch {
        message.error("Não foi possível carregar as ordens.");
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarClientes = async () => {
    try {
      const response = await api.get("/clientes/");
      const data = response.data;
      setClientes(
        (Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []).map((c) => ({
          value: c.id,
          label: `${c.nome_razao_social || c.nome || `Cliente #${c.id}`}${c.cnpj_cpf ? ` - ${formatDocumento(c.cnpj_cpf)}` : ""}`,
        }))
      );
    } catch {
      // silently fail
    }
  };

  const buscarCNPJ = async () => {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      message.warning("CNPJ inválido. Informe os 14 dígitos.");
      return;
    }
    setBuscandoCnpj(true);
    try {
      const response = await api.post("/fiscal/consultar-cnpj/", { cnpj: cnpjLimpo });
      const dados = response.data;
      setRazaoSocial(dados.nome || dados.razao_social || "");
      message.success("CNPJ encontrado.");
    } catch {
      message.error("CNPJ não encontrado.");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const criarAgrupamento = async () => {
    if (selectedOrdens.length === 0) {
      message.warning("Selecione ao menos uma OS.");
      return;
    }
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (!cnpjLimpo) {
      message.warning("Informe o CNPJ do tomador.");
      return;
    }
    setCriando(true);
    try {
      const response = await api.post("/ordens/faturamentos-agrupados/", {
        cnpj_tomador: cnpjLimpo,
        razao_social_tomador: razaoSocial,
        ordens_ids: selectedOrdens,
      });
      const agrupamento = response.data;
      if (agrupamento?.id && selectedOrdens.length > 0) {
        await api.post(`/ordens/faturamentos-agrupados/${agrupamento.id}/adicionar-ordens/`, {
          ordens_ids: selectedOrdens,
        }).catch(() => {});
      }
      message.success("Agrupamento criado com sucesso!");
      setModalOpen(false);
      setSelectedOrdens([]);
      setCnpj("");
      setRazaoSocial("");
      carregarOrdens();
    } catch {
      message.error("Erro ao criar agrupamento.");
    } finally {
      setCriando(false);
    }
  };

  const abrirFaturamentoRapido = (record) => {
    setOrdemFaturando(record);
    setNfAnalysis(null);
    drawerForm.setFieldsValue({
      valor_final_faturado: Number(record.valor_final_faturado || record.total_com_impostos || record.valor_total_orcado || 0),
      numero_nf: record.numero_nf || "",
      data_emissao_nf: record.data_emissao_nf ? dayjs(record.data_emissao_nf) : dayjs(),
      data_vencimento: record.data_vencimento ? dayjs(record.data_vencimento) : dayjs().add(30, "day"),
      forma_cobranca: record.forma_cobranca || "pix",
      descricao_servico_nf: record.descricao_servico_nf || record.descricao_servico || "",
      valor_issqn: Number(record.valor_issqn || 0),
      valor_pis: Number(record.valor_pis || 0),
      valor_cofins: Number(record.valor_cofins || 0),
      valor_irpj: Number(record.valor_irpj || 0),
      valor_csll: Number(record.valor_csll || 0),
      pdf_nf_upload: [],
    });
    setDrawerOpen(true);
  };

  const analisarPdfNota = async () => {
    const file = drawerForm.getFieldValue("pdf_nf_upload")?.[0]?.originFileObj;
    if (!file || !ordemFaturando?.id) {
      message.warning("Selecione o PDF da nota fiscal primeiro.");
      return;
    }
    const formData = new FormData();
    formData.append("arquivo", file);
    setAnalisandoNf(true);
    try {
      const response = await api.post(`/ordens/${ordemFaturando.id}/analisar-nota-fiscal/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data || {};
      setNfAnalysis(data);
      const impostos = data.impostos_sugeridos || {};
      drawerForm.setFieldsValue({
        numero_nf: data.numero_nf_sugerido || drawerForm.getFieldValue("numero_nf"),
        data_emissao_nf: data.data_emissao_sugerida ? dayjs(data.data_emissao_sugerida) : drawerForm.getFieldValue("data_emissao_nf"),
        valor_final_faturado: parseMoney(data.valor_total_sugerido) || drawerForm.getFieldValue("valor_final_faturado"),
        descricao_servico_nf: data.descricao_sugerida || drawerForm.getFieldValue("descricao_servico_nf"),
        valor_issqn: parseMoney(impostos.valor_issqn) || drawerForm.getFieldValue("valor_issqn"),
        valor_pis: parseMoney(impostos.valor_pis) || drawerForm.getFieldValue("valor_pis"),
        valor_cofins: parseMoney(impostos.valor_cofins) || drawerForm.getFieldValue("valor_cofins"),
        valor_irpj: parseMoney(impostos.valor_irpj) || drawerForm.getFieldValue("valor_irpj"),
        valor_csll: parseMoney(impostos.valor_csll) || drawerForm.getFieldValue("valor_csll"),
      });
      message.success("PDF da nota fiscal lido. Revise os campos antes de confirmar.");
    } catch (error) {
      message.error(error.response?.data?.detail || "Não foi possível ler o PDF da nota fiscal.");
    } finally {
      setAnalisandoNf(false);
    }
  };

  const confirmarFaturamentoRapido = async () => {
    if (!ordemFaturando?.id) return;
    setConfirmandoFaturamento(true);
    try {
      const values = await drawerForm.validateFields();
      const formData = new FormData();
      const pdfFile = values.pdf_nf_upload?.[0]?.originFileObj;
      const campos = {
        valor_final_faturado: values.valor_final_faturado || 0,
        numero_nf: values.numero_nf || "",
        data_emissao_nf: values.data_emissao_nf ? values.data_emissao_nf.format("YYYY-MM-DD") : "",
        data_vencimento: values.data_vencimento ? values.data_vencimento.format("YYYY-MM-DD") : "",
        forma_cobranca: values.forma_cobranca || "",
        descricao_servico_nf: values.descricao_servico_nf || "",
        valor_issqn: values.valor_issqn || 0,
        valor_pis: values.valor_pis || 0,
        valor_cofins: values.valor_cofins || 0,
        valor_irpj: values.valor_irpj || 0,
        valor_csll: values.valor_csll || 0,
        valor_liquido_nf: Number(values.valor_final_faturado || 0) - Number(values.valor_issqn || 0),
      };
      Object.entries(campos).forEach(([key, value]) => formData.append(key, value));
      if (pdfFile) formData.append("pdf_nf", pdfFile);

      await api.patch(`/ordens/${ordemFaturando.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const enviarConfirmacao = (flags = {}) =>
        api.post(`/ordens/${ordemFaturando.id}/confirmar-faturamento/`, flags);

      try {
        await enviarConfirmacao();
      } catch (error) {
        const data = error.response?.data || {};
        if (data.requer_confirmacao_pc || data.requer_confirmacao_valor_pc) {
          const confirmado = await new Promise((resolve) => {
            Modal.confirm({
              title: data.requer_confirmacao_valor_pc ? "Faturar acima do PC?" : "Faturar sem PC completo?",
              content: data.detail || "Confirme conscientemente para gerar o lançamento financeiro.",
              okText: "Confirmar e faturar",
              cancelText: "Revisar",
              okButtonProps: { danger: data.requer_confirmacao_valor_pc },
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            });
          });
          if (!confirmado) return;
          await enviarConfirmacao({
            forcar_sem_pc: Boolean(data.requer_confirmacao_pc),
            forcar_valor_pc: Boolean(data.requer_confirmacao_valor_pc),
          });
        } else {
          throw error;
        }
      }

      message.success("OS faturada e lançamento financeiro criado.");
      setDrawerOpen(false);
      setOrdemFaturando(null);
      setNfAnalysis(null);
      drawerForm.resetFields();
      carregarOrdens();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.detail || "Não foi possível confirmar o faturamento.");
    } finally {
      setConfirmandoFaturamento(false);
    }
  };

  const totalSelecionadas = ordens
    .filter((o) => selectedOrdens.includes(o.id))
    .reduce((acc, o) => acc + Number(o.valor_total_orcado || 0), 0);

  const totalPendente = ordens.reduce((acc, o) => acc + Number(o.valor_total_orcado || 0), 0);
  const ordensSemDocumento = ordens.filter((o) => !onlyDigits(getClienteDocumento(o))).length;

  // Verifica se PC está preenchido (tem número, valor ou dados extraídos)
  function pcStatus(record) {
    if (!record.tem_pedido_compra) return "sem_pc";
    const temNumero = record.numero_pc && String(record.numero_pc).trim().length > 0;
    const temValor = record.valor_autorizado_pc && Number(record.valor_autorizado_pc) > 0;
    const temDados = record.dados_pc_extraidos && typeof record.dados_pc_extraidos === "object" &&
      Object.keys(record.dados_pc_extraidos).length > 0;
    return (temNumero || temValor || temDados) ? "pc_ok" : "pc_pendente";
  }

  const columns = [
    {
      title: "Número OS",
      dataIndex: "numero",
      key: "numero",
      width: 140,
      render: (v) => <Text strong style={{ color: colors.azul }}>{v || "-"}</Text>,
    },
    {
      title: "Status",
      key: "status_faturamento",
      width: 170,
      render: () => (
        <Tag color="warning" style={{ borderRadius: 999, fontWeight: 700 }}>
          Pendente faturamento
        </Tag>
      ),
    },
    {
      title: "Cliente",
      dataIndex: "cliente_nome",
      key: "cliente_nome",
      render: (v) => v || "-",
    },
    {
      title: "CNPJ/CPF Cliente",
      key: "cliente_cnpj_cpf",
      width: 180,
      render: (_, record) => {
        const documento = getClienteDocumento(record);
        if (!onlyDigits(documento)) {
          return (
            <Tag color="error" style={{ borderRadius: 999, fontWeight: 700 }}>
              Sem documento
            </Tag>
          );
        }
        return <Text copyable style={{ color: colors.texto, fontWeight: 600 }}>{formatDocumento(documento)}</Text>;
      },
    },
    {
      title: "Tipo de Serviço",
      dataIndex: "tipo_servico",
      key: "tipo_servico",
      render: (v) => v || "-",
    },
    {
      title: "Valor Total",
      dataIndex: "valor_total_orcado",
      key: "valor_total_orcado",
      render: (v) => <Text strong style={{ color: colors.texto }}>{fmt(v)}</Text>,
    },
    {
      title: "Concluída em",
      dataIndex: "atualizado_em",
      key: "atualizado_em",
      width: 130,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Pedido de Compra",
      key: "pc",
      width: 150,
      render: (_, record) => {
        const ps = pcStatus(record);
        if (ps === "sem_pc") return <Tag color="default" style={{ borderRadius: 999, fontWeight: 600 }}>Sem PC</Tag>;
        if (ps === "pc_ok") return (
          <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 999, fontWeight: 600 }}>PC Preenchido</Tag>
        );
        return (
          <Tooltip title="PC obrigatório não preenchido. Preencha o Pedido de Compra na OS antes de faturar.">
            <Tag icon={<ExclamationCircleOutlined />} color="warning" style={{ borderRadius: 999, fontWeight: 600 }}>PC Pendente</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Ações",
      key: "acoes",
      render: (_, record) => {
        const ps = pcStatus(record);
        const bloqueado = ps === "pc_pendente";
        return (
          <Space>
            <Tooltip title={bloqueado ? "Preencha o PC na OS antes de faturar" : ""}>
              <Button
                size="small"
                type="primary"
                icon={<EyeOutlined />}
                disabled={bloqueado}
                style={bloqueado ? { borderRadius: 8 } : { background: colors.azul, borderColor: colors.azul, borderRadius: 8, fontWeight: 600 }}
                onClick={() => abrirFaturamentoRapido(record)}
              >
                {bloqueado ? "PC Pendente" : "Faturar"}
              </Button>
            </Tooltip>
            <Button
              size="small"
              icon={<EyeOutlined />}
              style={{ borderRadius: 8 }}
              onClick={() => navigate(`/ordens/${record.id}`)}
            >
              Ver OS
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={pageStyle}>
      {/* Header */}
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Space align="start">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${colors.azul}14`,
                color: colors.azul,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <DollarOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>
                Faturamento
              </Title>
              <Text style={{ color: colors.textoSecundario }}>
                Toda OS concluída entra automaticamente aqui para faturar
              </Text>
            </div>
          </Space>
          <Button
            type="primary"
            icon={<GroupOutlined />}
            style={{ height: 40, paddingInline: 20, borderRadius: 10, fontWeight: 600 }}
            onClick={() => setModalOpen(true)}
          >
            Agrupar para NF
          </Button>
        </div>
      </Card>

      <Alert
        showIcon
        type="warning"
        message="Fila oficial de pendências de faturamento"
        description="A regra é direta: quando a OS fica concluída, ela aparece em Faturamento como pendente. Depois que o faturamento é confirmado na OS, ela sai desta fila."
        style={{ borderRadius: 12, borderColor: "#FDE68A" }}
      />

      {/* Cards de totais */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard color={colors.azul} icon={<FileTextOutlined />} label="OS pendentes" value={ordens.length} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard color={colors.verde} icon={<DollarOutlined />} label="Valor total pendente" value={fmt(totalPendente)} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard
            color={colors.laranja}
            icon={<CheckCircleOutlined />}
            label="OS selecionadas"
            value={`${selectedOrdens.length} / ${ordens.length}`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard
            color={ordensSemDocumento > 0 ? colors.vermelho : colors.verde}
            icon={<ExclamationCircleOutlined />}
            label="Sem CNPJ/CPF"
            value={ordensSemDocumento}
          />
        </Col>
      </Row>

      {/* Filtros */}
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10}>
            <Select
              placeholder="Filtrar por cliente"
              allowClear
              options={clientes}
              style={{ width: "100%" }}
              onChange={(v) => setFilters((f) => ({ ...f, cliente: v }))}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={10}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              onChange={(v) => setFilters((f) => ({ ...f, periodo: v }))}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Button icon={<SearchOutlined />} onClick={carregarOrdens} style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}>
              Filtrar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabela */}
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={ordens}
          loading={loading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedOrdens,
            onChange: (keys) => setSelectedOrdens(keys),
          }}
          rowClassName={(record) => (!onlyDigits(getClienteDocumento(record)) ? "linha-sem-documento" : "")}
          scroll={{ x: 1350 }}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhuma OS pendente de faturamento"
                style={{ margin: "40px 0" }}
              />
            ),
          }}
        />
      </Card>

      <Drawer
        title={ordemFaturando ? `Faturar ${ordemFaturando.numero || `OS #${ordemFaturando.id}`}` : "Faturamento rápido"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={confirmandoFaturamento}
              onClick={confirmarFaturamentoRapido}
            >
              Confirmar faturamento
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            showIcon
            type="info"
            message="Revise antes de confirmar"
            description="O PDF da nota pode preencher campos automaticamente, mas a confirmação final usa os dados visíveis aqui para salvar a OS e criar o lançamento financeiro."
            style={{ borderRadius: 12 }}
          />

          {ordemFaturando && (
            <Card size="small" style={{ borderRadius: 12 }}>
              <Row gutter={[12, 8]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary">Cliente</Text>
                  <div><Text strong>{ordemFaturando.cliente_nome || "-"}</Text></div>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">CNPJ/CPF</Text>
                  <div><Text strong>{formatDocumento(getClienteDocumento(ordemFaturando)) || "Sem documento"}</Text></div>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">Valor da OS</Text>
                  <div><Text strong>{fmt(ordemFaturando.valor_total_orcado)}</Text></div>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">Pedido de Compra</Text>
                  <div>
                    <Tag color={pcStatus(ordemFaturando) === "pc_ok" ? "success" : pcStatus(ordemFaturando) === "pc_pendente" ? "warning" : "default"}>
                      {pcStatus(ordemFaturando) === "pc_ok" ? "PC preenchido" : pcStatus(ordemFaturando) === "pc_pendente" ? "PC pendente" : "Sem PC"}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          <Form form={drawerForm} layout="vertical">
            <Card size="small" title="Nota fiscal" style={{ borderRadius: 12, marginBottom: 16 }}>
              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="PDF da nota fiscal"
                    name="pdf_nf_upload"
                    valuePropName="fileList"
                    getValueFromEvent={(event) => event?.fileList || []}
                  >
                    <Upload beforeUpload={() => false} maxCount={1} accept="application/pdf">
                      <Button icon={<UploadOutlined />}>Selecionar PDF</Button>
                    </Upload>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Button
                    block
                    icon={<SearchOutlined />}
                    loading={analisandoNf}
                    onClick={analisarPdfNota}
                    style={{ marginTop: 30, borderRadius: 8, fontWeight: 600 }}
                  >
                    Ler PDF e preencher
                  </Button>
                </Col>
              </Row>
              {nfAnalysis && (
                <Alert
                  showIcon
                  type={Number(nfAnalysis.confianca || 0) >= 70 ? "success" : "warning"}
                  message={`Leitura da NF: ${Number(nfAnalysis.confianca || 0).toFixed(0)}% de confiança`}
                  description={nfAnalysis.resumo}
                  style={{ borderRadius: 12, marginBottom: 12 }}
                />
              )}
              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Número NF-e / NFS-e" name="numero_nf" rules={[{ required: true, message: "Informe o número da NF." }]}>
                    <Input placeholder="Ex.: 000123" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Data de emissão" name="data_emissao_nf" rules={[{ required: true, message: "Informe a emissão." }]}>
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Valor final faturado" name="valor_final_faturado" rules={[{ required: true, message: "Informe o valor faturado." }]}>
                    <InputNumber min={0} step={0.01} style={{ width: "100%" }} formatter={(v) => `R$ ${v || ""}`} parser={(v) => v?.replace(/R\$\s?/, "")} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Vencimento / previsão" name="data_vencimento" rules={[{ required: true, message: "Informe o vencimento." }]}>
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Forma de cobrança" name="forma_cobranca" rules={[{ required: true, message: "Informe a forma de cobrança." }]}>
                    <Select options={formaCobrancaOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Descrição do serviço na NF" name="descricao_servico_nf">
                    <Input.TextArea rows={3} placeholder="Descrição conforme a nota fiscal" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Impostos cobrados na nota" style={{ borderRadius: 12, marginBottom: 16 }}>
              <Row gutter={[12, 0]}>
                <Col xs={24} sm={8}>
                  <Form.Item label="ISSQN" name="valor_issqn"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="PIS" name="valor_pis"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="COFINS" name="valor_cofins"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="IRPJ" name="valor_irpj"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="CSLL" name="valor_csll"><InputNumber min={0} step={0.01} style={{ width: "100%" }} /></Form.Item>
                </Col>
              </Row>
              <Form.Item shouldUpdate>
                {() => {
                  const values = drawerForm.getFieldsValue();
                  const totalImpostos =
                    Number(values.valor_issqn || 0) +
                    Number(values.valor_pis || 0) +
                    Number(values.valor_cofins || 0) +
                    Number(values.valor_irpj || 0) +
                    Number(values.valor_csll || 0);
                  const liquido = Number(values.valor_final_faturado || 0) - Number(values.valor_issqn || 0);
                  return (
                    <Alert
                      showIcon
                      type="success"
                      message={`Resumo: impostos informados ${fmt(totalImpostos)} • líquido previsto ${fmt(liquido)}`}
                      style={{ borderRadius: 12 }}
                    />
                  );
                }}
              </Form.Item>
            </Card>
          </Form>
        </Space>
      </Drawer>

      {/* Modal Agrupamento */}
      <Modal
        title="Agrupar OS para Faturamento Único"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Text style={{ color: colors.textoSecundario }}>
            Selecione as OS abaixo e informe o tomador do serviço para gerar uma NF consolidada.
          </Text>

          {/* Seleção de OS */}
          <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${colors.borda}`, borderRadius: 10, padding: "8px 12px" }}>
            {ordens.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhuma OS disponível"
                style={{ margin: "16px 0" }}
              />
            ) : (
              ordens.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    margin: "0 -10px",
                    borderRadius: 8,
                    borderBottom: "1px solid #F1F5F9",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onClick={() =>
                    setSelectedOrdens((prev) =>
                      prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id]
                    )
                  }
                  onMouseEnter={(event) => { event.currentTarget.style.background = "#F8FAFD"; }}
                  onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}
                >
                  <Checkbox
                    checked={selectedOrdens.includes(o.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setSelectedOrdens((prev) =>
                        e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id)
                      )
                    }
                  />
                  <Text style={{ flex: 1, color: colors.texto }}>{o.numero || `OS #${o.id}`}</Text>
                  <div style={{ minWidth: 180 }}>
                    <Text style={{ color: colors.textoFraco, fontSize: 12, display: "block" }}>{o.cliente_nome || "-"}</Text>
                    <Text style={{ color: colors.textoFraco, fontSize: 11 }}>
                      {formatDocumento(getClienteDocumento(o)) || "Sem CNPJ/CPF"}
                    </Text>
                  </div>
                  <Text strong style={{ color: colors.azul, minWidth: 90, textAlign: "right" }}>{fmt(o.valor_total_orcado)}</Text>
                </div>
              ))
            )}
          </div>

          {selectedOrdens.length > 0 && (
            <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px" }}>
              <Text strong style={{ color: "#1D4ED8" }}>
                Total consolidado: {fmt(totalSelecionadas)} ({selectedOrdens.length} OS)
              </Text>
            </div>
          )}

          <Divider style={{ margin: "4px 0" }} />

          {/* Dados do tomador */}
          <Row gutter={[12, 0]} align="bottom">
            <Col xs={24} sm={14}>
              <Text strong style={{ fontSize: 13, color: colors.texto }}>CNPJ do tomador</Text>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(applyMaskCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                style={{ marginTop: 4, borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={10}>
              <Button
                onClick={buscarCNPJ}
                loading={buscandoCnpj}
                icon={<SearchOutlined />}
                style={{ marginTop: 22, width: "100%", borderRadius: 8, fontWeight: 600 }}
              >
                Buscar CNPJ
              </Button>
            </Col>
          </Row>

          <div>
            <Text strong style={{ fontSize: 13, color: colors.texto }}>Razão Social do tomador</Text>
            <Input
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Empresa Tomadora Ltda."
              style={{ marginTop: 4, borderRadius: 8 }}
            />
          </div>

          <Row justify="end">
            <Space>
              <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 8, fontWeight: 600 }}>Cancelar</Button>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                style={{ borderRadius: 8, fontWeight: 600 }}
                onClick={criarAgrupamento}
                loading={criando}
              >
                Criar Agrupamento
              </Button>
            </Space>
          </Row>
        </Space>
      </Modal>
    </div>
  );
}
