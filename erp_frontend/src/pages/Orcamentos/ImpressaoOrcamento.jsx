import { useEffect, useMemo, useState } from "react";
import { Button, Card, Divider, Skeleton, Space, Table, Tag, Typography, message } from "antd";
import { ArrowLeftOutlined, FilePdfOutlined, PrinterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";
import { formatMoneyTrailing, normalizeList, pageStyle } from "./shared";

const { Title, Text, Paragraph } = Typography;

const shellStyle = {
  ...pageStyle,
  padding: 20,
};

const pageCardStyle = {
  maxWidth: 1080,
  margin: "0 auto",
  borderRadius: 24,
  border: "1px solid #D9E3F0",
  boxShadow: "0 28px 60px rgba(15, 23, 42, 0.10)",
  overflow: "hidden",
};

const sectionTitleStyle = {
  color: "#6B7C91",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 12,
};

const infoCardStyle = {
  border: "1px solid #DDE5EF",
  borderRadius: 18,
  background: "#FFFFFF",
  padding: 18,
};

function formatStatus(status) {
  if (status === "orcamento_enviado") return "Enviado";
  if (status === "aprovada") return "Aprovado";
  if (status === "cancelada") return "Recusado";
  return "Rascunho";
}

function getLogoUrl(empresa) {
  if (!empresa?.logo) return "";
  if (String(empresa.logo).startsWith("http")) return empresa.logo;
  return empresa.logo;
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
  const logoUrl = getLogoUrl(empresa);

  const itemColumns = useMemo(
    () => [
      {
        title: "Item",
        dataIndex: "descricao",
        key: "descricao",
        render: (_, item) => (
          <div>
            <div style={{ fontWeight: 700, color: "#10233C", marginBottom: 4 }}>{item.descricao}</div>
            <div style={{ color: "#6B7280", fontSize: 12, lineHeight: 1.5 }}>
              {(item.codigo_referencia || item.produto_codigo || item.servico_codigo || "-")} | {item.unidade_referencia || "-"} | {item.origem_tipo === "servico" ? "Serviço" : item.origem_tipo === "produto" ? "Produto" : "Avulso"}
            </div>
          </div>
        ),
      },
      {
        title: "Qtd",
        dataIndex: "quantidade",
        key: "quantidade",
        width: 90,
        render: (value) => <span>{Number(value || 0).toLocaleString("pt-BR")}</span>,
      },
      {
        title: "Unitário",
        dataIndex: "valor_unitario",
        key: "valor_unitario",
        width: 140,
        render: (value) => formatMoneyTrailing(value),
      },
      {
        title: "Total",
        dataIndex: "valor_total",
        key: "valor_total",
        width: 140,
        render: (value) => <strong>{formatMoneyTrailing(value)}</strong>,
      },
    ],
    []
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

      <div className="print-toolbar" style={{ maxWidth: 1080, margin: "0 auto 16px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Voltar</Button>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Imprimir</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handlePdf} style={{ background: "#1B4F8A", borderColor: "#1B4F8A" }}>
            Gerar PDF
          </Button>
        </Space>
      </div>

      <Card className="print-sheet" bordered={false} style={pageCardStyle} bodyStyle={{ padding: 0 }}>
        <Skeleton active loading={loading} paragraph={{ rows: 12 }}>
          <div style={{ padding: 30, background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFD 100%)", borderBottom: "1px solid #E4EBF3" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, alignItems: "start" }}>
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                {logoUrl ? (
                  <div style={{ width: 92, height: 92, borderRadius: 18, background: "#FFFFFF", border: "1px solid #DDE5EF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    <img src={logoUrl} alt="Logo da empresa" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                ) : (
                  <div style={{ width: 92, height: 92, borderRadius: 18, background: "#1B4F8A", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26, flexShrink: 0 }}>
                    {(empresa?.nome || "ERP").slice(0, 3).toUpperCase()}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#1B4F8A", marginBottom: 8 }}>
                    {empresa?.razao_social || empresa?.nome || "Sua empresa"}
                  </div>
                  <div style={{ color: "#5A6070", lineHeight: 1.75, fontSize: 14 }}>
                    {empresa?.cnpj ? <div>CNPJ: {empresa.cnpj}</div> : null}
                    {empresa?.endereco ? <div>{empresa.endereco}</div> : null}
                    {empresa?.telefone ? <div>Telefone: {empresa.telefone}</div> : null}
                    {empresa?.email ? <div>Email: {empresa.email}</div> : null}
                    {empresa?.site ? <div>Site: {empresa.site}</div> : null}
                  </div>
                </div>
              </div>

              <div style={{ ...infoCardStyle, background: "#10233C", borderColor: "#10233C", color: "#FFFFFF" }}>
                <Tag color="blue" style={{ borderRadius: 999, padding: "6px 10px", fontWeight: 700, marginBottom: 10 }}>
                  PROPOSTA COMERCIAL
                </Tag>
                <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>{orcamento?.numero}</div>
                <div style={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.7 }}>
                  <div>Emitido em {dayjs().format("DD/MM/YYYY")}</div>
                  <div>Validade até {orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "a combinar"}</div>
                  <div>Status: {formatStatus(orcamento?.status)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, border: "1px solid #DDE5EF", borderRadius: 20, padding: 22, background: "linear-gradient(135deg, #FFFFFF 0%, #EEF5FC 100%)" }}>
              <Text style={{ ...sectionTitleStyle, display: "block", marginBottom: 8 }}>Descrição do serviço</Text>
              <Title level={3} style={{ marginTop: 0, marginBottom: 8, color: "#10233C" }}>
                Orçamento para {orcamento?.cliente_nome || orcamento?.cliente?.nome || "Cliente"}
              </Title>
              <Paragraph style={{ marginBottom: 0, color: "#445468", fontSize: 15, lineHeight: 1.8 }}>
                {orcamento?.descricao_servico || "Proposta comercial referente aos serviços e materiais descritos abaixo."}
              </Paragraph>
            </div>
          </div>

          <div style={{ padding: 30 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
              <div style={infoCardStyle}>
                <div style={sectionTitleStyle}>Dados da Empresa</div>
                <div style={{ color: "#10233C", fontWeight: 700, marginBottom: 8 }}>{empresa?.razao_social || empresa?.nome || "-"}</div>
                <div style={{ color: "#526173", lineHeight: 1.7 }}>
                  <div>CNPJ: {empresa?.cnpj || "-"}</div>
                  <div>Telefone: {empresa?.telefone || "-"}</div>
                  <div>Email: {empresa?.email || "-"}</div>
                </div>
              </div>

              <div style={infoCardStyle}>
                <div style={sectionTitleStyle}>Dados do Cliente</div>
                <div style={{ color: "#10233C", fontWeight: 700, marginBottom: 8 }}>{orcamento?.cliente_nome || orcamento?.cliente?.nome || "-"}</div>
                <div style={{ color: "#526173", lineHeight: 1.7 }}>
                  <div>Contato: {orcamento?.contato_nome || orcamento?.cliente_nome || "-"}</div>
                  <div>Condição de pagamento: {orcamento?.condicao_pagamento || "-"}</div>
                  <div>Regime tributário: {String(impostos?.regime || "-").replaceAll("_", " ")}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={sectionTitleStyle}>Itens do orçamento</div>
              <div style={{ border: "1px solid #DDE5EF", borderRadius: 18, overflow: "hidden" }}>
                <Table
                  columns={itemColumns}
                  dataSource={itens}
                  rowKey={(item) => item.id || item.key}
                  pagination={false}
                  style={{ marginBottom: 0 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
              <div style={infoCardStyle}>
                <div style={sectionTitleStyle}>Condições e observações</div>
                <Paragraph style={{ color: "#445468", lineHeight: 1.8, marginBottom: 12 }}>
                  {orcamento?.observacoes_tecnicas || "Proposta sujeita à aprovação comercial e confirmação de agenda operacional."}
                </Paragraph>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ border: "1px solid #E7EDF5", borderRadius: 14, padding: 14, background: "#F9FBFD" }}>
                    <div style={{ color: "#6B7C91", fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>Tipo de serviço</div>
                    <div style={{ color: "#10233C", fontWeight: 700 }}>{orcamento?.tipo_servico || "-"}</div>
                  </div>
                  <div style={{ border: "1px solid #E7EDF5", borderRadius: 14, padding: 14, background: "#F9FBFD" }}>
                    <div style={{ color: "#6B7C91", fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>Validade</div>
                    <div style={{ color: "#10233C", fontWeight: 700 }}>
                      {orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ ...infoCardStyle, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: 18, borderBottom: "1px solid #E8EEF6" }}>
                  <div style={sectionTitleStyle}>Resumo financeiro</div>
                </div>
                {[
                  ["Subtotal serviços", impostos?.subtotal_servicos || totaisItens.subtotalServicos || orcamento?.valor_servicos || 0],
                  ["Subtotal produtos", impostos?.subtotal_materiais || totaisItens.subtotalProdutos || orcamento?.valor_materiais || 0],
                  ["Subtotal orçamento", subtotalOrcamento],
                  ["Impostos estimados", impostoTotal],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #EEF2F6" }}>
                    <span style={{ color: "#445468" }}>{label}</span>
                    <strong style={{ color: "#10233C", fontSize: 15 }}>{formatMoneyTrailing(value)}</strong>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", background: "#1B4F8A", color: "#FFFFFF" }}>
                  <span style={{ fontWeight: 700 }}>Total geral</span>
                  <strong style={{ fontSize: 22 }}>{formatMoneyTrailing(totalComImpostos)}</strong>
                </div>
                <div style={{ padding: 16, background: "#F8FBFF", color: "#5A6070", fontSize: 12, lineHeight: 1.7 }}>
                  Impostos estimados para fins informativos, ainda não recolhidos na data desta proposta.
                </div>
              </div>
            </div>

            <Divider style={{ margin: "26px 0 18px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#6B7C91", fontSize: 12, flexWrap: "wrap" }}>
              <div>{empresa?.nome || "ERP"} </div>
              <div>{orcamento?.numero}</div>
              <div>Gerado em {dayjs().format("DD/MM/YYYY")}</div>
            </div>
          </div>
        </Skeleton>
      </Card>
    </div>
  );
}
