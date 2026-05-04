import { useEffect, useState } from "react";
import { Button, Card, Col, Row, Space, Table, Typography, message } from "antd";
import { BarcodeOutlined, DollarOutlined, ShoppingCartOutlined } from "@ant-design/icons";

import api from "../../services/api";

const { Text, Title } = Typography;
const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function LojaPage() {
  const [dashboard, setDashboard] = useState({});
  const [produtos, setProdutos] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      const [dash, produtosResp, caixasResp] = await Promise.all([
        api.get("/loja/dashboard/"),
        api.get("/loja/produtos/"),
        api.get("/loja/caixas/abertos/"),
      ]);
      setDashboard(dash.data || {});
      setProdutos(Array.isArray(produtosResp.data) ? produtosResp.data : produtosResp.data?.results || []);
      setCaixas(Array.isArray(caixasResp.data) ? caixasResp.data : caixasResp.data?.results || []);
    } catch {
      message.warning("Não foi possível carregar o modo loja agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirCaixa = async () => {
    try {
      await api.post("/loja/caixas/abrir/", { nome: "Caixa Loja", valor_abertura: 0 });
      message.success("Caixa aberto.");
      carregar();
    } catch {
      message.error("Não foi possível abrir o caixa.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
            <Space direction="vertical" size={2}>
              <Title level={1} style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
                Modo Loja
              </Title>
              <Text style={{ color: "#6B7280" }}>PDV, caixa, vendas, produtos e logística integrados ao ERP.</Text>
            </Space>
            <Button type="primary" icon={<DollarOutlined />} onClick={abrirCaixa} style={{ background: "#3B82F6" }}>
              Abrir caixa
            </Button>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Text style={{ color: "#6B7280", fontWeight: 700 }}>VENDAS DO DIA</Text>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#3B82F6" }}>
                {moneyFormatter.format(Number(dashboard.vendas_dia || 0))}
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Text style={{ color: "#6B7280", fontWeight: 700 }}>TICKET MÉDIO</Text>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#10B981" }}>
                {moneyFormatter.format(Number(dashboard.ticket_medio || 0))}
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Text style={{ color: "#6B7280", fontWeight: 700 }}>CAIXAS ABERTOS</Text>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{caixas.length}</div>
            </Card>
          </Col>
        </Row>

        <Card title={<><ShoppingCartOutlined /> Produtos da loja</>}>
          <Table
            loading={loading}
            rowKey="id"
            dataSource={produtos}
            columns={[
              { title: "Produto", render: (_, item) => item.produto_dados?.nome || "-" },
              { title: "Código", render: (_, item) => item.produto_dados?.codigo || "-" },
              { title: "Estoque", dataIndex: "estoque_atual" },
              { title: "Preço", dataIndex: "preco_vigente", render: (value) => moneyFormatter.format(Number(value || 0)) },
              { title: "Fiscal", render: (_, item) => `${item.ncm || "NCM não informado"} / CFOP ${item.cfop_padrao || "-"}` },
            ]}
          />
        </Card>

        <Card title={<><BarcodeOutlined /> Próximas etapas do PDV</>}>
          <Text>
            Backend completo publicado em `/api/v1/loja/`: produtos, busca por código de barras, caixa, vendas,
            pedidos de compra, entregas e relatórios.
          </Text>
        </Card>
      </Space>
    </div>
  );
}
