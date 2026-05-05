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
  const totalComImpostos = Number(
    impostos?.total_geral || subtotalItens - descontoOrcamento + impostoTotal || 0,
  );
  const logoUrl = getLogoUrl(empresa);

  const regimeLabels = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };
  const regimeExibir = regimeLabels[impostos?.regime] || regimeLabels[empresa?.regime_tributario] || "—";
  const aliquotaPercentual = subtotalItens > 0 ? ((impostoTotal / (subtotalItens - descontoOrcamento)) * 100).toFixed(2) : "0.00";
  const aliquotaExibir = impostoTotal > 0 ? `${aliquotaPercentual}%` : "—";

  const empresaInitials = (empresa?.razao_social || empresa?.nome || "E").slice(0, 2).toUpperCase();

  const statusStamp = {
    orcamento_enviado: { label: "ENVIADO", color: "#2563EB", bg: "#DBEAFE" },
    aprovada:          { label: "APROVADO", color: "#15803D", bg: "#DCFCE7" },
    cancelada:         { label: "RECUSADO", color: "#B91C1C", bg: "#FEE2E2" },
  }[orcamento?.status] || { label: "RASCUNHO", color: "#92400E", bg: "#FEF3C7" };

  const handlePrint = () => window.print();
  const handlePdf = async () => {
    let wrapper = null;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const element = document.querySelector(".doc-sheet");

      // ── Clona o elemento em um container off-screen com dimensões de paisagem A4
      // A4 landscape @ 96dpi = 1122.52px ≈ 1123px
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

      // Aguarda layout + imagens
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

      // ── Gera PDF A4 Paisagem
      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();   // 297 mm
      const pageH = pdf.internal.pageSize.getHeight();  // 210 mm

      const imgWidthMm = pageW;
      const imgHeightMm = (canvas.height * pageW) / canvas.width;

      if (imgHeightMm <= pageH) {
        // Cabe em 1 página — centraliza verticalmente
        const offsetY = (pageH - imgHeightMm) / 2;
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0, offsetY, imgWidthMm, imgHeightMm,
        );
      } else {
        // Divide em fatias por página
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

          const sliceH_mm = (srcH * pageW) / canvas.width;
          pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, sliceH_mm);
        }
      }

      pdf.save(`${orcamento?.numero || `orcamento-${id}`}.pdf`);
      message.success("PDF gerado com sucesso.");
    } catch (error) {
      if (wrapper) document.body.removeChild(wrapper);
      console.error("Erro ao gerar PDF:", error);
      message.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #EFF6FF 0%, #F0FDF4 100%)",
        padding: "28px 16px",
        fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          @page { size: 297mm 210mm; margin: 0mm !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body, #root { width: 297mm !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .ant-layout-sider, [class*="sidebar"], [class*="Sidebar"], nav, header, .print-toolbar, .ant-layout-header, aside { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .doc-sheet { width: 297mm !important; max-width: 297mm !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
        }
        .item-row:nth-child(even) td { background: #F8FAFD; }
        .item-row:hover td { background: #EFF6FF !important; transition: background 0.15s; }
        .item-row td { padding: 10px 16px; border-bottom: 1px solid #EFF2F8; font-size: 12.5px; color: #1E293B; transition: background 0.15s; }
        .item-row:last-child td { border-bottom: none; }
      `}</style>

      {/* ── TOOLBAR ── */}
      <div className="print-toolbar" style={{ maxWidth: 1100, margin: "0 auto 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ borderRadius: 8 }}>Voltar</Button>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint} style={{ borderRadius: 8 }}>Imprimir</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handlePdf} style={{ background: "#3B82F6", borderRadius: 8 }}>Salvar PDF</Button>
        </Space>
      </div>

      {/* ── DOCUMENTO ── */}
      <div className="doc-sheet" style={{ maxWidth: 1100, margin: "0 auto", background: "#FFFFFF", borderRadius: 16, boxShadow: "0 20px 60px rgba(15,23,42,0.14), 0 4px 16px rgba(15,23,42,0.06)", overflow: "hidden" }}>
        <Skeleton active loading={loading} paragraph={{ rows: 18 }} style={{ padding: 32 }}>

          {/* ═══════════════════════════════════════
              CABEÇALHO PREMIUM — barra lateral azul
          ═══════════════════════════════════════ */}
          <div style={{ display: "flex", minHeight: 160 }}>
            {/* Barra lateral decorativa */}
            <div style={{ width: 8, flexShrink: 0, background: "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 60%, #6366F1 100%)" }} />

            {/* Conteúdo do cabeçalho */}
            <div style={{ flex: 1, background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1E3A6E 100%)", padding: "24px 32px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>

                {/* LADO ESQUERDO — empresa */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ color: "#60A5FA", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.22em", marginBottom: 12, textTransform: "uppercase" }}>
                    ✦ PROPOSTA COMERCIAL
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 12,
                      background: "linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                    }}>
                      {logoUrl
                        ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                        : <span style={{ fontSize: 20, fontWeight: 900, color: "#1D4ED8", letterSpacing: -1 }}>{empresaInitials}</span>
                      }
                    </div>
                    <div>
                      <div style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 900, lineHeight: 1.1, letterSpacing: -0.3 }}>
                        {empresa?.razao_social || empresa?.nome || "Sua Empresa"}
                      </div>
                      <div style={{ color: "#93C5FD", fontSize: 11, marginTop: 4 }}>
                        {empresa?.site || empresa?.email || "Serviços técnicos especializados"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                    {empresa?.cnpj && (
                      <span style={{ color: "#94A3B8", fontSize: 10 }}>
                        CNPJ: <span style={{ color: "#CBD5E1" }}>{empresa.cnpj}</span>
                      </span>
                    )}
                    {empresa?.telefone && (
                      <span style={{ color: "#94A3B8", fontSize: 10 }}>
                        Fone: <span style={{ color: "#CBD5E1" }}>{empresa.telefone}</span>
                      </span>
                    )}
                    {empresa?.endereco && (
                      <span style={{ color: "#94A3B8", fontSize: 10 }}>
                        {empresa.endereco}
                      </span>
                    )}
                  </div>
                  {(empresa?.slogan) && (
                    <div style={{ marginTop: 10, color: "#64748B", fontSize: 10.5, fontStyle: "italic", borderLeft: "2px solid #3B82F6", paddingLeft: 10 }}>
                      "{empresa.slogan}"
                    </div>
                  )}
                </div>

                {/* LADO DIREITO — número e dados do orçamento */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, flexShrink: 0 }}>
                  {/* Número grande */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#60A5FA", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 4 }}>NÚMERO DO ORÇAMENTO</div>
                    <div style={{
                      color: "#FFFFFF", fontSize: 26, fontWeight: 900, letterSpacing: -1,
                      background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
                      borderRadius: 10, padding: "6px 18px", display: "inline-block"
                    }}>
                      {orcamento?.numero || `ORC-${id}`}
                    </div>
                  </div>

                  {/* Info grid */}
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", minWidth: 200 }}>
                    {[
                      ["Emissão", orcamento?.criado_em ? dayjs(orcamento.criado_em).format("DD/MM/YYYY") : dayjs().format("DD/MM/YYYY")],
                      ["Válido até", orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "Não definido"],
                      ["Pagamento", orcamento?.condicao_pagamento || "—"],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 5 }}>
                        <span style={{ color: "#64748B", fontSize: 11 }}>{label}</span>
                        <span style={{ color: "#CBD5E1", fontSize: 11, fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Badge de status */}
                  <div style={{
                    background: statusStamp.bg, color: statusStamp.color,
                    borderRadius: 8, padding: "5px 16px",
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
                    border: `1.5px solid ${statusStamp.color}40`
                  }}>
                    ● {statusStamp.label}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              FAIXA DE MÉTRICAS — 4 cards
          ═══════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "#F8FAFC" }}>
            {[
              { label: "Subtotal", value: subtotalItens, color: "#1E293B", accent: "#3B82F6" },
              { label: descontoLabel, value: descontoOrcamento, color: "#B45309", accent: "#F59E0B" },
              { label: "Impostos", value: impostoTotal, color: "#1E293B", accent: "#8B5CF6" },
              { label: "TOTAL FINAL", value: totalComImpostos, color: "#1D4ED8", accent: "#3B82F6", highlight: true },
            ].map(({ label, value, color, accent, highlight }, idx) => (
              <div key={label} style={{
                padding: "16px 20px",
                borderRight: idx < 3 ? "1px solid #E8EDF5" : "none",
                borderBottom: "3px solid transparent",
                borderBottomColor: highlight ? accent : "transparent",
                background: highlight ? "#EFF6FF" : "transparent",
                position: "relative",
              }}>
                {highlight && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "0 0 2px 2px" }} />
                )}
                <div style={{ color: "#94A3B8", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                <div style={{ color: highlight ? "#1D4ED8" : color, fontSize: highlight ? 22 : 18, fontWeight: highlight ? 900 : 700 }}>
                  {formatMoneyTrailing(value)}
                </div>
              </div>
            ))}
          </div>

          {/* ═══════════════════════════════════════
              DADOS CLIENTE + CONDIÇÕES — 2 colunas
          ═══════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #EDF0F5", borderBottom: "1px solid #EDF0F5" }}>

            {/* CLIENTE */}
            <div style={{ padding: "18px 24px 18px 32px", borderRight: "1px solid #EDF0F5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 3, height: 16, background: "#3B82F6", borderRadius: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1E293B" }}>Dados do Cliente</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", rowGap: 6 }}>
                {[
                  ["Nome", orcamento?.cliente_nome],
                  ["CNPJ/CPF", orcamento?.cliente_cnpj_cpf],
                  ["E-mail", orcamento?.cliente_email],
                  ["Telefone", orcamento?.cliente_telefone],
                  ["Endereço", orcamento?.cliente_endereco],
                ].map(([label, value]) => (
                  <>
                    <span key={`l-${label}`} style={{ color: "#94A3B8", fontSize: 11, fontWeight: 600, alignSelf: "start", paddingTop: 1 }}>{label}</span>
                    <span key={`v-${label}`} style={{ color: "#334155", fontSize: 11, fontWeight: 500 }}>{value || "—"}</span>
                  </>
                ))}
              </div>
            </div>

            {/* CONDIÇÕES */}
            <div style={{ padding: "18px 32px 18px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 3, height: 16, background: "#8B5CF6", borderRadius: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1E293B" }}>Condições Comerciais</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 6 }}>
                {[
                  { label: "Regime", value: regimeExibir, bold: false },
                  { label: "Pagamento", value: orcamento?.condicao_pagamento || "—", bold: false },
                  { label: "Alíquota", value: aliquotaExibir, bold: false },
                  { label: "Total impostos", value: formatMoneyTrailing(impostoTotal), bold: true },
                  { label: "Total final", value: formatMoneyTrailing(totalComImpostos), bold: true, highlight: true },
                ].map(({ label, value, bold, highlight }) => (
                  <>
                    <span key={`l-${label}`} style={{ color: "#94A3B8", fontSize: 11, fontWeight: 600, alignSelf: "start", paddingTop: 1 }}>{label}</span>
                    <span key={`v-${label}`} style={{
                      color: highlight ? "#1D4ED8" : "#334155",
                      fontSize: highlight ? 13 : 11,
                      fontWeight: bold ? 700 : 500
                    }}>{value}</span>
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              DESCRIÇÃO DO SERVIÇO
          ═══════════════════════════════════════ */}
          {orcamento?.descricao_servico && (
            <div style={{ padding: "14px 32px", borderBottom: "1px solid #EDF0F5", background: "#FAFBFF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 3, height: 14, background: "#10B981", borderRadius: 2 }} />
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1E293B" }}>Descrição do Serviço</span>
              </div>
              <div style={{ color: "#475569", fontSize: 11.5, lineHeight: 1.65 }}>{orcamento.descricao_servico}</div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              TABELA DE ITENS
          ═══════════════════════════════════════ */}
          <div style={{ padding: "0" }}>
            {/* Header da seção */}
            <div style={{ padding: "14px 32px 0", display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
              <div style={{ width: 3, height: 14, background: "#F59E0B", borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1E293B" }}>Itens da Proposta</span>
              <span style={{ marginLeft: 6, background: "#FEF3C7", color: "#92400E", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                {itens.length} {itens.length === 1 ? "item" : "itens"}
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
              <thead>
                <tr style={{ background: "linear-gradient(90deg, #1E3A5F 0%, #1E3A6E 100%)" }}>
                  <th style={{ padding: "10px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "left" }}>Descrição</th>
                  <th style={{ padding: "10px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", width: 70 }}>Qtd</th>
                  <th style={{ padding: "10px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "right", width: 130 }}>Preço Unit.</th>
                  <th style={{ padding: "10px 16px", color: "#93C5FD", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "right", width: 130 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#94A3B8", padding: 24, fontSize: 13 }}>Nenhum item cadastrado.</td>
                  </tr>
                ) : itens.map((item, idx) => {
                  const total = Number(item.valor_total || Number(item.quantidade || 0) * Number(item.valor_unitario || 0));
                  const isProduto = item.origem_tipo === "produto";
                  return (
                    <tr key={item.id || idx} className="item-row">
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #EFF2F8", fontSize: 12.5, color: "#1E293B" }}>
                        <div style={{ fontWeight: 500 }}>{item.descricao}</div>
                        {item.unidade && (
                          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                            {isProduto ? "🔩 Material" : "🔧 Serviço"} · {item.unidade}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #EFF2F8", textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "#475569" }}>
                        {Number(item.quantidade || 0).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #EFF2F8", textAlign: "right", fontSize: 12.5, color: "#475569" }}>
                        {formatMoneyTrailing(item.valor_unitario)}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid #EFF2F8", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
                        {formatMoneyTrailing(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ═══════════════════════════════════════
              TOTAIS — lado direito elegante
          ═══════════════════════════════════════ */}
          <div style={{ padding: "20px 32px 24px", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 300, maxWidth: 340, background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
              <div style={{ padding: "4px 0 0", borderBottom: "1px solid #E2E8F0" }}>
                {[
                  { label: "Subtotal", value: formatMoneyTrailing(subtotalItens) },
                  { label: descontoLabelMinusculo, value: `- ${formatMoneyTrailing(descontoOrcamento)}`, color: "#B45309" },
                  { label: "Base de cálculo", value: formatMoneyTrailing(Math.max(0, subtotalItens - descontoOrcamento)) },
                  { label: `Impostos (${aliquotaPercentual}%)`, value: formatMoneyTrailing(impostoTotal) },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 18px" }}>
                    <span style={{ color: "#64748B", fontSize: 12 }}>{label}</span>
                    <span style={{ color: color || "#334155", fontSize: 12, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 18px", background: "linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#93C5FD", fontWeight: 700, fontSize: 13 }}>Total da Proposta</span>
                <span style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>{formatMoneyTrailing(totalComImpostos)}</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              LOGOS DE CLIENTES (se houver)
          ═══════════════════════════════════════ */}
          {logosClientes.length > 0 && (
            <div style={{ padding: "16px 32px", borderTop: "1px solid #EDF0F5", background: "#FAFBFD" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#94A3B8", marginBottom: 12, textAlign: "center" }}>
                Empresas que confiam em nós
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "8px 18px" }}>
                {logosClientes.map((item) => (
                  <div key={item.id} title={item.nome} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "6px 14px", background: "#FFFFFF",
                    border: "1px solid #E2E8F0", borderRadius: 8,
                    boxShadow: "0 1px 4px rgba(15,23,42,0.05)"
                  }}>
                    <img src={item.logo_url || item.logo} alt={item.nome} style={{ maxHeight: 26, maxWidth: 80, objectFit: "contain", filter: "grayscale(20%)" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              RODAPÉ
          ═══════════════════════════════════════ */}
          <div style={{ background: "#0F172A", padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ color: "#60A5FA", fontSize: 11, fontWeight: 700 }}>
                {empresa?.razao_social || empresa?.nome || "ERP Nexus"}
              </div>
              <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>
                {[empresa?.cnpj && `CNPJ ${empresa.cnpj}`, empresa?.email].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#94A3B8", fontSize: 10 }}>
                Gerado em {dayjs().format("DD/MM/YYYY [às] HH:mm")}
              </div>
              <div style={{ color: "#475569", fontSize: 9.5, marginTop: 2 }}>
                Esta proposta é válida conforme as condições descritas acima.
              </div>
            </div>
          </div>

        </Skeleton>
      </div>
    </div>
  );
}
