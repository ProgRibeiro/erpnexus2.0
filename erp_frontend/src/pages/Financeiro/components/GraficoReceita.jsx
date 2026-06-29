import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Empty, Skeleton } from "antd";

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

export default function GraficoReceita({
  data = [],
  loading = false,
  title = "Receitas e Despesas",
  height = 300,
  showLegend = true,
  colors = { receita: "#16a34a", despesa: "#dc2626" },
}) {
  return (
    <Card bordered={false} style={cardStyle} title={title}>
      <Skeleton active loading={loading} paragraph={{ rows: 8 }} title={false}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
              <XAxis dataKey="mes" tick={{ fill: "#6B7280", fontSize: 12 }} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} />
              <RechartsTooltip
                formatter={(value) => formatMoney(value)}
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #E2E6EC",
                  borderRadius: 8,
                }}
              />
              {showLegend && <Legend />}
              <Bar dataKey="receita" fill={colors.receita} name="Receita" />
              <Bar dataKey="despesa" fill={colors.despesa} name="Despesa" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="Sem dados disponíveis" />
        )}
      </Skeleton>
    </Card>
  );
}
