import { Empty, Spin, Typography, Space, Card } from "antd";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import KanbanCard from "./KanbanCard";

export default function KanbanBoard({ kanban, loading, onMove, onOpen }) {
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside any droppable
    if (!destination) {
      return;
    }

    // Same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const oportunidadeId = Number(draggableId);
    const novaColunaId = Number(destination.droppableId);

    onMove(oportunidadeId, novaColunaId);
  };

  const handleDragStart = (event, oportunidade) => {
    event.dataTransfer.setData("text/plain", String(oportunidade.id));
  };

  if (loading) {
    return <Spin />;
  }

  if (!kanban?.colunas?.length) {
    return <Empty description="Nenhum pipeline configurado" />;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="crm-kanban-board">
        {kanban.colunas.map((coluna) => (
          <Droppable key={coluna.id} droppableId={String(coluna.id)}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="crm-kanban-column"
                style={{
                  backgroundColor: snapshot.isDraggingOver ? "#f0f5ff" : "#f9fafb",
                  borderRadius: 12,
                  padding: 14,
                  minWidth: 290,
                  maxWidth: 290,
                  minHeight: 400,
                  transition: "background-color 0.2s ease",
                }}
              >
                <div className="crm-kanban-column-header">
                  <span
                    className="crm-kanban-color"
                    style={{
                      background: coluna.cor || "#1B4F8A",
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      marginRight: 8,
                    }}
                  />
                  <Typography.Text strong style={{ flex: 1 }}>
                    {coluna.nome}
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    style={{
                      backgroundColor: "#e5e7eb",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {coluna.oportunidades?.length || 0}
                  </Typography.Text>
                </div>

                <div className="crm-kanban-column-body" style={{ marginTop: 12 }}>
                  {(coluna.oportunidades || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#9099a8" }}>
                      <Typography.Text type="secondary">Nenhuma oportunidade</Typography.Text>
                    </div>
                  ) : (
                    (coluna.oportunidades || []).map((oportunidade, index) => (
                      <Draggable
                        key={oportunidade.id}
                        draggableId={String(oportunidade.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              marginBottom: 8,
                              ...provided.draggableProps.style,
                            }}
                          >
                            <KanbanCard
                              oportunidade={oportunidade}
                              onOpen={onOpen}
                              onDragStart={handleDragStart}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
