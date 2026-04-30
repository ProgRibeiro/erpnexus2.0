import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";

import estoqueService from "../../services/estoque";

export default function SaidaEstoquePage() {
  const [produtos, setProdutos] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    estoqueService.listarProdutos().then(setProdutos);
  }, []);

  const salvar = async (values) => {
    await estoqueService.criarMovimentacao({
      ...values,
      tipo: "saida",
      motivo: values.motivo || "uso_os",
    });
    message.success("Saida registrada");
    navigate("/estoque");
  };

  return (
    <Card>
      <Typography.Title level={3}>Saida de estoque</Typography.Title>
      <Form form={form} layout="vertical" onFinish={salvar}>
        <Form.Item name="produto" label="Produto" rules={[{ required: true }]}>
          <Select showSearch optionFilterProp="label" options={produtos.map((produto) => ({ value: produto.id, label: `${produto.codigo} - ${produto.nome}` }))} />
        </Form.Item>
        <Form.Item name="quantidade" label="Quantidade" rules={[{ required: true }]}>
          <InputNumber min={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="valor_unitario" label="Valor unitario">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="motivo" label="Motivo" initialValue="uso_os">
          <Select options={[{ value: "uso_os", label: "Uso em OS" }, { value: "perda", label: "Perda" }, { value: "ajuste_inventario", label: "Ajuste de inventario" }]} />
        </Form.Item>
        <Form.Item name="observacoes" label="Observacoes">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Button type="primary" htmlType="submit">Registrar saida</Button>
      </Form>
    </Card>
  );
}
