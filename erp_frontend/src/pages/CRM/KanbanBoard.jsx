import { Empty, Spin, Typography } from "antd";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import KanbanCard from "./KanbanCard";

const colors = {
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  azul: "#3B82F6",
};

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
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <Spin />
      </div>
    );
  }

  if (!kanban?.colunas?.length) {
    return <Empty description="Nenhum pipeline configurado" style={{ padding: "40px 0" }} />;
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
                  backgroundColor: snapshot.isDraggingOver ? "#EFF6FF" : "#F8FAFD",
                  border: `1px solid ${snapshot.isDraggingOver ? "#BFDBFE" : colors.borda}`,
                  borderRadius: 14,
                  padding: 14,
                  minWidth: 290,
                  maxWidth: 290,
                  minHeight: 400,
                  transition: "background-color 0.2s ease, border-color 0.2s ease",
                }}
              >
                <div
                  className="crm-kanban-column-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingBottom: 12,
                    marginBottom: 0,
                    borderBottom: `1px solid ${colors.borda}`,
                  }}
                >
                  <span
                    className="crm-kanban-color"
                    style={{
                      background: coluna.cor || colors.azul,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      marginRight: 8,
                      flexShrink: 0,
                    }}
                  />
                  <Typography.Text strong style={{ flex: 1, fontSize: 13 }}>
                    {coluna.nome}
                  </Typography.Text>
                  <Typography.Text
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: `1px solid ${colors.borda}`,
                      color: "#475569",
                      padding: "1px 9px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {coluna.oportunidades?.length || 0}
                  </Typography.Text>
                </div>

                <div className="crm-kanban-column-body" style={{ marginTop: 12 }}>
                  {(coluna.oportunidades || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "26px 0", color: colors.textoFraco, fontSize: 12 }}>
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
