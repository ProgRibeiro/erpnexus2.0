import { Card, Progress, Space, Tag, Typography } from "antd";

const prioridadeColor = {
  baixa: "default",
  media: "blue",
  alta: "orange",
  urgente: "red",
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function KanbanCard({ oportunidade, onOpen, onDragStart }) {
  return (
    <Card
      size="small"
      className="crm-kanban-card"
      draggable
      onDragStart={(event) => onDragStart(event, oportunidade)}
      onClick={() => onOpen(oportunidade)}
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Typography.Text strong>{oportunidade.titulo}</Typography.Text>
        <Typography.Text type="secondary">{oportunidade.cliente_nome}</Typography.Text>
        <Space wrap>
          <Tag color={prioridadeColor[oportunidade.prioridade]}>
            {oportunidade.prioridade}
          </Tag>
          <Typography.Text>{formatCurrency(oportunidade.valor_estimado)}</Typography.Text>
        </Space>
        <Progress percent={oportunidade.probabilidade || 0} size="small" />
        <Typography.Text type="secondary">
          {oportunidade.responsavel_nome || "Sem responsavel"}
        </Typography.Text>
      </Space>
    </Card>
  );
}
