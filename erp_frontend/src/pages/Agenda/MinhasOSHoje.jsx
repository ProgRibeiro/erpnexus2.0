import { useEffect, useState } from "react";
import {
  Card,
  List,
  Tag,
  Typography,
  Empty,
  Spin,
  Row,
  Col,
  Button,
  Space,
  Badge,
  Divider,
} from "antd";
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/pt-br";

import agendaService from "../../services/agenda";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");

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
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const statusMap = {
  agendada: { color: colors.azul, background: "#DBEAFE", label: "Agendada", icon: <ExclamationCircleOutlined /> },
  em_execucao: { color: colors.laranja, background: "#FEF3C7", label: "Em Execução", icon: <CheckCircleOutlined /> },
  concluida: { color: colors.verde, background: "#DCFCE7", label: "Concluída", icon: <CheckCircleOutlined /> },
};

export default function MinhasOSHojePage() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalOrdens, setTotalOrdens] = useState(0);
  const [concluidasCount, setConcluidasCount] = useState(0);

  useEffect(() => {
    carregarOSHoje();
    // Atualizar a cada 30 segundos
    const intervalo = setInterval(carregarOSHoje, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const carregarOSHoje = async () => {
    setLoading(true);
    try {
      const data = await agendaService.agendaHoje();
      const ordensArray = Array.isArray(data) ? data : [];

      // Ordenar por hora de início
      ordensArray.sort((a, b) => {
        if (!a.hora_inicio) return 1;
        if (!b.hora_inicio) return -1;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });

      setOrdens(ordensArray);
      setTotalOrdens(ordensArray.length);
      setConcluidasCount(ordensArray.filter((o) => o.status === "concluida").length);
    } catch (erro) {
      console.error("Erro ao carregar OS de hoje:", erro);
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirGoogleMaps = (endereco) => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(endereco)}`;
    window.open(url, "_blank");
  };

  const abrirWhatsApp = (cliente) => {
    // Exemplo: abrir conversa com cliente (implementar com número real)
    const numero = cliente.telefone?.replace(/\D/g, "") || "";
    if (numero) {
      window.open(`https://wa.me/55${numero}`, "_blank");
    }
  };

  const abrirEmail = (cliente) => {
    if (cliente.email) {
      window.location.href = `mailto:${cliente.email}`;
    }
  };

  if (loading && ordens.length === 0) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.fundoSuave,
          padding: 24,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (ordens.length === 0) {
    return (
      <div style={{ padding: 16, background: colors.fundoSuave, minHeight: "100vh" }}>
        <Card bordered={false} style={sectionCardStyle}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nenhuma OS agendada para hoje"
            style={{ margin: "44px 0" }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: colors.fundoSuave, minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header com resumo */}
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${colors.azul}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.azul,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              <CalendarOutlined />
            </div>
            <div>
              <Typography.Title level={4} style={{ margin: 0, color: colors.texto }}>
                Minhas OS de hoje
              </Typography.Title>
              <Typography.Text style={{ color: colors.textoSecundario, fontSize: 12 }}>
                {dayjs().format("dddd, DD [de] MMMM")}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={12}>
            <div style={{ textAlign: "center", padding: "12px 0", borderRadius: 12, background: colors.fundoSuave }}>
              <Typography.Title level={2} style={{ margin: "0 0 4px 0", color: colors.texto }}>
                {totalOrdens}
              </Typography.Title>
              <Typography.Text style={{ color: colors.textoSecundario, fontSize: 12, fontWeight: 600 }}>
                OS Hoje
              </Typography.Text>
            </div>
          </Col>
          <Col xs={12}>
            <div style={{ textAlign: "center", padding: "12px 0", borderRadius: 12, background: "#F0FDF4" }}>
              <Typography.Title level={2} style={{ margin: "0 0 4px 0", color: colors.verde }}>
                {concluidasCount}
              </Typography.Title>
              <Typography.Text style={{ color: colors.textoSecundario, fontSize: 12, fontWeight: 600 }}>
                Concluídas
              </Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Lista de OS */}
      <List
        dataSource={ordens}
        renderItem={(os, index) => {
          const statusVisual = statusMap[os.status] || { color: colors.azul, background: "#DBEAFE", label: os.status };
          return (
            <Card
              key={os.id}
              bordered={false}
              style={{
                ...sectionCardStyle,
                marginBottom: 12,
                borderLeft: `4px solid ${statusVisual.color}`,
              }}
              bodyStyle={{ padding: 18 }}
            >
              {/* Número e Status */}
              <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                <Col>
                  <Space align="center" size={10}>
                    <Badge count={index + 1} style={{ backgroundColor: colors.azul }} />
                    <Typography.Title level={4} style={{ margin: 0, color: colors.texto }}>
                      {os.numero}
                    </Typography.Title>
                  </Space>
                </Col>
                <Col>
                  <Tag
                    style={{
                      color: statusVisual.color,
                      background: statusVisual.background,
                      border: "none",
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: "3px 10px",
                    }}
                  >
                    {statusVisual.label}
                  </Tag>
                </Col>
              </Row>

              <Divider style={{ margin: "12px 0", borderColor: colors.borda }} />

              {/* Cliente */}
              <div style={{ marginBottom: 12 }}>
                <Typography.Text strong style={{ color: colors.texto }}>Cliente:</Typography.Text>
                <Typography.Paragraph style={{ margin: "4px 0 0 0", color: colors.textoSecundario }}>
                  {os.cliente_nome}
                </Typography.Paragraph>
              </div>

              {/* Horário */}
              {os.hora_inicio && (
                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <ClockCircleOutlined style={{ fontSize: 16, color: colors.laranja }} />
                  <Typography.Text strong style={{ color: colors.texto }}>{os.hora_inicio}</Typography.Text>
                  {os.hora_conclusao && (
                    <>
                      <span style={{ color: colors.textoFraco }}>até</span>
                      <Typography.Text strong style={{ color: colors.texto }}>{os.hora_conclusao}</Typography.Text>
                    </>
                  )}
                </div>
              )}

              {/* Endereço */}
              {os.endereco_servico_texto && (
                <div style={{ marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <EnvironmentOutlined style={{ fontSize: 16, color: colors.roxo, marginTop: 2 }} />
                  <Typography.Paragraph style={{ margin: 0, color: colors.textoSecundario }}>
                    {os.endereco_servico_texto}
                  </Typography.Paragraph>
                </div>
              )}

              {/* Descrição do Serviço */}
              {os.descricao_servico && (
                <div
                  style={{
                    marginBottom: 12,
                    background: colors.fundoSuave,
                    border: `1px solid ${colors.borda}`,
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <Typography.Text style={{ fontSize: 12, color: colors.textoSecundario }}>
                    {os.descricao_servico}
                  </Typography.Text>
                </div>
              )}

              {/* Tipo de Serviço */}
              {os.tipo_servico && (
                <div style={{ marginBottom: 12 }}>
                  <Tag
                    style={{
                      color: colors.azul,
                      background: "#EFF6FF",
                      border: "none",
                      fontWeight: 700,
                      borderRadius: 999,
                    }}
                  >
                    {os.tipo_servico.toUpperCase()}
                  </Tag>
                </div>
              )}

              <Divider style={{ margin: "12px 0", borderColor: colors.borda }} />

              {/* Botões de Ação */}
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  block
                  type="primary"
                  size="large"
                  onClick={() => abrirGoogleMaps(os.endereco_servico_texto)}
                  icon={<EnvironmentOutlined />}
                  style={{ borderRadius: 10, fontWeight: 600, height: 48 }}
                >
                  Como chegar (Google Maps)
                </Button>

                <Row gutter={[8, 8]}>
                  <Col xs={12}>
                    <Button
                      block
                      size="large"
                      onClick={() => abrirWhatsApp(os.cliente)}
                      icon={<PhoneOutlined />}
                      style={{ background: "#25D366", color: "#fff", borderColor: "#25D366", borderRadius: 10, fontWeight: 600, height: 44 }}
                    >
                      WhatsApp
                    </Button>
                  </Col>
                  <Col xs={12}>
                    <Button
                      block
                      size="large"
                      onClick={() => abrirEmail(os.cliente)}
                      icon={<MailOutlined />}
                      style={{ borderRadius: 10, fontWeight: 600, height: 44 }}
                    >
                      Email
                    </Button>
                  </Col>
                </Row>
              </Space>
            </Card>
          );
        }}
      />

      {/* Footer com refresh button */}
      <div style={{ marginTop: 8, marginBottom: 24, textAlign: "center" }}>
        <Button onClick={carregarOSHoje} size="large" style={{ borderRadius: 10, fontWeight: 600, paddingInline: 24 }}>
          Atualizar
        </Button>
      </div>
    </div>
  );
}
