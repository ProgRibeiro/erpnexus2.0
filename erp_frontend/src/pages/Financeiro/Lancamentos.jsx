import { useEffect, useState } from "react";
import { Button, Card, message, Space, Table, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

import financeiroService from "../../services/financeiro";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function LancamentosPage() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      setLancamentos(await financeiroService.listarLancamentos());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const confirmar = async (id) => {
    await financeiroService.confirmarPagamento(id);
    message.success("Pagamento confirmado");
    carregar();
  };

  const remover = async (id) => {
    await financeiroService.removerLancamento(id);
    message.success("Lancamento removido");
    carregar();
  };

  return (
    <Card>
      <div className="page-header">
        <Typography.Title level={3}>Lancamentos</Typography.Title>
        <Link to="/financeiro/lancamentos/novo">
          <Button type="primary">Novo lancamento</Button>
        </Link>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={lancamentos}
        columns={[
          { title: "Descricao", dataIndex: "descricao" },
          { title: "Tipo", dataIndex: "tipo", render: (v) => <Tag>{v}</Tag> },
          { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
          { title: "Conta", dataIndex: "conta_nome" },
          { title: "Categoria", dataIndex: "categoria_nome" },
          { title: "Vencimento", dataIndex: "data_vencimento" },
          { title: "Valor", dataIndex: "valor", render: money },
          {
            title: "Acoes",
            render: (_, record) => (
              <Space>
                <Link to={`/financeiro/lancamentos/${record.id}`}>Editar</Link>
                {record.status !== "pago" && (
                  <Button size="small" onClick={() => confirmar(record.id)}>
                    Confirmar
                  </Button>
                )}
                <Button danger size="small" onClick={() => remover(record.id)}>
                  Excluir
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
