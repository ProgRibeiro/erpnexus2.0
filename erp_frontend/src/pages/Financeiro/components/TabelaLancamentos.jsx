import { Button, Empty, Space, Table, Tooltip, Typography, Card, Skeleton } from "antd";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";

const { Text } = Typography;

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

function formatDate(value) {
  if (!value) return "-";
  const safeValue = String(value).includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function StatusBadge({ status }) {
  const statusConfig = {
    pendente: { color: "#EA8C55", background: "#FEF3C7" },
    pago: { color: "#16a34a", background: "#DCFCE7" },
    vencido: { color: "#dc2626", background: "#FEE2E2" },
    cancelado: { color: "#9CA3AF", background: "#F3F4F6" },
  };
  const config = statusConfig[status] || statusConfig.pendente;
  const labels = {
    pendente: "Pendente",
    pago: "Pago",
    vencido: "Vencido",
    cancelado: "Cancelado",
  };
  return (
    <span
      style={{
        background: config.background,
        color: config.color,
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {labels[status] || status}
    </span>
  );
}

export default function TabelaLancamentos({
  data = [],
  loading = false,
  onEdit = () => {},
  onDelete = () => {},
  onView = () => {},
  pagination = null,
  onChange = () => {},
  size = "middle",
  title = "Lançamentos",
}) {
  const columns = [
    {
      title: "Data",
      dataIndex: "data_vencimento",
      key: "data_vencimento",
      width: 110,
      render: formatDate,
    },
    {
      title: "Descrição",
      dataIndex: "descricao",
      key: "descricao",
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Categoria",
      dataIndex: "categoria_nome",
      key: "categoria_nome",
      width: 140,
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      width: 120,
      align: "right",
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Ações",
      key: "acoes",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Visualizar">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView(record)}
              style={{ color: "#3B82F6" }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              style={{ color: "#374151" }}
            />
          </Tooltip>
          <Tooltip title="Deletar">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record.id)}
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false} style={cardStyle} title={title}>
      <Skeleton active loading={loading} paragraph={{ rows: 5 }} title={false}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <Empty description="Nenhum lançamento encontrado" style={{ margin: "20px 0" }} />
            ),
          }}
          pagination={pagination}
          onChange={onChange}
          size={size}
          scroll={{ x: 800 }}
        />
      </Skeleton>
    </Card>
  );
}
