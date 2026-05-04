import { useEffect, useMemo, useState } from "react";
import { Button, Divider, Skeleton, Space, message } from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  MailOutlined,
  PhoneOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";
import { formatMoneyTrailing, normalizeList } from "./shared";

function getLogoUrl(empresa) {
  if (!empresa?.logo) return "";
  return String(empresa.logo);
}

function formatStatus(status) {
  const map = {
    orcamento_enviado: "Enviado",
    aprovada: "Aprovado",
    cancelada: "Recusado",
    lead: "Rascunho",
  };
  return map[status] || "Rascunho";
}

function statusColor(status) {
  if (status === "aprovada") return { bg: "#D1FAE5", color: "#065F46" };
  if (status === "cancelada") return { bg: "#FEE2E2", color: "#991B1B" };
  if (status === "orcamento_enviado")
    return { bg: "#DBEAFE", color: "#1E40AF" };
  return { bg: "#F1F5F9", color: "#475569" };
}

const LABEL = {
  color: "#64748B",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
  marginBottom: 2,
};

const VALUE = { color: "#0F172A", fontSize: 14, fontWeight: 500 };

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={LABEL}>{label}</div>
      <div style={VALUE}>{value}</div>
    </div>
  );
}

export default function ImpressaoOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orcamento, setOrcamento] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [impostosCalculados, setImpostosCalculados] = useState(null);
  const [logosClientes, setLogosClientes] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const [orRes, empRes, logosRes] = await Promise.all([
          api.get(`/ordens/${id}/`),
          api.get("/configuracoes/empresa/"),
          api.get("/configuracoes/logos-clientes/").catch(() => ({ data: [] })),
        ]);
        if (!active) return;
        setOrcamento(orRes.data);
        setEmpresa(empRes.data || {});
        setLogosClientes((logosRes.data || []).filter((l) => l.ativo));
      } catch {
        if (active) message.error("Não foi possível carregar o orçamento.");
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
    const calc = (filter) =>
      itens
        .filter(filter)
        .reduce(
          (s, i) =>
            s +
            Number(
              i.valor_total ||
                Number(i.quantidade || 0) * Number(i.valor_unitario || 0),
            ),
          0,
        );
    return {
      subtotal: calc(() => true),
      subtotalServicos: calc((i) => i.origem_tipo !== "produto"),
      subtotalProdutos: calc((i) => i.origem_tipo === "produto"),
    };
  }, [itens]);

  useEffect(() => {
    if (!orcamento) return;
    let active = true;
    api
      .post("/fiscal/calcular-impostos/", {
        valor_servicos: totaisItens.subtotalServicos,
        valor_materiais: totaisItens.subtotalProdutos,
      })
      .then((r) => {
        if (active) setImpostosCalculados(r.data || null);
      })
      .catch(() => {
        if (active) setImpostosCalculados(orcamento?.dados_impostos || null);
      });
    return () => {
      active = false;
    };
  }, [orcamento, totaisItens.subtotalProdutos, totaisItens.subtotalServicos]);

  const impostos = impostosCalculados || orcamento?.dados_impostos || {};
  const subtotalOrcamento = Number(
    orcamento?.valor_total_orcado || totaisItens.subtotal || 0,
  );
  const impostoTotal = Number(impostos?.total_impostos || 0);
  const totalComImpostos = Number(
    impostos?.total_geral || subtotalOrcamento + impostoTotal || 0,
  );
  const logoUrl = getLogoUrl(empresa);
  const stColor = statusColor(orcamento?.status);

  const itensProdutos = itens.filter((i) => i.origem_tipo === "produto");
  const itensServicos = itens.filter((i) => i.origem_tipo !== "produto");

  const handlePrint = () => window.print();
  const handlePdf = async () => {
    try {
      const response = await api.post(
        `/ordens/${id}/gerar-pdf-orcamento/`,
        {},
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${orcamento?.numero || `orcamento-${id}`}.pdf`,
      );
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
    <div
      style={{
        minHeight: "100vh",
        background: "#E8EDF4",
        padding: "24px 16px",
        fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body, #root { width: 100% !important; min-height: auto !important; overflow: visible !important; }
          .print-toolbar { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-page { background: white !important; padding: 0 !important; min-height: auto !important; }
          .doc-sheet {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
        .items-table th {
          background: #F8FAFC;
          color: #64748B;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          padding: 10px 14px;
          border-bottom: 1px solid #E2E8F0;
          text-align: left;
        }
        .items-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 13px;
          color: #1E293B;
          vertical-align: top;
        }
        .items-table tr:last-child td { border-bottom: none; }
        .items-table tr:hover td { background: #F8FAFC; }
      `}</style>

      {/* Toolbar */}
      <div
        className="print-toolbar"
        style={{
          maxWidth: 900,
          margin: "0 auto 16px",
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Imprimir
          </Button>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={handlePdf}
            style={{ background: "#3B82F6" }}
          >
            Gerar PDF
          </Button>
        </Space>
      </div>

      {/* Documento */}
      <div
        className="doc-sheet"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 8px 40px rgba(15,23,42,0.13)",
          overflow: "hidden",
        }}
      >
        <Skeleton
          active
          loading={loading}
          paragraph={{ rows: 14 }}
          style={{ padding: 32 }}
        >
          {/* ── CABEÇALHO DA EMPRESA ── */}
          <div style={{ background: "#0F172A", padding: "28px 36px" }}>
    <div
      className="print-page"
      style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              {/* Logo + dados empresa */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {logoUrl ? (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      background: "#3B82F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 22,
                      color: "#FFFFFF",
                      flexShrink: 0,
                    }}
                  >
                    {(empresa?.razao_social || empresa?.nome || "E")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      color: "#FFFFFF",
                      fontSize: 20,
                      fontWeight: 800,
                      marginBottom: 4,
                    }}
                  >
                    {empresa?.razao_social || empresa?.nome || "Sua Empresa"}
                  </div>
                  {empresa?.cnpj && (
                    <div style={{ color: "#94A3B8", fontSize: 12 }}>
                      CNPJ: {empresa.cnpj}
                    </div>
                  )}
                  {empresa?.endereco && (
                    <div style={{ color: "#94A3B8", fontSize: 12 }}>
                      {empresa.endereco}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {empresa?.telefone && (
                      <span
                        style={{
                          color: "#CBD5E1",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <PhoneOutlined /> {empresa.telefone}
                      </span>
                    )}
                    {empresa?.email && (
                      <span
                        style={{
                          color: "#CBD5E1",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MailOutlined /> {empresa.email}
                      </span>
                    )}
                    {empresa?.site && (
                      <span style={{ color: "#CBD5E1", fontSize: 12 }}>
                        {empresa.site}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Badge ORÇAMENTO */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-block",
                    background: "#3B82F6",
                    color: "#FFFFFF",
                    borderRadius: 8,
                    padding: "4px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  ORÇAMENTO
                </div>
                <div
                  style={{
                    color: "#FFFFFF",
                    fontSize: 26,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {orcamento?.numero || `#${id}`}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    alignItems: "flex-end",
                  }}
                >
                  <span style={{ color: "#94A3B8", fontSize: 12 }}>
                    Emitido em {dayjs().format("DD/MM/YYYY")}
                  </span>
                  {orcamento?.validade_orcamento && (
                    <span style={{ color: "#94A3B8", fontSize: 12 }}>
                      Válido até{" "}
                      {dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY")}
                    </span>
                  )}
                  <span
                    style={{
                      background: stColor.bg,
                      color: stColor.color,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: 999,
                      marginTop: 4,
                    }}
                  >
                    {formatStatus(orcamento?.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── DADOS DO CLIENTE ── */}
          <div
            style={{
              padding: "24px 36px",
              borderBottom: "1px solid #F1F5F9",
              background: "#FAFBFD",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#3B82F6",
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              Dados do Cliente
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px 32px",
              }}
            >
              <InfoRow
                label="Cliente"
                value={orcamento?.cliente_nome || orcamento?.cliente?.nome}
              />
              <InfoRow label="Contato" value={orcamento?.contato_nome} />
              <InfoRow
                label="Condição de pagamento"
                value={orcamento?.condicao_pagamento}
              />
              <InfoRow
                label="Tipo de serviço"
                value={orcamento?.tipo_servico}
              />
              <InfoRow label="Segmento" value={orcamento?.segmento} />
            </div>
          </div>

          {/* ── DESCRIÇÃO DO SERVIÇO ── */}
          <div
            style={{ padding: "20px 36px", borderBottom: "1px solid #F1F5F9" }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#3B82F6",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Descrição do Serviço
            </div>
            <div style={{ color: "#334155", fontSize: 14, lineHeight: 1.8 }}>
              {orcamento?.descricao_servico ||
                "Proposta comercial referente aos serviços e materiais descritos abaixo."}
            </div>
          </div>

          {/* ── ITENS: SERVIÇOS ── */}
          {itensServicos.length > 0 && (
            <div
              style={{
                padding: "20px 36px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#3B82F6",
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Serviços
              </div>
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <table
                  className="items-table"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th style={{ width: 80 }}>Qtd</th>
                      <th style={{ width: 100 }}>Unidade</th>
                      <th style={{ width: 130, textAlign: "right" }}>
                        Unitário
                      </th>
                      <th style={{ width: 130, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensServicos.map((item, idx) => {
                      const total = Number(
                        item.valor_total ||
                          Number(item.quantidade || 0) *
                            Number(item.valor_unitario || 0),
                      );
                      return (
                        <tr key={item.id || idx}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#0F172A" }}>
                              {item.descricao}
                            </div>
                            {item.codigo_referencia && (
                              <div
                                style={{
                                  color: "#94A3B8",
                                  fontSize: 11,
                                  marginTop: 2,
                                }}
                              >
                                Cód: {item.codigo_referencia}
                              </div>
                            )}
                          </td>
                          <td>
                            {Number(item.quantidade || 0).toLocaleString(
                              "pt-BR",
                            )}
                          </td>
                          <td style={{ color: "#64748B" }}>
                            {item.unidade_referencia || "uni"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatMoneyTrailing(item.valor_unitario)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            {formatMoneyTrailing(total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ITENS: PRODUTOS / MATERIAIS ── */}
          {itensProdutos.length > 0 && (
            <div
              style={{
                padding: "20px 36px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#3B82F6",
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Materiais e Produtos
              </div>
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <table
                  className="items-table"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th style={{ width: 80 }}>Qtd</th>
                      <th style={{ width: 100 }}>Unidade</th>
                      <th style={{ width: 130, textAlign: "right" }}>
                        Unitário
                      </th>
                      <th style={{ width: 130, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensProdutos.map((item, idx) => {
                      const total = Number(
                        item.valor_total ||
                          Number(item.quantidade || 0) *
                            Number(item.valor_unitario || 0),
                      );
                      return (
                        <tr key={item.id || idx}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#0F172A" }}>
                              {item.descricao}
                            </div>
                            {item.codigo_referencia && (
                              <div
                                style={{
                                  color: "#94A3B8",
                                  fontSize: 11,
                                  marginTop: 2,
                                }}
                              >
                                Cód: {item.codigo_referencia}
                              </div>
                            )}
                          </td>
                          <td>
                            {Number(item.quantidade || 0).toLocaleString(
                              "pt-BR",
                            )}
                          </td>
                          <td style={{ color: "#64748B" }}>
                            {item.unidade_referencia || "un"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatMoneyTrailing(item.valor_unitario)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            {formatMoneyTrailing(total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── RESUMO FINANCEIRO + OBSERVAÇÕES ── */}
          <div
            style={{
              padding: "24px 36px",
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* Observações */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#3B82F6",
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                Observações e Condições
              </div>
              <div
                style={{
                  color: "#475569",
                  fontSize: 13,
                  lineHeight: 1.85,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 16,
                  minHeight: 80,
                }}
              >
                {orcamento?.observacoes_tecnicas ||
                  "Proposta sujeita à aprovação comercial e confirmação de agenda operacional. Valores válidos conforme prazo de validade indicado."}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#94A3B8",
                  fontStyle: "italic",
                }}
              >
                * Impostos estimados para fins informativos, ainda não
                recolhidos na data desta proposta.
              </div>
            </div>

            {/* Resumo financeiro */}
            <div
              style={{
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: "#F8FAFC",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#64748B",
                    fontWeight: 700,
                  }}
                >
                  Resumo Financeiro
                </div>
              </div>
              {[
                ["Serviços", totaisItens.subtotalServicos, false],
                ["Materiais e produtos", totaisItens.subtotalProdutos, false],
                ["Impostos estimados", impostoTotal, false],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <span style={{ color: "#64748B", fontSize: 13 }}>
                    {label}
                  </span>
                  <span
                    style={{ color: "#0F172A", fontWeight: 500, fontSize: 13 }}
                  >
                    {formatMoneyTrailing(value)}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  background: "#3B82F6",
                }}
              >
                <span
                  style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}
                >
                  Total Geral
                </span>
                <span
                  style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 20 }}
                >
                  {formatMoneyTrailing(totalComImpostos)}
                </span>
              </div>
            </div>
          </div>

          {/* ── EMPRESAS QUE CONFIAM EM NÓS ── */}
          {logosClientes.length > 0 && (
            <div
              style={{
                padding: "24px 36px",
                borderTop: "1px solid #E2E8F0",
                background: "#FAFBFD",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#94A3B8",
                  fontWeight: 700,
                  marginBottom: 18,
                  textAlign: "center",
                }}
              >
                Empresas que confiam em nós
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px 28px",
                }}
              >
                {logosClientes.map((item) => (
                  <div
                    key={item.id}
                    title={item.nome}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                      opacity: 0.7,
                    }}
                  >
                    <img
                      src={item.logo_url || item.logo}
                      alt={item.nome}
                      style={{ maxHeight: 38, maxWidth: 100, objectFit: "contain", filter: "grayscale(30%)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RODAPÉ ── */}
          <div
            style={{
              background: "#F8FAFC",
              borderTop: "1px solid #E2E8F0",
              padding: "14px 36px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#94A3B8",
                fontSize: 11,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span>
                {empresa?.razao_social || empresa?.nome || "ERP Nexus"}
              </span>
              <span>{orcamento?.numero}</span>
              <span>Gerado em {dayjs().format("DD/MM/YYYY [às] HH:mm")}</span>
            </div>
          </div>
        </Skeleton>
      </div>
    </div>
  );
}
