import { useMemo } from "react";
import {
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Typography,
  Empty,
  Skeleton,
} from "antd";
import {
  DollarOutlined,
  DashOutlined,
  ThunderboltOutlined,
  BankOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
};

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function StatisticCard({ icon: Icon, color, title, value, subtitle, trend }) {
  return (
    <Card bordered={false} style={cardStyle} bodyStyle={{ padding: 18 }}>
      <Space direction="vertical" style={{ width: "100%" }} size={8}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              background: `${color}14`,
              borderRadius: 8,
              height: 36,
              width: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
              fontSize: 18,
            }}
          >
            <Icon />
          </div>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
            {title}
          </Text>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color }}>
          {value}
        </div>
        {subtitle && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {subtitle}
          </Text>
        )}
        {trend && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: trend.positive ? "#16a34a" : "#dc2626",
            }}
          >
            {trend.positive ? "↑" : "↓"} {trend.valor}
          </Text>
        )}
      </Space>
    </Card>
  );
}

export default function RelatorioPersonalizado({
  data = null,
  loading = false,
  type = "resumo", // resumo, detalhado, comparativo
}) {
  const relatorio = useMemo(() => {
    if (!data) return null;

    const receita = Number(data.receita || 0);
    const despesa = Number(data.despesa || 0);
    const lucro = receita - despesa;
    const margem = receita !== 0 ? ((lucro / receita) * 100).toFixed(2) : 0;
    const contasReceber = Number(data.contas_receber || 0);
    const contasPagar = Number(data.contas_pagar || 0);
    const saldoTotal = Number(data.saldo_total || 0);

    return {
      receita,
      despesa,
      lucro,
      margem,
      contasReceber,
      contasPagar,
      saldoTotal,
    };
  }, [data]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} title={false} />;
  }

  if (!relatorio) {
    return <Empty description="Sem dados para exibir" />;
  }

  if (type === "resumo") {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            icon={DollarOutlined}
            color="#16a34a"
            title="Receitas"
            value={formatMoney(relatorio.receita)}
            trend={{ positive: true, valor: "+12%" }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            icon={DashOutlined}
            color="#dc2626"
            title="Despesas"
            value={formatMoney(relatorio.despesa)}
            trend={{ positive: false, valor: "+5%" }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            icon={ThunderboltOutlined}
            color="#3B82F6"
            title="Lucro Líquido"
            value={formatMoney(relatorio.lucro)}
            subtitle={`Margem: ${relatorio.margem}%`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            icon={BankOutlined}
            color="#0891b2"
            title="Saldo Total"
            value={formatMoney(relatorio.saldoTotal)}
          />
        </Col>
      </Row>
    );
  }

  if (type === "detalhado") {
    return (
      <Card bordered={false} style={cardStyle}>
        <Title level={4}>Análise Detalhada</Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                  Receitas
                </Text>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", marginTop: 8 }}>
                  {formatMoney(relatorio.receita)}
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                  Contas a Receber
                </Text>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>
                  {formatMoney(relatorio.contasReceber)}
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                  Despesas
                </Text>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#dc2626", marginTop: 8 }}>
                  {formatMoney(relatorio.despesa)}
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                  Contas a Pagar
                </Text>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>
                  {formatMoney(relatorio.contasPagar)}
                </div>
              </div>
            </Space>
          </Col>
        </Row>
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid #E2E6EC",
          }}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                Lucro Líquido
              </Text>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: relatorio.lucro >= 0 ? "#16a34a" : "#dc2626",
                  marginTop: 8,
                }}
              >
                {formatMoney(relatorio.lucro)}
              </div>
            </Col>
            <Col xs={24} md={12}>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                Margem Líquida
              </Text>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
                {relatorio.margem}%
              </div>
            </Col>
          </Row>
        </div>
      </Card>
    );
  }

  return <Empty description="Tipo de relatório não encontrado" />;
}
