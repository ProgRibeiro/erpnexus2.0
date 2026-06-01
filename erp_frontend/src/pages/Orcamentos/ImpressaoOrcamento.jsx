import { useEffect, useMemo, useState } from "react";
import { Button, Skeleton, Space, message } from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
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
  const subtotalItens = totaisItens.subtotal;
  const descontoOrcamento = Number(orcamento?.desconto || orcamento?.valor_desconto || 0);
  const tipoDescontoOrcamento = orcamento?.tipo_desconto || "valor";
  const percentualDescontoOrcamento = Number(orcamento?.percentual_desconto || 0);
  const descontoLabel =
    tipoDescontoOrcamento === "percentual" && percentualDescontoOrcamento > 0
      ? `DESCONTO (${percentualDescontoOrcamento}%)`
      : "DESCONTO";
  const descontoLabelMinusculo =
    tipoDescontoOrcamento === "percentual" && percentualDescontoOrcamento > 0
      ? `Desconto (${percentualDescontoOrcamento}%)`
      : "Desconto";
  const impostoTotal = Number(impostos?.total_impostos || 0);
  const totalOrcamentoSemImpostos = Number(
    orcamento?.valor_total_orcado || Math.max(0, subtotalItens - descontoOrcamento) || 0,
  );
  const totalProposta = Math.max(0, totalOrcamentoSemImpostos + impostoTotal);
  const baseCalculo = Math.max(0, subtotalItens - descontoOrcamento);
  const logoUrl = getLogoUrl(empresa);
  const printScaleClass = itens.length <= 6 ? "print-scale-100" : itens.length <= 12 ? "print-scale-88" : "print-scale-72";
  const printSizeClass = `print-compact print-single-page ${printScaleClass}`;

  const regimeLabels = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };
  const regimeExibir = regimeLabels[impostos?.regime] || regimeLabels[empresa?.regime_tributario] || "—";
  const aliquotaPercentual = baseCalculo > 0 ? ((impostoTotal / baseCalculo) * 100).toFixed(2) : "0.00";
  const aliquotaExibir = impostoTotal > 0 ? `${aliquotaPercentual}%` : "—";

  const empresaInitials = (empresa?.razao_social || empresa?.nome || "E").slice(0, 2).toUpperCase();

  const statusStamp = {
    orcamento_enviado: { label: "ENVIADO", color: "#FFFFFF", bg: "#2563EB", borderColor: "#1E40AF" },
    aprovada:          { label: "APROVADO", color: "#FFFFFF", bg: "#10B981", borderColor: "#047857" },
    cancelada:         { label: "RECUSADO", color: "#FFFFFF", bg: "#EF4444", borderColor: "#DC2626" },
  }[orcamento?.status] || { label: "RASCUNHO", color: "#111827", bg: "#FBBF24", borderColor: "#F59E0B" };

  const gerarPdfUmaPagina = async () => {
    let wrapper = null;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const element = document.querySelector(".doc-sheet");
      if (!element) {
        throw new Error("Documento de impressão não encontrado.");
      }

      wrapper = document.createElement("div");
      wrapper.style.cssText = [
        "position: fixed",
        "top: 0",
        "left: -9999px",
        "width: 1123px",
        "height: 794px",
        "background: #FFFFFF",
        "z-index: -1000",
        "overflow: hidden",
        "font-family: Inter, 'Segoe UI', system-ui, sans-serif",
      ].join("; ");

      const clone = element.cloneNode(true);
      clone.classList.add("print-compact", "print-single-page", "print-scale-100");
      clone.style.cssText = [
        "width: 1123px",
        "max-width: 1123px",
        "height: 794px",
        "max-height: 794px",
        "margin: 0",
        "border-radius: 0",
        "box-shadow: none",
        "overflow: hidden",
        "background: #FFFFFF",
        "position: relative",
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
      const fitScale = Math.min(1, pageH / imgHeightMm, pageW / imgWidthMm);
      const outputWidthMm = imgWidthMm * fitScale;
      const outputHeightMm = imgHeightMm * fitScale;
      const offsetX = (pageW - outputWidthMm) / 2;
      const offsetY = (pageH - outputHeightMm) / 2;

      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        offsetX,
        offsetY,
        outputWidthMm,
        outputHeightMm,
      );

      return pdf;
    } catch (error) {
      if (wrapper) document.body.removeChild(wrapper);
      throw error;
    }
  };

  const handlePrint = async () => {
    try {
      const pdf = await gerarPdfUmaPagina();
      pdf.autoPrint();
      const blobUrl = pdf.output("bloburl");
      window.open(blobUrl, "_blank");
      message.success("PDF de impressão gerado em uma única página.");
    } catch (error) {
      console.error("Erro ao imprimir:", error);
      message.error("Não foi possível preparar a impressão.");
    }
  };

  const handlePdf = async () => {
    try {
      const pdf = await gerarPdfUmaPagina();
      pdf.save(`${orcamento?.numero || `orcamento-${id}`}.pdf`);
      message.success("PDF gerado com sucesso.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      message.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EEF2F7",
        padding: "28px 16px",
        fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          @page { size: 297mm 210mm; margin: 0mm !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body, #root { width: 297mm !important; height: 210mm !important; min-height: 210mm !important; max-height: 210mm !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .ant-layout-sider, [class*="sidebar"], [class*="Sidebar"], nav, header, .print-toolbar, .ant-layout-header, aside { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          body > div:first-child { height: 210mm !important; min-height: 210mm !important; max-height: 210mm !important; padding: 0 !important; overflow: hidden !important; }
          .doc-sheet {
            width: 297mm !important;
            max-width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            overflow: hidden !important;
            position: relative !important;
          }
          .doc-sheet::after {
            content: "" !important;
            display: block !important;
            clear: both !important;
          }
          .print-single-page {
            transform-origin: top left !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .print-scale-100.doc-sheet {
            width: 297mm !important;
            max-width: 297mm !important;
            zoom: 1 !important;
          }
          .print-scale-88.doc-sheet {
            width: 337.5mm !important;
            max-width: 337.5mm !important;
            zoom: 0.88 !important;
          }
          .print-scale-72.doc-sheet {
            width: 412.5mm !important;
            max-width: 412.5mm !important;
            zoom: 0.72 !important;
          }
          .proposal-header,
          .proposal-metrics,
          .proposal-info,
          .proposal-description,
          .proposal-items-section,
          .proposal-totals,
          .proposal-logos,
          .proposal-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .proposal-items-table { break-inside: auto !important; page-break-inside: auto !important; }
          .proposal-items-table thead { display: table-header-group !important; }
          .proposal-items-table tr { break-inside: avoid !important; page-break-inside: avoid !important; }
          .proposal-header { min-height: 40mm !important; }
          .proposal-header-content { padding: 12px 22px 10px !important; }
          .proposal-logo-box { width: 38px !important; height: 38px !important; border-radius: 8px !important; }
          .proposal-company-name { font-size: 15px !important; }
          .proposal-number-box { font-size: 18px !important; padding: 3px 10px !important; }
          .proposal-number-panel { padding: 6px 10px !important; min-width: 170px !important; }
          .proposal-status-badge { padding: 3px 10px !important; font-size: 9px !important; }
          .proposal-metric-card { padding: 7px 14px !important; }
          .proposal-metric-value { font-size: 13px !important; }
          .proposal-metric-value.highlight { font-size: 16px !important; }
          .proposal-info-card { padding-top: 8px !important; padding-bottom: 8px !important; }
          .proposal-description { padding: 8px 20px !important; }
          .proposal-description-box { padding: 7px 10px !important; }
          .proposal-description-text { font-size: 9.5px !important; line-height: 1.28 !important; }
          .proposal-items-section { padding: 0 20px !important; }
          .proposal-items-title { padding-top: 8px !important; padding-bottom: 5px !important; }
          .proposal-items-table { margin-top: 0 !important; }
          .proposal-items-table th { padding-top: 6px !important; padding-bottom: 6px !important; font-size: 8.5px !important; }
          .item-row td { padding-top: 6px !important; padding-bottom: 6px !important; font-size: 10px !important; }
          .proposal-item-index { width: 18px !important; height: 18px !important; font-size: 8px !important; }
          .proposal-item-main { font-size: 10px !important; line-height: 1.15 !important; }
          .proposal-totals {
            position: absolute !important;
            right: 20px !important;
            bottom: 34px !important;
            width: 78mm !important;
            padding: 0 !important;
            z-index: 2 !important;
          }
          .proposal-totals > div { min-width: 0 !important; width: 100% !important; max-width: 100% !important; box-shadow: none !important; }
          .proposal-total-line { padding-top: 4px !important; padding-bottom: 4px !important; }
          .proposal-total-final { padding-top: 8px !important; padding-bottom: 8px !important; }
          .proposal-total-final-value { font-size: 17px !important; }
          .proposal-footer {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            padding: 7px 22px !important;
            z-index: 3 !important;
          }
          .proposal-logos { display: none !important; }
        }
        .print-compact.proposal-document .proposal-header { min-height: 120px !important; }
        .print-compact.proposal-document .proposal-header-content { padding: 16px 26px 14px !important; }
        .print-compact.proposal-document .proposal-kicker { margin-bottom: 8px !important; }
        .print-compact.proposal-document .proposal-logo-box { width: 46px !important; height: 46px !important; border-radius: 10px !important; }
        .print-compact.proposal-document .proposal-company-name { font-size: 17px !important; }
        .print-compact.proposal-document .proposal-number-box { font-size: 22px !important; padding: 4px 14px !important; }
        .print-compact.proposal-document .proposal-number-panel { padding: 8px 12px !important; min-width: 180px !important; }
        .print-compact.proposal-document .proposal-status-badge { padding: 4px 14px !important; }
        .print-compact.proposal-document .proposal-metric-card { padding: 10px 20px !important; }
        .print-compact.proposal-document .proposal-metric-value { font-size: 16px !important; }
        .print-compact.proposal-document .proposal-metric-value.highlight { font-size: 20px !important; }
        .print-compact.proposal-document .proposal-info-card { padding-top: 12px !important; padding-bottom: 12px !important; }
        .print-compact.proposal-document .proposal-section-title { margin-bottom: 7px !important; }
        .print-compact.proposal-document .proposal-description { padding: 10px 32px !important; }
        .print-compact.proposal-document .proposal-description-box { padding: 10px 14px !important; }
        .print-compact.proposal-document .proposal-description-text { line-height: 1.4 !important; font-size: 10.8px !important; }
        .print-compact.proposal-document .proposal-items-title { padding-top: 10px !important; }
        .print-compact.proposal-document .proposal-items-table { margin-top: 7px !important; }
        .print-compact.proposal-document .proposal-items-table th { padding-top: 8px !important; padding-bottom: 8px !important; }
        .print-compact.proposal-document .item-row td { padding-top: 8px !important; padding-bottom: 8px !important; }
        .print-compact.proposal-document .proposal-item-main { font-size: 12px !important; }
        .print-compact.proposal-document .proposal-totals { padding: 0 !important; }
        .print-compact.proposal-document .proposal-total-line { padding-top: 6px !important; padding-bottom: 6px !important; }
        .print-compact.proposal-document .proposal-total-final { padding-top: 11px !important; padding-bottom: 11px !important; }
        .print-compact.proposal-document .proposal-total-final-value { font-size: 21px !important; }
        .print-compact.proposal-document .proposal-logos { padding-top: 10px !important; padding-bottom: 10px !important; }
        .print-compact.proposal-document .proposal-footer { padding-top: 9px !important; padding-bottom: 9px !important; }
        .print-single-page.proposal-document .proposal-totals { break-inside: avoid; page-break-inside: avoid; }
        .proposal-document {
          position: relative;
          overflow: visible !important;
        }
        .proposal-items-section {
          padding-bottom: 18px !important;
        }
        .proposal-totals {
          position: static !important;
          width: 100% !important;
          padding: 0 32px 18px !important;
          z-index: 2 !important;
          background: #FFFFFF;
        }
        .proposal-totals > div {
          width: min(100%, 350px) !important;
          min-width: 0 !important;
          max-width: 100% !important;
          margin-left: auto !important;
        }
        .proposal-footer {
          position: static !important;
          z-index: 3 !important;
        }
        .proposal-table-wrap {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
        }
        .item-row:nth-child(even) td { background: #F8FAFC; }
        .item-row:hover td { background: #F1F5F9 !important; transition: background 0.15s; }
        .item-row td { padding: 10px 16px; border-bottom: 1px solid #E5E7EB; font-size: 12.5px; color: #111827; transition: background 0.15s; }
        .item-row:last-child td { border-bottom: none; }
        .proposal-item-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: #EEF2FF;
          color: #2563EB;
          font-size: 10px;
          font-weight: 900;
          flex-shrink: 0;
        }
        @media (max-width: 960px) {
          .proposal-document {
            max-width: 100% !important;
            aspect-ratio: auto !important;
            border-radius: 8px !important;
          }
          .proposal-header {
            grid-template-columns: 1fr !important;
          }
          .proposal-header-actions {
            grid-template-columns: 1fr 1fr !important;
            padding-top: 0 !important;
          }
          .proposal-info-grid {
            grid-template-columns: 1fr !important;
          }
          .proposal-totals {
            padding: 0 24px 18px !important;
          }
        }
        @media (max-width: 640px) {
          .proposal-header > div,
          .proposal-header-actions,
          .proposal-description,
          .proposal-items-section,
          .proposal-totals,
          .proposal-logos,
          .proposal-footer {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          .proposal-header-actions {
            grid-template-columns: 1fr !important;
          }
          .proposal-company-name {
            font-size: 15px !important;
            line-height: 1.2 !important;
          }
          .proposal-number-box,
          .proposal-total-final-value {
            font-size: 20px !important;
          }
          .proposal-items-table {
            min-width: 720px;
          }
          .proposal-totals > div {
            width: 100% !important;
          }
          .proposal-footer {
            align-items: flex-start !important;
          }
          .proposal-footer > div:last-child {
            text-align: left !important;
          }
        }
        @media print {
          .proposal-document {
            overflow: hidden !important;
          }
          .proposal-items-section {
            padding-bottom: 128px !important;
          }
          .proposal-totals {
            position: absolute !important;
            right: 20px !important;
            bottom: 34px !important;
            width: 78mm !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .proposal-totals > div {
            width: 100% !important;
            margin-left: 0 !important;
          }
          .proposal-footer {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          .proposal-table-wrap {
            overflow: visible !important;
          }
        }
      `}</style>

      {/* ── TOOLBAR ── */}
      <div className="print-toolbar" style={{ maxWidth: 1100, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ borderRadius: 8 }}>Voltar</Button>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint} style={{ borderRadius: 8 }}>Imprimir</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handlePdf} style={{ background: "#2563EB", borderRadius: 8 }}>Salvar PDF</Button>
        </Space>
      </div>

      {/* ── DOCUMENTO ── */}
      <div className={`doc-sheet proposal-document ${printSizeClass}`} style={{ width: "100%", maxWidth: 1100, margin: "0 auto", background: "#FFFFFF", borderRadius: 10, boxShadow: "0 24px 70px rgba(15,23,42,0.16), 0 4px 18px rgba(15,23,42,0.08)", border: "1px solid #DDE3EE", position: "relative" }}>
        <Skeleton active loading={loading} paragraph={{ rows: 18 }} style={{ padding: 32 }}>

          <div className="proposal-header" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", minHeight: 140, background: "linear-gradient(135deg, #0F172A 0%, #1A2744 50%, #0F172A 100%)", borderBottom: "3px solid #3B82F6" }}>
            <div style={{ padding: "28px 32px", borderLeft: "6px solid #3B82F6", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div className="proposal-kicker" style={{ color: "#60A5FA", fontSize: 11, fontWeight: 900, letterSpacing: "0.25em", marginBottom: 8, textTransform: "uppercase" }}>
                  ✓ Proposta Comercial
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}>
                  <div className="proposal-logo-box" style={{ width: 52, height: 52, borderRadius: 12, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 4px 12px rgba(15,23,42,0.3)" }}>
                    {logoUrl
                      ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      : <span style={{ fontSize: 20, fontWeight: 900, color: "#3B82F6" }}>{empresaInitials}</span>
                    }
                  </div>
                  <div>
                    <div className="proposal-company-name" style={{ color: "#F8FAFC", fontSize: 19, fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.3 }}>
                      {empresa?.razao_social || empresa?.nome || "Sua Empresa"}
                    </div>
                    <div style={{ color: "#CBD5E1", fontSize: 11, marginTop: 4, fontWeight: 600 }}>
                      {[empresa?.email, empresa?.telefone && `(${empresa.telefone})`].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="proposal-header-actions" style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 12, justifyContent: "space-between" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.15)", border: "2px solid #3B82F6", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ color: "#93C5FD", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Número</div>
                <div style={{ color: "#FFFFFF", fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>{orcamento?.numero || `ORC-${id}`}</div>
              </div>
              <div style={{ background: "#3B82F6", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ color: "#DBEAFE", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Valor Total</div>
                <div style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{formatMoneyTrailing(totalProposta)}</div>
                <span className="proposal-status-badge" style={{ background: statusStamp.bg, color: statusStamp.color, borderRadius: 8, padding: "6px 12px", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-block", border: `2px solid ${statusStamp.borderColor}` }}>
                  {statusStamp.label}
                </span>
              </div>
            </div>
          </div>

          <div className="proposal-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr 0.85fr", gap: 14, padding: "16px 24px 12px", background: "#0F172A", borderBottom: "2px solid #1E293B" }}>
            <div style={{ background: "#111827", border: "2px solid #1E293B", borderLeft: "6px solid #3B82F6", borderRadius: 9, padding: 13 }}>
              <div style={{ color: "#60A5FA", fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 9 }}>Cliente</div>
              <div style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 850 }}>{orcamento?.cliente_nome || "-"}</div>
              <div style={{ color: "#94A3B8", fontSize: 10.5, marginTop: 6 }}>
                {[orcamento?.cliente_cnpj_cpf, orcamento?.cliente_email, orcamento?.cliente_telefone].filter(Boolean).join("  |  ") || "Dados complementares não informados"}
              </div>
            </div>
            <div style={{ background: "#111827", border: "2px solid #1E293B", borderLeft: "6px solid #10B981", borderRadius: 9, padding: 13 }}>
              <div style={{ color: "#6EE7B7", fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 9 }}>Condições</div>
              <div style={{ display: "grid", gridTemplateColumns: "82px 1fr", gap: "5px 10px", fontSize: 10.5 }}>
                <span style={{ color: "#CBD5E1", fontWeight: 700 }}>Pagamento</span><span style={{ color: "#FFFFFF", fontWeight: 700 }}>{orcamento?.condicao_pagamento || "-"}</span>
                <span style={{ color: "#CBD5E1", fontWeight: 700 }}>Validade</span><span style={{ color: "#FFFFFF", fontWeight: 700 }}>{orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "-"}</span>
                <span style={{ color: "#CBD5E1", fontWeight: 700 }}>Regime</span><span style={{ color: "#FFFFFF", fontWeight: 700 }}>{regimeExibir}</span>
              </div>
            </div>
            <div style={{ background: "#111827", border: "2px solid #1E293B", borderLeft: "6px solid #F59E0B", borderRadius: 9, padding: 13 }}>
              <div style={{ color: "#FCD34D", fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 9 }}>Resumo</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 10px", fontSize: 10.5 }}>
                <span style={{ color: "#CBD5E1", fontWeight: 700 }}>Subtotal</span><span style={{ color: "#FFFFFF", fontWeight: 800 }}>{formatMoneyTrailing(subtotalItens)}</span>
                <span style={{ color: "#CBD5E1", fontWeight: 700 }}>{descontoLabelMinusculo}</span><span style={{ color: "#FCA5A5", fontWeight: 800 }}>- {formatMoneyTrailing(descontoOrcamento)}</span>
                <span style={{ color: "#CBD5E1", fontWeight: 700 }}>Impostos estimados</span><span style={{ color: "#FFFFFF", fontWeight: 800 }}>{formatMoneyTrailing(impostoTotal)}</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              DESCRIÇÃO DO SERVIÇO
          ═══════════════════════════════════════ */}
          {orcamento?.descricao_servico && (
            <div className="proposal-description" style={{ padding: "16px 32px", borderBottom: "2px solid #1E293B", background: "#0F172A" }}>
              <div className="proposal-section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 17, background: "#3B82F6", borderRadius: 2 }} />
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#60A5FA" }}>Descrição do Serviço</span>
                </div>
                <span style={{ color: "#94A3B8", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Escopo
                </span>
              </div>
              <div className="proposal-description-box" style={{ background: "#111827", border: "2px solid #1E293B", borderLeft: "6px solid #3B82F6", borderRadius: 8, padding: "13px 16px", boxShadow: "0 5px 18px rgba(15,23,42,0.2)" }}>
                <div className="proposal-description-text" style={{ color: "#FFFFFF", fontSize: 12.5, lineHeight: 1.55, fontWeight: 750 }}>{orcamento.descricao_servico}</div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              TABELA DE ITENS
          ═══════════════════════════════════════ */}
          <div className="proposal-items-section" style={{ padding: "0 32px 128px", background: "#0F172A" }}>
            {/* Header da seção */}
            <div className="proposal-items-title" style={{ padding: "16px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 4, height: 17, background: "#3B82F6", borderRadius: 2 }} />
                <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#60A5FA" }}>Itens da Proposta</span>
              </div>
              <span style={{ background: "#1E293B", color: "#93C5FD", borderRadius: 999, padding: "3px 10px", fontSize: 10, fontWeight: 900, border: "1px solid #334155" }}>
                {itens.length} {itens.length === 1 ? "item" : "itens"}
              </span>
            </div>

            <div className="proposal-table-wrap">
            <table className="proposal-items-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginTop: 0, border: "2px solid #1E293B", borderRadius: 8, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #1A2744 0%, #111827 100%)", borderBottom: "2px solid #334155" }}>
                  <th style={{ padding: "11px 14px", color: "#93C5FD", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", width: 64 }}>Item</th>
                  <th style={{ padding: "11px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "left" }}>Descrição</th>
                  <th style={{ padding: "11px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", width: 70 }}>Qtd</th>
                  <th style={{ padding: "11px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "right", width: 130 }}>Preço Unit.</th>
                  <th style={{ padding: "11px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "right", width: 130 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#64748B", padding: 24, fontSize: 13 }}>Nenhum item cadastrado.</td>
                  </tr>
                ) : itens.map((item, idx) => {
                  const total = Number(item.valor_total || Number(item.quantidade || 0) * Number(item.valor_unitario || 0));
                  const isProduto = item.origem_tipo === "produto";
                  return (
                    <tr key={item.id || idx} className="item-row">
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid #1E293B", textAlign: "center", verticalAlign: "top", background: idx % 2 === 0 ? "#111827" : "#0F172A" }}>
                        <span className="proposal-item-index" style={{ background: "#1E293B", color: "#60A5FA" }}>{String(idx + 1).padStart(2, "0")}</span>
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: "1px solid #1E293B", fontSize: 12.5, color: "#FFFFFF", background: idx % 2 === 0 ? "#111827" : "#0F172A" }}>
                        <div className="proposal-item-main" style={{ fontWeight: 850, fontSize: 13.2, lineHeight: 1.32, color: "#FFFFFF", textTransform: "uppercase" }}>{item.descricao}</div>
                        {item.unidade && (
                          <div style={{ fontSize: 10.2, color: "#94A3B8", marginTop: 3, fontWeight: 650 }}>
                            {isProduto ? "Material" : "Serviço"} · {item.unidade}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1E293B", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#E2E8F0", background: idx % 2 === 0 ? "#111827" : "#0F172A" }}>
                        {Number(item.quantidade || 0).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1E293B", textAlign: "right", fontSize: 12.5, color: "#E2E8F0", background: idx % 2 === 0 ? "#111827" : "#0F172A" }}>
                        {formatMoneyTrailing(item.valor_unitario)}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #1E293B", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#60A5FA", background: idx % 2 === 0 ? "#111827" : "#0F172A" }}>
                        {formatMoneyTrailing(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              TOTAIS — lado direito elegante
          ═══════════════════════════════════════ */}
          <div className="proposal-totals" style={{ padding: 0, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 310, maxWidth: 350, background: "#111827", borderRadius: 8, border: "2px solid #1E293B", overflow: "hidden", boxShadow: "0 8px 24px rgba(15,23,42,0.3)" }}>
              <div style={{ padding: "4px 0 0", borderBottom: "2px solid #1E293B" }}>
                {[
                  { label: "Subtotal", value: formatMoneyTrailing(subtotalItens) },
                  { label: descontoLabelMinusculo, value: `- ${formatMoneyTrailing(descontoOrcamento)}`, color: "#FCA5A5" },
                  { label: "Valor do orçamento", value: formatMoneyTrailing(totalOrcamentoSemImpostos) },
                  { label: `Impostos estimados (${aliquotaPercentual}%)`, value: formatMoneyTrailing(impostoTotal) },
                ].map(({ label, value, color }) => (
                  <div key={label} className="proposal-total-line" style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 18px" }}>
                    <span style={{ color: "#94A3B8", fontSize: 12 }}>{label}</span>
                    <span style={{ color: color || "#E2E8F0", fontSize: 12, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="proposal-total-final" style={{ padding: "14px 18px", background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#DBEAFE", fontWeight: 800, fontSize: 13 }}>Total da Proposta</span>
                <span className="proposal-total-final-value" style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>{formatMoneyTrailing(totalProposta)}</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              LOGOS DE CLIENTES (se houver)
          ═══════════════════════════════════════ */}
          {logosClientes.length > 0 && (
            <div className="proposal-logos" style={{ padding: "16px 32px", borderTop: "2px solid #1E293B", background: "#0F172A" }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "#64748B", marginBottom: 12, textAlign: "center" }}>
                Empresas que confiam em nós
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "8px 18px" }}>
                {logosClientes.map((item) => (
                  <div key={item.id} title={item.nome} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "6px 14px", background: "#111827",
                    border: "1px solid #1E293B", borderRadius: 8,
                    boxShadow: "0 1px 4px rgba(15,23,42,0.3)"
                  }}>
                    <img src={item.logo_url || item.logo} alt={item.nome} style={{ maxHeight: 26, maxWidth: 80, objectFit: "contain", filter: "grayscale(0%)" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              RODAPÉ
          ═══════════════════════════════════════ */}
          <div className="proposal-footer" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1A2744 50%, #0F172A 100%)", borderTop: "2px solid #1E293B", padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ color: "#E2E8F0", fontSize: 11, fontWeight: 800 }}>
                {empresa?.razao_social || empresa?.nome || "ERP Nexus"}
              </div>
              <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 2 }}>
                {[empresa?.cnpj && `CNPJ ${empresa.cnpj}`, empresa?.email].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#CBD5E1", fontSize: 10 }}>
                Gerado em {dayjs().format("DD/MM/YYYY [às] HH:mm")}
              </div>
              <div style={{ color: "#94A3B8", fontSize: 9.5, marginTop: 2 }}>
                Esta proposta é válida conforme as condições descritas acima.
              </div>
            </div>
          </div>

        </Skeleton>
      </div>
    </div>
  );
}
