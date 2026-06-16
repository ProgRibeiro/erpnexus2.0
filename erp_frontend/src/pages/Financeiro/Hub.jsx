import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  BankOutlined,
  BarChartOutlined,
  DollarOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReconciliationOutlined,
  SwapOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import financeiroService from "../../services/financeiro";

const { Title, Text, Paragraph } = Typography;

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quickActions = [
  {
    key: "novo-lancamento",
    label: "Novo lançamento",
    path: "/financeiro/lancamentos/novo",
    icon: PlusOutlined,
    color: "#3B82F6",
  },
  {
    key: "contas",
    label: "Contas bancárias",
    path: "/financeiro/contas",
    icon: BankOutlined,
    color: "#10B981",
  },
  {
    key: "lancamentos",
    label: "Lançamentos",
    path: "/financeiro/lancamentos",
    icon: FileTextOutlined,
    color: "#8B5CF6",
  },
  {
    key: "relatorios",
    label: "Relatórios",
    path: "/financeiro/relatorios",
    icon: BarChartOutlined,
    color: "#F59E0B",
  },
  {
    key: "painel",
    label: "Painel analítico",
    path: "/financeiro/analitico",
    icon: ReconciliationOutlined,
    color: "#EF4444",
  },
];

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Summary({ title, value, helper, icon: Icon, color }) {
  return (
    <Card
      bordered={false}
      style={{ borderRadius: 18, border: "1px solid #E2E8F0", height: "100%" }}
    >
      <Space
        align="start"
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <Space direction="vertical" size={6}>
          <Text
            style={{
              color: "#64748B",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {title}
          </Text>
          <Title level={3} style={{ margin: 0, color }}>
            {value}
          </Title>
          <Text style={{ color: "#94A3B8" }}>{helper}</Text>
        </Space>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${color}14`,
            color,
            flexShrink: 0,
          }}
        >
          <Icon style={{ fontSize: 18 }} />
        </div>
      </Space>
    </Card>
  );
}

function ShortList({ title, items, emptyText, onOpenMore }) {
  return (
    <Card
      bordered={false}
      style={{ borderRadius: 18, border: "1px solid #E2E8F0", height: "100%" }}
      bodyStyle={{ padding: 18 }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {onOpenMore ? (
            <Button type="link" onClick={onOpenMore}>
              Ver tudo
            </Button>
          ) : null}
        </Space>
        {items.length > 0 ? (
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                <List.Item.Meta
                  title={<Text strong>{item.title}</Text>}
                  description={item.description}
                />
                <Text strong>{item.value}</Text>
              </List.Item>
            )}
          />
        ) : (
          <Empty description={emptyText} />
        )}
      </Space>
    </Card>
  );
}

export default function FinanceiroHubPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({
    receita: 0,
    despesa: 0,
    lucro: 0,
    contas_receber: 0,
    contas_pagar: 0,
    saldo_total: 0,
    por_mes: [],
    despesas_categoria: [],
    contas_receber_lista: [],
    contas_pagar_lista: [],
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await financeiroService.dashboard();
        if (!alive) return;
        setDashboard({
          receita: toNumber(data.receita),
          despesa: toNumber(data.despesa),
          lucro: toNumber(data.lucro),
          contas_receber: toNumber(data.contas_receber),
          contas_pagar: toNumber(data.contas_pagar),
          saldo_total: toNumber(data.saldo_total),
          por_mes: Array.isArray(data.por_mes) ? data.por_mes : [],
          despesas_categoria: Array.isArray(data.despesas_categoria)
            ? data.despesas_categoria
            : [],
          contas_receber_lista: Array.isArray(data.contas_receber_lista)
            ? data.contas_receber_lista
            : [],
          contas_pagar_lista: Array.isArray(data.contas_pagar_lista)
            ? data.contas_pagar_lista
            : [],
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const revenueGrowth = useMemo(() => {
    const months = dashboard.por_mes.slice(-2);
    if (months.length < 2) return 0;
    const previous = toNumber(months[0]?.total);
    const current = toNumber(months[1]?.total);
    if (!previous) return current ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, [dashboard.por_mes]);

  const pendingReceivables = dashboard.contas_receber_lista
    .slice(0, 4)
    .map((item, index) => ({
      title:
        item.descricao || item.numero_documento || `Recebível ${index + 1}`,
      description: item.data_vencimento
        ? `Vencimento em ${String(item.data_vencimento).slice(0, 10)}`
        : "Sem vencimento",
      value: formatMoney(item.valor),
    }));

  const pendingPayables = dashboard.contas_pagar_lista
    .slice(0, 4)
    .map((item, index) => ({
      title: item.descricao || item.numero_documento || `Pagar ${index + 1}`,
      description: item.data_vencimento
        ? `Vencimento em ${String(item.data_vencimento).slice(0, 10)}`
        : "Sem vencimento",
      value: formatMoney(item.valor),
    }));

  return (
    <div style={{ padding: 24 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 22,
          border: "1px solid #E2E8F0",
          background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
          marginBottom: 16,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Row gutter={[20, 20]} align="middle">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Tag color="green" style={{ width: "fit-content", margin: 0 }}>
                Financeiro
              </Tag>
              <Title level={2} style={{ margin: 0 }}>
                Central financeira
              </Title>
              <Paragraph style={{ marginBottom: 0, color: "#475569" }}>
                Entrada principal para pagamentos, recebimentos, contas
                bancárias, relatórios e acompanhamento do caixa.
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap style={{ justifyContent: "flex-end", width: "100%" }}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.key}
                    icon={<Icon />}
                    onClick={() => navigate(action.path)}
                    style={{ borderRadius: 12, height: 42 }}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}>
          <Summary
            title="Receita"
            value={formatMoney(dashboard.receita)}
            helper={`Crescimento de ${revenueGrowth.toFixed(1)}%`}
            icon={DollarOutlined}
            color="#10B981"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Summary
            title="Despesa"
            value={formatMoney(dashboard.despesa)}
            helper="Total de despesas no período"
            icon={WalletOutlined}
            color="#EF4444"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Summary
            title="Saldo"
            value={formatMoney(dashboard.lucro)}
            helper="Resultado do período"
            icon={BankOutlined}
            color="#2563EB"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Summary
            title="Caixa"
            value={formatMoney(dashboard.saldo_total)}
            helper="Saldo consolidado das contas"
            icon={FolderOpenOutlined}
            color="#8B5CF6"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              border: "1px solid #E2E8F0",
              height: "100%",
            }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Title level={4} style={{ margin: 0 }}>
                Fluxo do caixa
              </Title>
              <Skeleton
                active
                loading={loading}
                paragraph={{ rows: 6 }}
                title={false}
              >
                {dashboard.por_mes.length > 0 ? (
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}
                    size={8}
                  >
                    {dashboard.por_mes.slice(-6).map((item, index) => {
                      const value = toNumber(item.total);
                      const max = Math.max(
                        ...dashboard.por_mes
                          .slice(-6)
                          .map((m) => toNumber(m.total)),
                        1,
                      );
                      return (
                        <div key={`${item.mes}-${index}`}>
                          <Space
                            style={{
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <Text strong>
                              {String(item.mes || "").slice(0, 10)}
                            </Text>
                            <Text>{formatMoney(value)}</Text>
                          </Space>
                          <Progress
                            percent={Math.max(5, (value / max) * 100)}
                            showInfo={false}
                            strokeColor="#3B82F6"
                          />
                        </div>
                      );
                    })}
                  </Space>
                ) : (
                  <Empty description="Sem dados de fluxo" />
                )}
              </Skeleton>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Alert
            type={
              dashboard.contas_receber > dashboard.contas_pagar
                ? "info"
                : "warning"
            }
            showIcon
            message="Leitura rápida do caixa"
            description={`A receber: ${formatMoney(dashboard.contas_receber)} | A pagar: ${formatMoney(dashboard.contas_pagar)}`}
            style={{ borderRadius: 18, marginBottom: 16 }}
          />
          <Card
            bordered={false}
            style={{ borderRadius: 18, border: "1px solid #E2E8F0" }}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Title level={4} style={{ margin: 0 }}>
                Acesso rápido
              </Title>
              <Button
                block
                onClick={() => navigate("/financeiro/lancamentos/novo")}
                type="primary"
              >
                Novo lançamento
              </Button>
              <Button block onClick={() => navigate("/financeiro/lancamentos")}>
                Abrir lançamentos
              </Button>
              <Button block onClick={() => navigate("/financeiro/contas")}>
                Contas bancárias
              </Button>
              <Button block onClick={() => navigate("/financeiro/relatorios")}>
                Relatórios
              </Button>
              <Button block onClick={() => navigate("/financeiro/analitico")}>
                Painel analítico
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ShortList
            title="Contas a receber"
            items={pendingReceivables}
            emptyText="Sem contas a receber"
            onOpenMore={() => navigate("/financeiro/lancamentos")}
          />
        </Col>
        <Col xs={24} lg={12}>
          <ShortList
            title="Contas a pagar"
            items={pendingPayables}
            emptyText="Sem contas a pagar"
            onOpenMore={() => navigate("/financeiro/lancamentos")}
          />
        </Col>
      </Row>
    </div>
  );
}
