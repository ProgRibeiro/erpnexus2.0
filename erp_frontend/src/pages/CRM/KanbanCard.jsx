import { Avatar, Card, Progress, Space, Tag, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";

const prioridadeConfig = {
  baixa: { color: "#10b981", label: "Baixa", shortColor: "green" },
  media: { color: "#f59e0b", label: "Média", shortColor: "orange" },
  alta: { color: "#ef4444", label: "Alta", shortColor: "red" },
  urgente: { color: "#8b5cf6", label: "Urgente", shortColor: "purple" },
};

const prioridadeTagColor = {
  baixa: "success",
  media: "warning",
  alta: "error",
  urgente: "purple",
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function KanbanCard({ oportunidade, onOpen, onDragStart }) {
  const prioridade = prioridadeConfig[oportunidade.prioridade] || prioridadeConfig.media;

  return (
    <Card
      size="small"
      className="crm-kanban-card"
      draggable
      onDragStart={(event) => onDragStart(event, oportunidade)}
      onClick={() => onOpen(oportunidade)}
      style={{
        borderLeft: `4px solid ${prioridade.color}`,
        cursor: "grab",
        transition: "all 0.2s ease",
      }}
      hoverable
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        {/* Título e Prioridade */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography.Text strong style={{ flex: 1 }} ellipsis={{ rows: 1 }}>
            {oportunidade.titulo}
          </Typography.Text>
          <Tag color={prioridadeTagColor[oportunidade.prioridade]} style={{ marginLeft: 8 }}>
            {prioridade.label}
          </Tag>
        </div>

        {/* Cliente */}
        <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
          {oportunidade.cliente_nome}
        </Typography.Text>

        {/* Valor */}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#3B82F6" }}>
          {formatCurrency(oportunidade.valor_estimado)}
        </div>

        {/* Probabilidade */}
        <Progress
          percent={oportunidade.probabilidade || 0}
          size="small"
          strokeColor={prioridade.color}
          showInfo={false}
        />

        {/* Responsável com Avatar */}
        {oportunidade.responsavel_nome ? (
          <Space size={4} style={{ width: "100%" }}>
            <Avatar size={20} icon={<UserOutlined />} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {oportunidade.responsavel_nome}
            </Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Sem responsável
          </Typography.Text>
        )}

        {/* Data */}
        {oportunidade.data_fechamento_prevista && (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            📅 {new Date(oportunidade.data_fechamento_prevista).toLocaleDateString("pt-BR")}
          </Typography.Text>
        )}
      </Space>
    </Card>
  );
}
