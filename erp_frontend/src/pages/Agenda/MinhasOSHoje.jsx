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
} from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/pt-br";

import agendaService from "../../services/agenda";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");

const statusMap = {
  agendada: { color: "geekblue", label: "Agendada", icon: <ExclamationCircleOutlined /> },
  em_execucao: { color: "orange", label: "Em Execução", icon: <CheckCircleOutlined /> },
  concluida: { color: "green", label: "Concluída", icon: <CheckCircleOutlined /> },
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
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (ordens.length === 0) {
    return (
      <div style={{ padding: "24px" }}>
        <Card>
          <Empty
            description="Nenhuma OS agendada para hoje"
            style={{ marginTop: "40px", marginBottom: "40px" }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header com resumo */}
      <Card style={{ marginBottom: "16px" }}>
        <Row gutter={[16, 16]}>
          <Col xs={12}>
            <div style={{ textAlign: "center" }}>
              <Typography.Title level={2} style={{ margin: "0 0 8px 0" }}>
                {totalOrdens}
              </Typography.Title>
              <Typography.Text type="secondary">OS Hoje</Typography.Text>
            </div>
          </Col>
          <Col xs={12}>
            <div style={{ textAlign: "center" }}>
              <Typography.Title level={2} style={{ margin: "0 0 8px 0", color: "#52c41a" }}>
                {concluidasCount}
              </Typography.Title>
              <Typography.Text type="secondary">Concluídas</Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Lista de OS */}
      <List
        dataSource={ordens}
        renderItem={(os, index) => (
          <Card
            key={os.id}
            style={{
              marginBottom: "12px",
              borderLeft: `4px solid ${
                os.status === "concluida"
                  ? "#52c41a"
                  : os.status === "em_execucao"
                  ? "#faad14"
                  : "#1890ff"
              }`,
            }}
          >
            {/* Número e Status */}
            <Row justify="space-between" align="middle" style={{ marginBottom: "12px" }}>
              <Col>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  <Badge count={index + 1} style={{ backgroundColor: "#1890ff" }} />
                  <span style={{ marginLeft: "8px" }}>{os.numero}</span>
                </Typography.Title>
              </Col>
              <Col>
                <Tag color={statusMap[os.status]?.color}>
                  {statusMap[os.status]?.label || os.status}
                </Tag>
              </Col>
            </Row>

            <Divider style={{ margin: "12px 0" }} />

            {/* Cliente */}
            <div style={{ marginBottom: "12px" }}>
              <Typography.Text strong>Cliente:</Typography.Text>
              <Typography.Paragraph style={{ margin: "4px 0 0 0" }}>
                {os.cliente_nome}
              </Typography.Paragraph>
            </div>

            {/* Horário */}
            {os.hora_inicio && (
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ClockCircleOutlined style={{ fontSize: "16px", color: "#faad14" }} />
                <Typography.Text strong>{os.hora_inicio}</Typography.Text>
                {os.hora_conclusao && (
                  <>
                    <span>até</span>
                    <Typography.Text strong>{os.hora_conclusao}</Typography.Text>
                  </>
                )}
              </div>
            )}

            {/* Endereço */}
            {os.endereco_servico_texto && (
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <EnvironmentOutlined style={{ fontSize: "16px", color: "#eb2f96", marginTop: "2px" }} />
                <Typography.Paragraph style={{ margin: 0 }}>
                  {os.endereco_servico_texto}
                </Typography.Paragraph>
              </div>
            )}

            {/* Descrição do Serviço */}
            {os.descricao_servico && (
              <div style={{ marginBottom: "12px", backgroundColor: "#f5f5f5", padding: "8px", borderRadius: "4px" }}>
                <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                  {os.descricao_servico}
                </Typography.Text>
              </div>
            )}

            {/* Tipo de Serviço */}
            {os.tipo_servico && (
              <div style={{ marginBottom: "12px" }}>
                <Tag color="cyan">{os.tipo_servico.toUpperCase()}</Tag>
              </div>
            )}

            <Divider style={{ margin: "12px 0" }} />

            {/* Botões de Ação */}
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                block
                type="primary"
                size="large"
                onClick={() => abrirGoogleMaps(os.endereco_servico_texto)}
                icon={<EnvironmentOutlined />}
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
                    style={{ backgroundColor: "#25d366", color: "#fff", borderColor: "#25d366" }}
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
                  >
                    Email
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>
        )}
      />

      {/* Footer com refresh button */}
      <div style={{ marginTop: "24px", marginBottom: "24px", textAlign: "center" }}>
        <Button onClick={carregarOSHoje} size="large">
          Atualizar
        </Button>
      </div>
    </div>
  );
}
