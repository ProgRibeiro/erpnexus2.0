import { useState, useEffect } from "react";
import { Row, Col, Card, Tag, Typography, Space, Skeleton, Select, Progress, Divider } from "antd";
import { DollarOutlined, WalletOutlined, PieChartOutlined } from "@ant-design/icons";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const colors = {
  azul: "#3B82F6",
  roxo: "#5B21B6",
  verde: "#1A7A4A",
  laranja: "#B45309",
  vermelho: "#B91C1C",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const metricCardStyle = {
  ...panelStyle,
  minHeight: 124,
};

const statusColor = {
  rascunho: "default",
  aprovado: "green",
  executando: "blue",
  encerrado: "orange",
};
const statusLabel = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  executando: "Executando",
  encerrado: "Encerrado",
};

const anoAtual = new Date().getFullYear();
const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

function consumoCor(pct) {
  return pct > 90 ? colors.vermelho : pct > 70 ? colors.laranja : colors.verde;
}

function KpiCard({ label, value, icon, color, children }) {
  return (
    <Card bordered={false} style={metricCardStyle} bodyStyle={{ padding: 20, height: "100%" }} hoverable>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: children ? 14 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: colors.textoFraco,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
          <div style={{ color: colors.texto, fontSize: 26, fontWeight: 800, lineHeight: 1, wordBreak: "break-word" }}>
            {value}
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            background: `${color}14`,
            borderRadius: 12,
            color,
            display: "flex",
            height: 44,
            justifyContent: "center",
            width: 44,
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroAno, setFiltroAno] = useState(anoAtual);

  const carregar = (ano) => {
    setLoading(true);
    api.get(`/portal/contratante/budget/?ano=${ano}`)
      .then((r) => setBudgets(Array.isArray(r.data) ? r.data : (r.data?.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(filtroAno); }, [filtroAno]);

  const totalAprovado = budgets.reduce((acc, b) => acc + Number(b.valor_aprovado || 0), 0);
  const totalRealizado = budgets.reduce((acc, b) => acc + Number(b.valor_realizado || 0), 0);
  const consumoGeral = totalAprovado > 0 ? (totalRealizado / totalAprovado) * 100 : 0;

  return (
    <div style={pageStyle}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Space align="start">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${colors.laranja}14`,
                color: colors.laranja,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <DollarOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: colors.texto, fontSize: 26, fontWeight: 800 }}>Budget</Title>
              <Text style={{ color: colors.textoSecundario }}>
                Controle de orçamento por empresa e ano
              </Text>
            </div>
          </Space>
          <Select value={filtroAno} onChange={setFiltroAno} style={{ width: 130 }}>
            {anos.map((a) => <Option key={a} value={a}>{a}</Option>)}
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card bordered={false} style={panelStyle}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            <Col xs={24} sm={8}>
              <KpiCard
                label="Total Aprovado"
                value={`R$ ${totalAprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                icon={<WalletOutlined />}
                color={colors.azul}
              />
            </Col>
            <Col xs={24} sm={8}>
              <KpiCard
                label="Total Realizado"
                value={`R$ ${totalRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                icon={<DollarOutlined />}
                color={colors.verde}
              />
            </Col>
            <Col xs={24} sm={8}>
              <KpiCard
                label="Consumo Geral"
                value={`${consumoGeral.toFixed(1)}%`}
                icon={<PieChartOutlined />}
                color={colors.laranja}
              >
                <Progress
                  percent={Math.min(consumoGeral, 100)}
                  showInfo={false}
                  strokeColor={consumoCor(consumoGeral)}
                  size="small"
                />
              </KpiCard>
            </Col>
          </Row>

          {budgets.length === 0 ? (
            <Card bordered={false} style={{ ...panelStyle, textAlign: "center" }} bodyStyle={{ padding: 48 }}>
              <Text style={{ color: colors.textoSecundario }}>Nenhum budget encontrado para {filtroAno}</Text>
            </Card>
          ) : (
            <Row gutter={[20, 20]}>
              {budgets.map((b) => {
                const pct = Number(b.percentual_consumo || 0);
                const aprovado = Number(b.valor_aprovado || 0);
                const realizado = Number(b.valor_realizado || 0);
                return (
                  <Col xs={24} md={12} lg={8} key={b.id}>
                    <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 22 }} hoverable>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: colors.texto }}>
                          {b.empresa || "Empresa"}
                        </div>
                        <Tag color={statusColor[b.status] || "default"} style={{ borderRadius: 999, fontWeight: 600 }}>
                          {statusLabel[b.status] || b.status || "-"}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, color: colors.textoFraco, marginBottom: 16 }}>Ano: {b.ano}</div>

                      <Divider style={{ margin: "12px 0" }} />

                      <Row gutter={8} style={{ marginBottom: 16 }}>
                        <Col span={12}>
                          <div style={{ fontSize: 11, color: colors.textoFraco }}>Aprovado</div>
                          <div style={{ fontWeight: 700, color: colors.azul, fontSize: 14 }}>
                            R$ {aprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 11, color: colors.textoFraco }}>Realizado</div>
                          <div style={{ fontWeight: 700, color: colors.verde, fontSize: 14 }}>
                            R$ {realizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </Col>
                      </Row>

                      <div style={{ marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: colors.textoSecundario }}>Consumo</Text>
                        <Text style={{ fontSize: 12, fontWeight: 700, color: consumoCor(pct) }}>
                          {pct.toFixed(1)}%
                        </Text>
                      </div>
                      <Progress
                        percent={Math.min(pct, 100)}
                        showInfo={false}
                        strokeColor={consumoCor(pct)}
                        size="small"
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </>
      )}
    </div>
  );
}
