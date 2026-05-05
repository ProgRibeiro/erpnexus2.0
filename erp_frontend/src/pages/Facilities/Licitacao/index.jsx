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
  Spin,
} from "antd";
import {
  TrophyOutlined,
  PlusOutlined,
  TeamOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
  const [modalNova, setModalNova] = useState(false);
  const [modalPropostas, setModalPropostas] = useState(null);
  const [criarLoading, setCriarLoading] = useState(false);
  const [aceitarLoading, setAceitarLoading] = useState(null);
  const [tabAtiva, setTabAtiva] = useState("publicada");
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

  useEffect(() => {
    fetchLicitacoes();
    fetchAtivos();
  }, [fetchLicitacoes, fetchAtivos]);

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
      });
      message.success("Licitação publicada com sucesso!");
      setModalNova(false);
      form.resetFields();
      fetchLicitacoes();
    } catch {
      message.error("Erro ao publicar licitação");
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
    if (loading) return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
    if (!lista.length) {
      return (
        <Empty
          image={<TrophyOutlined style={{ fontSize: 64, color: "#CBD5E1" }} />}
          description={<span style={{ color: "#94A3B8", fontSize: 16 }}>Nenhuma licitação nesta categoria</span>}
        />
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
              style={{ borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "none" }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <Row align="middle" gutter={[16, 12]}>
                <Col xs={24} md={16}>
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Space wrap>
                      <Tag color={statusConf.color} style={{ borderRadius: 6 }}>{statusConf.label}</Tag>
                      <Tag color="blue" style={{ borderRadius: 6 }}>{l.tipo_servico}</Tag>
                    </Space>
                    <Text strong style={{ fontSize: 16 }}>{l.titulo}</Text>
                    <Space wrap>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <TeamOutlined style={{ marginRight: 4 }} />
                        {numPropostas} proposta(s) recebida(s)
                      </Text>
                      {l.prazo_propostas && (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Prazo: {new Date(l.prazo_propostas).toLocaleDateString("pt-BR")}
                        </Text>
                      )}
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} md={8} style={{ textAlign: "right" }}>
                  <Button
                    style={{ borderRadius: 8, background: "#3B82F6", color: "#fff", border: "none" }}
                    icon={<TeamOutlined />}
                    onClick={() => setModalPropostas(l)}
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
      render: (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
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
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={s === "aceita" ? "green" : s === "recusada" ? "red" : "blue"}>
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
            style={{ background: "#10B981", borderColor: "#10B981", borderRadius: 6 }}
            onClick={() => handleAceitarProposta(licitacao.id, row.id)}
          >
            Aceitar
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TrophyOutlined style={{ fontSize: 28, color: "#10B981" }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>Licitações</Title>
            <Text type="secondary">Gerencie licitações e propostas de prestadores</Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: "#10B981", borderColor: "#10B981", borderRadius: 8 }}
          onClick={() => { setModalNova(true); form.resetFields(); }}
        >
          Nova Licitação
        </Button>
      </div>

      <Tabs
        activeKey={tabAtiva}
        onChange={setTabAtiva}
        items={[
          { key: "publicada", label: `Abertas (${filtradas("publicada").length})` },
          { key: "em_analise", label: `Em Análise (${filtradas("em_analise").length})` },
          { key: "concluida", label: `Concluídas (${filtradas("concluida").length})` },
        ]}
      />

      <div style={{ marginTop: 16 }}>
        {renderCards(filtradas(tabAtiva))}
      </div>

      {/* Modal Nova Licitação */}
      <Modal
        open={modalNova}
        onCancel={() => { setModalNova(false); form.resetFields(); }}
        title={
          <Space>
            <TrophyOutlined style={{ color: "#10B981" }} />
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
                <Select>
                  <Option value="aberta">Aberta (qualquer prestador)</Option>
                  <Option value="convidada">Convidada</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

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
              style={{ background: "#10B981", borderColor: "#10B981", borderRadius: 8, height: 42 }}
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
            <TeamOutlined style={{ color: "#3B82F6" }} />
            <span>Propostas — {modalPropostas?.titulo}</span>
          </Space>
        }
        footer={null}
        width={900}
      >
        {modalPropostas && (
          <Table
            dataSource={modalPropostas.propostas ?? []}
            columns={colunasPropostas(modalPropostas)}
            rowKey="id"
            pagination={false}
            scroll={{ x: 700 }}
            locale={{ emptyText: "Nenhuma proposta recebida ainda" }}
          />
        )}
      </Modal>
    </div>
  );
}
