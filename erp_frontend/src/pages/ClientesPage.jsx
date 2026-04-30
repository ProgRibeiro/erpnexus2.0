import { useEffect, useState } from "react";
import { Card, Table, Typography } from "antd";

import clienteService from "../services/clienteService";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const data = await clienteService.listar();
        setClientes(data.results ?? data);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, []);

  return (
    <Card>
      <Typography.Title level={3}>Clientes</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={clientes}
        columns={[
          { title: "Nome", dataIndex: "nome" },
          { title: "Email", dataIndex: "email" },
          { title: "Telefone", dataIndex: "telefone" },
          { title: "Cidade", dataIndex: "cidade" },
        ]}
      />
    </Card>
  );
}
