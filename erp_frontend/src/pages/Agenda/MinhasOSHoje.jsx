import { useEffect, useState } from "react";
import { Card, List, Tag, Typography } from "antd";

import ordemService from "../../services/ordemService";

export default function MinhasOSHojePage() {
  const [ordens, setOrdens] = useState([]);

  useEffect(() => {
    ordemService.agendaHoje().then((data) => setOrdens(data.results ?? data));
  }, []);

  return (
    <Card>
      <Typography.Title level={3}>Minhas OS de hoje</Typography.Title>
      <List
        dataSource={ordens}
        renderItem={(os) => (
          <List.Item>
            <List.Item.Meta
              title={`${os.numero} - ${os.cliente_nome}`}
              description={
                <>
                  <div>{os.endereco_servico_texto}</div>
                  <div>{os.descricao_servico}</div>
                  <Tag>{os.status}</Tag>
                </>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
