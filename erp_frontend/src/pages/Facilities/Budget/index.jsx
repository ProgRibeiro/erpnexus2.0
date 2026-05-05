import { useState, useEffect } from "react";
import { Row, Col, Card, Tag, Typography, Space, Spin, Select, Progress, Divider } from "antd";
import { DollarOutlined } from "@ant-design/icons";
import api from "../../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

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

  if (loading) return <Spin style={{ display: "block", marginTop: 80, textAlign: "center" }} />;

  return (
    <div style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Budget</Title>
          <Text type="secondary">Controle de orçamento por empresa e ano</Text>
        </Col>
        <Col>
          <Select value={filtroAno} onChange={setFiltroAno} style={{ width: 120 }}>
            {anos.map((a) => <Option key={a} value={a}>{a}</Option>)}
          </Select>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, border: "none", background: "#EFF6FF" }} bodyStyle={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#3B82F620", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#3B82F6" }}>
                <DollarOutlined />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                  R$ {totalAprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Total Aprovado</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, border: "none", background: "#ECFDF5" }} bodyStyle={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#10B98120", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#10B981" }}>
                <DollarOutlined />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                  R$ {totalRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Total Realizado</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, border: "none", background: "#FFF7ED" }} bodyStyle={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "#F59E0B20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#F59E0B" }}>
                <DollarOutlined />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{consumoGeral.toFixed(1)}%</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Consumo Geral</div>
              </div>
            </div>
            <Progress
              percent={Math.min(consumoGeral, 100)}
              showInfo={false}
              strokeColor={consumoGeral > 90 ? "#EF4444" : consumoGeral > 70 ? "#F59E0B" : "#10B981"}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {budgets.length === 0 ? (
        <Card style={{ borderRadius: 14, textAlign: "center", padding: 40 }}>
          <Text type="secondary">Nenhum budget encontrado para {filtroAno}</Text>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {budgets.map((b) => {
            const pct = Number(b.percentual_consumo || 0);
            const aprovado = Number(b.valor_aprovado || 0);
            const realizado = Number(b.valor_realizado || 0);
            return (
              <Col xs={24} md={12} lg={8} key={b.id}>
                <Card
                  style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
                  bodyStyle={{ padding: "20px 24px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                      {b.empresa || "Empresa"}
                    </div>
                    <Tag color={statusColor[b.status] || "default"}>
                      {statusLabel[b.status] || b.status || "-"}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>Ano: {b.ano}</div>

                  <Divider style={{ margin: "12px 0" }} />

                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>Aprovado</div>
                      <div style={{ fontWeight: 600, color: "#3B82F6", fontSize: 14 }}>
                        R$ {aprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>Realizado</div>
                      <div style={{ fontWeight: 600, color: "#10B981", fontSize: 14 }}>
                        R$ {realizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </Col>
                  </Row>

                  <div style={{ marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Consumo</Text>
                    <Text style={{ fontSize: 12, fontWeight: 700, color: pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#10B981" }}>
                      {pct.toFixed(1)}%
                    </Text>
                  </div>
                  <Progress
                    percent={Math.min(pct, 100)}
                    showInfo={false}
                    strokeColor={pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#10B981"}
                    size="small"
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
