import { useState, useEffect } from "react";
import {
  Card, Row, Col, Tag, Typography, Space, Button, Spin,
  Table, Descriptions, Modal, message, Divider,
} from "antd";
import { ArrowLeftOutlined, EditOutlined, QrcodeOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { QRCodeSVG as QRCode } from "qrcode.react";
import api from "../../../services/api";

const { Title, Text } = Typography;

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

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;
  if (!ativo) return null;

  const chamadosCols = [
    { title: "Nº", dataIndex: "numero", key: "numero", width: 130 },
    { title: "Título", dataIndex: "titulo", key: "titulo", ellipsis: true },
    {
      title: "Prioridade",
      dataIndex: "prioridade",
      key: "prioridade",
      width: 110,
      render: (p) => <Tag color={prioridadeCor[p]}>{p?.toUpperCase()}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (s) => <Tag>{s?.replace("_", " ").toUpperCase()}</Tag>,
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
        return <Tag color={cor}>{dayjs(d).format("DD/MM/YYYY")}</Tag>;
      },
    },
    {
      title: "Ativo",
      dataIndex: "ativo_plano",
      key: "ativo_plano",
      width: 80,
      render: (v) => <Tag color={v ? "green" : "default"}>{v ? "Sim" : "Não"}</Tag>,
    },
  ];

  const documentosCols = [
    { title: "Documento", dataIndex: "titulo", key: "titulo", ellipsis: true },
    { title: "Tipo", dataIndex: "tipo", key: "tipo", width: 120, render: (t) => <Tag>{t?.toUpperCase()}</Tag> },
    {
      title: "Validade",
      dataIndex: "data_validade",
      key: "data_validade",
      width: 130,
      render: (d) => {
        if (!d) return "-";
        const diff = dayjs(d).diff(dayjs(), "day");
        return <Tag color={diff < 0 ? "red" : diff <= 30 ? "orange" : "green"}>{dayjs(d).format("DD/MM/YYYY")}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/facilities/ativos")}>
          Voltar
        </Button>
      </Space>

      <Card
        style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}
        bodyStyle={{ padding: "20px 24px" }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center" size={16}>
              <span
                style={{
                  fontFamily: "monospace", fontWeight: 700, fontSize: 20,
                  color: "#3B82F6", background: "#EFF6FF", padding: "4px 12px",
                  borderRadius: 8,
                }}
              >
                {ativo.tag}
              </span>
              <div>
                <Title level={4} style={{ margin: 0 }}>{ativo.nome}</Title>
                <Text type="secondary">{ativo.descricao}</Text>
              </div>
              <Tag color={statusCor[ativo.status]} style={{ fontSize: 13 }}>
                {statusLabel[ativo.status]}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)}>
                Gerar QR Code
              </Button>
              <Button icon={<EditOutlined />} type="primary" style={{ background: "#3B82F6" }}>
                Editar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title="Dados Gerais"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Categoria">{ativo.categoria?.toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusCor[ativo.status]}>{statusLabel[ativo.status]}</Tag>
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
                  <Tag color={dayjs(ativo.garantia_fim).diff(dayjs(), "day") < 0 ? "red" : "green"}>
                    {dayjs(ativo.garantia_fim).format("DD/MM/YYYY")}
                  </Tag>
                ) : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Coordenadas">
                {ativo.latitude && ativo.longitude ? `${ativo.latitude}, ${ativo.longitude}` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Manual">{ativo.manual_url ? <a href={ativo.manual_url} target="_blank" rel="noreferrer">Abrir</a> : "-"}</Descriptions.Item>
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
            title="Planos de Manutenção"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            extra={
              <Tag color="blue">{ativo.planos?.length || 0} planos</Tag>
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
        title="Histórico de Chamados"
        style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
        extra={<Tag color="orange">{ativo.chamados_count || 0} chamados</Tag>}
      >
        <HistoricoChamados ativoId={id} columns={chamadosCols} />
      </Card>

      <Card
        title="Documentos e Conformidade"
        style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginTop: 16 }}
        extra={<Tag color="blue">{ativo.documentos_count || 0} docs</Tag>}
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
          <Button key="fechar" onClick={() => setQrOpen(false)}>Fechar</Button>,
        ]}
        centered
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <QRCode value={qrUrl} size={220} level="H" includeMargin />
          <Divider />
          <Text type="secondary" style={{ fontSize: 12 }}>{qrUrl}</Text>
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontFamily: "monospace", fontSize: 18, color: "#3B82F6" }}>
              {ativo.tag}
            </Text>
          </div>
          <div style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}>{ativo.nome}</div>
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
