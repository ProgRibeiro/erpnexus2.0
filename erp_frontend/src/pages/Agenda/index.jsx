import { useEffect, useMemo, useState } from "react";
import { Badge, Calendar, Card, List, Typography } from "antd";

import ordemService from "../../services/ordemService";

export default function AgendaPage() {
  const [ordens, setOrdens] = useState([]);

  useEffect(() => {
    ordemService
      .agenda()
      .then((data) => setOrdens(data.results ?? data))
      .catch(() => {
        setOrdens([]);
      });
  }, []);

  const porData = useMemo(() => {
    return ordens.reduce((acc, os) => {
      if (!os.data_agendada) return acc;
      acc[os.data_agendada] = [...(acc[os.data_agendada] || []), os];
      return acc;
    }, {});
  }, [ordens]);

  return (
    <Card>
      <Typography.Title level={3}>Agenda de tecnicos</Typography.Title>
      <Calendar
        cellRender={(value) => {
          const itens = porData[value.format("YYYY-MM-DD")] || [];
          return (
            <List
              size="small"
              dataSource={itens}
              renderItem={(item) => (
                <List.Item>
                  <Badge status="processing" text={`${item.numero} - ${item.cliente_nome}`} />
                </List.Item>
              )}
            />
          );
        }}
      />
    </Card>
  );
}
