import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Select, Switch, Table, Typography, message } from "antd";

import financeiroService from "../../services/financeiro";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ContasBancariasPage() {
  const [contas, setContas] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const carregar = async () => setContas(await financeiroService.listarContas());

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async (values) => {
    await financeiroService.salvarConta(values, editing?.id);
    message.success("Conta salva");
    setOpen(false);
    setEditing(null);
    form.resetFields();
    carregar();
  };

  const abrir = (record = null) => {
    setEditing(record);
    form.setFieldsValue(record || { tipo: "corrente", ativo: true, saldo_inicial: 0 });
    setOpen(true);
  };

  return (
    <Card>
      <div className="page-header">
        <Typography.Title level={3}>Contas bancarias</Typography.Title>
        <Button type="primary" onClick={() => abrir()}>Nova conta</Button>
      </div>
      <Table
        rowKey="id"
        dataSource={contas}
        columns={[
          { title: "Nome", dataIndex: "nome" },
          { title: "Banco", dataIndex: "banco" },
          { title: "Tipo", dataIndex: "tipo" },
          { title: "Saldo inicial", dataIndex: "saldo_inicial", render: money },
          { title: "Saldo atual", dataIndex: "saldo_atual", render: money },
          { title: "Ativa", dataIndex: "ativo", render: (v) => (v ? "Sim" : "Nao") },
          { title: "Acoes", render: (_, record) => <Button onClick={() => abrir(record)}>Editar</Button> },
        ]}
      />
      <Modal open={open} title="Conta bancaria" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={salvar}>
          <Form.Item name="nome" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="banco" label="Banco"><Input /></Form.Item>
          <Form.Item name="agencia" label="Agencia"><Input /></Form.Item>
          <Form.Item name="conta" label="Conta"><Input /></Form.Item>
          <Form.Item name="tipo" label="Tipo">
            <Select options={["corrente", "poupanca", "caixa", "investimento"].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="saldo_inicial" label="Saldo inicial">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="ativo" label="Ativo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
