import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, Skeleton, Space, Typography, message } from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../../services/api";
import { formatMoneyTrailing, normalizeList } from "./shared";

const { Text } = Typography;
const { TextArea } = Input;

function getLogoUrl(empresa) {
  if (!empresa?.logo) return "";
  return String(empresa.logo);
}

function getClientName(record) {
  return record?.cliente_nome || record?.cliente?.nome || "Cliente não informado";
}

function getDescription(record) {
  return record?.descricao_servico || record?.observacoes_tecnicas || "Sem descrição";
}

function getBudgetNumber(record) {
  if (record?.numero && String(record.numero).startsWith("ORC-")) return record.numero;
  const id = record?.id || 1;
  return `ORC-${dayjs().year()}-${String(id).padStart(4, "0")}`;
}

function calcOrcamentoTotals(orcamento) {
  const itens = normalizeList(orcamento?.itens);
  const subtotal = itens.reduce((sum, item) => {
    return sum + Number(item.valor_total || Number(item.quantidade || 0) * Number(item.valor_unitario || 0));
  }, 0);
  const desconto = Number(orcamento?.desconto || orcamento?.valor_desconto || 0);
  return { subtotal, desconto, liquido: Math.max(0, subtotal - desconto) };
}

export default function OrcamentoUnificado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  const [loading, setLoading] = useState(true);
  const [orcamentos, setOrcamentos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [logosClientes, setLogosClientes] = useState([]);
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const numeroUnificado = useMemo(() => `ORC-UNIF-${dayjs().year()}-${String(Date.now()).slice(-4)}`, []);

  useEffect(() => {
    if (ids.length < 2) {
      setLoading(false);
      return;
    }
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const promises = [
          api.get("/configuracoes/empresa/"),
          api.get("/configuracoes/logos-clientes/").catch(() => ({ data: [] })),
          ...ids.map((id) => api.get(`/ordens/${id}/`)),
        ];
        const results = await Promise.all(promises);
        if (!active) return;
        const [empRes, logosRes, ...orcRes] = results;
        setEmpresa(empRes.data || {});
        setLogosClientes((logosRes.data || []).filter((l) => l.ativo));
        setOrcamentos(orcRes.map((r) => r.data));
      } catch {
        if (active) {
          setError("Não foi possível carregar um ou mais orçamentos.");
          message.error("Erro ao carregar orçamentos.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  const subtotalGeral = useMemo(() => orcamentos.reduce((sum, orc) => sum + calcOrcamentoTotals(orc).subtotal, 0), [orcamentos]);
  const descontoTotal = useMemo(() => orcamentos.reduce((sum, orc) => sum + calcOrcamentoTotals(orc).desconto, 0), [orcamentos]);
  const totalGeral = useMemo(() => orcamentos.reduce((sum, orc) => sum + calcOrcamentoTotals(orc).liquido, 0), [orcamentos]);

  const validadeMenor = useMemo(() => {
    const validades = orcamentos
      .map((orc) => orc?.validade_orcamento)
      .filter(Boolean)
      .map((d) => dayjs(d))
      .filter((d) => d.isValid());
    if (validades.length === 0) return null;
    return validades.reduce((min, d) => (d.isBefore(min) ? d : min));
  }, [orcamentos]);

  const logoUrl = getLogoUrl(empresa);
  const empresaInitials = (empresa?.razao_social || empresa?.nome || "E").slice(0, 2).toUpperCase();

  const handlePrint = () => window.print();

  const handlePdf = async () => {
    let wrapper = null;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const element = document.querySelector(".doc-sheet");
      wrapper = document.createElement("div");
      wrapper.style.cssText = [
        "position: fixed",
        "top: 0",
        "left: -9999px",
        "width: 1123px",
        "background: #FFFFFF",
        "z-index: -1000",
        "overflow: visible",
      ].join("; ");

      const clone = element.cloneNode(true);
      clone.style.cssText = [
        "width: 1123px",
        "max-width: 1123px",
        "margin: 0",
        "border-radius: 0",
        "box-shadow: none",
        "overflow: visible",
        "background: #FFFFFF",
      ].join("; ");

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FFFFFF",
        windowWidth: 1123,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });

      document.body.removeChild(wrapper);
      wrapper = null;

      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgWidthMm = pageW;
      const imgHeightMm = (canvas.height * pageW) / canvas.width;

      if (imgHeightMm <= pageH) {
        const offsetY = (pageH - imgHeightMm) / 2;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, offsetY, imgWidthMm, imgHeightMm);
      } else {
        const slicePx = Math.round((pageH * canvas.width) / pageW);
        const totalPages = Math.ceil(canvas.height / slicePx);
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();
          const srcY = page * slicePx;
          const srcH = Math.min(slicePx, canvas.height - srcY);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = slicePx;
          const ctx = slice.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
          const sliceHMm = (srcH * pageW) / canvas.width;
          pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, sliceHMm);
        }
      }

      pdf.save("orcamento-unificado.pdf");
      message.success("PDF gerado com sucesso.");
    } catch (err) {
      if (wrapper) document.body.removeChild(wrapper);
      console.error("Erro ao gerar PDF:", err);
      message.error("Não foi possível gerar o PDF.");
    }
  };

  if (!loading && ids.length < 2) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Alert
          type="warning"
          message="Seleção insuficiente"
          description="Selecione ao menos 2 orçamentos para utilizar a funcionalidade de unificação."
          showIcon
          style={{ maxWidth: 480, marginBottom: 16 }}
        />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/orcamentos")}>
          Voltar para Orçamentos
        </Button>
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Alert
          type="error"
          message="Erro ao carregar"
          description={error}
          showIcon
          style={{ maxWidth: 480, marginBottom: 16 }}
        />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/orcamentos")}>
          Voltar para Orçamentos
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        padding: "24px 16px",
        fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <style>{`
        @media print {
          @page { size: 297mm 210mm; margin: 0mm !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body, #root { width: 297mm !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .ant-layout-sider, [class*="sidebar"], [class*="Sidebar"], nav, header, .print-toolbar, .print-obs-area, .ant-layout-header, aside { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .doc-sheet { width: 297mm !important; max-width: 297mm !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
        }
        .unif-item-table { width: 100%; border-collapse: collapse; }
        .unif-item-table th {
          background: #1E3A5F; color: #fff; font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.06em; font-weight: 700; padding: 8px 12px; text-align: left;
        }
        .unif-item-table th.right, .unif-item-table td.right { text-align: right; }
        .unif-item-table th.center, .unif-item-table td.center { text-align: center; }
        .unif-item-table td { padding: 7px 12px; font-size: 12px; color: #1E293B; border-bottom: 1px solid #E2E8F0; }
        .unif-item-table tr:nth-child(even) td { background: #F8FAFC; }
        .unif-item-table tr:nth-child(odd) td { background: #FFFFFF; }
      `}</style>

      {/* ── TOOLBAR ── */}
      <div
        className="print-toolbar"
        style={{
          maxWidth: 1160,
          margin: "0 auto 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/orcamentos")}>
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
            style={{ background: "#3B82F6", borderColor: "#3B82F6" }}
          >
            Salvar PDF
          </Button>
        </Space>
      </div>

      {/* ── CAMPO DE OBSERVAÇÕES (editável antes de imprimir) ── */}
      <div className="print-obs-area" style={{ maxWidth: 1160, margin: "0 auto 16px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: 16,
            border: "1px solid #E2E6EC",
          }}
        >
          <Text strong style={{ display: "block", marginBottom: 6, color: "#1E293B" }}>
            Observações unificadas (opcional — aparecerá no documento)
          </Text>
          <TextArea
            rows={3}
            placeholder="Adicione condições gerais, validade, observações para o cliente..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>

      {/* ── DOCUMENTO ── */}
      <div
        className="doc-sheet"
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          background: "#FFFFFF",
          borderRadius: 12,
          boxShadow: "0 8px 40px rgba(15,23,42,0.13)",
          overflow: "hidden",
        }}
      >
        <Skeleton active loading={loading} paragraph={{ rows: 18 }} style={{ padding: 24 }}>

          {/* ═══ CABEÇALHO ═══ */}
          <div style={{ background: "linear-gradient(135deg, #1a6b58 0%, #0d4d40 100%)", padding: "16px 28px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>

              {/* Esquerda: empresa */}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ color: "#94A3B8", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", marginBottom: 8 }}>
                  ORÇAMENTO UNIFICADO
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: 7, background: "#FFFFFF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", flexShrink: 0,
                    }}
                  >
                    {logoUrl
                      ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      : <span style={{ fontSize: 16, fontWeight: 800, color: "#0d4d40" }}>{empresaInitials}</span>
                    }
                  </div>
                  <div>
                    <div style={{ color: "#FFFFFF", fontSize: 17, fontWeight: 800, lineHeight: 1.15, marginBottom: 2 }}>
                      {empresa?.razao_social || empresa?.nome || "Sua Empresa"}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 10, marginBottom: 4, lineHeight: 1.5 }}>
                      {[empresa?.cnpj && `CNPJ: ${empresa.cnpj}`, empresa?.telefone, empresa?.email].filter(Boolean).join(" | ")}
                    </div>
                    {empresa?.endereco && (
                      <div style={{ color: "#94A3B8", fontSize: 10 }}>{empresa.endereco}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Direita: box do documento unificado */}
              <div style={{ background: "rgba(0,0,0,0.32)", borderRadius: 10, padding: "12px 18px", minWidth: 240 }}>
                <div style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                  {numeroUnificado}
                </div>
                {[
                  ["Emitido em", dayjs().format("DD/MM/YYYY")],
                  ["Válido até", validadeMenor ? validadeMenor.format("DD/MM/YYYY") : "—"],
                  ["Orçamentos", `${ids.length} unificados`],
                  ["Total geral", formatMoneyTrailing(totalGeral)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, gap: 10 }}>
                    <span style={{ color: "#94A3B8", fontSize: 11, whiteSpace: "nowrap" }}>{label}:</span>
                    <span
                      style={{
                        color: label === "Total geral" ? "#FFFFFF" : "#CBD5E1",
                        fontSize: 11,
                        fontWeight: label === "Total geral" ? 700 : 400,
                        textAlign: "right",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Logos de parceiros */}
            {logosClientes.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {logosClientes.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: "3px 8px",
                      display: "flex", alignItems: "center",
                    }}
                  >
                    <img
                      src={item.logo_url || item.logo}
                      alt={item.nome}
                      style={{ maxHeight: 22, maxWidth: 64, objectFit: "contain", filter: "brightness(2)" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══ CLIENTE PRINCIPAL ═══ */}
          {orcamentos.length > 0 && (
            <div style={{ padding: "10px 28px", borderBottom: "1px solid #EDF0F5", background: "#FAFBFD" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 3 }}>
                CLIENTE PRINCIPAL
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
                {getClientName(orcamentos[0])}
              </div>
            </div>
          )}

          {/* ═══ SEÇÕES POR ORÇAMENTO ═══ */}
          <div style={{ padding: "12px 28px 4px" }}>
            {orcamentos.map((orc, idx) => {
              const itens = normalizeList(orc?.itens);
              const numero = getBudgetNumber(orc);
              const clienteNome = getClientName(orc);
              const descricao = getDescription(orc);
              const { subtotal, desconto, liquido } = calcOrcamentoTotals(orc);

              return (
                <div key={orc?.id || idx} style={{ marginBottom: 24 }}>
                  {/* Header da seção */}
                  <div
                    style={{
                      background: "linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)",
                      color: "#fff",
                      padding: "7px 14px",
                      borderRadius: "6px 6px 0 0",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap" }}>{numero} · {clienteNome}</span>
                    <span
                      style={{
                        opacity: 0.85, fontWeight: 400, fontSize: 10,
                        maxWidth: 380, textAlign: "right",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {descricao}
                    </span>
                  </div>

                  {/* Tabela de itens */}
                  <table className="unif-item-table">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>#</th>
                        <th>Descrição</th>
                        <th className="center" style={{ width: 60 }}>Qtd</th>
                        <th className="center" style={{ width: 70 }}>Unidade</th>
                        <th className="right" style={{ width: 130 }}>Preço Unit.</th>
                        <th className="right" style={{ width: 130 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", color: "#94A3B8", padding: 14 }}>
                            Nenhum item cadastrado neste orçamento.
                          </td>
                        </tr>
                      ) : itens.map((item, i) => {
                        const total = Number(item.valor_total || Number(item.quantidade || 0) * Number(item.valor_unitario || 0));
                        return (
                          <tr key={item.id || i}>
                            <td style={{ color: "#94A3B8", fontSize: 11 }}>{i + 1}</td>
                            <td>{item.descricao || "—"}</td>
                            <td className="center">{Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
                            <td className="center">{item.unidade_referencia || "—"}</td>
                            <td className="right">{formatMoneyTrailing(item.valor_unitario)}</td>
                            <td className="right" style={{ fontWeight: 600 }}>{formatMoneyTrailing(total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Subtotal da seção */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E6EC",
                      borderTop: "none",
                      borderRadius: "0 0 6px 6px",
                      padding: "8px 14px",
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 24,
                      fontSize: 12,
                    }}
                  >
                    {desconto > 0 && (
                      <>
                        <span style={{ color: "#64748B" }}>
                          Subtotal: <strong>{formatMoneyTrailing(subtotal)}</strong>
                        </span>
                        <span style={{ color: "#B91C1C" }}>
                          Desconto: <strong>- {formatMoneyTrailing(desconto)}</strong>
                        </span>
                      </>
                    )}
                    <span style={{ color: "#15803D", fontWeight: 700, fontSize: 13 }}>
                      {desconto > 0 ? "Líquido" : "Subtotal"}: {formatMoneyTrailing(liquido)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══ TOTAIS GERAIS ═══ */}
          <div style={{ padding: "10px 28px 18px", borderTop: "2px solid #E2E6EC" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ minWidth: 340, maxWidth: 380 }}>
                {[
                  ["Subtotal geral", formatMoneyTrailing(subtotalGeral)],
                  ...(descontoTotal > 0 ? [["Desconto total", `- ${formatMoneyTrailing(descontoTotal)}`]] : []),
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 14 }}>
                    <span style={{ color: "#64748B", fontSize: 12 }}>{label}</span>
                    <span style={{ color: String(label).includes("Desconto") ? "#B91C1C" : "#1E293B", fontSize: 12 }}>
                      {value}
                    </span>
                  </div>
                ))}
                <div style={{ height: 2, background: "#3B82F6", margin: "8px 0", borderRadius: 2 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>TOTAL GERAL</span>
                  <span style={{ fontWeight: 800, fontSize: 22, color: "#3B82F6" }}>
                    {formatMoneyTrailing(totalGeral)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ CONDIÇÕES / OBSERVAÇÕES ═══ */}
          {(orcamentos[0]?.condicao_pagamento || observacoes) && (
            <div
              style={{
                padding: "12px 28px",
                borderTop: "1px solid #EDF0F5",
                background: "#FAFBFD",
                display: "grid",
                gridTemplateColumns:
                  orcamentos[0]?.condicao_pagamento && observacoes ? "1fr 1fr" : "1fr",
                gap: 24,
              }}
            >
              {orcamentos[0]?.condicao_pagamento && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 5 }}>
                    FORMA DE PAGAMENTO
                  </div>
                  <div style={{ fontSize: 12, color: "#1E293B" }}>{orcamentos[0].condicao_pagamento}</div>
                </div>
              )}
              {observacoes && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 5 }}>
                    OBSERVAÇÕES GERAIS
                  </div>
                  <div style={{ fontSize: 12, color: "#1E293B", whiteSpace: "pre-line" }}>{observacoes}</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ASSINATURA ═══ */}
          <div style={{ padding: "16px 28px 12px", borderTop: "1px solid #EDF0F5" }}>
            <div style={{ display: "flex", gap: 48, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{ borderBottom: "1.5px solid #94A3B8", marginBottom: 6, height: 30 }} />
                <div style={{ fontSize: 11, color: "#64748B", textAlign: "center" }}>
                  Assinatura do cliente
                </div>
              </div>
              <div style={{ width: 200 }}>
                <div style={{ borderBottom: "1.5px solid #94A3B8", marginBottom: 6, height: 30 }} />
                <div style={{ fontSize: 11, color: "#64748B", textAlign: "center" }}>
                  Data: ___/___/______
                </div>
              </div>
            </div>
          </div>

          {/* ═══ RODAPÉ ═══ */}
          <div
            style={{
              background: "#F8FAFC",
              borderTop: "1px solid #E2E8F0",
              padding: "8px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#94A3B8", fontSize: 10 }}>
              {[
                empresa?.razao_social || empresa?.nome,
                empresa?.cnpj && `CNPJ: ${empresa.cnpj}`,
                empresa?.telefone,
                empresa?.endereco,
              ].filter(Boolean).join(" · ")}
            </span>
            <span style={{ color: "#94A3B8", fontSize: 10 }}>
              Emitido em {dayjs().format("DD/MM/YYYY")}
            </span>
          </div>

        </Skeleton>
      </div>
    </div>
  );
}
