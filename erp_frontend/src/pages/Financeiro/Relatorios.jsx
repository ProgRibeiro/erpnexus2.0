import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Descriptions,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tooltip,
  Typography,
  message,
  Modal,
} from "antd";
import {
  DownloadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import financeiroService from "../../services/financeiro";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const pageStyle = {
  minHeight: "100vh",
  background: "#F4F6F9",
  padding: "24px",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EC",
  borderRadius: 12,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  transition: "box-shadow 0.2s ease, border-color 0.2s ease",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const safeValue = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function DRESimplificada({ data, loading }) {
  if (loading) {
    return <Skeleton active paragraph={{ rows: 6 }} title={false} />;
  }

  if (!data) {
    return <Empty description="Sem dados de DRE" />;
  }

  const items = [
    { label: "Receita Bruta", value: data.receita_bruta },
    { label: "Deduções", value: -Math.abs(data.deducoes || 0) },
    { label: "Receita Líquida", value: data.receita_liquida },
    { label: "Custo de Vendas", value: -Math.abs(data.custo_vendas || 0) },
    { label: "Lucro Bruto", value: data.lucro_bruto },
    { label: "Despesas Operacionais", value: -Math.abs(data.despesas_operacionais || 0) },
    { label: "EBITDA", value: data.ebitda },
    { label: "Depreciação/Amortização", value: -Math.abs(data.depreciacao || 0) },
    { label: "EBIT", value: data.ebit },
    { label: "Despesas Financeiras", value: -Math.abs(data.despesas_financeiras || 0) },
    { label: "Resultado Líquido", value: data.resultado },
    { label: "Margem Líquida", value: `${Number(data.margem || 0).toFixed(2)}%` },
  ];

  return (
    <Card bordered={false} style={cardStyle}>
      <Descriptions
        column={2}
        bordered
        size="small"
        items={items.map((item) => ({
          label: <Text strong>{item.label}</Text>,
          children: (
            <Text
              strong
              style={{
                color:
                  typeof item.value === "number" && item.value < 0
                    ? "#dc2626"
                    : "#16a34a",
              }}
            >
              {typeof item.value === "number" ? formatMoney(item.value) : item.value}
            </Text>
          ),
        }))}
      />
    </Card>
  );
}

function RelatorioOSPorPeriodo({ data, loading }) {
  const columns = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const labels = {
          aberta: "Aberta",
          orcamento_enviado: "Orçamento",
          aprovada: "Aprovada",
          agendada: "Agendada",
          concluida: "Concluída",
          cancelada: "Cancelada",
        };
        return <Text strong>{labels[status] || status}</Text>;
      },
    },
    {
      title: "Quantidade",
      dataIndex: "total_os",
      key: "total_os",
      align: "right",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Valor Total",
      dataIndex: "total_valor",
      key: "total_valor",
      align: "right",
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: "Valor Médio",
      dataIndex: "valor_medio",
      key: "valor_medio",
      align: "right",
      render: (value) => <Text>{formatMoney(value)}</Text>,
    },
  ];

  const handleExportExcel = () => {
    try {
      const dataToExport = (data || []).map((item) => ({
        Status: {
          aberta: "Aberta",
          orcamento_enviado: "Orçamento",
          aprovada: "Aprovada",
          agendada: "Agendada",
          concluida: "Concluída",
          cancelada: "Cancelada",
        }[item.status] || item.status,
        Quantidade: item.total_os,
        "Valor Total": item.total_valor,
        "Valor Médio": item.valor_medio,
      }));

      const headers = ["Status", "Quantidade", "Valor Total", "Valor Médio"];
      const escapar = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const linhas = dataToExport.map((item) =>
        headers.map((header) => escapar(item[header])).join(";")
      );
      const csv = `\uFEFF${headers.join(";")}\r\n${linhas.join("\r\n")}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_os_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Arquivo exportado com sucesso");
    } catch (error) {
      message.error("Erro ao exportar arquivo");
    }
  };

  return (
    <Card
      bordered={false}
      style={cardStyle}
      extra={
        <Tooltip title="Exportar planilha compatível com Excel (CSV)">
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            style={{ borderRadius: 8 }}
          >
            Exportar
          </Button>
        </Tooltip>
      }
    >
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        <Table
          columns={columns}
          dataSource={data || []}
          rowKey="status"
          pagination={false}
          locale={{ emptyText: <Empty description="Sem dados" /> }}
          size="small"
        />
      </Skeleton>
    </Card>
  );
}

function AgingContasReceber({ data, loading }) {
  const agingData = data?.aging_receber || {};

  const categories = [
    { label: "A Vencer", key: "a_vencer", value: agingData.a_vencer || 0 },
    { label: "1 a 30 dias", key: "dias_1_30", value: agingData.dias_1_30 || 0 },
    { label: "31 a 60 dias", key: "dias_31_60", value: agingData.dias_31_60 || 0 },
    { label: "61 a 90 dias", key: "dias_61_90", value: agingData.dias_61_90 || 0 },
    { label: "Acima de 90 dias", key: "dias_acima_90", value: agingData.dias_acima_90 || 0 },
  ];

  const total = categories.reduce((acc, cat) => acc + cat.value, 0);

  const getColor = (key) => {
    const colors = {
      a_vencer: "#16a34a",
      dias_1_30: "#4ade80",
      dias_31_60: "#EA8C55",
      dias_61_90: "#f97316",
      dias_acima_90: "#dc2626",
    };
    return colors[key] || "#3B82F6";
  };

  return (
    <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
      <Row gutter={[16, 16]}>
        {categories.map((cat) => (
          <Col xs={24} sm={12} lg={4.8} key={cat.key}>
            <Card bordered={false} style={cardStyle}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div
                  style={{
                    height: 4,
                    background: getColor(cat.key),
                    borderRadius: 2,
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {cat.label}
                </Text>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: getColor(cat.key),
                  }}
                >
                  {formatMoney(cat.value)}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {total > 0 ? `${((cat.value / total) * 100).toFixed(1)}%` : "0%"}
                </Text>
              </Space>
            </Card>
          </Col>
        ))}
        <Col span={24}>
          <Card bordered={false} style={cardStyle}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total a Receber
            </Text>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: "#3B82F6" }}>
              {formatMoney(total)}
            </div>
          </Card>
        </Col>
      </Row>
    </Skeleton>
  );
}

function FluxoRealizadoVsPrevisto({ data, loading }) {
  const columns = [
    {
      title: "Período",
      dataIndex: "periodo",
      key: "periodo",
    },
    {
      title: "Previsto",
      dataIndex: "previsto",
      key: "previsto",
      align: "right",
      render: (value) => <Text>{formatMoney(value)}</Text>,
    },
    {
      title: "Realizado",
      dataIndex: "realizado",
      key: "realizado",
      align: "right",
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: "Variação",
      dataIndex: "variacao",
      key: "variacao",
      align: "right",
      render: (value, record) => {
        const variacao = record.realizado - record.previsto;
        const percentual = record.previsto !== 0 ? ((variacao / record.previsto) * 100).toFixed(1) : 0;
        return (
          <Text
            strong
            style={{
              color: variacao >= 0 ? "#16a34a" : "#dc2626",
            }}
          >
            {formatMoney(variacao)} ({percentual}%)
          </Text>
        );
      },
    },
  ];

  return (
    <Card bordered={false} style={cardStyle}>
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        <Table
          columns={columns}
          dataSource={data?.fluxo_comparativo || []}
          rowKey="periodo"
          pagination={false}
          locale={{ emptyText: <Empty description="Sem dados comparativos" /> }}
          size="small"
        />
      </Skeleton>
    </Card>
  );
}

export default function RelatoriosFinanceirosPage() {
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const params = {};
        if (periodo?.[0])
          params.data_inicio = periodo[0].format("YYYY-MM-DD");
        if (periodo?.[1])
          params.data_fim = periodo[1].format("YYYY-MM-DD");

        const data = await financeiroService.dre(params);
        setDre(data);
      } catch (error) {
        message.error("Erro ao carregar relatórios");
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [periodo]);

  const tabItems = [
    {
      key: "dre",
      label: "DRE Simplificada",
      children: <DRESimplificada data={dre} loading={loading} />,
    },
    {
      key: "os",
      label: "Relatório OS por Período",
      children: <RelatorioOSPorPeriodo data={dre?.ordens_servico} loading={loading} />,
    },
    {
      key: "aging",
      label: "Aging de Contas a Receber",
      children: <AgingContasReceber data={dre} loading={loading} />,
    },
    {
      key: "fluxo",
      label: "Fluxo Realizado vs Previsto",
      children: <FluxoRealizadoVsPrevisto data={dre} loading={loading} />,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: "#F8FAFC",
            headerColor: "#6B7280",
            rowHoverBg: "#F3F6FA",
          },
        },
      }}
    >
      <div style={pageStyle}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Title level={1} style={{ color: "#111827", fontSize: 24, fontWeight: 800, margin: 0 }}>
            Relatórios Financeiros
          </Title>
        </div>

        {/* Filtro de Período */}
        <Card bordered={false} style={{ ...cardStyle, marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} lg={6}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Período
              </div>
              <RangePicker
                format="DD/MM/YYYY"
                value={periodo}
                onChange={setPeriodo}
                style={{ borderRadius: 8, width: "100%" }}
              />
            </Col>
            <Col xs={24} lg={18}>
              <Button
                onClick={() => setPeriodo(null)}
                style={{ borderRadius: 8 }}
              >
                Limpar filtro
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Tabs */}
        <Card bordered={false} style={cardStyle}>
          <Tabs items={tabItems} />
        </Card>
      </div>
    </ConfigProvider>
  );
}
