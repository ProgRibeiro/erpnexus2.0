import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Typography, message } from "antd";
import { ArrowDownOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import estoqueService from "../../services/estoque";

const { Title, Text } = Typography;

const colors = {
  texto: "#10233C",
  textoSecundario: "#5A6070",
  borda: "#E2E6EC",
  vermelho: "#B91C1C",
};

const panelStyle = {
  border: `1px solid ${colors.borda}`,
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

export default function SaidaEstoquePage() {
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
        tipo: "saida",
        motivo: values.motivo || "uso_os",
      });
      message.success("Saída registrada");
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
              background: `${colors.vermelho}14`,
              color: colors.vermelho,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <ArrowDownOutlined />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: colors.texto, fontWeight: 800 }}>
              Saída de estoque
            </Title>
            <Text style={{ color: colors.textoSecundario }}>
              Registre o consumo ou perda de itens do estoque
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
          <Form.Item name="motivo" label="Motivo" initialValue="uso_os">
            <Select
              options={[
                { value: "uso_os", label: "Uso em OS" },
                { value: "perda", label: "Perda" },
                { value: "ajuste_inventario", label: "Ajuste de inventário" },
              ]}
            />
          </Form.Item>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={4} placeholder="Detalhes da saída, OS relacionada, justificativa..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={salvando}
              style={{ borderRadius: 8, fontWeight: 600, height: 40 }}
            >
              Registrar saída
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
