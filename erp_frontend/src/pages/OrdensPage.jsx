import { useEffect, useState } from "react";
import { Card, Table, Tag, Typography } from "antd";

import ordemService from "../services/ordemService";

const colorByStatus = {
  aberta: "blue",
  em_andamento: "gold",
  aguardando: "orange",
  concluida: "green",
  cancelada: "red",
};

export default function OrdensPage() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const data = await ordemService.listar();
        setOrdens(data.results ?? data);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, []);

  return (
    <Card>
      <Typography.Title level={3}>Ordens de Servico</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={ordens}
        columns={[
          { title: "Titulo", dataIndex: "titulo" },
          { title: "Cliente", dataIndex: "cliente_nome" },
          {
            title: "Status",
            dataIndex: "status",
            render: (status) => <Tag color={colorByStatus[status]}>{status}</Tag>,
          },
          { title: "Valor", dataIndex: "valor_total" },
        ]}
      />
    </Card>
  );
}
