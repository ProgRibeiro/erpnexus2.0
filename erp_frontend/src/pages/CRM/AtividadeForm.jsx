import { Button, Checkbox, DatePicker, Form, Input, Select, Space, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const tipos = [
  { label: "☎️ Ligação", value: "ligacao" },
  { label: "📧 Email", value: "email" },
  { label: "💬 WhatsApp", value: "whatsapp" },
  { label: "👥 Reunião", value: "reuniao" },
  { label: "🚗 Visita", value: "visita" },
  { label: "✅ Tarefa", value: "tarefa" },
  { label: "📝 Nota", value: "nota" },
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
    <Card size="small" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="tipo"
          rules={[{ required: true, message: "Informe o tipo de atividade" }]}
        >
          <Select
            placeholder="Tipo de atividade"
            options={tipos}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="titulo"
          rules={[{ required: true, message: "Informe o título da atividade" }]}
        >
          <Input
            placeholder="Título da atividade"
            size="large"
          />
        </Form.Item>

        <Form.Item name="descricao">
          <Input.TextArea
            rows={3}
            placeholder="Descrição detalhada (opcional)"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Space wrap align="start" style={{ width: "100%" }}>
          <Form.Item
            name="data_atividade"
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              showTime
              placeholder="Data da atividade"
              style={{ width: 180 }}
            />
          </Form.Item>

          <Form.Item
            name="data_vencimento"
            style={{ marginBottom: 0 }}
          >
            <DatePicker
              showTime
              placeholder="Data de vencimento"
              style={{ width: 180 }}
            />
          </Form.Item>

          <Form.Item name="concluida" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Atividade concluída</Checkbox>
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<PlusOutlined />}
          >
            Adicionar
          </Button>
        </Space>
      </Form>
    </Card>
  );
}
