import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  TimePicker,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FilterOutlined,
  ReloadOutlined,
  RocketOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useNavigate } from "react-router-dom";

import agendaService from "../../services/agenda";
import api from "../../services/api";

dayjs.locale("pt-br");

const { Text, Title } = Typography;

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

const sectionCardStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const metricCardStyle = {
  ...sectionCardStyle,
  minHeight: 110,
};

const statusMap = {
  rascunho: { color: colors.textoSecundario, background: "#F3F4F6", label: "Rascunho" },
  aberta: { color: colors.azul, background: "#DBEAFE", label: "Aberta" },
  orcamento_enviado: { color: "#0E7490", background: "#CFFAFE", label: "Orçamento enviado" },
  aprovada: { color: colors.verde, background: "#DCFCE7", label: "Aprovada" },
  agendada: { color: colors.roxo, background: "#EDE9FE", label: "Agendada" },
  em_execucao: { color: colors.laranja, background: "#FEF3C7", label: "Em execução" },
  concluida: { color: colors.verde, background: "#DCFCE7", label: "Concluída" },
  faturada: { color: colors.verde, background: "#DCFCE7", label: "Faturada" },
  cancelada: { color: colors.vermelho, background: "#FEE2E2", label: "Cancelada" },
};

const tiposServico = [
  { label: "HVAC", value: "hvac" },
  { label: "Refrigeração", value: "refrigeracao" },
  { label: "Elétrica", value: "eletrica" },
  { label: "Civil", value: "civil" },
  { label: "Manutenção", value: "manutencao" },
  { label: "Instalação", value: "instalacao" },
  { label: "Outro", value: "outro" },
];

