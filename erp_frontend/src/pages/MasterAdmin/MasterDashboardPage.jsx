import { useEffect, useState } from "react";
import { Card, Col, Row, Skeleton, Tag, Table, Radio, Empty, Typography, Badge, Tooltip, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import masterApi from "../../services/masterApi";

const { Text, Title } = Typography;
const moneyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v) => moneyFmt.format(Number(v || 0));

function relTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"];

const CARD_STYLE = {
  background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14,
  padding: "20px 24px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  transition: "all 0.15s ease",
};

const SISTEMA_LABELS = { erp: "ERP", facilities: "Facilities", ambos: "Ambos" };
const SISTEMA_COLORS = { erp: "blue", facilities: "green", ambos: "purple" };
const STATUS_COLORS = { ativo: "#10B981", trial: "#F59E0B", suspenso: "#EF4444", cancelado: "#94A3B8" };
const ACAO_DOT_COLORS = {
  login_sucesso: "#10B981", login_falha: "#EF4444", bloquear_cliente: "#F97316",
  desbloquear_cliente: "#3B82F6", cancelar_cliente: "#EF4444", resetar_senha: "#8B5CF6",
  aplicar_desconto: "#06B6D4", confirmar_pagamento: "#10B981",
  criar_cliente: "#3B82F6", editar_cliente: "#6366F1",
};

