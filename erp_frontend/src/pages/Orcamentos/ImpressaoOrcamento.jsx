import { useEffect, useMemo, useState } from "react";
import { Button, Card, Descriptions, Divider, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import { ArrowLeftOutlined, FilePdfOutlined, PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";
import { moneyFormatter, normalizeList, pageStyle } from "./shared";

const { Title, Text, Paragraph } = Typography;

const shellStyle = {
  ...pageStyle,
  padding: 20,
};

const pageCardStyle = {
  maxWidth: 980,
  margin: "0 auto",
  borderRadius: 18,
  border: "1px solid #DDE5EF",
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
};

function formatStatus(status) {
  if (status === "orcamento_enviado") return "Enviado";
  if (status === "aprovada") return "Aprovado";
  if (status === "cancelada") return "Recusado";
  return "Rascunho";
}

export default function ImpressaoOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orcamento, setOrcamento] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [impostosCalculados, setImpostosCalculados] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [orcamentoResponse, empresaResponse] = await Promise.all([
          api.get(`/ordens/${id}/`),
          api.get("/configuracoes/empresa/"),
        ]);

        if (!active) return;
        setOrcamento(orcamentoResponse.data);
        setEmpresa(empresaResponse.data || {});
      } catch {
        if (active) message.error("Não foi possível carregar a página de impressão.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [id]);

  const itens = normalizeList(orcamento?.itens);
  const totaisItens = useMemo(() => {
    const subtotal = itens.reduce((sum, item) => sum + Number(item.valor_total || (Number(item.quantidade || 0) * Number(item.valor_unitario || 0))), 0);
    const subtotalServicos = itens
      .filter((item) => item.origem_tipo !== "produto")
      .reduce((sum, item) => sum + Number(item.valor_total || (Number(item.quantidade || 0) * Number(item.valor_unitario || 0))), 0);
    const subtotalProdutos = itens
      .filter((item) => item.origem_tipo === "produto")
      .reduce((sum, item) => sum + Number(item.valor_total || (Number(item.quantidade || 0) * Number(item.valor_unitario || 0))), 0);
    return { subtotal, subtotalServicos, subtotalProdutos };
  }, [itens]);

  useEffect(() => {
    if (!orcamento) return;
    let active = true;

    async function recalcularImpostos() {
      try {
        const response = await api.post("/fiscal/calcular-impostos/", {
          valor_servicos: totaisItens.subtotalServicos,
          valor_materiais: totaisItens.subtotalProdutos,
        });
        if (active) setImpostosCalculados(response.data || null);
      } catch {
        if (active) setImpostosCalculados(orcamento?.dados_impostos || null);
      }
    }

    recalcularImpostos();
    return () => {
      active = false;
    };
  }, [orcamento, totaisItens.subtotalProdutos, totaisItens.subtotalServicos]);

  const impostos = impostosCalculados || orcamento?.dados_impostos || {};
  const subtotalOrcamento = Number(orcamento?.valor_total_orcado || totaisItens.subtotal || 0);
  const impostoTotal = Number(impostos?.total_impostos || 0);
  const totalComImpostos = Number(impostos?.total_geral || subtotalOrcamento + impostoTotal || 0);

  const itemColumns = useMemo(
    () => [
      {
        title: "Descrição",
        dataIndex: "descricao",
        key: "descricao",
        render: (_, item) => (
          <div>
            <div style={{ fontWeight: 700, color: "#10233C" }}>{item.descricao}</div>
            <div style={{ color: "#6B7280", fontSize: 12 }}>
              {(item.codigo_referencia || item.produto_codigo || item.servico_codigo || "-")} | {item.unidade_referencia || "-"}
            </div>
          </div>
        ),
      },
      {
        title: "Origem",
        dataIndex: "origem_tipo",
        key: "origem_tipo",
        width: 110,
        render: (value) => <Tag>{value === "servico" ? "Serviço" : value === "produto" ? "Produto" : "Avulso"}</Tag>,
      },
      {
        title: "Qtd",
        dataIndex: "quantidade",
        key: "quantidade",
        width: 80,
      },
      {
        title: "Unitário",
        dataIndex: "valor_unitario",
        key: "valor_unitario",
        width: 120,
        render: (value) => moneyFormatter.format(Number(value || 0)),
      },
      {
        title: "Total",
        dataIndex: "valor_total",
        key: "valor_total",
        width: 120,
        render: (value) => <strong>{moneyFormatter.format(Number(value || 0))}</strong>,
      },
    ],
    []
  );

  const impostoRows = useMemo(
    () => [
      { key: "iss", nome: "ISS", aliquota: impostos?.aliquotas?.iss || 0, valor: impostos?.iss || 0 },
      { key: "pis", nome: "PIS", aliquota: impostos?.aliquotas?.pis || 0, valor: impostos?.pis || 0 },
      { key: "cofins", nome: "COFINS", aliquota: impostos?.aliquotas?.cofins || 0, valor: impostos?.cofins || 0 },
      { key: "irpj", nome: "IRPJ", aliquota: impostos?.aliquotas?.irpj || 0, valor: impostos?.irpj || 0 },
      { key: "csll", nome: "CSLL", aliquota: impostos?.aliquotas?.csll || 0, valor: impostos?.csll || 0 },
    ],
    [impostos]
  );

  const handlePrint = () => window.print();

  const handlePdf = async () => {
    try {
      const response = await api.post(`/ordens/${id}/gerar-pdf-orcamento/`, {}, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${orcamento?.numero || `orcamento-${id}`}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("PDF gerado com sucesso.");
    } catch {
      message.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div style={shellStyle}>
      <style>{`
        @media print {
          .print-toolbar { display: none !important; }
          body { background: white !important; }
          .print-sheet { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="print-toolbar" style={{ maxWidth: 980, margin: "0 auto 16px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Voltar</Button>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Imprimir</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handlePdf} style={{ background: "#1B4F8A", borderColor: "#1B4F8A" }}>
            Gerar PDF
          </Button>
        </Space>
      </div>

      <Card className="print-sheet" bordered={false} style={pageCardStyle} bodyStyle={{ padding: 28 }}>
        <Skeleton active loading={loading} paragraph={{ rows: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, borderBottom: "3px solid #1B4F8A", paddingBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1B4F8A", marginBottom: 8 }}>
                {empresa?.razao_social || empresa?.nome || "Sua empresa"}
              </div>
              <div style={{ color: "#5A6070", lineHeight: 1.7 }}>
                {empresa?.cnpj ? <div>CNPJ: {empresa.cnpj}</div> : null}
                {empresa?.endereco ? <div>{empresa.endereco}</div> : null}
                {empresa?.telefone ? <div>Telefone: {empresa.telefone}</div> : null}
                {empresa?.email ? <div>Email: {empresa.email}</div> : null}
              </div>
            </div>

            <div style={{ minWidth: 220, textAlign: "right" }}>
              <Tag color="blue" style={{ borderRadius: 999, padding: "6px 10px", fontWeight: 700 }}>PROPOSTA COMERCIAL</Tag>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#10233C", marginTop: 10 }}>{orcamento?.numero}</div>
              <div style={{ color: "#5A6070", marginTop: 6 }}>Emitido em {dayjs().format("DD/MM/YYYY")}</div>
              <div style={{ color: "#5A6070" }}>
                Validade {orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "a combinar"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: 20, border: "1px solid #DDE5EF", borderRadius: 16, background: "#F8FBFF" }}>
            <Title level={3} style={{ marginTop: 0, marginBottom: 8, color: "#10233C" }}>
              Orçamento para {orcamento?.cliente_nome || orcamento?.cliente?.nome || "Cliente"}
            </Title>
            <Paragraph style={{ marginBottom: 0, color: "#5A6070" }}>
              {orcamento?.descricao_servico || "Proposta comercial referente aos serviços e materiais descritos abaixo."}
            </Paragraph>
          </div>

          <div style={{ marginTop: 24 }}>
            <Title level={5} style={{ color: "#6B7C91", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Empresa e Cliente
            </Title>
            <Descriptions bordered column={2} size="middle">
              <Descriptions.Item label="Empresa">{empresa?.razao_social || empresa?.nome || "-"}</Descriptions.Item>
              <Descriptions.Item label="Cliente">{orcamento?.cliente_nome || orcamento?.cliente?.nome || "-"}</Descriptions.Item>
              <Descriptions.Item label="Status">{formatStatus(orcamento?.status)}</Descriptions.Item>
              <Descriptions.Item label="Contato">{orcamento?.contato_nome || orcamento?.cliente_nome || "-"}</Descriptions.Item>
              <Descriptions.Item label="Condição de pagamento">{orcamento?.condicao_pagamento || "-"}</Descriptions.Item>
              <Descriptions.Item label="Regime tributário">{String(impostos?.regime || "-").replaceAll("_", " ")}</Descriptions.Item>
            </Descriptions>
          </div>

          <div style={{ marginTop: 24 }}>
            <Title level={5} style={{ color: "#6B7C91", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Itens do orçamento
            </Title>
            <Table columns={itemColumns} dataSource={itens} rowKey={(item) => item.id || item.key} pagination={false} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20, marginTop: 24 }}>
            <div>
              <Title level={5} style={{ color: "#6B7C91", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Observações e termos
              </Title>
              <div style={{ border: "1px solid #DDE5EF", borderRadius: 14, padding: 16, background: "#F8FBFF", color: "#445468", lineHeight: 1.7 }}>
                {orcamento?.observacoes_tecnicas || "Proposta sujeita à aprovação comercial e confirmação de agenda operacional."}
              </div>
            </div>

            <div>
              <Title level={5} style={{ color: "#6B7C91", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Resumo financeiro
              </Title>
              <div style={{ border: "1px solid #DDE5EF", borderRadius: 14, overflow: "hidden" }}>
                {[
                  ["Subtotal serviços", impostos?.subtotal_servicos || totaisItens.subtotalServicos || orcamento?.valor_servicos || 0],
                  ["Subtotal produtos", impostos?.subtotal_materiais || totaisItens.subtotalProdutos || orcamento?.valor_materiais || 0],
                  ["Subtotal orçamento", subtotalOrcamento],
                  ["Imposto sobre os serviços", impostoTotal],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #EEF2F6" }}>
                    <span>{label}</span>
                    <strong>{moneyFormatter.format(Number(value || 0))}</strong>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "14px", background: "#1B4F8A", color: "#fff" }}>
                  <span>Total com impostos</span>
                  <strong>{moneyFormatter.format(totalComImpostos)}</strong>
                </div>
              </div>
            </div>
          </div>

          <Divider />

          <div>
            <Title level={5} style={{ color: "#6B7C91", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Descrição dos impostos pagos
            </Title>
            <Paragraph style={{ color: "#5A6070" }}>
              A composição abaixo descreve os impostos pagos considerados neste orçamento, conforme o regime tributário configurado para a empresa.
            </Paragraph>
            <Table
              pagination={false}
              rowKey="key"
              dataSource={impostoRows}
              columns={[
                { title: "Imposto", dataIndex: "nome", key: "nome" },
                { title: "Alíquota", dataIndex: "aliquota", key: "aliquota", width: 120, render: (value) => `${value}%` },
                { title: "Valor estimado", dataIndex: "valor", key: "valor", width: 160, render: (value) => moneyFormatter.format(Number(value || 0)) },
              ]}
            />
            {impostos?.observacao ? (
              <Alert style={{ marginTop: 12, borderRadius: 12 }} type="info" showIcon message={impostos.observacao} />
            ) : null}
          </div>
        </Skeleton>
      </Card>
    </div>
  );
}
