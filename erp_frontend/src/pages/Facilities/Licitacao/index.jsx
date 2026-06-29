import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  Skeleton,
} from "antd";
import {
  TrophyOutlined,
  PlusOutlined,
  TeamOutlined,
  CheckOutlined,
  FileTextOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

const formatMoney = (value) =>
  `R$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const STATUS_CONFIG = {
  rascunho:   { color: "default", label: "Rascunho" },
  publicada:  { color: "blue",    label: "Publicada" },
  em_analise: { color: "orange",  label: "Em Análise" },
  concluida:  { color: "green",   label: "Concluída" },
  cancelada:  { color: "red",     label: "Cancelada" },
};

export default function LicitacaoFacilitiesPage() {
  const [licitacoes, setLicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ativos, setAtivos] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [modalNova, setModalNova] = useState(false);
  const [modalPropostas, setModalPropostas] = useState(null);
  const [criarLoading, setCriarLoading] = useState(false);
  const [aceitarLoading, setAceitarLoading] = useState(null);
  const [tabAtiva, setTabAtiva] = useState("publicada");
  const [modoSelecionado, setModoSelecionado] = useState("aberta");
  const [form] = Form.useForm();

  const fetchLicitacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/facilities/licitacoes/");
      setLicitacoes(res.data.results ?? res.data);
    } catch {
      message.error("Erro ao carregar licitações");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAtivos = useCallback(async () => {
    try {
      const res = await api.get("/facilities/ativos/?limit=200");
      setAtivos(res.data.results ?? res.data);
    } catch {
      // ignorar erro ao carregar ativos
    }
  }, []);

  const fetchPrestadores = useCallback(async () => {
    try {
      // Busca prestadores homologados/contratados do módulo SaaS
      const res = await api.get("/saas/prestadores-contratados/");
      setPrestadores(res.data.results ?? res.data);
    } catch {
      // ignorar erro
    }
  }, []);

  useEffect(() => {
    fetchLicitacoes();
    fetchAtivos();
    fetchPrestadores();
  }, [fetchLicitacoes, fetchAtivos, fetchPrestadores]);

  const handleCriar = async (values) => {
    setCriarLoading(true);
    try {
      await api.post("/facilities/licitacoes/", {
        titulo: values.titulo,
        tipo_servico: values.tipo_servico,
        descricao: values.descricao || "",
        prazo_propostas: values.prazo_propostas?.toISOString(),
        valor_maximo: values.valor_maximo || null,
        ativo: values.ativo || null,
        modo: values.modo || "aberta",
        status: "publicada",
        prestadores_convidados: values.prestadores_convidados || [],
      });
      message.success("Licitação publicada com sucesso!");
      setModalNova(false);
      form.resetFields();
      setModoSelecionado("aberta");
      fetchLicitacoes();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : "Erro de conexão";
      message.error(`Erro ao publicar licitação: ${errorMsg}`);
    } finally {
      setCriarLoading(false);
    }
  };

  const handleAceitarProposta = async (licitacaoId, propostaId) => {
    setAceitarLoading(propostaId);
    try {
      await api.post(`/facilities/licitacoes/${licitacaoId}/aceitar_proposta/`, {
        proposta_id: propostaId,
      });
      message.success("Proposta aceita! Prestador notificado.");
      setModalPropostas(null);
      fetchLicitacoes();
    } catch {
      message.error("Erro ao aceitar proposta");
    } finally {
      setAceitarLoading(null);
    }
  };

  const filtradas = (status) =>
    licitacoes.filter((l) => {
      if (status === "publicada") return l.status === "publicada";
      if (status === "em_analise") return l.status === "em_analise";
      if (status === "concluida") return l.status === "concluida" || l.status === "cancelada";
      return true;
    });

  const renderCards = (lista) => {
    if (loading) {
      return (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      );
    }
    if (!lista.length) {
      return (
        <Card bordered={false} style={{ ...panelStyle, textAlign: "center" }} bodyStyle={{ padding: 48 }}>
          <Empty
            image={<TrophyOutlined style={{ fontSize: 64, color: colors.textoFraco }} />}
            description={<span style={{ color: colors.textoFraco, fontSize: 16 }}>Nenhuma licitação nesta categoria</span>}
          />
        </Card>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {lista.map((l) => {
          const statusConf = STATUS_CONFIG[l.status] || STATUS_CONFIG.publicada;
          const numPropostas = l.propostas_count ?? (l.propostas?.length ?? 0);
          return (
            <Card
              key={l.id}
              bordered={false}
              style={{ ...panelStyle, transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
              bodyStyle={{ padding: "20px 24px" }}
              hoverable
            >
              <Row align="middle" gutter={[16, 12]}>
                <Col xs={24} md={16}>
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Space wrap>
                      <Tag color={statusConf.color} style={{ borderRadius: 999, fontWeight: 600 }}>{statusConf.label}</Tag>
                      <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>{l.tipo_servico}</Tag>
                      {l.modo === "convidada" && <Tag color="purple" style={{ borderRadius: 999, fontWeight: 600 }}>Convidada</Tag>}
                    </Space>
                    <Text strong style={{ fontSize: 16, color: colors.texto }}>{l.titulo}</Text>
                    <Space wrap>
                      <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                        <TeamOutlined style={{ marginRight: 4 }} />
                        {numPropostas} proposta(s) recebida(s)
                      </Text>
                      {l.prazo_propostas && (
                        <Text style={{ fontSize: 13, color: colors.textoSecundario }}>
                          Prazo: {new Date(l.prazo_propostas).toLocaleDateString("pt-BR")}
                        </Text>
                      )}
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} md={8} style={{ textAlign: "right" }}>
                  <Button
                    type="primary"
                    icon={<TeamOutlined />}
                    onClick={() => setModalPropostas(l)}
                    style={{ borderRadius: 10, fontWeight: 600, height: 38 }}
                  >
                    Ver Propostas ({numPropostas})
                  </Button>
                </Col>
              </Row>
            </Card>
          );
        })}
      </div>
    );
  };

  const colunasPropostas = (licitacao) => [
    { title: "Prestador", dataIndex: "prestador_nome", key: "prestador_nome", ellipsis: true },
    { title: "Email", dataIndex: "prestador_email", key: "prestador_email", ellipsis: true },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      render: formatMoney,
    },
    {
      title: "Itens",
      key: "itens",
      width: 90,
      render: (_, row) => `${row.itens_orcamento?.length || 0} item(s)`,
    },
    {
      title: "Prazo (dias)",
      dataIndex: "prazo_execucao_dias",
      key: "prazo_execucao_dias",
    },
    {
      title: "Observações",
      dataIndex: "observacoes",
      key: "observacoes",
      ellipsis: true,
    },
    {
      title: "Anexo",
      key: "arquivo_proposta",
      width: 92,
      render: (_, row) =>
        row.arquivo_proposta ? (
          <Button
            type="link"
            size="small"
            icon={<PaperClipOutlined />}
            href={row.arquivo_proposta}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            Abrir
          </Button>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={s === "aceita" ? "green" : s === "recusada" ? "red" : "blue"} style={{ borderRadius: 999, fontWeight: 600 }}>
          {s === "aceita" ? "Aceita" : s === "recusada" ? "Recusada" : "Enviada"}
        </Tag>
      ),
    },
    {
      title: "Ação",
      key: "acao",
      render: (_, row) =>
        row.status === "enviada" && licitacao.status !== "concluida" ? (
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            loading={aceitarLoading === row.id}
            style={{ background: colors.verde, borderColor: colors.verde, borderRadius: 8, fontWeight: 600 }}
            onClick={() => handleAceitarProposta(licitacao.id, row.id)}
          >
            Aceitar
          </Button>
        ) : null,
    },
  ];

  const renderDetalhesProposta = (proposta) => {
    const itensProposta = proposta.itens_orcamento || [];

    return (
      <div style={{ padding: "8px 8px 12px", background: colors.fundoSuave, borderRadius: 8 }}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>
              <FileTextOutlined style={{ marginRight: 4 }} />
              {itensProposta.length} item(s) cotado(s)
            </Tag>
            {proposta.condicao_pagamento && <Tag style={{ borderRadius: 999 }}>Pagamento: {proposta.condicao_pagamento}</Tag>}
            {proposta.validade_proposta && <Tag style={{ borderRadius: 999 }}>Validade: {new Date(proposta.validade_proposta).toLocaleDateString("pt-BR")}</Tag>}
          </Space>

          <div style={{ border: `1px solid ${colors.borda}`, borderRadius: 12, overflow: "hidden" }}>
            <Table
              size="small"
              rowKey={(row, idx) => `${row.ordem ?? idx}-${row.descricao}`}
              dataSource={itensProposta}
              pagination={false}
              locale={{ emptyText: "Nenhum item informado nesta proposta" }}
              columns={[
                { title: "Item cotado", dataIndex: "descricao", ellipsis: true },
                { title: "Qtd", dataIndex: "quantidade", width: 80 },
                { title: "Un.", dataIndex: "unidade", width: 80 },
                { title: "Valor unit.", dataIndex: "valor_unitario", width: 130, render: formatMoney },
                {
                  title: "Total",
                  dataIndex: "valor_total",
                  width: 130,
                  render: (value, row) => formatMoney(value ?? Number(row.quantidade || 0) * Number(row.valor_unitario || 0)),
                },
              ]}
            />
          </div>

          {proposta.observacoes && (
            <div style={{ padding: 12, border: `1px solid ${colors.borda}`, borderRadius: 10, background: "#FFFFFF" }}>
              <Text strong style={{ color: colors.texto }}>Observações do prestador</Text>
              <Text style={{ display: "block", marginTop: 4, color: colors.textoSecundario }}>{proposta.observacoes}</Text>
            </div>
          )}

          {proposta.arquivo_proposta && (
            <Button
              icon={<PaperClipOutlined />}
              href={proposta.arquivo_proposta}
              target="_blank"
              rel="noreferrer"
              style={{ borderRadius: 8 }}
            >
              Abrir anexo da proposta
            </Button>
          )}
        </Space>
      </div>
    );
  };

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
                background: `${colors.verde}14`,
                color: colors.verde,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <TrophyOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>Licitações</Title>
              <Text style={{ color: colors.textoSecundario }}>Gerencie licitações e propostas de prestadores</Text>
            </div>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setModalNova(true);
              setModoSelecionado("aberta");
              form.resetFields();
            }}
            style={{ height: 40, paddingInline: 20, fontWeight: 600, borderRadius: 10 }}
          >
            Nova Licitação
          </Button>
        </div>
      </Card>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 16 }}>
        <Tabs
          activeKey={tabAtiva}
          onChange={setTabAtiva}
          items={[
            { key: "publicada", label: `Abertas (${filtradas("publicada").length})` },
            { key: "em_analise", label: `Em Análise (${filtradas("em_analise").length})` },
            { key: "concluida", label: `Concluídas (${filtradas("concluida").length})` },
          ]}
        />
      </Card>

      {renderCards(filtradas(tabAtiva))}

      {/* Modal Nova Licitação */}
      <Modal
        open={modalNova}
        onCancel={() => { setModalNova(false); form.resetFields(); }}
        title={
          <Space>
            <TrophyOutlined style={{ color: colors.verde }} />
            <span>Nova Licitação</span>
          </Space>
        }
        footer={null}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={handleCriar} style={{ marginTop: 16 }}>
          <Form.Item
            name="titulo"
            label="Título"
            rules={[{ required: true, message: "Informe o título" }]}
          >
            <Input placeholder="Ex: Manutenção preventiva dos splits sala 301" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tipo_servico"
                label="Tipo de serviço"
                rules={[{ required: true, message: "Selecione o tipo" }]}
              >
                <Select placeholder="Selecione">
                  <Option value="hvac">HVAC</Option>
                  <Option value="eletrica">Elétrica</Option>
                  <Option value="hidraulica">Hidráulica</Option>
                  <Option value="civil">Civil</Option>
                  <Option value="outro">Outro</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="modo" label="Modo" initialValue="aberta">
                <Select onChange={(v) => setModoSelecionado(v)}>
                  <Option value="aberta">Aberta (qualquer prestador)</Option>
                  <Option value="convidada">Convidada</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {modoSelecionado === "convidada" && (
            <Form.Item
              name="prestadores_convidados"
              label="Prestadores convidados"
              rules={[{ required: true, message: "Selecione ao menos um prestador" }]}
              extra="Somente prestadores homologados podem ser convidados"
            >
              <Select
                mode="multiple"
                placeholder="Selecione os prestadores"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {prestadores.map((p) => (
                  <Option key={p.tenant_prestador} value={p.tenant_prestador}>
                    {p.tenant_prestador_nome}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="descricao" label="Descrição">
            <TextArea rows={3} placeholder="Descreva o serviço necessário..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="prazo_propostas" label="Prazo para propostas">
                <DatePicker style={{ width: "100%" }} showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="valor_maximo" label="Valor máximo estimado (R$)">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="Opcional"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ativo" label="Ativo vinculado (opcional)">
            <Select placeholder="Selecione um ativo" allowClear showSearch optionFilterProp="children">
              {ativos.map((a) => (
                <Option key={a.id} value={a.id}>
                  [{a.tag}] {a.nome}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={criarLoading}
              block
              style={{ background: colors.verde, borderColor: colors.verde, borderRadius: 10, height: 42, fontWeight: 600 }}
            >
              Publicar Licitação
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Ver Propostas */}
      <Modal
        open={!!modalPropostas}
        onCancel={() => setModalPropostas(null)}
        title={
          <Space>
            <TeamOutlined style={{ color: colors.azul }} />
            <span>Propostas — {modalPropostas?.titulo}</span>
          </Space>
        }
        footer={null}
        width={900}
      >
        {modalPropostas && (
          <div style={{ border: `1px solid ${colors.borda}`, borderRadius: 12, overflow: "hidden" }}>
            <Table
              dataSource={modalPropostas.propostas ?? []}
              columns={colunasPropostas(modalPropostas)}
              rowKey="id"
              pagination={false}
              expandable={{
                expandedRowRender: renderDetalhesProposta,
                rowExpandable: (row) => Boolean(row.itens_orcamento?.length || row.observacoes || row.arquivo_proposta),
              }}
              scroll={{ x: 900 }}
              locale={{ emptyText: "Nenhuma proposta recebida ainda" }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
