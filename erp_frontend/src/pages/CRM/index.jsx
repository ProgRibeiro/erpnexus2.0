import { useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Input, InputNumber, message, Modal, Select, Space, Typography } from "antd";

import clienteService from "../../services/clienteService";
import crmService from "../../services/crm";
import KanbanBoard from "./KanbanBoard";
import OportunidadeDrawer from "./OportunidadeDrawer";

export default function CRMPage() {
  const [pipelines, setPipelines] = useState([]);
  const [pipelineId, setPipelineId] = useState(null);
  const [kanban, setKanban] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form] = Form.useForm();

  const selectedOportunidade = useMemo(() => {
    if (!selectedId || !kanban) return null;
    return kanban.colunas
      .flatMap((coluna) => coluna.oportunidades || [])
      .find((oportunidade) => oportunidade.id === selectedId);
  }, [kanban, selectedId]);

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
      const data = await crmService.obterKanban(id);
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
  }, []);

  useEffect(() => {
    if (!pipelineId && pipelines.length) {
      setPipelineId(pipelines[0].id);
      return;
    }
    carregarKanban(pipelineId);
  }, [pipelineId, pipelines]);

  const handleMove = async (oportunidadeId, colunaId) => {
    await crmService.moverOportunidade(oportunidadeId, { coluna: colunaId });
    await carregarKanban();
  };

  const handleCreate = async (values) => {
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
    message.success("Oportunidade criada");
    await carregarKanban();
  };

  const handleOpen = (oportunidade) => {
    setSelectedId(oportunidade.id);
    setDrawerOpen(true);
  };

  const handleRefreshDrawer = async () => {
    await carregarKanban();
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <div className="page-header">
          <div>
            <Typography.Title level={3}>CRM</Typography.Title>
            <Typography.Text type="secondary">Pipeline comercial</Typography.Text>
          </div>
          <Space>
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
                />
                <Button type="primary" onClick={() => setModalOpen(true)}>
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
        {pipelines.length > 0 && (
          <KanbanBoard
            kanban={kanban}
            loading={loading}
            onMove={handleMove}
            onOpen={handleOpen}
          />
        )}
      </Card>

      <Modal
        title="Nova oportunidade"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Criar"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="titulo"
            label="Titulo"
            rules={[{ required: true, message: "Informe o titulo" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="cliente"
            label="Cliente"
            rules={[{ required: true, message: "Selecione o cliente" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={clientes.map((cliente) => ({
                value: cliente.id,
                label: cliente.nome,
              }))}
            />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="valor_estimado" label="Valor" style={{ width: "50%" }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="probabilidade" label="Probabilidade" style={{ width: "50%" }}>
              <InputNumber min={0} max={100} style={{ width: "100%" }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="prioridade" label="Prioridade" initialValue="media">
            <Select
              options={[
                { value: "baixa", label: "Baixa" },
                { value: "media", label: "Media" },
                { value: "alta", label: "Alta" },
                { value: "urgente", label: "Urgente" },
              ]}
            />
          </Form.Item>
          <Form.Item name="descricao" label="Descricao">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <OportunidadeDrawer
        oportunidade={selectedOportunidade}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={handleRefreshDrawer}
      />
    </Space>
  );
}
