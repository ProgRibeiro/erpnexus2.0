import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  List,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  AlertOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BuildOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  MessageOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
  WalletOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import {
  ERP_HUB_MODULES,
  ERP_WORKFLOW_STEPS,
} from "../../config/erpExperience";

const { Title, Text, Paragraph } = Typography;

const ICONS = {
  AlertOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BuildOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  MessageOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
  WalletOutlined,
  DownloadOutlined,
  UploadOutlined,
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

const emptyFinanceiro = {
  receita: 0,
  despesa: 0,
  lucro: 0,
  contas_receber: 0,
  contas_pagar: 0,
  saldo_total: 0,
  contas_receber_lista: [],
  contas_pagar_lista: [],
};

const emptyEstoque = {
  produtos_total: 0,
  produtos_em_alerta: 0,
  alertas_nao_lidos: 0,
  movimentacoes_hoje: 0,
  valor_total_estoque: 0,
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFinanceiro(data = {}) {
  return {
    receita: toNumber(data.receita),
    despesa: toNumber(data.despesa),
    lucro: toNumber(data.lucro),
    contas_receber: toNumber(data.contas_receber),
    contas_pagar: toNumber(data.contas_pagar),
    saldo_total: toNumber(data.saldo_total),
    contas_receber_lista: Array.isArray(data.contas_receber_lista)
      ? data.contas_receber_lista
      : [],
    contas_pagar_lista: Array.isArray(data.contas_pagar_lista)
      ? data.contas_pagar_lista
      : [],
  };
}

function normalizeOrders(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeEstoque(data = {}) {
  return {
    produtos_total: toNumber(data.produtos_total),
    produtos_em_alerta: toNumber(data.produtos_em_alerta),
    alertas_nao_lidos: toNumber(data.alertas_nao_lidos),
    movimentacoes_hoje: toNumber(data.movimentacoes_hoje),
    valor_total_estoque: toNumber(data.valor_total_estoque),
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getFirstName(user) {
  return (
    user?.first_name ||
    user?.nome_completo?.split(" ")[0] ||
    user?.nome?.split(" ")[0] ||
    user?.username ||
    "usuário"
  );
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ModuleCard({ module, onClick }) {
  const Icon = ICONS[module.iconKey] || AppstoreOutlined;

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        height: "100%",
        cursor: "pointer",
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${module.accent}14`,
            color: module.accent,
          }}
        >
          <Icon style={{ fontSize: 20 }} />
        </div>
        <Space direction="vertical" size={2}>
          <Tag
            color={module.accent}
            style={{ width: "fit-content", margin: 0 }}
          >
            {module.label}
          </Tag>
          <Text strong style={{ fontSize: 15 }}>
            {module.title}
          </Text>
          <Paragraph
            style={{ marginBottom: 0, color: "#64748B", minHeight: 40 }}
          >
            {module.description}
          </Paragraph>
        </Space>
      </Space>
    </Card>
  );
}

function WorkflowCard({ step, onClick, index }) {
  const Icon = ICONS[step.iconKey] || AppstoreOutlined;

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderRadius: 16,
        border: "1px solid #E2E8F0",
        cursor: "pointer",
        height: "100%",
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space align="start" size={14}>
        <Badge
          count={index + 1}
          style={{ backgroundColor: "#3B82F6" }}
          offset={[-2, 2]}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#EFF6FF",
              color: "#2563EB",
            }}
          >
            <Icon style={{ fontSize: 18 }} />
          </div>
        </Badge>
        <Space direction="vertical" size={4}>
          <Text strong>{step.title}</Text>
          <Text style={{ color: "#64748B" }}>{step.description}</Text>
        </Space>
      </Space>
    </Card>
  );
}

function SummaryStat({ title, value, helper, icon, color, loading }) {
  const Icon = icon;

  return (
    <Card
      style={{
        borderRadius: 18,
        border: "1px solid #E2E8F0",
        height: "100%",
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Skeleton active loading={loading} paragraph={false} title={false}>
        <Space
          align="start"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Space direction="vertical" size={8}>
            <Text
              style={{
                color: "#64748B",
                fontSize: 12,
                fontWeight: 600,
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
      </Skeleton>
    </Card>
  );
}

export default function CentralGestaoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [financeiro, setFinanceiro] = useState(emptyFinanceiro);
  const [estoque, setEstoque] = useState(emptyEstoque);
  const [ordensHoje, setOrdensHoje] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const [financeiroResponse, ordensResponse, estoqueResponse] =
          await Promise.all([
            api.get("/financeiro/dashboard/"),
            api.get("/ordens/agenda/hoje/"),
            api.get("/estoque/dashboard/"),
          ]);

        if (!alive) return;

        setFinanceiro(normalizeFinanceiro(financeiroResponse.data || {}));
        setOrdensHoje(normalizeOrders(ordensResponse.data));
        setEstoque(normalizeEstoque(estoqueResponse.data || {}));
      } catch {
        if (!alive) return;
        setFinanceiro(emptyFinanceiro);
        setOrdensHoje([]);
        setEstoque(emptyEstoque);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const moduleCards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ERP_HUB_MODULES;
    return ERP_HUB_MODULES.filter((module) => {
      const haystack =
        `${module.label} ${module.title} ${module.description}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [search]);

  const todayPendingCount = ordensHoje.length;
  const stockAlertCount =
    estoque.produtos_em_alerta + estoque.alertas_nao_lidos;
  const cashGap = financeiro.receita - financeiro.despesa;

  const quickActions = [
    {
      key: "novo-orcamento",
      label: "Novo orçamento",
      path: "/orcamentos/novo",
      iconKey: "FileTextOutlined",
      color: "#8B5CF6",
    },
    {
      key: "nova-os",
      label: "Nova OS",
      path: "/ordens/novo",
      iconKey: "FileDoneOutlined",
      color: "#10B981",
    },
    {
      key: "novo-lancamento",
      label: "Lançamento",
      path: "/financeiro/lancamentos/novo",
      iconKey: "DollarOutlined",
      color: "#F59E0B",
    },
    {
      key: "estoque",
      label: "Estoque",
      path: "/estoque",
      iconKey: "ShoppingCartOutlined",
      color: "#0EA5E9",
    },
  ];

  const operationalSignals = [
    {
      title: "Receita do mês",
      value: currencyFormatter.format(financeiro.receita),
      helper: "Base financeira consolidada",
      icon: DollarOutlined,
      color: "#10B981",
    },
    {
      title: "Saldo projetado",
      value: currencyFormatter.format(cashGap),
      helper: "Receita menos despesas",
      icon: BankOutlined,
      color: cashGap >= 0 ? "#2563EB" : "#EF4444",
    },
    {
      title: "OS de hoje",
      value: integerFormatter.format(todayPendingCount),
      helper: "Agenda operacional",
      icon: CalendarOutlined,
      color: "#8B5CF6",
    },
    {
      title: "Alertas de estoque",
      value: integerFormatter.format(stockAlertCount),
      helper: "Produtos abaixo do mínimo",
      icon: AlertOutlined,
      color: "#F59E0B",
    },
  ];

  const receivables = financeiro.contas_receber_lista.slice(0, 5);
  const payables = financeiro.contas_pagar_lista.slice(0, 5);

  return (
    <div style={{ padding: 24 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 22,
          background:
            "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 52%, #EEFDF7 100%)",
          border: "1px solid #E2E8F0",
          marginBottom: 20,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Row gutter={[20, 20]} align="middle">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Tag color="blue" style={{ width: "fit-content", margin: 0 }}>
                Central de gestão
              </Tag>
              <Title level={2} style={{ margin: 0, fontSize: 28 }}>
                {getGreeting()}, {getFirstName(user)}.
              </Title>
              <Paragraph
                style={{
                  marginBottom: 0,
                  color: "#475569",
                  fontSize: 15,
                  maxWidth: 760,
                }}
              >
                Organize clientes, vendas, ordens, financeiro e estoque em um
                fluxo único, com atalhos de uso diário e visão operacional
                semelhante a um ERP completo.
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap style={{ justifyContent: "flex-end", width: "100%" }}>
              {quickActions.map((action) => {
                const Icon = ICONS[action.iconKey] || AppstoreOutlined;
                return (
                  <Button
                    key={action.key}
                    icon={<Icon />}
                    onClick={() => navigate(action.path)}
                    style={{
                      borderRadius: 12,
                      height: 42,
                      borderColor: `${action.color}33`,
                      color: action.color,
                    }}
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
        {operationalSignals.map((signal) => (
          <Col key={signal.title} xs={24} sm={12} xl={6}>
            <SummaryStat
              title={signal.title}
              value={signal.value}
              helper={signal.helper}
              icon={signal.icon}
              color={signal.color}
              loading={loading}
            />
          </Col>
        ))}
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: 20,
          border: "1px solid #E2E8F0",
          marginBottom: 16,
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Principais módulos
              </Title>
              <Text style={{ color: "#64748B" }}>
                Navegação por áreas para acelerar rotinas de cadastro, operação
                e cobrança.
              </Text>
            </div>
            <Input.Search
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar módulo"
              style={{ maxWidth: 320 }}
            />
          </div>

          <Row gutter={[14, 14]}>
            {moduleCards.map((module) => (
              <Col key={module.key} xs={24} sm={12} lg={8} xl={6}>
                <ModuleCard
                  module={module}
                  onClick={() => navigate(module.path)}
                />
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              border: "1px solid #E2E8F0",
              height: "100%",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Fluxo operacional
                </Title>
                <Text style={{ color: "#64748B" }}>
                  Um caminho simples para vender, executar, faturar e controlar.
                </Text>
              </div>
              <Row gutter={[12, 12]}>
                {ERP_WORKFLOW_STEPS.map((step, index) => (
                  <Col key={step.key} xs={24} sm={12} lg={12} xl={8}>
                    <WorkflowCard
                      step={step}
                      index={index}
                      onClick={() => navigate(step.path)}
                    />
                  </Col>
                ))}
              </Row>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              border: "1px solid #E2E8F0",
              height: "100%",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Pendências do dia
                </Title>
                <Text style={{ color: "#64748B" }}>
                  O que precisa de ação agora para manter a operação fluindo.
                </Text>
              </div>

              <Alert
                type="info"
                showIcon
                message={`${integerFormatter.format(todayPendingCount)} ordens agendadas para hoje`}
                description="Use a agenda para priorizar atendimento, execução e faturamento."
              />

              <Alert
                type="warning"
                showIcon
                message={`${integerFormatter.format(stockAlertCount)} alertas de estoque ativos`}
                description="Revise itens abaixo do mínimo antes de liberar novas ordens."
              />

              <Alert
                type={financeiro.contas_receber > 0 ? "error" : "success"}
                showIcon
                message={`${currencyFormatter.format(financeiro.contas_receber)} a receber`}
                description="Acompanhe títulos pendentes e mantenha o caixa previsível."
              />

              <Progress
                percent={Math.min(
                  100,
                  Math.max(
                    0,
                    estoque.produtos_total
                      ? (estoque.produtos_em_alerta / estoque.produtos_total) *
                          100
                      : 0,
                  ),
                )}
                strokeColor="#F59E0B"
                trailColor="#E2E8F0"
                format={(value) =>
                  `${value ? value.toFixed(0) : 0}% dos itens em alerta`
                }
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              border: "1px solid #E2E8F0",
              height: "100%",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Contas a receber
                </Title>
                <Text style={{ color: "#64748B" }}>
                  Títulos em aberto ordenados por vencimento.
                </Text>
              </div>
              <Skeleton
                active
                loading={loading}
                paragraph={{ rows: 5 }}
                title={false}
              >
                {receivables.length > 0 ? (
                  <List
                    dataSource={receivables}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Button
                            key="open"
                            type="link"
                            onClick={() => navigate("/financeiro/lancamentos")}
                          >
                            Abrir
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge
                              count={index + 1}
                              style={{ backgroundColor: "#3B82F6" }}
                            />
                          }
                          title={
                            item.descricao ||
                            item.numero_documento ||
                            "Lançamento"
                          }
                          description={formatDateTime(
                            item.data_vencimento || item.data_competencia,
                          )}
                        />
                        <Text strong>
                          {currencyFormatter.format(toNumber(item.valor))}
                        </Text>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Sem contas a receber" />
                )}
              </Skeleton>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              border: "1px solid #E2E8F0",
              height: "100%",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Ordens de hoje
                </Title>
                <Text style={{ color: "#64748B" }}>
                  Acompanhe a execução operacional em andamento.
                </Text>
              </div>
              <Skeleton
                active
                loading={loading}
                paragraph={{ rows: 5 }}
                title={false}
              >
                {ordensHoje.length > 0 ? (
                  <List
                    dataSource={ordensHoje.slice(0, 5)}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Button
                            key="open"
                            type="link"
                            onClick={() => navigate(`/ordens/${item.id}`)}
                          >
                            Ver
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge
                              count={index + 1}
                              style={{ backgroundColor: "#10B981" }}
                            />
                          }
                          title={
                            item.numero || item.codigo || `OS ${index + 1}`
                          }
                          description={
                            item.cliente?.nome ||
                            item.cliente_nome ||
                            "Cliente não informado"
                          }
                        />
                        <Space direction="vertical" align="end" size={0}>
                          <Text strong>
                            {currencyFormatter.format(
                              toNumber(
                                item.valor_total_orcado || item.valor_total,
                              ),
                            )}
                          </Text>
                          <Tag color="green">{item.status || "Agendada"}</Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Sem ordens para hoje" />
                )}
              </Skeleton>
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 18, border: "1px solid #E2E8F0" }}
          >
            <Statistic
              title="Saldo projetado"
              value={currencyFormatter.format(financeiro.lucro)}
              prefix={<CheckCircleOutlined style={{ color: "#10B981" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 18, border: "1px solid #E2E8F0" }}
          >
            <Statistic
              title="Movimentações hoje"
              value={estoque.movimentacoes_hoje}
              prefix={<ShoppingCartOutlined style={{ color: "#0EA5E9" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 18, border: "1px solid #E2E8F0" }}
          >
            <Statistic
              title="Valor total do estoque"
              value={currencyFormatter.format(estoque.valor_total_estoque)}
              prefix={<BankOutlined style={{ color: "#6366F1" }} />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
