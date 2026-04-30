import { useEffect, useState } from "react";
import { Card, Table, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

import estoqueService from "../../services/estoque";

export default function AlertasEstoquePage() {
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    estoqueService.listarProdutos({ abaixo_minimo: true }).then(setProdutos);
  }, []);

  return (
    <Card>
      <Typography.Title level={3}>Alertas de estoque</Typography.Title>
      <Table
        rowKey="id"
        dataSource={produtos}
        columns={[
          { title: "Codigo", dataIndex: "codigo" },
          { title: "Produto", dataIndex: "nome", render: (text, record) => <Link to={`/estoque/produtos/${record.id}`}>{text}</Link> },
          { title: "Categoria", dataIndex: "categoria_nome" },
          { title: "Estoque atual", dataIndex: "estoque_atual" },
          { title: "Estoque minimo", dataIndex: "estoque_minimo" },
          { title: "Localizacao", dataIndex: "localizacao" },
          { title: "Alerta", render: () => <Tag color="red">Comprar</Tag> },
        ]}
      />
    </Card>
  );
}