const visoes = [
  { label: "Despacho", value: "despacho" },
  { label: "Hoje", value: "hoje" },
  { label: "Semanal", value: "semanal" },
  { label: "Mensal", value: "mensal" },
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function tecnicoNome(tecnico) {
  return tecnico?.nome || tecnico?.nome_completo || tecnico?.username || tecnico?.email || "Sem técnico";
}

function osCliente(os) {
  return os?.cliente_nome || os?.cliente_dados?.nome || os?.cliente?.nome || "Cliente não informado";
}

function osEndereco(os) {
  return os?.endereco_servico_texto || os?.endereco_servico || os?.cliente_dados?.endereco_completo || "Endereço não definido";
}

function horaCurta(value) {
  if (!value) return "--:--";
  return String(value).slice(0, 5);
}

function getStatus(os) {
  return statusMap[os?.status] || { color: colors.textoSecundario, background: "#F3F4F6", label: os?.status || "Sem status" };
}

function StatusBadge({ status }) {
  const meta = getStatus({ status });
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: meta.color,
        background: meta.background,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const [visao, setVisao] = useState("despacho");
  const [agenda, setAgenda] = useState([]);
  const [ordensHoje, setOrdensHoje] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroTecnico, setFiltroTecnico] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [periodo, setPeriodo] = useState([dayjs().startOf("week"), dayjs().endOf("week")]);
  const [osEmEdicao, setOsEmEdicao] = useState(null);
  const [modalEditarVisivel, setModalEditarVisivel] = useState(false);
  const [form] = Form.useForm();

  const carregarTecnicos = async () => {
    try {
      const response = await api.get("/auth/users/");
      const usuarios = normalizeList(response.data)
        .filter((usuario) => String(usuario.role || "").toLowerCase() === "tecnico")
        .map((usuario) => ({
          id: usuario.id,
          nome: usuario.nome_completo || usuario.username || usuario.email,
          nome_completo: usuario.nome_completo || usuario.username || usuario.email,
          username: usuario.username,
          email: usuario.email,
        }));
      setTecnicos(usuarios);
    } catch {
      setTecnicos([]);
    }
  };

  const carregarAgenda = async () => {
    setLoading(true);
    try {
      const inicio = (periodo?.[0] || dayjs().startOf("week")).format("YYYY-MM-DD");
      const fim = (periodo?.[1] || dayjs().endOf("week")).format("YYYY-MM-DD");
      const [agendaPeriodo, hoje] = await Promise.all([
        agendaService.listarPorPeriodo(inicio, fim, filtroTecnico, filtroTipo),
        agendaService.agendaHoje(),
      ]);
      setAgenda(normalizeList(agendaPeriodo));
      setOrdensHoje(normalizeList(hoje));

      if (!tecnicos.length) {
        const extraidos = [];
        normalizeList(agendaPeriodo).forEach((dia) => {
          (dia.tecnicos || []).forEach((tecnico) => {
            if (tecnico.id && !extraidos.some((item) => item.id === tecnico.id)) {
              extraidos.push({ ...tecnico, nome: tecnicoNome(tecnico) });
            }
          });
        });
        if (extraidos.length) setTecnicos(extraidos);
      }
    } catch (erro) {
      console.error("Erro ao carregar agenda:", erro);
      message.error("Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTecnicos();
  }, []);

  useEffect(() => {
    carregarAgenda();
  }, [periodo, filtroTecnico, filtroTipo]);

  const ordensPeriodo = useMemo(() => {
    const lista = [];
    agenda.forEach((dia) => {
      (dia.tecnicos || []).forEach((tecnico) => {
        (tecnico.ordens || []).forEach((os) => {
          lista.push({
            ...os,
            data_agendada: os.data_agendada || dia.data,
            tecnico_agenda_id: tecnico.id,
            tecnico_agenda_nome: tecnicoNome(tecnico),
          });
        });
      });
    });
    return lista;
  }, [agenda]);

  const ordensDaVisao = visao === "hoje" || visao === "despacho" ? ordensHoje : ordensPeriodo;
  const totalHoje = ordensHoje.length;
  const emExecucao = ordensDaVisao.filter((os) => os.status === "em_execucao").length;
  const concluidas = ordensDaVisao.filter((os) => ["concluida", "faturada"].includes(os.status)).length;
  const semTecnico = ordensDaVisao.filter((os) => !os.tecnico_responsavel && !os.tecnico_agenda_id).length;
  const produtividade = ordensDaVisao.length ? Math.round((concluidas / ordensDaVisao.length) * 100) : 0;

  const abrirEdicao = (os) => {
    setOsEmEdicao(os);
    form.setFieldsValue({
      data_agendada: os.data_agendada ? dayjs(os.data_agendada) : dayjs(),
      hora_inicio: os.hora_inicio ? dayjs(os.hora_inicio, "HH:mm:ss") : null,
      tecnico_responsavel: os.tecnico_responsavel || os.tecnico_agenda_id || null,
      observacao: "",
    });
    setModalEditarVisivel(true);
  };

  const handleSalvarEdicao = async (valores) => {
    try {
      setLoading(true);
      await agendaService.reagendar(osEmEdicao.id, {
        data_agendada: valores.data_agendada.format("YYYY-MM-DD"),
        hora_inicio: valores.hora_inicio ? valores.hora_inicio.format("HH:mm:ss") : null,
        tecnico_responsavel: valores.tecnico_responsavel || null,
      });
      message.success("OS reagendada com sucesso.");
      setModalEditarVisivel(false);
      carregarAgenda();
    } catch {
      message.error("Erro ao reagendar OS");
    } finally {
      setLoading(false);
    }
  };

  const OsCard = ({ os, compact = false }) => {
    return (
      <Card
        size="small"
        hoverable
        bordered={false}
        style={{
          border: `1px solid ${colors.borda}`,
          borderLeft: `4px solid ${os.status === "em_execucao" ? colors.laranja : colors.azul}`,
          borderRadius: 12,
          marginBottom: 10,
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
        }}
        bodyStyle={{ padding: compact ? 12 : 16 }}
        onClick={() => abrirEdicao(os)}
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Space style={{ justifyContent: "space-between", width: "100%" }} align="start">
            <Space direction="vertical" size={0}>
              <Text strong style={{ color: colors.texto }}>{os.numero}</Text>
              <Text style={{ color: colors.textoFraco, fontSize: 12 }}>{osCliente(os)}</Text>
            </Space>
            <StatusBadge status={os.status} />
          </Space>
          <Space wrap size={8}>
            <Tag
              icon={<ClockCircleOutlined />}
              style={{ color: colors.azul, background: "#EFF6FF", border: "none", borderRadius: 999, fontWeight: 600 }}
            >
              {horaCurta(os.hora_inicio)} {os.hora_conclusao ? `- ${horaCurta(os.hora_conclusao)}` : ""}
            </Tag>
            <Tag style={{ color: colors.textoSecundario, background: colors.fundoSuave, border: `1px solid ${colors.borda}`, borderRadius: 999 }}>
              {os.tipo_servico || "Serviço"}
            </Tag>
          </Space>
          {!compact && (
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text style={{ color: colors.textoSecundario, fontSize: 12 }} ellipsis>
                <EnvironmentOutlined /> {osEndereco(os)}
              </Text>
              {os.descricao_servico && (
                <Text style={{ color: colors.textoFraco, fontSize: 12 }} ellipsis>{os.descricao_servico}</Text>
              )}
            </Space>
          )}
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/ordens/${os.id}`);
              }}
              style={{ borderRadius: 8, color: colors.azul }}
            >
              OS
            </Button>
            <Button
              size="small"
              icon={<CompassOutlined />}
              href={`https://www.google.com/maps/search/${encodeURIComponent(osEndereco(os))}`}
              target="_blank"
              onClick={(event) => event.stopPropagation()}
              style={{ borderRadius: 8 }}
            >
              Rota
            </Button>
          </Space>
        </Space>
      </Card>
    );
  };

  const renderDespacho = () => {
    const tecnicosOperacao = tecnicos.length ? tecnicos : [{ id: "sem_tecnico", nome: "Sem técnico" }];
    return (
      <Row gutter={[16, 16]}>
        {tecnicosOperacao.map((tecnico) => {
          const ordensTecnico = ordensHoje.filter((os) => String(os.tecnico_responsavel || os.tecnico_agenda_id || "sem_tecnico") === String(tecnico.id));
          const concluidasTec = ordensTecnico.filter((os) => ["concluida", "faturada"].includes(os.status)).length;
          const progresso = ordensTecnico.length ? Math.round((concluidasTec / ordensTecnico.length) * 100) : 0;
          return (
            <Col xs={24} md={12} xl={8} xxl={6} key={tecnico.id}>
              <Card
                bordered={false}
                style={{ ...sectionCardStyle, minHeight: 430 }}
                title={
                  <Space>
                    <Avatar style={{ background: colors.azul }} icon={<UserOutlined />} />
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ color: colors.texto }}>{tecnicoNome(tecnico)}</Text>
                      <Text style={{ color: colors.textoFraco, fontSize: 12 }}>{ordensTecnico.length} atendimento(s) hoje</Text>
                    </Space>
                  </Space>
                }
                extra={<Progress type="circle" percent={progresso} size={42} strokeColor={colors.verde} />}
              >
                {ordensTecnico.length ? (
                  ordensTecnico.map((os) => <OsCard key={os.id} os={os} compact />)
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem OS hoje" />
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  const renderHoje = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={16}>
        <Card bordered={false} style={sectionCardStyle} title="Linha do tempo de hoje">
          {ordensHoje.length ? (
            ordensHoje
              .slice()
              .sort((a, b) => String(a.hora_inicio || "99:99").localeCompare(String(b.hora_inicio || "99:99")))
              .map((os) => <OsCard key={os.id} os={os} />)
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma OS agendada para hoje" style={{ padding: "34px 0 26px" }} />
          )}
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card bordered={false} style={sectionCardStyle} title="Operação do dia">
          <List
            dataSource={[
              { icon: <CalendarOutlined />, label: "Serviços planejados", value: totalHoje, color: colors.azul },
              { icon: <FieldTimeOutlined />, label: "Em execução", value: emExecucao, color: colors.laranja },
              { icon: <CheckCircleOutlined />, label: "Concluídos", value: concluidas, color: colors.verde },
              { icon: <WarningOutlined />, label: "Sem técnico", value: semTecnico, color: colors.vermelho },
            ]}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  <span style={{ color: item.color, fontSize: 16 }}>{item.icon}</span>
                  <Text style={{ color: colors.textoSecundario }}>{item.label}</Text>
                </Space>
                <Text strong style={{ color: colors.texto, fontSize: 16 }}>{item.value}</Text>
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderSemanal = () => {
    const dias = Array.from({ length: 7 }, (_, index) => (periodo?.[0] || dayjs().startOf("week")).startOf("week").add(index, "day"));
    return (
      <Card bordered={false} style={sectionCardStyle} title="Planejamento semanal por dia">
        <div style={{ overflowX: "auto" }}>
          <Row gutter={12} style={{ minWidth: 980 }}>
            {dias.map((dia) => {
              const ordensDia = ordensPeriodo.filter((os) => os.data_agendada === dia.format("YYYY-MM-DD"));
              return (
                <Col flex="1" key={dia.format("YYYY-MM-DD")}>
                  <Card
                    size="small"
                    bordered={false}
                    style={{ ...sectionCardStyle, minHeight: 420 }}
                    title={
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ color: colors.texto }}>{dia.format("ddd")}</Text>
                        <Text style={{ color: colors.textoFraco, fontSize: 12 }}>{dia.format("DD/MM")}</Text>
                      </Space>
                    }
                  >
                    {ordensDia.length ? ordensDia.map((os) => <OsCard key={os.id} os={os} compact />) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Livre" />}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      </Card>
    );
  };

  const renderMensal = () => {
    const porData = agenda.reduce((acc, dia) => {
      acc[dia.data] = dia;
      return acc;
    }, {});
    return (
      <Card bordered={false} style={sectionCardStyle} title="Mapa mensal da operação">
        <Calendar
          fullscreen
          cellRender={(value) => {
            const dataStr = value.format("YYYY-MM-DD");
            const item = porData[dataStr];
            if (!item) return null;
            const total = (item.tecnicos || []).reduce((sum, tecnico) => sum + Number(tecnico.total_os || 0), 0);
            return (
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                <Badge count={total} style={{ backgroundColor: colors.azul }} />
                {(item.tecnicos || []).slice(0, 3).map((tec) => (
                  <Tooltip title={tecnicoNome(tec)} key={tec.id}>
                    <Tag
                      style={{
                        maxWidth: "100%",
                        color: colors.textoSecundario,
                        background: colors.fundoSuave,
                        border: `1px solid ${colors.borda}`,
                        borderRadius: 6,
                      }}
                    >
                      {tecnicoNome(tec).split(" ")[0]}: {tec.total_os}
                    </Tag>
                  </Tooltip>
                ))}
              </Space>
            );
          }}
        />
      </Card>
    );
  };

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={sectionCardStyle}>
        <Row gutter={[20, 20]} align="middle" justify="space-between">
          <Col xs={24} lg={12}>
            <Space direction="vertical" size={4}>
              <Text style={{ color: colors.textoFraco, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>
                Agenda e despacho de campo
              </Text>
              <Title level={2} style={{ margin: 0, color: colors.texto }}>Planeje e acompanhe sua equipe em tempo real</Title>
              <Text style={{ color: colors.textoSecundario }}>
                Visão inspirada em operação de campo: técnicos, rotas, OS do dia, produtividade e reagendamento rápido.
              </Text>
            </Space>
          </Col>
          <Col xs={24} lg={12}>
            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 16 }}>
                  <Statistic title="Hoje" value={totalHoje} prefix={<CalendarOutlined />} valueStyle={{ color: colors.texto, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 16 }}>
                  <Statistic title="Execução" value={emExecucao} prefix={<RocketOutlined />} valueStyle={{ color: colors.laranja, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 16 }}>
                  <Statistic title="Equipe" value={tecnicos.length} prefix={<TeamOutlined />} valueStyle={{ color: colors.azul, fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 16 }}>
                  <Statistic title="Produtividade" value={produtividade} suffix="%" valueStyle={{ color: colors.verde, fontWeight: 700 }} />
                </Card>
              </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        <Card bordered={false} style={sectionCardStyle}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} lg={8}>
              <Segmented block size="large" value={visao} onChange={setVisao} options={visoes} />
            </Col>
            <Col xs={24} md={8} lg={5}>
              <Select
                allowClear
                placeholder="Técnico"
                value={filtroTecnico}
                onChange={setFiltroTecnico}
                style={{ width: "100%" }}
                suffixIcon={<FilterOutlined />}
                options={tecnicos.map((tecnico) => ({ value: tecnico.id, label: tecnicoNome(tecnico) }))}
              />
            </Col>
            <Col xs={24} md={8} lg={5}>
              <Select
                allowClear
                placeholder="Tipo de serviço"
                value={filtroTipo}
                onChange={setFiltroTipo}
                style={{ width: "100%" }}
                options={tiposServico}
              />
            </Col>
            <Col xs={24} md={8} lg={4}>
              <DatePicker.RangePicker
                value={periodo}
                onChange={(value) => setPeriodo(value || [dayjs().startOf("week"), dayjs().endOf("week")])}
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} lg={2}>
              <Button block icon={<ReloadOutlined />} onClick={carregarAgenda}>Atualizar</Button>
            </Col>
          </Row>
        </Card>

        <Spin spinning={loading}>
          {visao === "despacho" && renderDespacho()}
          {visao === "hoje" && renderHoje()}
          {visao === "semanal" && renderSemanal()}
          {visao === "mensal" && renderMensal()}
        </Spin>

        <Card
          bordered={false}
          style={sectionCardStyle}
          title="Tabela operacional"
          extra={<Text style={{ color: colors.textoSecundario }}>{ordensDaVisao.length} OS na visão atual</Text>}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            rowKey="id"
            dataSource={ordensDaVisao}
            scroll={{ x: 900 }}
            columns={[
              {
                title: "OS",
                dataIndex: "numero",
                width: 110,
                render: (value, os) => (
                  <Button type="link" onClick={() => navigate(`/ordens/${os.id}`)} style={{ color: colors.azul, fontWeight: 700, padding: 0 }}>
                    {value}
                  </Button>
                ),
              },
              { title: "Cliente", render: (_, os) => <Text style={{ color: colors.texto }}>{osCliente(os)}</Text> },
              { title: "Técnico", render: (_, os) => os.tecnico_nome || os.tecnico_agenda_nome || "Sem técnico" },
              { title: "Data", dataIndex: "data_agendada", width: 120, render: (value) => value ? dayjs(value).format("DD/MM/YYYY") : "-" },
              { title: "Hora", dataIndex: "hora_inicio", width: 90, render: horaCurta },
              { title: "Status", width: 150, render: (_, os) => <StatusBadge status={os.status} /> },
              {
                title: "Ações",
                width: 130,
                render: (_, os) => (
                  <Button size="small" onClick={() => abrirEdicao(os)} style={{ borderRadius: 8 }}>
                    Reagendar
                  </Button>
                ),
              },
            ]}
          />
        </Card>

      <Modal
        title="Reagendar atendimento"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        open={modalEditarVisivel}
        onCancel={() => setModalEditarVisivel(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        okText="Salvar agenda"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={handleSalvarEdicao}>
          <Form.Item label="Data" name="data_agendada" rules={[{ required: true, message: "Data é obrigatória" }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Horário de início" name="hora_inicio">
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Técnico responsável" name="tecnico_responsavel">
            <Select
              allowClear
              placeholder="Selecionar técnico"
              options={tecnicos.map((tecnico) => ({ value: tecnico.id, label: tecnicoNome(tecnico) }))}
            />
          </Form.Item>
          <Form.Item label="Observação interna" name="observacao">
            <Input.TextArea rows={3} placeholder="Ex: cliente solicitou atendimento no período da manhã" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
