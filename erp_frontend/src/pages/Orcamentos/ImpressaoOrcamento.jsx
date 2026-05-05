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

function formatStatus(status) {
  const map = {
    orcamento_enviado: "Enviado",
    aprovada: "Aprovado",
    cancelada: "Recusado",
    lead: "Rascunho",
  };
  return map[status] || "Rascunho";
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
        background: "#E8EDF4",
        padding: "24px 16px",
        fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <style>{`
        @media print {
          @page { size: 297mm 210mm; margin: 0mm !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body, #root { width: 297mm !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .ant-layout-sider, [class*="sidebar"], [class*="Sidebar"], nav, header, .print-toolbar, .ant-layout-header, aside { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .doc-sheet { width: 297mm !important; max-width: 297mm !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
        }
        .prop-table th {
          background: #F8FAFC; color: #64748B; font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.06em; font-weight: 700; padding: 10px 14px;
          border-bottom: 2px solid #E2E8F0; text-align: left;
        }
        .prop-table td { padding: 11px 14px; border-bottom: 1px solid #F1F5F9; font-size: 13px; color: #1E293B; }
        .prop-table tr:last-child td { border-bottom: none; }
        .prop-table tr:hover td { background: #F8FAFC; }
      `}</style>

      {/* ── TOOLBAR ── */}
      <div className="print-toolbar" style={{ maxWidth: 900, margin: "0 auto 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Voltar</Button>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Imprimir</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={handlePdf} style={{ background: "#3B82F6" }}>Gerar PDF</Button>
        </Space>
      </div>

      {/* ── DOCUMENTO ── */}
      <div className="doc-sheet" style={{ maxWidth: 1100, margin: "0 auto", background: "#FFFFFF", borderRadius: 12, boxShadow: "0 8px 40px rgba(15,23,42,0.13)", overflow: "hidden" }}>
        <Skeleton active loading={loading} paragraph={{ rows: 14 }} style={{ padding: 24 }}>

          {/* ═══ CABEÇALHO TEAL ═══ */}
          <div style={{ background: "linear-gradient(135deg, #1a6b58 0%, #0d4d40 100%)", padding: "16px 28px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>

              {/* Esquerda: empresa */}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ color: "#94A3B8", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", marginBottom: 8 }}>PROPOSTA COMERCIAL</div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 7, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {logoUrl
                      ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      : <span style={{ fontSize: 16, fontWeight: 800, color: "#0d4d40" }}>{empresaInitials}</span>
                    }
                  </div>
                  <div>
                    <div style={{ color: "#FFFFFF", fontSize: 17, fontWeight: 800, lineHeight: 1.15, marginBottom: 2 }}>
                      {empresa?.razao_social || empresa?.nome || "Sua Empresa"}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 10, marginBottom: 6, lineHeight: 1.4 }}>
                      {empresa?.site || "Manutenção preventiva, padronização operacional e execução confiável."}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "2px 9px" }}>
                      <span style={{ color: "#CBD5E1", fontSize: 10 }}>Versão otimizada para 1 página</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8, color: "#94A3B8", fontSize: 11, lineHeight: 1.5 }}>
                  {[empresa?.cnpj && `CNPJ: ${empresa.cnpj}`, empresa?.email].filter(Boolean).join(" | ")}
                </div>
                {empresa?.endereco && (
                  <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 1 }}>{empresa.endereco}</div>
                )}
              </div>

              {/* Direita: box orçamento */}
              <div style={{ background: "rgba(0,0,0,0.32)", borderRadius: 10, padding: "12px 18px", minWidth: 190 }}>
                <div style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                  {orcamento?.numero || `Orçamento #${id}`}
                </div>
                {[
                  ["Emissão", orcamento?.criado_em ? dayjs(orcamento.criado_em).format("DD/MM/YYYY") : dayjs().format("DD/MM/YYYY")],
                  ["Validade", orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "—"],
                  ["Status", formatStatus(orcamento?.status)],
                  ["Modelo", orcamento?.condicao_pagamento || "—"],
                  ["Total final", formatMoneyTrailing(totalComImpostos)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, gap: 10 }}>
                    <span style={{ color: "#94A3B8", fontSize: 11, whiteSpace: "nowrap" }}>{label}:</span>
                    <span style={{ color: label === "Total final" ? "#FFFFFF" : "#CBD5E1", fontSize: 11, fontWeight: label === "Total final" ? 700 : 400, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frase motivacional */}
            <div style={{ marginTop: 10, background: "rgba(0,0,0,0.22)", borderRadius: 999, padding: "4px 16px", display: "inline-block" }}>
              <span style={{ color: "#94A3B8", fontSize: 11, fontStyle: "italic" }}>
                {empresa?.slogan || orcamento?.observacoes_tecnicas?.slice(0, 80) || "Excelência e confiança em cada atendimento."}
              </span>
            </div>
          </div>

          {/* ═══ POR QUE ESTA PROPOSTA SE DESTACA ═══ */}
          <div style={{ padding: "10px 28px", borderBottom: "1px solid #EDF0F5" }}>
            <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 12, marginBottom: 3 }}>Por que esta proposta se destaca</div>
            <div style={{ color: "#64748B", fontSize: 11, lineHeight: 1.5 }}>
              {orcamento?.descricao_servico ||
                "Excelência técnica com soluções eficientes para o seu negócio. Serviços especializados em climatização, elétrica e manutenção."}
            </div>
          </div>

          {/* ═══ 4 MÉTRICAS ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid #EDF0F5" }}>
            {[
              ["SUBTOTAL", subtotalItens],
              [descontoLabel, descontoOrcamento],
              ["IMPOSTO", impostoTotal],
              ["TOTAL FINAL", totalComImpostos],
            ].map(([label, value], idx) => (
              <div key={label} style={{ padding: "10px 16px", borderRight: idx < 3 ? "1px solid #EDF0F5" : "none" }}>
                <div style={{ color: "#94A3B8", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
                <div style={{ color: "#1E293B", fontSize: 18, fontWeight: 800 }}>{formatMoneyTrailing(value)}</div>
              </div>
            ))}
          </div>

          {/* ═══ DADOS CLIENTE + CONDIÇÕES COMERCIAIS ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1px solid #EDF0F5" }}>
            <div style={{ padding: "10px 22px 10px 28px", borderRight: "1px solid #EDF0F5" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1E293B", borderBottom: "2px solid #E2E8F0", paddingBottom: 5, marginBottom: 8 }}>DADOS DO CLIENTE</div>
              {[
                ["Nome", orcamento?.cliente_nome],
                ["Documento", orcamento?.cliente_cnpj_cpf || "—"],
                ["Email", orcamento?.cliente_email || "—"],
                ["Telefone", orcamento?.cliente_telefone || "—"],
                ["Endereço", orcamento?.cliente_endereco || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 6, marginBottom: 5 }}>
                  <span style={{ color: "#64748B", fontSize: 11 }}>{label}</span>
                  <span style={{ color: "#1E293B", fontSize: 11 }}>{value || "—"}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 28px 10px 22px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1E293B", borderBottom: "2px solid #E2E8F0", paddingBottom: 5, marginBottom: 8 }}>CONDIÇÕES COMERCIAIS</div>
              {[
                ["Regime", regimeExibir],
                ["Modelo", orcamento?.condicao_pagamento || "—"],
                ["Alíquota", aliquotaExibir],
                ["Imposto", formatMoneyTrailing(impostoTotal)],
                ["Total Final", formatMoneyTrailing(totalComImpostos)],
              ].map(([label, value], idx) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 6, marginBottom: 5 }}>
                  <span style={{ color: "#64748B", fontSize: 11 }}>{label}</span>
                  <span style={{ color: "#1E293B", fontSize: 11, fontWeight: idx >= 3 ? 700 : 400 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ ITENS DA PROPOSTA ═══ */}
          <div style={{ padding: "10px 28px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1E293B", marginBottom: 8 }}>ITENS DA PROPOSTA</div>
            <table className="prop-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>DESCRIÇÃO</th>
                  <th style={{ width: 60, textAlign: "center" }}>QTD</th>
                  <th style={{ width: 120, textAlign: "right" }}>PREÇO UNIT.</th>
                  <th style={{ width: 120, textAlign: "right" }}>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "#94A3B8", padding: 16 }}>Nenhum item cadastrado.</td></tr>
                ) : itens.map((item, idx) => {
                  const total = Number(item.valor_total || Number(item.quantidade || 0) * Number(item.valor_unitario || 0));
                  return (
                    <tr key={item.id || idx}>
                      <td style={{ fontSize: 12 }}>{item.descricao}</td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>{Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
                      <td style={{ textAlign: "right", fontSize: 12 }}>{formatMoneyTrailing(item.valor_unitario)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontSize: 12 }}>{formatMoneyTrailing(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ═══ TOTAIS (direita) ═══ */}
          <div style={{ padding: "8px 28px 14px", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 280, maxWidth: 310 }}>
              {[
                ["Subtotal", formatMoneyTrailing(subtotalItens)],
                [descontoLabelMinusculo, `- ${formatMoneyTrailing(descontoOrcamento)}`],
                ["Base de cálculo", formatMoneyTrailing(Math.max(0, subtotalItens - descontoOrcamento))],
                [`Imposto (${aliquotaPercentual}%)`, formatMoneyTrailing(impostoTotal)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 14 }}>
                  <span style={{ color: "#64748B", fontSize: 12 }}>{label}</span>
                  <span style={{ color: "#1E293B", fontSize: 12 }}>{value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "#E2E8F0", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>Total da Proposta</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: "#0d9488" }}>{formatMoneyTrailing(totalComImpostos)}</span>
              </div>
            </div>
          </div>

          {/* ═══ EMPRESAS QUE CONFIAM ═══ */}
          {logosClientes.length > 0 && (
            <div style={{ padding: "10px 28px", borderTop: "1px solid #EDF0F5", background: "#FAFBFD" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 10, textAlign: "center" }}>Empresas que confiam em nós</div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "8px 20px" }}>
                {logosClientes.map((item) => (
                  <div key={item.id} title={item.nome} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 12px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 6, opacity: 0.7 }}>
                    <img src={item.logo_url || item.logo} alt={item.nome} style={{ maxHeight: 28, maxWidth: 80, objectFit: "contain", filter: "grayscale(30%)" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ RODAPÉ ═══ */}
          <div style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0", padding: "7px 28px" }}>
            <span style={{ color: "#94A3B8", fontSize: 10 }}>
              Esta proposta foi gerada em {dayjs().format("DD/MM/YYYY")}. No app desktop, use a versão de impressão para salvar o PDF com este mesmo layout.
            </span>
          </div>

        </Skeleton>
      </div>
    </div>
  );
}
