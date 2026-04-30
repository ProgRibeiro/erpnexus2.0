import { useEffect, useState } from "react";
import { Alert, Button, Card, Space, Table, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

import estoqueService from "../../services/estoque";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EstoquePage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      setProdutos(await estoqueService.listarProdutos());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const totalAlertas = produtos.filter((produto) => produto.abaixo_minimo).length;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {totalAlertas > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${totalAlertas} produto(s) abaixo do estoque minimo`}
          action={<Link to="/estoque/alertas">Ver alertas</Link>}
        />
      )}
      <Card>
        <div className="page-header">
          <Typography.Title level={3}>Estoque</Typography.Title>
          <Space>
            <Link to="/estoque/entrada"><Button>Entrada</Button></Link>
            <Link to="/estoque/saida"><Button>Saida</Button></Link>
          </Space>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={produtos}
          columns={[
            { title: "Codigo", dataIndex: "codigo" },
            { title: "Nome", dataIndex: "nome", render: (text, record) => <Link to={`/estoque/produtos/${record.id}`}>{text}</Link> },
            { title: "Categoria", dataIndex: "categoria_nome" },
            { title: "Unidade", dataIndex: "unidade_medida" },
            { title: "Estoque", dataIndex: "estoque_atual" },
            { title: "Minimo", dataIndex: "estoque_minimo" },
            { title: "Custo", dataIndex: "preco_custo", render: money },
            { title: "Venda", dataIndex: "preco_venda", render: money },
            { title: "Status", dataIndex: "abaixo_minimo", render: (v) => v ? <Tag color="red">Abaixo</Tag> : <Tag color="green">OK</Tag> },
          ]}
        />
      </Card>
    </Space>
  );
}
