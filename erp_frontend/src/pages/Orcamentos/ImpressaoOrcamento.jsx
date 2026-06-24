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
  return resolveMediaUrl(empresa.logo);
}

function getBackendOrigin() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (envBaseUrl?.startsWith("http")) {
    return envBaseUrl.replace(/\/api\/v1\/?$/, "");
  }

  const { hostname, protocol, port } = window.location;
  if (["localhost", "127.0.0.1"].includes(hostname) && port !== "8000") {
    return `${protocol}//127.0.0.1:8000`;
  }

  return window.location.origin;
}

function resolveMediaUrl(url) {
  if (!url) return "";
  const value = String(url);
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return `${getBackendOrigin()}${value}`;
  return `${getBackendOrigin()}/${value}`;
}


export default function ImpressaoOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orcamento, setOrcamento] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [impostosCalculados, setImpostosCalculados] = useState(null);
  const [logosClientes, setLogosClientes] = useState([]);
  const [logoFalhou, setLogoFalhou] = useState(false);

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

  useEffect(() => {
    setLogoFalhou(false);
  }, [logoUrl]);

  const statusStamp = {
    orcamento_enviado: { label: "ENVIADO", color: "#FFFFFF", bg: "#2563EB", borderColor: "#1E40AF" },
    aprovada:          { label: "APROVADO", color: "#FFFFFF", bg: "#10B981", borderColor: "#047857" },
    cancelada:         { label: "RECUSADO", color: "#FFFFFF", bg: "#EF4444", borderColor: "#DC2626" },
  }[orcamento?.status] || { label: "RASCUNHO", color: "#374151", bg: "#FBBF24", borderColor: "#F59E0B" };

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
        "min-height: 794px",
        "background: #FFFFFF",
        "z-index: -1000",
        "overflow: visible",
        "font-family: Inter, 'Segoe UI', system-ui, sans-serif",
      ].join("; ");

      const clone = element.cloneNode(true);
      clone.classList.add("print-compact", "print-export", "print-scale-100");
      clone.style.cssText = [
        "width: 1123px",
        "max-width: 1123px",
        "min-height: 794px",
        "height: auto",
        "margin: 0",
        "border-radius: 0",
        "box-shadow: none",
        "overflow: visible",
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
        windowHeight: Math.max(794, clone.scrollHeight),
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });

      document.body.removeChild(wrapper);
      wrapper = null;

      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const availableW = pageW - margin * 2;
      const availableH = pageH - margin * 2;
      const imgWidthMm = availableW;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      if (imgHeightMm <= availableH) {
        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          (pageH - imgHeightMm) / 2,
          imgWidthMm,
          imgHeightMm,
        );

        return pdf;
      }

      const pages = Math.ceil(imgHeightMm / availableH);
      for (let page = 0; page < pages; page += 1) {
        if (page > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          margin - page * availableH,
          imgWidthMm,
          imgHeightMm,
        );
      }

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
      message.success("PDF de impressão gerado sem cortes.");
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          @page { size: 297mm 210mm; margin: 6mm !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body, #root { width: auto !important; min-height: 100% !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .ant-layout-sider, [class*="sidebar"], [class*="Sidebar"], nav, header, .print-toolbar, .ant-layout-header, aside { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          body > div:first-child { min-height: 100% !important; padding: 0 !important; overflow: visible !important; }
          .doc-sheet {
            width: 285mm !important;
            max-width: 285mm !important;
            height: auto !important;
            min-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            overflow: visible !important;
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
            width: 285mm !important;
            max-width: 285mm !important;
            zoom: 1 !important;
          }
          .print-scale-88.doc-sheet {
            width: 323.8mm !important;
            max-width: 323.8mm !important;
            zoom: 0.88 !important;
          }
          .print-scale-72.doc-sheet {
            width: 395.8mm !important;
            max-width: 395.8mm !important;
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
          .proposal-logo-box, .brand-mark { width: 38px !important; height: 38px !important; border-radius: 9px !important; box-shadow: none !important; }
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
          .proposal-items-table th:nth-child(4),
          .proposal-items-table th:nth-child(5),
          .proposal-items-table td:nth-child(4),
          .proposal-items-table td:nth-child(5),
          .proposal-total-line span:last-child,
          .proposal-total-final-value {
            white-space: nowrap !important;
          }
          .proposal-item-index { width: 18px !important; height: 18px !important; font-size: 8px !important; }
          .proposal-item-main { font-size: 10px !important; line-height: 1.15 !important; }
          .proposal-totals {
            position: static !important;
            width: 78mm !important;
            padding: 0 !important;
            z-index: 2 !important;
            margin-left: auto !important;
            margin-right: 20px !important;
            margin-bottom: 12px !important;
          }
          .proposal-totals > div { min-width: 0 !important; width: 100% !important; max-width: 100% !important; box-shadow: none !important; }
          .proposal-total-line { padding-top: 4px !important; padding-bottom: 4px !important; }
          .proposal-total-final { padding-top: 8px !important; padding-bottom: 8px !important; }
          .proposal-total-final-value { font-size: 17px !important; }
          .proposal-footer {
            position: static !important;
            padding: 7px 22px !important;
            z-index: 3 !important;
          }
          .proposal-logos { display: none !important; }
        }
        .print-compact.proposal-document .proposal-header { min-height: 120px !important; }
        .print-compact.proposal-document .proposal-header-content { padding: 16px 26px 14px !important; }
        .print-compact.proposal-document .proposal-kicker { margin-bottom: 8px !important; }
        .print-compact.proposal-document .proposal-logo-box,
        .print-compact.proposal-document .brand-mark { width: 48px !important; height: 48px !important; border-radius: 12px !important; }
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
        .proposal-document::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(59, 130, 246, 0.075), transparent 36%),
            radial-gradient(circle at 92% 12%, rgba(16, 185, 129, 0.10), transparent 24%);
          border-radius: inherit;
          z-index: 0;
        }
        .proposal-document > * {
          position: relative;
          z-index: 1;
        }
        .brand-mark {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, #2563EB 0%, #14B8A6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-size: 21px;
          font-weight: 900;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
          overflow: hidden;
          flex-shrink: 0;
        }
        .brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 7px;
          background: #FFFFFF;
        }
        .proposal-chip {
          display: inline-flex;
          align-items: center;
          border: 1px solid #DBEAFE;
          background: #EFF6FF;
          color: #2563EB;
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .proposal-stat-card {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid #DCE6F4;
          border-radius: 14px;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.07);
        }
        .proposal-items-section {
          padding-bottom: 18px !important;
        }
        .proposal-totals {
          position: static !important;
          width: 100% !important;
          padding: 0 32px 16px !important;
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
        .proposal-items-table th:nth-child(4),
        .proposal-items-table th:nth-child(5),
        .proposal-items-table td:nth-child(4),
        .proposal-items-table td:nth-child(5),
        .proposal-total-line span:last-child,
        .proposal-total-final-value {
          white-space: nowrap;
        }
        .item-row:nth-child(even) td { background: #F8FAFC; }
        .item-row:hover td { background: #F1F5F9 !important; transition: background 0.15s; }
        .item-row td { padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 11.5px; color: #475569; transition: background 0.15s; }
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
            overflow: visible !important;
          }
          .proposal-items-section {
            padding-bottom: 16px !important;
          }
          .proposal-totals {
            position: static !important;
            width: 78mm !important;
            padding: 0 !important;
            background: transparent !important;
            margin-left: auto !important;
            margin-right: 20px !important;
            margin-bottom: 12px !important;
          }
          .proposal-totals > div {
            width: 100% !important;
            margin-left: auto !important;
          }
          .proposal-footer {
            position: static !important;
          }
          .proposal-table-wrap {
            overflow: visible !important;
          }
        }
      `}</style>

      {/* ── TOOLBAR ── */}
      <div
        className="print-toolbar"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          background: "#FFFFFF",
          border: "1px solid #E2E6EC",
          borderRadius: 16,
          boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
          padding: "14px 20px",
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ borderRadius: 10, height: 40, fontWeight: 600 }}>Voltar</Button>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint} style={{ borderRadius: 10, height: 40, fontWeight: 600 }}>Imprimir</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handlePdf} style={{ background: "#3B82F6", borderColor: "#3B82F6", borderRadius: 10, height: 40, fontWeight: 600, paddingInline: 20 }}>Salvar PDF</Button>
        </Space>
      </div>

      {/* ── DOCUMENTO ── */}
      <div className={`doc-sheet proposal-document ${printSizeClass}`} style={{ width: "100%", maxWidth: 1100, margin: "0 auto", background: "#FFFFFF", borderRadius: 12, boxShadow: "0 10px 32px rgba(15,23,42,0.06), 0 2px 8px rgba(15,23,42,0.03)", border: "1px solid #E2E8F0", position: "relative" }}>
        <Skeleton active loading={loading} paragraph={{ rows: 18 }} style={{ padding: 32 }}>

          <div className="proposal-header" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", minHeight: 150, background: "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 48%, #EFF6FF 100%)", borderBottom: "1px solid #D7E3F4", alignItems: "center" }}>
            <div style={{ padding: "28px 34px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="proposal-kicker" style={{ marginBottom: 12 }}>
                <span className="proposal-chip">Proposta Comercial</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="brand-mark">
                  {logoUrl && !logoFalhou
                    ? <img src={logoUrl} crossOrigin="anonymous" alt="Logo" onError={() => setLogoFalhou(true)} />
                    : <span>{empresaInitials}</span>
                  }
                </div>
                <div>
                  <div className="proposal-company-name" style={{ color: "#0F172A", fontSize: 22, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.01em" }}>
                    {empresa?.razao_social || empresa?.nome || "Sua Empresa"}
                  </div>
                  <div style={{ color: "#64748B", fontSize: 11, marginTop: 6, fontWeight: 600 }}>
                    {[empresa?.cnpj && `CNPJ ${empresa.cnpj}`, empresa?.telefone, empresa?.email].filter(Boolean).join("  •  ") || "contato"}
                  </div>
                </div>
              </div>
            </div>
            <div className="proposal-header-actions" style={{ padding: "24px 34px 24px 8px", display: "grid", gridTemplateColumns: "1fr", gap: 10, justifyContent: "center", textAlign: "center" }}>
              <div className="proposal-stat-card" style={{ padding: "13px 16px" }}>
                <div style={{ color: "#64748B", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>Número</div>
                <div style={{ color: "#2563EB", fontSize: 22, fontWeight: 900, letterSpacing: 0 }}>{orcamento?.numero || `ORC-${id}`}</div>
              </div>
              <div className="proposal-stat-card" style={{ padding: "12px 16px" }}>
                <div style={{ color: "#64748B", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Valor Total</div>
                <div style={{ color: "#0F172A", fontSize: 20, fontWeight: 900 }}>{formatMoneyTrailing(totalProposta)}</div>
                <span className="proposal-status-badge" style={{ background: statusStamp.bg, color: statusStamp.color, borderRadius: 999, padding: "5px 12px", fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", display: "inline-block", marginTop: 7, border: `1px solid ${statusStamp.borderColor}` }}>
                  {statusStamp.label}
                </span>
              </div>
            </div>
          </div>

          <div className="proposal-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr 0.85fr", gap: 12, padding: "16px 26px", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, transition: "all 0.2s", boxShadow: "0 10px 22px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ color: "#3B82F6", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Cliente</div>
              <div style={{ color: "#1E293B", fontSize: 12.5, fontWeight: 700 }}>{orcamento?.cliente_nome || "-"}</div>
              <div style={{ color: "#64748B", fontSize: 10, marginTop: 5 }}>
                {[orcamento?.cliente_cnpj_cpf, orcamento?.cliente_email, orcamento?.cliente_telefone].filter(Boolean).join("  •  ") || "—"}
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, boxShadow: "0 10px 22px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ color: "#3B82F6", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Condições</div>
              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "5px 8px", fontSize: 10 }}>
                <span style={{ color: "#64748B", fontWeight: 600 }}>Pagamento</span><span style={{ color: "#1E293B", fontWeight: 600 }}>{orcamento?.condicao_pagamento || "-"}</span>
                <span style={{ color: "#64748B", fontWeight: 600 }}>Validade</span><span style={{ color: "#1E293B", fontWeight: 600 }}>{orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "-"}</span>
                <span style={{ color: "#64748B", fontWeight: 600 }}>Regime</span><span style={{ color: "#1E293B", fontWeight: 600 }}>{regimeExibir}</span>
              </div>
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, boxShadow: "0 10px 22px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ color: "#3B82F6", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Resumo</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 10px", fontSize: 10 }}>
                <span style={{ color: "#64748B", fontWeight: 600 }}>Subtotal</span><span style={{ color: "#1E293B", fontWeight: 700 }}>{formatMoneyTrailing(subtotalItens)}</span>
                <span style={{ color: "#64748B", fontWeight: 600 }}>{descontoLabelMinusculo}</span><span style={{ color: "#EF4444", fontWeight: 700 }}>- {formatMoneyTrailing(descontoOrcamento)}</span>
                <span style={{ color: "#64748B", fontWeight: 600 }}>Impostos</span><span style={{ color: "#1E293B", fontWeight: 700 }}>{formatMoneyTrailing(impostoTotal)}</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              DESCRIÇÃO DO SERVIÇO
          ═══════════════════════════════════════ */}
          {orcamento?.descricao_servico && (
            <div className="proposal-description" style={{ padding: "14px 32px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
              <div className="proposal-section-title" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#3B82F6" }}>Descrição do Serviço</span>
              </div>
              <div className="proposal-description-box" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px" }}>
                <div className="proposal-description-text" style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, fontWeight: 500 }}>{orcamento.descricao_servico}</div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              TABELA DE ITENS
          ═══════════════════════════════════════ */}
          <div className="proposal-items-section" style={{ padding: "0 32px 128px", background: "#FFFFFF" }}>
            {/* Header da seção */}
            <div className="proposal-items-title" style={{ padding: "14px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#3B82F6" }}>Itens da Proposta</span>
              <span style={{ background: "#F1F5F9", color: "#3B82F6", borderRadius: 999, padding: "2px 8px", fontSize: 9, fontWeight: 700, border: "1px solid #E2E8F0" }}>
                {itens.length} {itens.length === 1 ? "item" : "itens"}
              </span>
            </div>

            <div className="proposal-table-wrap">
            <table className="proposal-items-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginTop: 0, border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ padding: "10px 12px", color: "#64748B", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", width: 64 }}>Item</th>
                  <th style={{ padding: "10px 14px", color: "#64748B", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "left" }}>Descrição</th>
                  <th style={{ padding: "10px 14px", color: "#64748B", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", width: 70 }}>Qtd</th>
                  <th style={{ padding: "10px 14px", color: "#64748B", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "right", width: 130 }}>Preço Unit.</th>
                  <th style={{ padding: "10px 14px", color: "#64748B", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "right", width: 130 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#94A3B8", padding: 20, fontSize: 12 }}>Nenhum item cadastrado.</td>
                  </tr>
                ) : itens.map((item, idx) => {
                  const total = Number(item.valor_total || Number(item.quantidade || 0) * Number(item.valor_unitario || 0));
                  const isProduto = item.origem_tipo === "produto";
                  return (
                    <tr key={item.id || idx} className="item-row">
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #E2E8F0", textAlign: "center", verticalAlign: "top", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                        <span className="proposal-item-index" style={{ background: "#EEF2FF", color: "#3B82F6" }}>{String(idx + 1).padStart(2, "0")}</span>
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0", fontSize: 11.5, color: "#475569", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                        <div className="proposal-item-main" style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.35, color: "#1E293B", textTransform: "uppercase" }}>{item.descricao}</div>
                        {item.unidade && (
                          <div style={{ fontSize: 9.5, color: "#64748B", marginTop: 3, fontWeight: 500 }}>
                            {isProduto ? "Material" : "Serviço"} · {item.unidade}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0", textAlign: "center", fontSize: 11.5, fontWeight: 600, color: "#475569", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                        {Number(item.quantidade || 0).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0", textAlign: "right", fontSize: 11.5, color: "#475569", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                        {formatMoneyTrailing(item.valor_unitario)}
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid #E2E8F0", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#3B82F6", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
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
            <div style={{ minWidth: 310, maxWidth: 350, background: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 4px 12px rgba(15,23,42,0.04)" }}>
              <div style={{ padding: "0", borderBottom: "1px solid #E2E8F0" }}>
                {[
                  { label: "Subtotal", value: formatMoneyTrailing(subtotalItens) },
                  { label: descontoLabelMinusculo, value: `- ${formatMoneyTrailing(descontoOrcamento)}`, color: "#EF4444" },
                  { label: "Valor do orçamento", value: formatMoneyTrailing(totalOrcamentoSemImpostos) },
                  { label: `Impostos estimados (${aliquotaPercentual}%)`, value: formatMoneyTrailing(impostoTotal) },
                ].map(({ label, value, color }) => (
                  <div key={label} className="proposal-total-line" style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 16px" }}>
                    <span style={{ color: "#64748B", fontSize: 11 }}>{label}</span>
                    <span style={{ color: color || "#475569", fontSize: 11, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="proposal-total-final" style={{ padding: "13px 16px", background: "#F0F9FF", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748B", fontWeight: 700, fontSize: 11 }}>Total da Proposta</span>
                <span className="proposal-total-final-value" style={{ color: "#3B82F6", fontWeight: 900, fontSize: 22, letterSpacing: 0 }}>{formatMoneyTrailing(totalProposta)}</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              LOGOS DE CLIENTES (se houver)
          ═══════════════════════════════════════ */}
          {logosClientes.length > 0 && (
            <div className="proposal-logos" style={{ padding: "12px 32px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF" }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94A3B8", marginBottom: 10, textAlign: "center" }}>
                Parceiros
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "6px 14px" }}>
                {logosClientes.map((item) => (
                  <div key={item.id} title={item.nome} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "5px 12px", background: "#F8FAFC",
                    border: "1px solid #E2E8F0", borderRadius: 6
                  }}>
                    <img
                      src={resolveMediaUrl(item.logo_url || item.logo)}
                      crossOrigin="anonymous"
                      alt={item.nome}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      style={{ maxHeight: 24, maxWidth: 70, objectFit: "contain" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              RODAPÉ
          ═══════════════════════════════════════ */}
          <div className="proposal-footer" style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0", padding: "10px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ color: "#1E293B", fontSize: 10, fontWeight: 700 }}>
                {empresa?.razao_social || empresa?.nome || "ERP Nexus"}
              </div>
              <div style={{ color: "#64748B", fontSize: 9, marginTop: 1 }}>
                {[empresa?.cnpj && `CNPJ ${empresa.cnpj}`, empresa?.email].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#64748B", fontSize: 9 }}>
                Gerado em {dayjs().format("DD/MM/YYYY [às] HH:mm")}
              </div>
              <div style={{ color: "#94A3B8", fontSize: 8.5, marginTop: 1 }}>
                Válida conforme condições descritas acima.
              </div>
            </div>
          </div>

        </Skeleton>
      </div>
    </div>
  );
}
