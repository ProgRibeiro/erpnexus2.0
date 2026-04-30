import { useEffect, useState } from "react";
import { Button, Card, Space, Table, Tag, Typography, message } from "antd";

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

  const relatorioUrl = (record) =>
    `${window.location.origin}/relatorio/${record.token_relatorio}`;

  const copiarLink = async (record) => {
    await navigator.clipboard.writeText(relatorioUrl(record));
    message.success("Link copiado");
  };

  const whatsappLink = (record) =>
    `https://wa.me/?text=${encodeURIComponent(`Relatorio da OS ${record.numero}: ${relatorioUrl(record)}`)}`;

  return (
    <Card>
      <Typography.Title level={3}>Ordens de Servico</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={ordens}
        columns={[
          { title: "Numero", dataIndex: "numero" },
          { title: "Cliente", dataIndex: "cliente_nome" },
          {
            title: "Status",
            dataIndex: "status",
            render: (status) => <Tag color={colorByStatus[status]}>{status}</Tag>,
          },
          { title: "Valor", dataIndex: "valor_total_orcado" },
          {
            title: "Relatorio",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => copiarLink(record)}>Copiar link</Button>
                <Button size="small" href={whatsappLink(record)} target="_blank">WhatsApp</Button>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
