import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Space, Typography, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";

import financeiroService from "../../services/financeiro";

export default function NovoLancamentoPage() {
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const carregar = async () => {
      const [contasData, categoriasData] = await Promise.all([
        financeiroService.listarContas(),
        financeiroService.listarCategorias(),
      ]);
      setContas(contasData);
      setCategorias(categoriasData);
      if (id) {
        const lancamentos = await financeiroService.listarLancamentos();
        const lancamento = lancamentos.find((item) => String(item.id) === String(id));
        if (lancamento) {
          form.setFieldsValue(lancamento);
        }
      }
    };
    carregar();
  }, [id, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (id) {
        await financeiroService.atualizarLancamento(id, values);
      } else {
        await financeiroService.criarLancamento(values);
      }
      message.success("Lancamento salvo");
      navigate("/financeiro/lancamentos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Typography.Title level={3}>{id ? "Editar lancamento" : "Novo lancamento"}</Typography.Title>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="descricao" label="Descricao" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Space.Compact block>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]} style={{ width: "50%" }}>
            <Select options={[{ value: "receita", label: "Receita" }, { value: "despesa", label: "Despesa" }]} />
          </Form.Item>
          <Form.Item name="valor" label="Valor" rules={[{ required: true }]} style={{ width: "50%" }}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Space.Compact>
        <Space.Compact block>
          <Form.Item name="data_competencia" label="Competencia" rules={[{ required: true }]} style={{ width: "50%" }}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="data_vencimento" label="Vencimento" rules={[{ required: true }]} style={{ width: "50%" }}>
            <Input type="date" />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="conta_bancaria" label="Conta bancaria" rules={[{ required: true }]}>
          <Select options={contas.map((conta) => ({ value: conta.id, label: conta.nome }))} />
        </Form.Item>
        <Form.Item name="categoria" label="Categoria">
          <Select allowClear options={categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome }))} />
        </Form.Item>
        <Form.Item name="fornecedor_cliente" label="Fornecedor/cliente">
          <Input />
        </Form.Item>
        <Form.Item name="numero_documento" label="Numero do documento">
          <Input />
        </Form.Item>
        <Form.Item name="observacoes" label="Observacoes">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Salvar
        </Button>
      </Form>
    </Card>
  );
}
