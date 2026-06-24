import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Descriptions, Divider, Empty, Modal, Row, Skeleton, Space, Table, Tabs, Tag, Timeline, Typography, message } from "antd";
import {
  CalendarOutlined,
  FilePdfOutlined,
  FileProtectOutlined,
  ReloadOutlined,
  ShopOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";
import { money, statusConfig } from "./shared";

const { Title, Text, Paragraph } = Typography;

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

const metricCardStyle = {
  ...panelStyle,
  minHeight: 110,
};

const statusBadgeMeta = {
  rascunho: { color: colors.textoSecundario, background: "#F3F4F6" },
  ativo: { color: colors.verde, background: "#DCFCE7" },
  suspenso: { color: colors.laranja, background: "#FFEDD5" },
  encerrado: { color: colors.azul, background: "#DBEAFE" },
  rescindido: { color: colors.vermelho, background: "#FEE2E2" },
};

function StatusBadge({ status }) {
  const meta = statusBadgeMeta[status] || statusBadgeMeta.rascunho;
  const label = statusConfig[status]?.label || status;
  return (
    <span
      style={{
        alignItems: "center",
        background: meta.background,
        borderRadius: 999,
        color: meta.color,
        display: "inline-flex",
        fontSize: 12,
        fontWeight: 700,
        gap: 6,
        padding: "5px 10px",
      }}
    >
      <Badge color={meta.color} />
      {label}
    </span>
  );
}

function MiniMetric({ color, icon, label, value }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 18, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: colors.textoFraco,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
          <div style={{ color: colors.texto, fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
        </div>
        <div
          style={{
            alignItems: "center",
            background: `${color}14`,
            borderRadius: 12,
            color,
            display: "flex",
            height: 40,
            justifyContent: "center",
            width: 40,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function ContratoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState("");

  async function fetchContrato() {
    setLoading(true);
    try {
      const res = await api.get(`/contratos/${id}/`);
      setContrato(res.data);
    } catch {
      message.error("Erro ao carregar contrato.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContrato();
  }, [id]);

  const cronogramaLinhas = useMemo(() => {
    const mapa = new Map();
    (contrato?.os_contrato || []).forEach((os) => {
      const key = `${os.unidade_nome} | ${os.escopo_nome}`;
      if (!mapa.has(key)) mapa.set(key, { key, unidade: os.unidade_nome, escopo: os.escopo_nome, cor: os.escopo_cor, meses: Array.from({ length: 12 }, () => []) });
      const data = new Date(`${os.data_prevista}T00:00:00`);
      mapa.get(key).meses[data.getMonth()].push(os);
    });
    return Array.from(mapa.values());
  }, [contrato]);

  async function gerarPdf(tipo) {
    setGerando(tipo);
    try {
      await api.post(`/contratos/${id}/gerar-pdf-${tipo}/`);
      message.success("PDF gerado.");
      fetchContrato();
    } catch {
      message.error("Erro ao gerar PDF.");
    } finally {
      setGerando("");
    }
  }

  async function gerarFatura() {
    try {
      await api.post(`/contratos/${id}/gerar-fatura-mes/`, {});
      message.success("Fatura do mês gerada.");
      fetchContrato();
    } catch {
      message.error("Erro ao gerar fatura.");
    }
  }

  function rescindir() {
    Modal.confirm({
      title: "Rescindir contrato",
      content: "As OS programadas serão canceladas. Deseja continuar?",
      okText: "Rescindir",
      okButtonProps: { danger: true },
      onOk: async () => {
        await api.post(`/contratos/${id}/rescindir/`, { motivo: "Rescindido pelo usuário" });
        fetchContrato();
      },
    });
  }

  if (!contrato) {
    return (
      <div style={pageStyle}>
        <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 32 }}>
          {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : <Empty description="Contrato não encontrado" />}
        </Card>
      </div>
    );
  }

  const osColumns = [
    { title: "Data", dataIndex: "data_prevista", width: 120 },
    { title: "Unidade", dataIndex: "unidade_nome", ellipsis: true },
    { title: "Escopo", dataIndex: "escopo_nome", width: 180 },
    { title: "Visita", dataIndex: "numero_visita", width: 80 },
    { title: "OS", dataIndex: "ordem_servico_numero", width: 120 },
    { title: "Status", dataIndex: "status", width: 130, render: (v) => <Tag>{v}</Tag> },
  ];

  const faturaColumns = [
    { title: "Competência", render: (_, row) => `${String(row.mes_referencia).padStart(2, "0")}/${row.ano_referencia}` },
    { title: "Vencimento", dataIndex: "vencimento" },
    { title: "Base", dataIndex: "valor_base", render: (v) => money.format(Number(v || 0)) },
    { title: "Glosa", dataIndex: "valor_glosa", render: (v) => money.format(Number(v || 0)) },
    { title: "Total", dataIndex: "valor_total", render: (v) => <Text strong>{money.format(Number(v || 0))}</Text> },
    { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
  ];

  const cronogramaColumns = [
    { title: "Unidade", dataIndex: "unidade", fixed: "left", width: 180 },
    { title: "Escopo", dataIndex: "escopo", fixed: "left", width: 160, render: (v, row) => <Tag color={row.cor}>{v}</Tag> },
    ...meses.map((mes, idx) => ({
      title: mes,
      width: 80,
      render: (_, row) => row.meses[idx].length ? <Tag color="blue">{row.meses[idx].length} OS</Tag> : <Text type="secondary">-</Text>,
    })),
  ];

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Space align="start">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${colors.azul}14`,
                color: colors.azul,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <FileProtectOutlined />
            </div>
            <div>
              <Space wrap align="center">
                <Title level={1} style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.texto }}>{contrato.numero}</Title>
                <StatusBadge status={contrato.status} />
              </Space>
              <Text style={{ color: colors.textoSecundario }}>{contrato.cliente_nome} - {contrato.titulo}</Text>
            </div>
          </Space>
          <Space wrap>
            <Button onClick={() => navigate("/contratos")} style={{ borderRadius: 10, height: 40 }}>Voltar</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchContrato} style={{ borderRadius: 10, height: 40 }}>Atualizar</Button>
            {contrato.status === "rascunho" && (
              <Button type="primary" onClick={() => navigate(`/contratos/editar/${id}`)} style={{ borderRadius: 10, height: 40, fontWeight: 600 }}>
                Editar
              </Button>
            )}
            <Button icon={<FilePdfOutlined />} loading={gerando === "proposta"} onClick={() => gerarPdf("proposta")} style={{ borderRadius: 10, height: 40 }}>
              PDF Proposta
            </Button>
            <Button icon={<FilePdfOutlined />} loading={gerando === "contrato"} onClick={() => gerarPdf("contrato")} style={{ borderRadius: 10, height: 40 }}>
              PDF Contrato
            </Button>
            <Button danger icon={<StopOutlined />} onClick={rescindir} style={{ borderRadius: 10, height: 40 }}>Rescindir</Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} xl={6}>
          <MiniMetric color={colors.verde} icon={<FileProtectOutlined />} label="Valor mensal" value={money.format(Number(contrato.valor_total_mensal || 0))} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MiniMetric color={colors.azul} icon={<FileProtectOutlined />} label="Valor contrato" value={money.format(Number(contrato.valor_total_contrato || 0))} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MiniMetric color={colors.roxo} icon={<ShopOutlined />} label="Unidades" value={contrato.unidades?.length || 0} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MiniMetric color={colors.laranja} icon={<CalendarOutlined />} label="OS planejadas" value={contrato.os_contrato?.length || 0} />
        </Col>
      </Row>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <Tabs
          items={[
            {
              key: "geral",
              label: "Visão geral",
              children: (
                <>
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Cliente">{contrato.cliente_nome}</Descriptions.Item>
                    <Descriptions.Item label="Vigência">{contrato.data_inicio} até {contrato.data_fim}</Descriptions.Item>
                    <Descriptions.Item label="Faturamento">{contrato.tipo_faturamento}</Descriptions.Item>
                    <Descriptions.Item label="Pagamento">{contrato.forma_pagamento}</Descriptions.Item>
                    <Descriptions.Item label="Reajuste">{contrato.reajuste_anual ? contrato.indice_reajuste : "Sem reajuste"}</Descriptions.Item>
                    <Descriptions.Item label="ART">{contrato.requer_art ? contrato.numero_art || "Requerida" : "Não requerida"}</Descriptions.Item>
                  </Descriptions>
                  <Divider />
                  <Paragraph style={{ color: colors.textoSecundario }}>{contrato.objeto_contrato}</Paragraph>
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={contrato.unidades || []}
                    columns={[
                      { title: "Unidade", dataIndex: "nome_unidade" },
                      { title: "Cidade/UF", render: (_, row) => `${row.cidade || "-"} / ${row.estado || "-"}` },
                      { title: "Valor mensal", dataIndex: "valor_mensal", render: (v) => money.format(Number(v || 0)) },
                      { title: "Escopos", render: (_, row) => (row.escopos || []).map((e) => <Tag key={e.id} color={e.escopo_dados?.cor}>{e.escopo_dados?.nome}</Tag>) },
                    ]}
                  />
                </>
              ),
            },
            {
              key: "cronograma",
              label: "Cronograma",
              children: <Table size="small" rowKey="key" dataSource={cronogramaLinhas} columns={cronogramaColumns} pagination={false} scroll={{ x: 1200 }} />,
            },
            {
              key: "executadas",
              label: "OS Executadas",
              children: <Table rowKey="id" columns={osColumns} dataSource={(contrato.os_contrato || []).filter((os) => os.status === "concluida")} />,
            },
            {
              key: "faturas",
              label: "Faturas",
              children: (
                <>
                  <Button type="primary" onClick={gerarFatura} style={{ marginBottom: 12, borderRadius: 10, height: 40, fontWeight: 600 }}>
                    Gerar fatura do mês
                  </Button>
                  <Table rowKey="id" columns={faturaColumns} dataSource={contrato.faturas || []} />
                </>
              ),
            },
            {
              key: "documentos",
              label: "Documentos",
              children: (
                <Space direction="vertical" size={10}>
                  {contrato.pdf_proposta ? (
                    <Button icon={<FilePdfOutlined />} href={contrato.pdf_proposta} target="_blank" style={{ borderRadius: 10 }}>
                      Abrir PDF da proposta
                    </Button>
                  ) : (
                    <Text type="secondary">Proposta ainda não gerada.</Text>
                  )}
                  {contrato.pdf_contrato ? (
                    <Button icon={<FilePdfOutlined />} href={contrato.pdf_contrato} target="_blank" style={{ borderRadius: 10 }}>
                      Abrir PDF do contrato
                    </Button>
                  ) : (
                    <Text type="secondary">Contrato ainda não gerado.</Text>
                  )}
                  {contrato.pdf_cronograma ? (
                    <Button icon={<FilePdfOutlined />} href={contrato.pdf_cronograma} target="_blank" style={{ borderRadius: 10 }}>
                      Abrir PDF do cronograma
                    </Button>
                  ) : (
                    <Button onClick={() => gerarPdf("cronograma")} loading={gerando === "cronograma"} style={{ borderRadius: 10 }}>
                      Gerar cronograma
                    </Button>
                  )}
                </Space>
              ),
            },
            {
              key: "historico",
              label: "Histórico",
              children: (
                <Timeline items={[
                  { children: `Contrato criado em ${contrato.criado_em}` },
                  { children: `Última atualização em ${contrato.atualizado_em}` },
                  { children: `Status atual: ${statusConfig[contrato.status]?.label || contrato.status}` },
                ]} />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
