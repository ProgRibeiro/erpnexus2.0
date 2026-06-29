import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Typography,
  Row,
  Col,
  DatePicker,
  Empty,
} from "antd";
import {
  PlusOutlined,
  FilterOutlined,
  ClearOutlined,
  ApartmentOutlined,
  DollarOutlined,
  WarningOutlined,
  RiseOutlined,
} from "@ant-design/icons";

import clienteService from "../../services/clienteService";
import crmService from "../../services/crm";
import KanbanBoard from "./KanbanBoard";
import OportunidadeDrawer from "./OportunidadeDrawer";

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

const sectionCardStyle = {
  border: "1px solid #E2E6EC",
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const metricCardStyle = {
  border: "1px solid #E2E6EC",
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
  minHeight: 124,
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

function CrmMetricCard({ label, value, color, icon, valueColor }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 18, height: "100%" }} hoverable>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: colors.textoFraco,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 26,
              lineHeight: 1.1,
              fontWeight: 700,
              color: valueColor || colors.texto,
              wordBreak: "break-word",
            }}
          >
            {value}
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 10,
            background: `${color}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
            fontSize: 18,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function CRMPage() {
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [kanban, setKanban] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form] = Form.useForm();

  // Filtros
  const [filtros, setFiltros] = useState({
    responsavel_id: null,
    prioridade: null,
    data_inicio: null,
    data_fim: null,
  });

  const selectedOportunidade = useMemo(() => {
    if (!selectedId || !kanban) return null;
    return kanban.colunas
      .flatMap((coluna) => coluna.oportunidades || [])
      .find((oportunidade) => oportunidade.id === selectedId);
  }, [kanban, selectedId]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!kanban) return { total: 0, valor: 0, altaPrioridade: 0 };

    const oportunidades = kanban.colunas.flatMap((col) => col.oportunidades || []);
    return {
      total: oportunidades.length,
      valor: oportunidades.reduce((sum, opp) => sum + (opp.valor_estimado || 0), 0),
      altaPrioridade: oportunidades.filter((opp) => opp.prioridade === "alta" || opp.prioridade === "urgente").length,
    };
  }, [kanban]);

  const carregarPipelines = async () => {
    try {
      const data = await crmService.listarPipelines();
      setPipelines(data);
      if (!pipelineId && data.length) {
        setPipelineId(data[0].id);
      }
    } catch {
      setPipelines([]);
    }
  };

  const carregarResponsaveis = async () => {
    try {
      const data = await crmService.listarResponsaveis();
      setResponsaveis(data);
    } catch {
      setResponsaveis([]);
    }
  };

  const criarPipelinePadrao = async () => {
    try {
      await crmService.criarPipeline({
        nome: "Pipeline Comercial",
        descricao: "Pipeline principal de vendas",
        ativo: true,
      });
      message.success("Pipeline padrão criado");
      await carregarPipelines();
    } catch (error) {
      message.error("Erro ao criar pipeline padrão");
    }
  };

  const carregarKanban = async (id = pipelineId) => {
    if (!id) return;
    setLoading(true);
    try {
      const params = {};
      if (filtros.responsavel_id) params.responsavel_id = filtros.responsavel_id;
      if (filtros.prioridade) params.prioridade = filtros.prioridade;
      if (filtros.data_inicio) params.data_inicio = filtros.data_inicio.toISOString();
      if (filtros.data_fim) params.data_fim = filtros.data_fim.toISOString();

      const data = await crmService.obterKanban(id, params);
      setKanban(data);
    } catch {
      setKanban(null);
    } finally {
      setLoading(false);
    }
  };

  const carregarClientes = async () => {
    try {
      const data = await clienteService.listar();
      setClientes(data.results ?? data);
    } catch {
      setClientes([]);
    }
  };

  useEffect(() => {
    carregarPipelines();
    carregarClientes();
    carregarResponsaveis();
  }, []);

  useEffect(() => {
    if (!pipelineId && pipelines.length) {
      setPipelineId(pipelines[0].id);
      return;
    }
    carregarKanban(pipelineId);
  }, [pipelineId, pipelines, filtros]);

  const handleMove = async (oportunidadeId, colunaId) => {
    try {
      await crmService.moverOportunidade(oportunidadeId, { coluna: colunaId });
      message.success("Oportunidade movida");
      await carregarKanban();
    } catch (error) {
      message.error("Erro ao mover oportunidade");
    }
  };

  const handleCreate = async (values) => {
    try {
      const primeiraColuna = kanban?.colunas?.[0];
      await crmService.criarOportunidade({
        ...values,
        pipeline: pipelineId,
        coluna: primeiraColuna?.id,
        probabilidade: values.probabilidade || 0,
        valor_estimado: values.valor_estimado || 0,
      });
      form.resetFields();
      setModalOpen(false);
      message.success("Oportunidade criada com sucesso");
      await carregarKanban();
    } catch (error) {
      message.error("Erro ao criar oportunidade");
    }
  };

  const handleOpen = (oportunidade) => {
    setSelectedId(oportunidade.id);
    setDrawerOpen(true);
  };

  const handleRefreshDrawer = async () => {
    await carregarKanban();
  };

  const handleLimparFiltros = () => {
    setFiltros({
      responsavel_id: null,
      prioridade: null,
      data_inicio: null,
      data_fim: null,
    });
  };

  const temFiltrosAtivos = Object.values(filtros).some((v) => v !== null);

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, color: colors.texto, fontWeight: 700 }}>
              CRM
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Gestão de oportunidades comerciais
            </Text>
          </div>
          <Space wrap>
            {pipelines.length > 0 ? (
              <>
                <Select
                  style={{ width: 260 }}
                  value={pipelineId}
                  onChange={setPipelineId}
                  options={pipelines.map((pipeline) => ({
                    value: pipeline.id,
                    label: pipeline.nome,
                  }))}
                  placeholder="Selecione um pipeline"
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                  Nova oportunidade
                </Button>
              </>
            ) : (
              <Button type="primary" onClick={criarPipelinePadrao}>
                Criar pipeline padrão
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {pipelines.length > 0 && (
        <>
          {/* Estatísticas */}
          <Row gutter={[20, 20]}>
            <Col xs={24} sm={12} xl={6}>
              <CrmMetricCard
                label="Total de Oportunidades"
                value={estatisticas.total}
                color={colors.azul}
                icon={<ApartmentOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <CrmMetricCard
                label="Valor em Carteira"
                value={formatCurrency(estatisticas.valor)}
                color={colors.azul}
                icon={<DollarOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <CrmMetricCard
                label="Prioridade Alta"
                value={estatisticas.altaPrioridade}
                color={colors.vermelho}
                valueColor={estatisticas.altaPrioridade > 0 ? colors.vermelho : colors.texto}
                icon={<WarningOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <CrmMetricCard
                label="Taxa de Conversão"
                value={`${kanban?.taxa_conversao || 0}%`}
                color={colors.verde}
                valueColor={colors.verde}
                icon={<RiseOutlined />}
              />
            </Col>
          </Row>

          {/* Filtros */}
          <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 16 }}>
            <Form layout="inline" style={{ width: "100%", rowGap: 12 }}>
              <Form.Item label={<FilterOutlined style={{ color: colors.textoFraco }} />} style={{ marginBottom: 0 }}>
                <Select
                  style={{ width: 200 }}
                  placeholder="Filtrar por responsável"
                  allowClear
                  value={filtros.responsavel_id}
                  onChange={(value) => setFiltros({ ...filtros, responsavel_id: value })}
                  options={[
                    { label: "Todos", value: null },
                    ...responsaveis.map((r) => ({ label: r.nome, value: r.id })),
                  ]}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Select
                  style={{ width: 200 }}
                  placeholder="Filtrar por prioridade"
                  allowClear
                  value={filtros.prioridade}
                  onChange={(value) => setFiltros({ ...filtros, prioridade: value })}
                  options={[
                    { label: "Todas", value: null },
                    { label: "🟢 Baixa", value: "baixa" },
                    { label: "🟡 Média", value: "media" },
                    { label: "🔴 Alta", value: "alta" },
                    { label: "🟣 Urgente", value: "urgente" },
                  ]}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <DatePicker
                  placeholder="Data início"
                  value={filtros.data_inicio}
                  onChange={(date) => setFiltros({ ...filtros, data_inicio: date })}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <DatePicker
                  placeholder="Data fim"
                  value={filtros.data_fim}
                  onChange={(date) => setFiltros({ ...filtros, data_fim: date })}
                />
              </Form.Item>

              {temFiltrosAtivos && (
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button icon={<ClearOutlined />} onClick={handleLimparFiltros}>
                    Limpar filtros
                  </Button>
                </Form.Item>
              )}
            </Form>
          </Card>

          {/* Kanban Board */}
          <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
            {kanban?.colunas?.length ? (
              <KanbanBoard
                kanban={kanban}
                loading={loading}
                onMove={handleMove}
                onOpen={handleOpen}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhuma coluna configurada para este pipeline"
                style={{ padding: "40px 0" }}
              />
            )}
          </Card>
        </>
      )}

      {/* Modal de criação */}
      <Modal
        title="Nova Oportunidade"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Criar"
        cancelText="Cancelar"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="titulo"
            label="Título da Oportunidade"
            rules={[{ required: true, message: "Informe o título" }]}
          >
            <Input placeholder="Ex: Projeto de reforma" />
          </Form.Item>

          <Form.Item
            name="cliente"
            label="Cliente"
            rules={[{ required: true, message: "Selecione o cliente" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Selecione ou digite o cliente"
              options={clientes.map((cliente) => ({
                value: cliente.id,
                label: cliente.nome,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="valor_estimado"
                label="Valor Estimado (R$)"
                rules={[{ required: true, message: "Informe o valor" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0,00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="probabilidade"
                label="Probabilidade de Conversão (%)"
                initialValue={50}
              >
                <InputNumber min={0} max={100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="prioridade" label="Prioridade" initialValue="media">
            <Select
              options={[
                { value: "baixa", label: "🟢 Baixa" },
                { value: "media", label: "🟡 Média" },
                { value: "alta", label: "🔴 Alta" },
                { value: "urgente", label: "🟣 Urgente" },
              ]}
            />
          </Form.Item>

          <Form.Item name="descricao" label="Descrição">
            <Input.TextArea rows={4} placeholder="Descreva os detalhes da oportunidade" />
          </Form.Item>

          <Form.Item name="data_fechamento_prevista" label="Data Prevista de Fechamento">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer de detalhes */}
      <OportunidadeDrawer
        oportunidade={selectedOportunidade}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={handleRefreshDrawer}
      />
    </div>
  );
}
