import { useState, useEffect } from "react";
import {
  Card, Row, Col, Tag, Typography, Space, Button, Skeleton,
  Table, Descriptions, Modal, message, Divider,
} from "antd";
import { ArrowLeftOutlined, EditOutlined, QrcodeOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { QRCodeSVG as QRCode } from "qrcode.react";
import api from "../../../services/api";

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

const statusCor = { operacional: "green", em_manutencao: "orange", inativo: "default", sucateado: "red" };
const statusLabel = { operacional: "Operacional", em_manutencao: "Em Manutenção", inativo: "Inativo", sucateado: "Sucateado" };
const prioridadeCor = { baixa: "blue", media: "gold", alta: "orange", critica: "red" };

export default function AtivoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ativo, setAtivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const qrUrl = `${window.location.origin}/facilities/ativos/${id}`;

  useEffect(() => {
    api.get(`/facilities/ativos/${id}/`)
      .then((r) => setAtivo(r.data))
      .catch(() => message.error("Erro ao carregar ativo"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }
  if (!ativo) return null;

  const chamadosCols = [
    {
      title: "Nº",
      dataIndex: "numero",
      key: "numero",
      width: 130,
      render: (v) => <Text strong style={{ color: colors.azul }}>{v}</Text>,
    },
    { title: "Título", dataIndex: "titulo", key: "titulo", ellipsis: true },
    {
      title: "Prioridade",
      dataIndex: "prioridade",
      key: "prioridade",
      width: 110,
      render: (p) => <Tag color={prioridadeCor[p]} style={{ borderRadius: 999, fontWeight: 600 }}>{p?.toUpperCase()}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (s) => <Tag style={{ borderRadius: 999, fontWeight: 600 }}>{s?.replace("_", " ").toUpperCase()}</Tag>,
    },
    {
      title: "Aberto em",
      dataIndex: "aberto_em",
      key: "aberto_em",
      width: 160,
      render: (d) => d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "-",
    },
  ];

  const planosCols = [
    { title: "Nome", dataIndex: "nome", key: "nome" },
    { title: "Tipo", dataIndex: "tipo", key: "tipo", width: 120 },
    { title: "Periodicidade", dataIndex: "periodicidade", key: "periodicidade", width: 130 },
    {
      title: "Próxima Execução",
      dataIndex: "proxima_execucao",
      key: "proxima_execucao",
      width: 150,
      render: (d) => {
        if (!d) return "-";
        const diff = dayjs(d).diff(dayjs(), "day");
        const cor = diff < 0 ? "red" : diff < 7 ? "orange" : "green";
        return <Tag color={cor} style={{ borderRadius: 999, fontWeight: 600 }}>{dayjs(d).format("DD/MM/YYYY")}</Tag>;
      },
    },
    {
      title: "Ativo",
      dataIndex: "ativo_plano",
      key: "ativo_plano",
      width: 80,
      render: (v) => <Tag color={v ? "green" : "default"} style={{ borderRadius: 999, fontWeight: 600 }}>{v ? "Sim" : "Não"}</Tag>,
    },
  ];

  const documentosCols = [
    { title: "Documento", dataIndex: "titulo", key: "titulo", ellipsis: true },
    { title: "Tipo", dataIndex: "tipo", key: "tipo", width: 120, render: (t) => <Tag style={{ borderRadius: 999, fontWeight: 600 }}>{t?.toUpperCase()}</Tag> },
    {
      title: "Validade",
      dataIndex: "data_validade",
      key: "data_validade",
      width: 130,
      render: (d) => {
        if (!d) return "-";
        const diff = dayjs(d).diff(dayjs(), "day");
        return <Tag color={diff < 0 ? "red" : diff <= 30 ? "orange" : "green"} style={{ borderRadius: 999, fontWeight: 600 }}>{dayjs(d).format("DD/MM/YYYY")}</Tag>;
      },
    },
  ];

  return (
    <div style={pageStyle}>
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/facilities/ativos")} style={{ borderRadius: 8, fontWeight: 600 }}>
          Voltar
        </Button>
      </div>

      <Card
        bordered={false}
        style={panelStyle}
        bodyStyle={{ padding: 20 }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col flex="auto">
            <Space align="center" size={16} wrap>
              <span
                style={{
                  fontFamily: "monospace", fontWeight: 700, fontSize: 18,
                  color: colors.azul, background: "#EFF6FF", padding: "4px 12px",
                  borderRadius: 8,
                }}
              >
                {ativo.tag}
              </span>
              <div>
                <Title level={4} style={{ margin: 0, color: colors.texto }}>{ativo.nome}</Title>
                <Text style={{ color: colors.textoSecundario }}>{ativo.descricao}</Text>
              </div>
              <Tag color={statusCor[ativo.status]} style={{ fontSize: 13, borderRadius: 999, fontWeight: 600 }}>
                {statusLabel[ativo.status]}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)} style={{ borderRadius: 8, fontWeight: 600 }}>
                Gerar QR Code
              </Button>
              <Button icon={<EditOutlined />} type="primary" style={{ borderRadius: 8, fontWeight: 600 }}>
                Editar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            title="Dados Gerais"
            style={panelStyle}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Categoria">{ativo.categoria?.toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusCor[ativo.status]} style={{ borderRadius: 999, fontWeight: 600 }}>{statusLabel[ativo.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Unidade">{ativo.unidade_nome || "-"}</Descriptions.Item>
              <Descriptions.Item label="Prédio">{ativo.localizacao_predio || "-"}</Descriptions.Item>
              <Descriptions.Item label="Andar">{ativo.localizacao_andar || "-"}</Descriptions.Item>
              <Descriptions.Item label="Sala">{ativo.localizacao_sala || "-"}</Descriptions.Item>
              <Descriptions.Item label="Área atendida">{ativo.area_m2 ? `${ativo.area_m2} m²` : "-"}</Descriptions.Item>
              <Descriptions.Item label="Fabricante">{ativo.fabricante || "-"}</Descriptions.Item>
              <Descriptions.Item label="Modelo">{ativo.modelo || "-"}</Descriptions.Item>
              <Descriptions.Item label="Nº de Série">{ativo.numero_serie || "-"}</Descriptions.Item>
              <Descriptions.Item label="Data Instalação">
                {ativo.data_instalacao ? dayjs(ativo.data_instalacao).format("DD/MM/YYYY") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Vida Útil">
                {ativo.vida_util_anos ? `${ativo.vida_util_anos} anos` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Garantia">
                {ativo.garantia_fim ? (
                  <Tag color={dayjs(ativo.garantia_fim).diff(dayjs(), "day") < 0 ? "red" : "green"} style={{ borderRadius: 999, fontWeight: 600 }}>
                    {dayjs(ativo.garantia_fim).format("DD/MM/YYYY")}
                  </Tag>
                ) : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Coordenadas">
                {ativo.latitude && ativo.longitude ? `${ativo.latitude}, ${ativo.longitude}` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Manual">{ativo.manual_url ? <a href={ativo.manual_url} target="_blank" rel="noreferrer" style={{ color: colors.azul, fontWeight: 600 }}>Abrir</a> : "-"}</Descriptions.Item>
              <Descriptions.Item label="Custo Aquisição">
                {ativo.custo_aquisicao
                  ? `R$ ${Number(ativo.custo_aquisicao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            bordered={false}
            title="Planos de Manutenção"
            style={panelStyle}
            bodyStyle={{ padding: 0 }}
            extra={
              <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>{ativo.planos?.length || 0} planos</Tag>
            }
          >
            <Table
              dataSource={ativo.planos || []}
              columns={planosCols}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: true }}
              locale={{ emptyText: "Nenhum plano cadastrado" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        title="Histórico de Chamados"
        style={panelStyle}
        bodyStyle={{ padding: 0 }}
        extra={<Tag color="orange" style={{ borderRadius: 999, fontWeight: 600 }}>{ativo.chamados_count || 0} chamados</Tag>}
      >
        <HistoricoChamados ativoId={id} columns={chamadosCols} />
      </Card>

      <Card
        bordered={false}
        title="Documentos e Conformidade"
        style={panelStyle}
        bodyStyle={{ padding: 0 }}
        extra={<Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>{ativo.documentos_count || 0} docs</Tag>}
      >
        <Table
          dataSource={ativo.documentos || []}
          columns={documentosCols}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: "Nenhum documento anexado" }}
        />
      </Card>

      <Modal
        title="QR Code do Ativo"
        open={qrOpen}
        onCancel={() => setQrOpen(false)}
        footer={[
          <Button key="fechar" onClick={() => setQrOpen(false)} style={{ borderRadius: 8, fontWeight: 600 }}>Fechar</Button>,
        ]}
        centered
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <QRCode value={qrUrl} size={220} level="H" includeMargin />
          <Divider />
          <Text style={{ color: colors.textoFraco, fontSize: 12 }}>{qrUrl}</Text>
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontFamily: "monospace", fontSize: 18, color: colors.azul }}>
              {ativo.tag}
            </Text>
          </div>
          <div style={{ color: colors.textoSecundario, fontSize: 13, marginTop: 4 }}>{ativo.nome}</div>
        </div>
      </Modal>
    </div>
  );
}

function HistoricoChamados({ ativoId, columns }) {
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/facilities/ativos/${ativoId}/historico_chamados/`)
      .then((r) => setChamados(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, [ativoId]);

  return (
    <Table
      dataSource={chamados}
      columns={columns}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{ pageSize: 10 }}
      locale={{ emptyText: "Nenhum chamado registrado" }}
    />
  );
}
