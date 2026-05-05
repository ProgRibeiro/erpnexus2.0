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
    try {
      // Importar html2pdf dinamicamente
      const { default: html2pdf } = await import("html2pdf.js");

      const element = document.querySelector(".doc-sheet");

      // Calcular dimensões do elemento
      const rect = element.getBoundingClientRect();
      const aspectRatio = rect.width / rect.height;

      const opt = {
        margin: 0,
        filename: `${orcamento?.numero || `orcamento-${id}`}.pdf`,
        image: { type: "png", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#FFFFFF",
          windowWidth: 900,
          windowHeight: Math.round(900 / aspectRatio),
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape", compress: true },
        pagebreak: { mode: "avoid" },
      };

      await html2pdf().set(opt).from(element).save();
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
        background: "#E8EDF4",
        padding: "24px 16px",
        fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0mm !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body, #root { width: 100% !important; height: auto !important; min-height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .ant-layout-sider, [class*="sidebar"], [class*="Sidebar"], nav, header, .print-toolbar, .ant-layout-header, aside { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .doc-sheet { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
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
      <div className="doc-sheet" style={{ maxWidth: 900, margin: "0 auto", background: "#FFFFFF", borderRadius: 16, boxShadow: "0 8px 40px rgba(15,23,42,0.13)", overflow: "hidden" }}>
        <Skeleton active loading={loading} paragraph={{ rows: 16 }} style={{ padding: 32 }}>

          {/* ═══ CABEÇALHO TEAL ═══ */}
          <div style={{ background: "linear-gradient(135deg, #1a6b58 0%, #0d4d40 100%)", padding: "28px 36px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>

              {/* Esquerda: empresa */}
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ color: "#94A3B8", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", marginBottom: 12 }}>PROPOSTA COMERCIAL</div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  {/* Logo */}
                  <div style={{ width: 58, height: 58, borderRadius: 8, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {logoUrl
                      ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      : <span style={{ fontSize: 18, fontWeight: 800, color: "#0d4d40" }}>{empresaInitials}</span>
                    }
                  </div>
                  <div>
                    <div style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 800, lineHeight: 1.15, marginBottom: 4 }}>
                      {empresa?.razao_social || empresa?.nome || "Sua Empresa"}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
                      {empresa?.site || "Manutenção preventiva, padronização operacional e execução confiável para sua operação."}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "4px 12px" }}>
                      <span style={{ color: "#CBD5E1", fontSize: 11 }}>Versão otimizada para caber em 1 página</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14, color: "#94A3B8", fontSize: 12, lineHeight: 1.6 }}>
                  {[empresa?.cnpj && `CNPJ: ${empresa.cnpj}`, empresa?.email].filter(Boolean).join(" | ")}
                </div>
                {empresa?.endereco && (
                  <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>{empresa.endereco}</div>
                )}
              </div>

              {/* Direita: box orçamento */}
              <div style={{ background: "rgba(0,0,0,0.32)", borderRadius: 12, padding: "18px 22px", minWidth: 200 }}>
                <div style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 800, marginBottom: 14 }}>
                  {orcamento?.numero || `Orçamento #${id}`}
                </div>
                {[
                  ["Emissão", orcamento?.criado_em ? dayjs(orcamento.criado_em).format("DD/MM/YYYY") : dayjs().format("DD/MM/YYYY")],
                  ["Validade", orcamento?.validade_orcamento ? dayjs(orcamento.validade_orcamento).format("DD/MM/YYYY") : "—"],
                  ["Status", formatStatus(orcamento?.status)],
                  ["Modelo", orcamento?.condicao_pagamento || "—"],
                  ["Total final", formatMoneyTrailing(totalComImpostos)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 12 }}>
                    <span style={{ color: "#94A3B8", fontSize: 12, whiteSpace: "nowrap" }}>{label}:</span>
                    <span style={{ color: label === "Total final" ? "#FFFFFF" : "#CBD5E1", fontSize: 12, fontWeight: label === "Total final" ? 700 : 400, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frase motivacional */}
            <div style={{ marginTop: 18, background: "rgba(0,0,0,0.22)", borderRadius: 999, padding: "7px 22px", display: "inline-block" }}>
              <span style={{ color: "#94A3B8", fontSize: 12, fontStyle: "italic" }}>
                {empresa?.slogan || orcamento?.observacoes_tecnicas?.slice(0, 80) || "Excelência e confiança em cada atendimento."}
              </span>
            </div>
          </div>

          {/* ═══ POR QUE ESTA PROPOSTA SE DESTACA ═══ */}
          <div style={{ padding: "18px 36px", borderBottom: "1px solid #EDF0F5" }}>
            <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 14, marginBottom: 6 }}>Por que esta proposta se destaca</div>
            <div style={{ color: "#64748B", fontSize: 13, lineHeight: 1.65 }}>
              {orcamento?.descricao_servico ||
                "Excelência técnica com soluções eficientes para o seu negócio. Oferecemos serviços especializados em climatização, elétrica e manutenção, garantindo desempenho, segurança e economia para sua operação."}
            </div>
          </div>

          {/* ═══ 4 MÉTRICAS ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid #EDF0F5" }}>
            {[
              ["SUBTOTAL", subtotalItens],
              ["DESCONTO", descontoOrcamento],
              ["IMPOSTO", impostoTotal],
              ["TOTAL FINAL", totalComImpostos],
            ].map(([label, value], idx) => (
              <div key={label} style={{ padding: "18px 20px", borderRight: idx < 3 ? "1px solid #EDF0F5" : "none" }}>
                <div style={{ color: "#94A3B8", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
                <div style={{ color: "#1E293B", fontSize: 21, fontWeight: 800 }}>{formatMoneyTrailing(value)}</div>
              </div>
            ))}
          </div>

          {/* ═══ DADOS CLIENTE + CONDIÇÕES COMERCIAIS ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1px solid #EDF0F5" }}>
            {/* Dados do cliente */}
            <div style={{ padding: "22px 28px 22px 36px", borderRight: "1px solid #EDF0F5" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1E293B", borderBottom: "2px solid #E2E8F0", paddingBottom: 8, marginBottom: 14 }}>DADOS DO CLIENTE</div>
              {[
                ["Nome", orcamento?.cliente_nome],
                ["Documento", orcamento?.cliente_cnpj_cpf || "—"],
                ["Email", orcamento?.cliente_email || "—"],
                ["Telefone", orcamento?.cliente_telefone || "—"],
                ["Endereço", orcamento?.cliente_endereco || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, marginBottom: 9 }}>
                  <span style={{ color: "#64748B", fontSize: 12 }}>{label}</span>
                  <span style={{ color: "#1E293B", fontSize: 13 }}>{value || "—"}</span>
                </div>
              ))}
            </div>

            {/* Condições comerciais */}
            <div style={{ padding: "22px 36px 22px 28px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1E293B", borderBottom: "2px solid #E2E8F0", paddingBottom: 8, marginBottom: 14 }}>CONDIÇÕES COMERCIAIS</div>
              {[
                ["Regime", regimeExibir],
                ["Modelo de execução", orcamento?.condicao_pagamento || "—"],
                ["Alíquota", aliquotaExibir],
                ["Veículo operacional", "—"],
                ["Imposto", formatMoneyTrailing(impostoTotal)],
                ["Total Final", formatMoneyTrailing(totalComImpostos)],
              ].map(([label, value], idx) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, marginBottom: 9 }}>
                  <span style={{ color: "#64748B", fontSize: 12 }}>{label}</span>
                  <span style={{ color: "#1E293B", fontSize: 13, fontWeight: idx >= 4 ? 700 : 400 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ ITENS DA PROPOSTA ═══ */}
          <div style={{ padding: "22px 36px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1E293B", marginBottom: 14 }}>ITENS DA PROPOSTA</div>
            <table className="prop-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>DESCRIÇÃO</th>
                  <th style={{ width: 70, textAlign: "center" }}>QTD</th>
                  <th style={{ width: 130, textAlign: "right" }}>PREÇO UNIT.</th>
                  <th style={{ width: 130, textAlign: "right" }}>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "#94A3B8", padding: 24 }}>Nenhum item cadastrado.</td></tr>
                ) : itens.map((item, idx) => {
                  const total = Number(item.valor_total || Number(item.quantidade || 0) * Number(item.valor_unitario || 0));
                  return (
                    <tr key={item.id || idx}>
                      <td>{item.descricao}</td>
                      <td style={{ textAlign: "center" }}>{Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
                      <td style={{ textAlign: "right" }}>{formatMoneyTrailing(item.valor_unitario)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{formatMoneyTrailing(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ═══ TOTAIS (direita) ═══ */}
          <div style={{ padding: "16px 36px 28px", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 300, maxWidth: 320 }}>
              {[
                ["Subtotal", formatMoneyTrailing(subtotalItens)],
                ["Desconto", `- ${formatMoneyTrailing(descontoOrcamento)}`],
                ["Base de cálculo", formatMoneyTrailing(Math.max(0, subtotalItens - descontoOrcamento))],
                [`Imposto (${aliquotaPercentual}%)`, formatMoneyTrailing(impostoTotal)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, gap: 16 }}>
                  <span style={{ color: "#64748B", fontSize: 13 }}>{label}</span>
                  <span style={{ color: "#1E293B", fontSize: 13 }}>{value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "#E2E8F0", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#1E293B" }}>Total da Proposta</span>
                <span style={{ fontWeight: 800, fontSize: 22, color: "#0d9488" }}>{formatMoneyTrailing(totalComImpostos)}</span>
              </div>
            </div>
          </div>

          {/* ═══ EMPRESAS QUE CONFIAM ═══ */}
          {logosClientes.length > 0 && (
            <div style={{ padding: "20px 36px", borderTop: "1px solid #EDF0F5", background: "#FAFBFD" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 16, textAlign: "center" }}>Empresas que confiam em nós</div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "10px 24px" }}>
                {logosClientes.map((item) => (
                  <div key={item.id} title={item.nome} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "7px 14px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, opacity: 0.7 }}>
                    <img src={item.logo_url || item.logo} alt={item.nome} style={{ maxHeight: 36, maxWidth: 100, objectFit: "contain", filter: "grayscale(30%)" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ RODAPÉ ═══ */}
          <div style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0", padding: "12px 36px" }}>
            <span style={{ color: "#94A3B8", fontSize: 11 }}>
              Esta proposta foi gerada em {dayjs().format("DD/MM/YYYY")}. No app desktop, use a versão de impressão para salvar o PDF com este mesmo layout.
            </span>
          </div>

        </Skeleton>
      </div>
    </div>
  );
}
