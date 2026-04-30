import { useEffect, useState } from "react";
import { Card, Descriptions, Table, Tag, Typography } from "antd";
import { useParams } from "react-router-dom";

import estoqueService from "../../services/estoque";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProdutoDetalhePage() {
  const { id } = useParams();
  const [produto, setProduto] = useState(null);

  useEffect(() => {
    estoqueService.obterProduto(id).then(setProduto);
  }, [id]);

  return (
    <Card>
      <Typography.Title level={3}>{produto?.nome || "Produto"}</Typography.Title>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Codigo">{produto?.codigo}</Descriptions.Item>
        <Descriptions.Item label="Categoria">{produto?.categoria_nome || "-"}</Descriptions.Item>
        <Descriptions.Item label="Estoque atual">{produto?.estoque_atual}</Descriptions.Item>
        <Descriptions.Item label="Estoque minimo">{produto?.estoque_minimo}</Descriptions.Item>
        <Descriptions.Item label="Preco custo">{money(produto?.preco_custo)}</Descriptions.Item>
        <Descriptions.Item label="Preco venda">{money(produto?.preco_venda)}</Descriptions.Item>
        <Descriptions.Item label="Localizacao">{produto?.localizacao || "-"}</Descriptions.Item>
        <Descriptions.Item label="Ativo">{produto?.ativo ? "Sim" : "Nao"}</Descriptions.Item>
      </Descriptions>
      <Typography.Title level={4} style={{ marginTop: 24 }}>Historico de movimentacoes</Typography.Title>
      <Table
        rowKey="id"
        dataSource={produto?.movimentacoes || []}
        columns={[
          { title: "Data", dataIndex: "data_movimentacao" },
          { title: "Tipo", dataIndex: "tipo", render: (v) => <Tag>{v}</Tag> },
          { title: "Motivo", dataIndex: "motivo" },
          { title: "Quantidade", dataIndex: "quantidade" },
          { title: "Valor unitario", dataIndex: "valor_unitario", render: money },
          { title: "OS", dataIndex: "os_numero" },
          { title: "Responsavel", dataIndex: "realizado_por_nome" },
        ]}
      />
    </Card>
  );
}
