import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Calendar,
  Card,
  List,
  Typography,
  Row,
  Col,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Empty,
  Spin,
  Dropdown,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/pt-br";

import ordemService from "../../services/ordemService";
import agendaService from "../../services/agenda";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");

const statusMap = {
  rascunho: { color: "default", label: "Rascunho" },
  aberta: { color: "blue", label: "Aberta" },
  orcamento_enviado: { color: "cyan", label: "Orçamento Enviado" },
  aprovada: { color: "green", label: "Aprovada" },
  agendada: { color: "geekblue", label: "Agendada" },
  em_execucao: { color: "orange", label: "Em Execução" },
  concluida: { color: "green", label: "Concluída" },
  faturada: { color: "green", label: "Faturada" },
  cancelada: { color: "red", label: "Cancelada" },
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

export default function AgendaPage() {
  const [visao, setVisao] = useState("mensal"); // mensal, semanal, hoje
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const [filtroTecnico, setFiltroTecnico] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [dataInicio, setDataInicio] = useState(dayjs().startOf("month"));
  const [dataFim, setDataFim] = useState(dayjs().endOf("month"));
  const [osEmEdicao, setOsEmEdicao] = useState(null);
  const [modalEditarVisivel, setModalEditarVisivel] = useState(false);
  const [form] = Form.useForm();

  // Carregar agenda
  const carregarAgenda = async () => {
    setLoading(true);
    try {
      let data = [];

      if (visao === "hoje") {
        data = await agendaService.agendaHoje();
      } else {
        const inicio = dataInicio.format("YYYY-MM-DD");
        const fim = dataFim.format("YYYY-MM-DD");
        data = await agendaService.listarPorPeriodo(
          inicio,
          fim,
          filtroTecnico,
          filtroTipo
        );
      }

      setOrdens(data);

      // Extrair técnicos únicos
      const tecSet = new Set();
      if (Array.isArray(data)) {
        if (data[0]?.tecnicos) {
          // Resposta agrupada por data
          data.forEach((item) => {
            if (item.tecnicos) {
              item.tecnicos.forEach((t) => {
                if (t.id) tecSet.add(JSON.stringify({ id: t.id, nome: t.nome_completo }));
              });
            }
          });
        } else {
          // Resposta simples de lista
          data.forEach((os) => {
            if (os.tecnico_responsavel) {
              tecSet.add(
                JSON.stringify({
                  id: os.tecnico_responsavel,
                  nome: os.tecnico_nome,
                })
              );
            }
          });
        }
      }

      setTecnicos(Array.from(tecSet).map((t) => JSON.parse(t)));
    } catch (erro) {
      console.error("Erro ao carregar agenda:", erro);
      message.error("Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAgenda();
  }, [visao, dataInicio, dataFim, filtroTecnico, filtroTipo]);

  // Visualização Mensal
  const renderMensal = () => {
    const porData = useMemo(() => {
      return ordens.reduce((acc, item) => {
        if (item.tecnicos) {
          // Resposta agrupada
          const data = item.data;
          acc[data] = item;
        }
        return acc;
      }, {});
    }, [ordens]);

    return (
      <Calendar
        fullscreen={true}
        cellRender={(value) => {
          const dataStr = value.format("YYYY-MM-DD");
          const item = porData[dataStr];

          if (!item) return null;

          return (
            <div style={{ fontSize: "12px" }}>
              {item.tecnicos?.map((tec) => (
                <div key={tec.id} style={{ marginBottom: "4px" }}>
                  <Badge
                    count={tec.total_os}
                    style={{ backgroundColor: "#52c41a" }}
                  />
                  <span style={{ marginLeft: "4px", fontWeight: "bold" }}>
                    {tec.nome_completo?.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          );
        }}
      />
    );
  };

  // Visualização Semanal
  const renderSemanal = () => {
    const semanaInicio = dataInicio.startOf("week");
    const semanaFim = semanaInicio.add(6, "days");

    const horariosOcupados = {};

    ordens.forEach((item) => {
      if (item.tecnicos) {
        item.tecnicos.forEach((tec) => {
          tec.ordens?.forEach((os) => {
            if (os.hora_inicio) {
              const key = `${tec.id}_${os.hora_inicio}`;
              horariosOcupados[key] = os;
            }
          });
        });
      }
    });

    const horas = Array.from({ length: 8 }, (_, i) => `${8 + i}:00`);

    return (
      <div style={{ overflowX: "auto" }}>
        <Table
          columns={[
            {
              title: "Horário",
              key: "hora",
              width: 100,
              render: (_, __, index) => horas[index],
            },
            ...tecnicos.map((tec) => ({
              title: tec.nome,
              key: `tec_${tec.id}`,
              render: (_, record, rowIndex) => {
                const hora = horas[rowIndex];
                const key = `${tec.id}_${hora}`;
                const os = horariosOcupados[key];

                if (!os) return "-";

                return (
                  <Card
                    size="small"
                    style={{ backgroundColor: "#e6f7ff", cursor: "pointer" }}
                    onClick={() => {
                      setOsEmEdicao(os);
                      form.setFieldsValue({
                        data_agendada: dayjs(os.data_agendada),
                        hora_inicio: os.hora_inicio ? dayjs(os.hora_inicio, "HH:mm") : null,
                      });
                      setModalEditarVisivel(true);
                    }}
                  >
                    <div style={{ fontSize: "11px" }}>
                      <strong>{os.numero}</strong>
                      <br />
                      {os.cliente_nome}
                    </div>
                  </Card>
                );
              },
            })),
          ]}
          dataSource={horas.map((h) => ({ hora: h }))}
          pagination={false}
          size="small"
        />
      </div>
    );
  };

  // Visualização Hoje
  const renderHoje = () => {
    const ordensList = Array.isArray(ordens)
      ? ordens.filter((o) => !o.tecnicos)
      : [];

    if (ordensList.length === 0) {
      return <Empty description="Nenhuma OS agendada para hoje" />;
    }

    return (
      <List
        dataSource={ordensList}
        renderItem={(os) => (
          <List.Item
            key={os.id}
            style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}
          >
            <List.Item.Meta
              avatar={<UserOutlined />}
              title={
                <div>
                  <strong>{os.numero}</strong>
                  <Tag color={statusMap[os.status]?.color} style={{ marginLeft: "8px" }}>
                    {statusMap[os.status]?.label}
                  </Tag>
                </div>
              }
              description={
                <div>
                  <div style={{ marginTop: "8px", fontSize: "14px" }}>
                    <strong>Cliente:</strong> {os.cliente_nome}
                  </div>
                  <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <EnvironmentOutlined />
                    {os.endereco_servico_texto}
                  </div>
                  {os.hora_inicio && (
                    <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <ClockCircleOutlined />
                      {os.hora_inicio}
                      {os.hora_conclusao && ` até ${os.hora_conclusao}`}
                    </div>
                  )}
                  {os.descricao_servico && (
                    <div style={{ marginTop: "4px", color: "#666" }}>
                      {os.descricao_servico}
                    </div>
                  )}
                </div>
              }
            />
            <Button
              type="primary"
              href={`https://www.google.com/maps/search/${os.endereco_servico_texto}`}
              target="_blank"
              size="small"
            >
              Como chegar
            </Button>
          </List.Item>
        )}
      />
    );
  };

  const handleSalvarEdicao = async (valores) => {
    try {
      setLoading(true);
      await agendaService.reagendar(osEmEdicao.id, {
        data_agendada: valores.data_agendada.format("YYYY-MM-DD"),
        hora_inicio: valores.hora_inicio ? valores.hora_inicio.format("HH:mm:ss") : null,
      });
      message.success("OS reagendada com sucesso!");
      setModalEditarVisivel(false);
      carregarAgenda();
    } catch (erro) {
      message.error("Erro ao reagendar OS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Agenda de Técnicos
            </Typography.Title>
          </Col>
          <Col>
            <Space>
              <Button
                type={visao === "mensal" ? "primary" : "default"}
                onClick={() => setVisao("mensal")}
              >
                Mensal
              </Button>
              <Button
                type={visao === "semanal" ? "primary" : "default"}
                onClick={() => setVisao("semanal")}
              >
                Semanal
              </Button>
              <Button
                type={visao === "hoje" ? "primary" : "default"}
                onClick={() => setVisao("hoje")}
              >
                Hoje
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filtrar por técnico"
              value={filtroTecnico}
              onChange={setFiltroTecnico}
              allowClear
              style={{ width: "100%" }}
              options={tecnicos.map((t) => ({
                label: t.nome,
                value: t.id,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filtrar por tipo"
              value={filtroTipo}
              onChange={setFiltroTipo}
              allowClear
              style={{ width: "100%" }}
              options={tiposServico}
            />
          </Col>
          {visao === "mensal" && (
            <>
              <Col xs={12} sm={12} md={6}>
                <DatePicker
                  value={dataInicio}
                  onChange={setDataInicio}
                  format="DD/MM/YYYY"
                  placeholder="Data início"
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={12} sm={12} md={6}>
                <DatePicker
                  value={dataFim}
                  onChange={setDataFim}
                  format="DD/MM/YYYY"
                  placeholder="Data fim"
                  style={{ width: "100%" }}
                />
              </Col>
            </>
          )}
        </Row>

        <div style={{ marginTop: "24px" }}>
          <Spin spinning={loading}>
            {visao === "mensal" && renderMensal()}
            {visao === "semanal" && renderSemanal()}
            {visao === "hoje" && renderHoje()}
          </Spin>
        </div>
      </Card>

      <Modal
        title="Editar Agendamento"
        open={modalEditarVisivel}
        onCancel={() => setModalEditarVisivel(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSalvarEdicao}
        >
          <Form.Item
            label="Nova Data"
            name="data_agendada"
            rules={[{ required: true, message: "Data é obrigatória" }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Horário de Início" name="hora_inicio">
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
