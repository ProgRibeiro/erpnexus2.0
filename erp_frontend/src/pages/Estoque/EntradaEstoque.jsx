import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Typography, message } from "antd";
import { ArrowUpOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import estoqueService from "../../services/estoque";

const { Title, Text } = Typography;

const colors = {
  texto: "#10233C",
  textoSecundario: "#5A6070",
  borda: "#E2E6EC",
  verde: "#1A7A4A",
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

export default function EntradaEstoquePage() {
  const [produtos, setProdutos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    estoqueService.listarProdutos().then(setProdutos);
  }, []);

  const salvar = async (values) => {
    setSalvando(true);
    try {
      await estoqueService.criarMovimentacao({
        ...values,
        tipo: "entrada",
        motivo: values.motivo || "compra",
      });
      message.success("Entrada registrada");
      navigate("/estoque");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <Card bordered={false} style={panelStyle} bodyStyle={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${colors.verde}14`,
              color: colors.verde,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <ArrowUpOutlined />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: colors.texto, fontWeight: 800 }}>
              Entrada de estoque
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Registre compras, devoluções e ajustes de inventário
            </Text>
          </div>
        </div>
      </Card>

      <Card bordered={false} style={panelStyle}>
        <Form form={form} layout="vertical" onFinish={salvar}>
          <Form.Item name="produto" label="Produto" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Selecione o produto"
              options={produtos.map((produto) => ({ value: produto.id, label: `${produto.codigo} - ${produto.nome}` }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="quantidade" label="Quantidade" rules={[{ required: true }]}>
                <InputNumber min={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="valor_unitario" label="Valor unitário">
                <InputNumber min={0} style={{ width: "100%" }} prefix="R$" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="motivo" label="Motivo" initialValue="compra">
            <Select
              options={[
                { value: "compra", label: "Compra" },
                { value: "devolucao", label: "Devolução" },
                { value: "ajuste_inventario", label: "Ajuste de inventário" },
              ]}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="fornecedor" label="Fornecedor">
                <Input placeholder="Nome do fornecedor" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="numero_nota" label="Número da nota">
                <Input placeholder="NF-e" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={4} placeholder="Detalhes da entrada, condições, observações..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={salvando}
              style={{ borderRadius: 8, fontWeight: 600, height: 40 }}
            >
              Registrar entrada
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