export default function MasterDashboardPage() {
  const [data, setData] = useState(null);
  const [saasMetrics, setSaasMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartRange, setChartRange] = useState("12m");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r1, r2] = await Promise.all([
        masterApi.get("/dashboard/"),
        masterApi.get("/metricas/"),
      ]);
      setData(r1.data);
      setSaasMetrics(r2.data);
    } catch (e) {
      setError("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 28, textAlign: "center" }}>
        <Text type="danger">{error}</Text>
        <br /><br />
        <Button icon={<ReloadOutlined />} onClick={load}>Tentar novamente</Button>
      </div>
    );
  }

  const r = data.resumo;
  const mrrChange = r.mrr_mes_anterior > 0
    ? (((r.mrr - r.mrr_mes_anterior) / r.mrr_mes_anterior) * 100).toFixed(1)
    : null;

  const evolucaoFiltrada = (() => {
    const all = data.evolucao_receita || [];
    if (chartRange === "3m") return all.slice(-3);
    if (chartRange === "6m") return all.slice(-6);
    return all;
  })();

  const maxVal = evolucaoFiltrada.reduce((m, d) => Math.max(m, d.valor), 0);
  const lastVal = evolucaoFiltrada.length ? evolucaoFiltrada[evolucaoFiltrada.length - 1].valor : 0;
  const firstVal = evolucaoFiltrada.length ? evolucaoFiltrada[0].valor : 0;
  const crescimento = firstVal > 0 ? (((lastVal - firstVal) / firstVal) * 100).toFixed(1) : 0;
  const lastThree = evolucaoFiltrada.slice(-3);
  const projecao = lastThree.length
    ? fmt((lastThree.reduce((s, d) => s + d.valor, 0) / lastThree.length) * 12)
    : "—";

  const totalPlanos = data.distribuicao_planos.reduce((s, d) => s + d.quantidade, 0);

  const topClientesCols = [
    {
      title: "#", key: "rank", width: 36,
      render: (_, __, i) => <Text style={{ color: "#94A3B8", fontSize: 12 }}>{i + 1}</Text>,
    },
    {
      title: "Nome", dataIndex: "nome_empresa", key: "nome",
      render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: "Sistema", dataIndex: "sistema", key: "sistema",
      render: (v) => <Tag color={SISTEMA_COLORS[v] || "default"} style={{ fontSize: 11 }}>{SISTEMA_LABELS[v] || v}</Tag>,
    },
    {
      title: "Plano", dataIndex: "plano_nome", key: "plano",
      render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "MRR", dataIndex: "mrr", key: "mrr",
      render: (v) => <Text strong style={{ color: "#10B981", fontSize: 13 }}>{fmt(v)}</Text>,
    },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (v, row) => (
        <Badge color={STATUS_COLORS[v] || "#94A3B8"} text={
          <Text style={{ fontSize: 12 }}>{row.status_display}</Text>
        } />
      ),
    },
    {
      title: "Desde", dataIndex: "criado_em", key: "criado",
      render: (v) => <Text style={{ fontSize: 12, color: "#94A3B8" }}>{v ? v.slice(0, 4) : "—"}</Text>,
    },
  ];

  return (
    <div style={{ padding: 28, minHeight: "100vh", background: "#F8FAFC" }}>

      {/* Saudação */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>{data.saudacao}</div>
        <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
          MRR {fmt(r.mrr)} · ARR {fmt(r.arr)} · {r.ativos} clientes ativos
        </div>
      </div>

      {/* KPI Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* MRR */}
        <Col xs={24} sm={12} lg={6}>
          <div style={CARD_STYLE}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #10B981, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 16 }}>$</span>
              </div>
              <Text style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>MRR Total</Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{fmt(r.mrr)}</div>
            {mrrChange !== null && (
              <div style={{ fontSize: 12, color: Number(mrrChange) >= 0 ? "#10B981" : "#EF4444", marginTop: 6 }}>
                {Number(mrrChange) >= 0 ? "▲" : "▼"} {Math.abs(mrrChange)}% vs mês anterior
              </div>
            )}
          </div>
        </Col>
        {/* Ativos */}
        <Col xs={24} sm={12} lg={6}>
          <div style={CARD_STYLE}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 16 }}>👥</span>
              </div>
              <Text style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Clientes Ativos</Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{r.ativos}</div>
            <div style={{ fontSize: 12, color: "#3B82F6", marginTop: 6 }}>
              +{r.novos_este_mes} novos este mês
            </div>
          </div>
        </Col>
        {/* Trial */}
        <Col xs={24} sm={12} lg={6}>
          <div style={CARD_STYLE}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 16 }}>⏳</span>
              </div>
              <Text style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Em Trial</Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{r.trial}</div>
            <div style={{ fontSize: 12, color: "#F59E0B", marginTop: 6 }}>
              {r.vencendo_proximos_7_dias} vencendo em 7 dias
            </div>
          </div>
        </Col>
        {/* Churn */}
        <Col xs={24} sm={12} lg={6}>
          <div style={CARD_STYLE}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #EF4444, #DC2626)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 16 }}>📉</span>
              </div>
              <Text style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>Taxa de Churn</Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>
              {Number(r.churn_rate).toFixed(1)}%
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>Taxa de cancelamento</div>
          </div>
        </Col>
      </Row>

      {/* Row 2: Evolução + Vencimentos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <div style={{ ...CARD_STYLE, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text strong style={{ fontSize: 15, color: "#0F172A" }}>Evolução da Receita</Text>
              <Radio.Group
                size="small"
                value={chartRange}
                onChange={(e) => setChartRange(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="3m">3m</Radio.Button>
                <Radio.Button value="6m">6m</Radio.Button>
                <Radio.Button value="12m">12m</Radio.Button>
              </Radio.Group>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={evolucaoFiltrada} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false} tickLine={false}
                />
                <RTooltip
                  formatter={(v) => [fmt(v), "Receita"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
                />
                <Area
                  type="monotone" dataKey="valor" stroke="#6366F1" strokeWidth={2}
                  fill="url(#colorReceita)" dot={false} activeDot={{ r: 5, fill: "#6366F1" }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 32, marginTop: 16, padding: "12px 0 0", borderTop: "1px solid #F1F5F9" }}>
              <div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 2 }}>Maior mês</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{fmt(maxVal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 2 }}>Crescimento</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: Number(crescimento) >= 0 ? "#10B981" : "#EF4444" }}>
                  {Number(crescimento) >= 0 ? "+" : ""}{crescimento}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 2 }}>Projeção anual</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#6366F1" }}>{projecao}</div>
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div style={{ ...CARD_STYLE, padding: 24, height: "100%" }}>
            <Text strong style={{ fontSize: 15, color: "#0F172A", display: "block", marginBottom: 16 }}>
              Vencimentos Próximos
            </Text>
            {data.vencimentos_proximos.length === 0 ? (
              <Empty description="Nenhum vencimento próximo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.vencimentos_proximos.slice(0, 8).map((v) => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{v.cliente_nome}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{v.plano_nome}</div>
                    </div>
                    <Tag color={v.dias_restantes <= 0 ? "red" : v.dias_restantes <= 3 ? "orange" : "gold"} style={{ fontSize: 11 }}>
                      {v.dias_restantes <= 0 ? `${Math.abs(v.dias_restantes)}d atraso` : `${v.dias_restantes}d`}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Row 3: Distribuição + Top Clientes */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={10}>
          <div style={{ ...CARD_STYLE, padding: 24 }}>
            <Text strong style={{ fontSize: 15, color: "#0F172A", display: "block", marginBottom: 16 }}>
              Distribuição de Planos
            </Text>
            {data.distribuicao_planos.length === 0 ? (
              <Empty description="Sem dados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.distribuicao_planos}
                      dataKey="quantidade"
                      nameKey="plano_nome"
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                    >
                      {data.distribuicao_planos.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {data.distribuicao_planos.map((d, i) => (
                    <div key={d.plano_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <Text style={{ fontSize: 12, color: "#374151" }}>{d.plano_nome}</Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Text strong style={{ fontSize: 12 }}>{d.quantidade}</Text>
                        <Text style={{ fontSize: 11, color: "#94A3B8" }}>
                          ({totalPlanos ? ((d.quantidade / totalPlanos) * 100).toFixed(0) : 0}%)
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Col>
        <Col xs={24} lg={14}>
          <div style={{ ...CARD_STYLE, padding: 24 }}>
            <Text strong style={{ fontSize: 15, color: "#0F172A", display: "block", marginBottom: 16 }}>
              Top Clientes por MRR
            </Text>
            <Table
              columns={topClientesCols}
              dataSource={data.top_clientes}
              rowKey="id"
              size="small"
              pagination={false}
              style={{ fontSize: 12 }}
            />
          </div>
        </Col>
      </Row>

      {/* Row 4: Atividade + Métricas SaaS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={17}>
          <div style={{ ...CARD_STYLE, padding: 24 }}>
            <Text strong style={{ fontSize: 15, color: "#0F172A", display: "block", marginBottom: 16 }}>
              Atividade Recente
            </Text>
            {data.atividade_recente.length === 0 ? (
              <Empty description="Sem atividade" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.atividade_recente.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                      background: ACAO_DOT_COLORS[a.acao] || "#94A3B8",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Text strong style={{ fontSize: 13, color: "#0F172A" }}>{a.acao_display}</Text>
                        <Text style={{ fontSize: 11, color: "#94A3B8" }}>{relTime(a.timestamp)}</Text>
                      </div>
                      {a.detalhes && Object.keys(a.detalhes).length > 0 && (
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                          {Object.entries(a.detalhes).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </div>
                      )}
                    </div>
                    <Text style={{ fontSize: 11, color: "#CBD5E1", flexShrink: 0 }}>{a.ip}</Text>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>
        <Col xs={24} lg={7}>
          <div style={{ ...CARD_STYLE, padding: 24 }}>
            <Text strong style={{ fontSize: 15, color: "#0F172A", display: "block", marginBottom: 16 }}>
              Métricas SaaS
            </Text>
            {saasMetrics ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "MRR", value: fmt(saasMetrics.mrr) },
                  { label: "ARR", value: fmt(saasMetrics.arr) },
                  { label: "LTV", value: fmt(saasMetrics.ltv) },
                  { label: "CAC", value: fmt(saasMetrics.cac) },
                  {
                    label: "LTV / CAC",
                    value: (
                      <span>
                        <Text strong>{Number(saasMetrics.ltv_cac_ratio).toFixed(1)}x</Text>
                        {saasMetrics.ltv_cac_ratio > 10 && (
                          <Tag color="green" style={{ marginLeft: 6, fontSize: 10 }}>Saudável</Tag>
                        )}
                      </span>
                    ),
                  },
                  { label: "Ticket Médio", value: fmt(saasMetrics.ticket_medio) },
                  { label: "Churn Rate", value: `${Number(saasMetrics.churn_rate).toFixed(1)}%` },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: "#64748B" }}>{row.label}</Text>
                    <Text strong style={{ fontSize: 13, color: "#0F172A" }}>{row.value}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton active paragraph={{ rows: 5 }} />
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
}