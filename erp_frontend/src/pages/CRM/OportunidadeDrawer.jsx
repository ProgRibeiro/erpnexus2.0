import { Button, Descriptions, Divider, Drawer, Form, Input, List, message, Space, Tag, Timeline } from "antd";

import crmService from "../../services/crm";
import AtividadeForm from "./AtividadeForm";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function OportunidadeDrawer({
  oportunidade,
  open,
  onClose,
  onRefresh,
}) {
  const [emailForm] = Form.useForm();

  const handleAtividade = async (payload) => {
    await crmService.criarAtividade(payload);
    message.success("Atividade registrada");
    onRefresh();
  };

  const handleConverter = async () => {
    const os = await crmService.converterOrcamento(oportunidade.id);
    message.success(`OS ${os.numero} criada`);
    onRefresh();
  };

  const handleEmail = async (values) => {
    await crmService.enviarEmail(oportunidade.id, values);
    emailForm.resetFields();
    message.success("Email registrado");
    onRefresh();
  };

  return (
    <Drawer
      width={720}
      title={oportunidade?.titulo}
      open={open}
      onClose={onClose}
      extra={
        <Button type="primary" onClick={handleConverter} disabled={!oportunidade}>
          Converter em OS
        </Button>
      }
    >
      {oportunidade && (
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Cliente">
              {oportunidade.cliente_nome}
            </Descriptions.Item>
            <Descriptions.Item label="Contato">
              {oportunidade.contato_nome || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Valor">
              {formatCurrency(oportunidade.valor_estimado)}
            </Descriptions.Item>
            <Descriptions.Item label="Responsavel">
              {oportunidade.responsavel_nome || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Prioridade">
              <Tag>{oportunidade.prioridade}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Probabilidade">
              {oportunidade.probabilidade}%
            </Descriptions.Item>
            <Descriptions.Item label="Origem">
              {oportunidade.origem || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Fechamento">
              {oportunidade.data_fechamento_prevista || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Descricao" span={2}>
              {oportunidade.descricao || "-"}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">Atividades</Divider>
          <AtividadeForm oportunidadeId={oportunidade.id} onSubmit={handleAtividade} />
          <Timeline
            items={(oportunidade.atividades || []).map((atividade) => ({
              color: atividade.concluida ? "green" : "blue",
              children: (
                <Space direction="vertical" size={2}>
                  <strong>{atividade.titulo}</strong>
                  <span>{atividade.descricao}</span>
                  <span>{atividade.usuario_nome || ""}</span>
                </Space>
              ),
            }))}
          />

          <Divider orientation="left">Enviar email</Divider>
          <Form form={emailForm} layout="vertical" onFinish={handleEmail}>
            <Form.Item
              name="destinatario_email"
              label="Destinatario"
              rules={[{ required: true, message: "Informe o email" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="destinatario_nome" label="Nome">
              <Input />
            </Form.Item>
            <Form.Item
              name="assunto"
              label="Assunto"
              rules={[{ required: true, message: "Informe o assunto" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="corpo"
              label="Corpo"
              rules={[{ required: true, message: "Informe o corpo" }]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Enviar
            </Button>
          </Form>

          <Divider orientation="left">Emails</Divider>
          <List
            dataSource={oportunidade.emails || []}
            renderItem={(email) => (
              <List.Item>
                <List.Item.Meta
                  title={email.assunto}
                  description={`${email.destinatario_email} - ${email.status}`}
                />
              </List.Item>
            )}
          />
        </Space>
      )}
    </Drawer>
  );
}
