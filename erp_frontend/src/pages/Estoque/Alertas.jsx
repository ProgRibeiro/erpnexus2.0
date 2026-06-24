import { useEffect, useState } from "react";
import { Card, Empty, Table, Tag, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import estoqueService from "../../services/estoque";

const { Title, Text } = Typography;

const colors = {
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  vermelho: "#B91C1C",
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

export default function AlertasEstoquePage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    estoqueService
      .listarProdutos({ abaixo_minimo: true })
      .then(setProdutos)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: "Código", dataIndex: "codigo", width: 120 },
    {
      title: "Produto",
      dataIndex: "nome",
      render: (text, record) => (
        <Link to={`/estoque/produtos/${record.id}`} style={{ fontWeight: 600, color: "#3B82F6" }}>
          {text}
        </Link>
      ),
    },
    {
      title: "Categoria",
      dataIndex: "categoria_nome",
      render: (value) => value || <Text style={{ color: colors.textoFraco }}>Sem categoria</Text>,
    },
    {
      title: "Estoque atual",
      dataIndex: "estoque_atual",
      width: 130,
      render: (value) => <Text strong style={{ color: colors.vermelho }}>{value}</Text>,
    },
    { title: "Estoque mínimo", dataIndex: "estoque_minimo", width: 140 },
    {
      title: "Localização",
      dataIndex: "localizacao",
      render: (value) => value || <Text style={{ color: colors.textoFraco }}>-</Text>,
    },
    {
      title: "Alerta",
      width: 110,
      render: () => <Tag color="error" style={{ borderRadius: 999, fontWeight: 700 }}>Comprar</Tag>,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.vermelho}14`,
              color: colors.vermelho,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <WarningOutlined />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: colors.texto, fontWeight: 800 }}>
              Alertas de estoque
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Produtos abaixo do estoque mínimo que precisam de reposição
            </Text>
          </div>
        </div>
      </Card>

      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={produtos}
          columns={columns}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Nenhum produto abaixo do estoque mínimo"
                style={{ margin: "40px 0" }}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
