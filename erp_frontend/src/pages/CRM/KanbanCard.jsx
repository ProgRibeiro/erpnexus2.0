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
        border: "1px solid #E2E6EC",
        borderLeft: `3px solid ${prioridade.color}`,
        borderRadius: 12,
        cursor: "grab",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
        transition: "all 0.2s ease",
      }}
      bodyStyle={{ padding: 12 }}
      hoverable
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.08)";
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.04)";
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        {/* Título e Prioridade */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <Typography.Text strong style={{ flex: 1, fontSize: 13 }} ellipsis={{ rows: 1 }}>
            {oportunidade.titulo}
          </Typography.Text>
          <Tag color={prioridadeTagColor[oportunidade.prioridade]} style={{ marginLeft: 0, marginRight: 0 }}>
            {prioridade.label}
          </Tag>
        </div>

        {/* Cliente */}
        <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
          {oportunidade.cliente_nome}
        </Typography.Text>

        {/* Valor */}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#3B82F6" }}>
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
          <Space size={6} style={{ width: "100%" }}>
            <Avatar size={20} icon={<UserOutlined />} style={{ background: "#DBEAFE", color: "#3B82F6" }} />
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
