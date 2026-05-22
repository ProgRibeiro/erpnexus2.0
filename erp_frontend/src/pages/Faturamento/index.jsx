import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
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
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const { Title, Text } = Typography;

const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function fmt(v) { return moneyFmt.format(Number(v || 0)); }

function applyMaskCNPJ(value) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

const statusColors = {
  aberta: "blue",
  em_execucao: "processing",
  concluida: "success",
  faturada: "green",
  aprovada: "cyan",
};

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
          label: c.nome_razao_social || c.nome || `Cliente #${c.id}`,
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

  const totalSelecionadas = ordens
    .filter((o) => selectedOrdens.includes(o.id))
    .reduce((acc, o) => acc + Number(o.valor_total_orcado || 0), 0);

  const totalPendente = ordens.reduce((acc, o) => acc + Number(o.valor_total_orcado || 0), 0);

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
      render: (v) => <Text strong style={{ color: "#3B82F6" }}>{v || "-"}</Text>,
    },
    {
      title: "Cliente",
      dataIndex: "cliente_nome",
      key: "cliente_nome",
      render: (v) => v || "-",
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
      render: (v) => <Text strong>{fmt(v)}</Text>,
    },
    {
      title: "Pedido de Compra",
      key: "pc",
      width: 150,
      render: (_, record) => {
        const ps = pcStatus(record);
        if (ps === "sem_pc") return <Tag color="default">Sem PC</Tag>;
        if (ps === "pc_ok") return (
          <Tag icon={<CheckCircleOutlined />} color="success">PC Preenchido</Tag>
        );
        return (
          <Tooltip title="PC obrigatório não preenchido. Preencha o Pedido de Compra na OS antes de faturar.">
            <Tag icon={<ExclamationCircleOutlined />} color="warning">PC Pendente</Tag>
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
                style={bloqueado ? {} : { background: "#3B82F6", borderColor: "#3B82F6" }}
                onClick={() => navigate(`/ordens/${record.id}`, { state: { tab: "faturamento" } })}
              >
                {bloqueado ? "PC Pendente" : "Faturar"}
              </Button>
            </Tooltip>
            <Button
              size="small"
              icon={<EyeOutlined />}
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
    <div style={{ padding: 24, background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <DollarOutlined style={{ marginRight: 10, color: "#3B82F6" }} />
            Faturamento
          </Title>
          <Text type="secondary">Gerencie OS pendentes de faturamento e agrupamentos de NF</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<GroupOutlined />}
            style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 10, fontWeight: 600 }}
            onClick={() => setModalOpen(true)}
          >
            Agrupar para NF
          </Button>
        </Col>
      </Row>

      {/* Cards de totais */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="OS pendentes"
              value={ordens.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#3B82F6" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="Valor total pendente"
              value={fmt(totalPendente)}
              valueStyle={{ color: "#10B981" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title="OS selecionadas"
              value={selectedOrdens.length}
              suffix={`/ ${ordens.length}`}
              valueStyle={{ color: "#F59E0B" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Row gutter={[16, 8]} align="middle">
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
            <Button icon={<SearchOutlined />} onClick={carregarOrdens} style={{ width: "100%" }}>
              Filtrar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabela */}
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Table
          columns={columns}
          dataSource={ordens}
          loading={loading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedOrdens,
            onChange: (keys) => setSelectedOrdens(keys),
          }}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: "Nenhuma OS pendente de faturamento" }}
        />
      </Card>

      {/* Modal Agrupamento */}
      <Modal
        title="Agrupar OS para Faturamento Único"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Text type="secondary">
            Selecione as OS abaixo e informe o tomador do serviço para gerar uma NF consolidada.
          </Text>

          {/* Seleção de OS */}
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 12px" }}>
            {ordens.length === 0 ? (
              <Text type="secondary">Nenhuma OS disponível.</Text>
            ) : (
              ordens.map((o) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <Checkbox
                    checked={selectedOrdens.includes(o.id)}
                    onChange={(e) =>
                      setSelectedOrdens((prev) =>
                        e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id)
                      )
                    }
                  />
                  <Text style={{ flex: 1 }}>{o.numero || `OS #${o.id}`}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{o.cliente_nome || "-"}</Text>
                  <Text strong style={{ color: "#3B82F6", minWidth: 90, textAlign: "right" }}>{fmt(o.valor_total_orcado)}</Text>
                </div>
              ))
            )}
          </div>

          {selectedOrdens.length > 0 && (
            <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 14px" }}>
              <Text strong style={{ color: "#1D4ED8" }}>
                Total consolidado: {fmt(totalSelecionadas)} ({selectedOrdens.length} OS)
              </Text>
            </div>
          )}

          <Divider style={{ margin: "4px 0" }} />

          {/* Dados do tomador */}
          <Row gutter={[12, 0]} align="bottom">
            <Col xs={24} sm={14}>
              <Text strong style={{ fontSize: 13 }}>CNPJ do tomador</Text>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(applyMaskCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                style={{ marginTop: 4 }}
              />
            </Col>
            <Col xs={24} sm={10}>
              <Button
                onClick={buscarCNPJ}
                loading={buscandoCnpj}
                icon={<SearchOutlined />}
                style={{ marginTop: 22, width: "100%" }}
              >
                Buscar CNPJ
              </Button>
            </Col>
          </Row>

          <div>
            <Text strong style={{ fontSize: 13 }}>Razão Social do tomador</Text>
            <Input
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Empresa Tomadora Ltda."
              style={{ marginTop: 4 }}
            />
          </div>

          <Row justify="end">
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                style={{ background: "#3B82F6", borderColor: "#3B82F6", fontWeight: 600 }}
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
