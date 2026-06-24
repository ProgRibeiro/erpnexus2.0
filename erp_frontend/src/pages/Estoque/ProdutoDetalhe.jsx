import { useEffect, useState } from "react";
import { Card, Col, Descriptions, Empty, Row, Skeleton, Table, Tag, Typography } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, BoxPlotOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";

import estoqueService from "../../services/estoque";

const { Title, Text } = Typography;

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const colors = {
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  azul: "#3B82F6",
  verde: "#1A7A4A",
  vermelho: "#B91C1C",
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

export default function ProdutoDetalhePage() {
  const { id } = useParams();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    estoqueService
      .obterProduto(id)
      .then(setProduto)
      .finally(() => setLoading(false));
  }, [id]);

  const emAlerta =
    produto && Number(produto.estoque_atual || 0) <= Number(produto.estoque_minimo || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <Skeleton active loading={loading} paragraph={{ rows: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${colors.azul}14`,
                color: colors.azul,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              <BoxPlotOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title level={3} style={{ margin: 0, color: colors.texto, fontWeight: 800 }}>
                {produto?.nome || "Produto"}
              </Title>
              <Text style={{ color: colors.textoSecundario }}>
                Código {produto?.codigo || "-"} • {produto?.categoria_nome || "Sem categoria"}
              </Text>
            </div>
            {produto && (
              <Tag
                color={emAlerta ? "error" : "success"}
                style={{ borderRadius: 999, padding: "4px 12px", fontWeight: 700, margin: 0 }}
              >
                {emAlerta ? "Estoque baixo" : "Estoque OK"}
              </Tag>
            )}
          </div>
        </Skeleton>
      </Card>

      <Card bordered={false} style={panelStyle} title="Dados do produto">
        <Skeleton active loading={loading} paragraph={{ rows: 4 }}>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Código">{produto?.codigo}</Descriptions.Item>
            <Descriptions.Item label="Categoria">{produto?.categoria_nome || "-"}</Descriptions.Item>
            <Descriptions.Item label="Estoque atual">
              <Text strong style={{ color: emAlerta ? colors.vermelho : colors.verde }}>
                {produto?.estoque_atual}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Estoque mínimo">{produto?.estoque_minimo}</Descriptions.Item>
            <Descriptions.Item label="Preço custo">{money(produto?.preco_custo)}</Descriptions.Item>
            <Descriptions.Item label="Preço venda">
              <Text strong style={{ color: colors.azul }}>{money(produto?.preco_venda)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Localização">{produto?.localizacao || "-"}</Descriptions.Item>
            <Descriptions.Item label="Ativo">
              <Tag color={produto?.ativo ? "success" : "default"}>{produto?.ativo ? "Sim" : "Não"}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Skeleton>
      </Card>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 0 }} title="Histórico de movimentações">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={produto?.movimentacoes || []}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhuma movimentação registrada"
                style={{ margin: "40px 0" }}
              />
            ),
          }}
          columns={[
            { title: "Data", dataIndex: "data_movimentacao" },
            {
              title: "Tipo",
              dataIndex: "tipo",
              render: (value) =>
                value === "entrada" ? (
                  <Tag icon={<ArrowUpOutlined />} color="success">Entrada</Tag>
                ) : (
                  <Tag icon={<ArrowDownOutlined />} color="error">Saída</Tag>
                ),
            },
            { title: "Motivo", dataIndex: "motivo" },
            { title: "Quantidade", dataIndex: "quantidade" },
            { title: "Valor unitário", dataIndex: "valor_unitario", render: money },
            { title: "OS", dataIndex: "os_numero" },
            { title: "Responsável", dataIndex: "realizado_por_nome" },
          ]}
        />
      </Card>
    </div>
  );
}
