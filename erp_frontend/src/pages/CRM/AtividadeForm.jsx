import { Button, Checkbox, DatePicker, Form, Input, Select, Space } from "antd";

const tipos = [
  { label: "Ligacao", value: "ligacao" },
  { label: "Email", value: "email" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Reuniao", value: "reuniao" },
  { label: "Visita", value: "visita" },
  { label: "Tarefa", value: "tarefa" },
  { label: "Nota", value: "nota" },
];

export default function AtividadeForm({ oportunidadeId, onSubmit, loading }) {
  const [form] = Form.useForm();

  const handleFinish = async (values) => {
    await onSubmit({
      ...values,
      oportunidade: oportunidadeId,
      data_atividade: values.data_atividade?.toISOString(),
      data_vencimento: values.data_vencimento?.toISOString(),
    });
    form.resetFields();
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Space.Compact block>
        <Form.Item
          name="tipo"
          rules={[{ required: true, message: "Informe o tipo" }]}
          style={{ width: 150 }}
        >
          <Select placeholder="Tipo" options={tipos} />
        </Form.Item>
        <Form.Item
          name="titulo"
          rules={[{ required: true, message: "Informe o titulo" }]}
          style={{ width: "100%" }}
        >
          <Input placeholder="Titulo" />
        </Form.Item>
      </Space.Compact>
      <Form.Item name="descricao">
        <Input.TextArea rows={3} placeholder="Descricao" />
      </Form.Item>
      <Space wrap align="start">
        <Form.Item name="data_atividade">
          <DatePicker showTime placeholder="Data da atividade" />
        </Form.Item>
        <Form.Item name="data_vencimento">
          <DatePicker showTime placeholder="Vencimento" />
        </Form.Item>
        <Form.Item name="concluida" valuePropName="checked">
          <Checkbox>Concluida</Checkbox>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Adicionar
        </Button>
      </Space>
    </Form>
  );
}
