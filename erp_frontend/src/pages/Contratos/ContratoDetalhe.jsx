import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Descriptions, Divider, Empty, Modal, Row, Space, Statistic, Table, Tabs, Tag, Timeline, Typography, message } from "antd";
import { CalendarOutlined, FilePdfOutlined, FileProtectOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";
import { money, pageStyle, statusConfig } from "./shared";

const { Title, Text, Paragraph } = Typography;

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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
    return <div style={pageStyle}>{loading ? "Carregando..." : <Empty />}</div>;
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
    { title: "Total", dataIndex: "valor_total", render: (v) => money.format(Number(v || 0)) },
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
      <Space align="center" style={{ justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
        <Space>
          <FileProtectOutlined style={{ fontSize: 28, color: "#3B82F6" }} />
          <div>
            <Space wrap>
              <Title level={3} style={{ margin: 0 }}>{contrato.numero}</Title>
              <Tag color={statusConfig[contrato.status]?.color}>{statusConfig[contrato.status]?.label || contrato.status}</Tag>
            </Space>
            <Text type="secondary">{contrato.cliente_nome} - {contrato.titulo}</Text>
          </div>
        </Space>
        <Space wrap>
          <Button onClick={() => navigate("/contratos")}>Voltar</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchContrato}>Atualizar</Button>
          <Button icon={<FilePdfOutlined />} loading={gerando === "proposta"} onClick={() => gerarPdf("proposta")}>PDF Proposta</Button>
          <Button icon={<FilePdfOutlined />} loading={gerando === "contrato"} onClick={() => gerarPdf("contrato")}>PDF Contrato</Button>
          <Button danger icon={<StopOutlined />} onClick={rescindir}>Rescindir</Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}><Card><Statistic title="Valor mensal" value={Number(contrato.valor_total_mensal || 0)} prefix="R$" precision={2} valueStyle={{ color: "#10B981" }} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Valor contrato" value={Number(contrato.valor_total_contrato || 0)} prefix="R$" precision={2} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Unidades" value={contrato.unidades?.length || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="OS planejadas" value={contrato.os_contrato?.length || 0} prefix={<CalendarOutlined />} /></Card></Col>
      </Row>

      <Card>
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
                  <Paragraph>{contrato.objeto_contrato}</Paragraph>
                  <Table size="small" rowKey="id" pagination={false} dataSource={contrato.unidades || []} columns={[
                    { title: "Unidade", dataIndex: "nome_unidade" },
                    { title: "Cidade/UF", render: (_, row) => `${row.cidade || "-"} / ${row.estado || "-"}` },
                    { title: "Valor mensal", dataIndex: "valor_mensal", render: (v) => money.format(Number(v || 0)) },
                    { title: "Escopos", render: (_, row) => (row.escopos || []).map((e) => <Tag key={e.id} color={e.escopo_dados?.cor}>{e.escopo_dados?.nome}</Tag>) },
                  ]} />
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
                  <Button type="primary" onClick={gerarFatura} style={{ marginBottom: 12 }}>Gerar fatura do mês</Button>
                  <Table rowKey="id" columns={faturaColumns} dataSource={contrato.faturas || []} />
                </>
              ),
            },
            {
              key: "documentos",
              label: "Documentos",
              children: (
                <Space direction="vertical">
                  {contrato.pdf_proposta ? <Button href={contrato.pdf_proposta} target="_blank">Abrir PDF da proposta</Button> : <Text type="secondary">Proposta ainda não gerada.</Text>}
                  {contrato.pdf_contrato ? <Button href={contrato.pdf_contrato} target="_blank">Abrir PDF do contrato</Button> : <Text type="secondary">Contrato ainda não gerado.</Text>}
                  {contrato.pdf_cronograma ? <Button href={contrato.pdf_cronograma} target="_blank">Abrir PDF do cronograma</Button> : <Button onClick={() => gerarPdf("cronograma")} loading={gerando === "cronograma"}>Gerar cronograma</Button>}
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
