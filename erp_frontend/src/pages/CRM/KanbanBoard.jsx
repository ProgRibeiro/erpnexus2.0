import { Empty, Spin, Typography } from "antd";

import KanbanCard from "./KanbanCard";

export default function KanbanBoard({
  kanban,
  loading,
  onMove,
  onOpen,
}) {
  const handleDragStart = (event, oportunidade) => {
    event.dataTransfer.setData("text/plain", String(oportunidade.id));
  };

  const handleDrop = (event, coluna) => {
    event.preventDefault();
    const oportunidadeId = event.dataTransfer.getData("text/plain");
    if (oportunidadeId) {
      onMove(Number(oportunidadeId), coluna.id);
    }
  };

  if (loading) {
    return <Spin />;
  }

  if (!kanban?.colunas?.length) {
    return <Empty description="Nenhum pipeline configurado" />;
  }

  return (
    <div className="crm-kanban-board">
      {kanban.colunas.map((coluna) => (
        <section
          key={coluna.id}
          className="crm-kanban-column"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, coluna)}
        >
          <div className="crm-kanban-column-header">
            <span className="crm-kanban-color" style={{ background: coluna.cor }} />
            <Typography.Text strong>{coluna.nome}</Typography.Text>
            <Typography.Text type="secondary">
              {coluna.oportunidades?.length || 0}
            </Typography.Text>
          </div>
          <div className="crm-kanban-column-body">
            {(coluna.oportunidades || []).map((oportunidade) => (
              <KanbanCard
                key={oportunidade.id}
                oportunidade={oportunidade}
                onOpen={onOpen}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
