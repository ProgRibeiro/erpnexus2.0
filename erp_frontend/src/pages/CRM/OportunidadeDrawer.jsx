import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  List,
  message,
  Space,
  Tag,
  Timeline,
  Badge,
  Avatar,
  Card,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  MailOutlined,
} from "@ant-design/icons";

import crmService from "../../services/crm";
import AtividadeForm from "./AtividadeForm";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const prioridadeConfig = {
  baixa: { color: "green", label: "Baixa" },
  media: { color: "orange", label: "Média" },
  alta: { color: "red", label: "Alta" },
  urgente: { color: "purple", label: "Urgente" },
};

export default function OportunidadeDrawer({ oportunidade, open, onClose, onRefresh }) {
  const [emailForm] = Form.useForm();

  const handleAtividade = async (payload) => {
    try {
      await crmService.criarAtividade(payload);
      message.success("Atividade registrada com sucesso");
      onRefresh();
    } catch (error) {
      message.error("Erro ao registrar atividade");
    }
  };

  const handleConverter = async () => {
    try {
      const os = await crmService.converterOrcamento(oportunidade.id);
      message.success(`Ordem de Serviço ${os.numero} criada com sucesso`);
      onRefresh();
    } catch (error) {
      message.error("Erro ao converter para ordem de serviço");
    }
  };

  const handleEmail = async (values) => {
    try {
      await crmService.enviarEmail(oportunidade.id, values);
      emailForm.resetFields();
      message.success("Email registrado com sucesso");
      onRefresh();
    } catch (error) {
      message.error("Erro ao registrar email");
    }
  };

  const prioridade = prioridadeConfig[oportunidade?.prioridade] || prioridadeConfig.media;

  return (
    <Drawer
      width={720}
      title={
        oportunidade && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>{oportunidade.titulo}</span>
            <Tag color={prioridade.color}>{prioridade.label}</Tag>
          </div>
        )
      }
      open={open}
      onClose={onClose}
      extra={
        <Button type="primary" onClick={handleConverter} disabled={!oportunidade}>
          Converter em OS
        </Button>
      }
      bodyStyle={{ paddingBottom: 80 }}
    >
      {oportunidade && (
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          {/* Informações principais */}
          <Card size="small">
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <span style={{ fontSize: 11, color: "#9099a8", fontWeight: 600 }}>
                    CLIENTE
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                    {oportunidade.cliente_nome}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <span style={{ fontSize: 11, color: "#9099a8", fontWeight: 600 }}>
                    CONTATO
                  </span>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    {oportunidade.contato_nome || "-"}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Detalhes financeiros */}
          <Card size="small">
            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <span style={{ fontSize: 11, color: "#9099a8", fontWeight: 600 }}>
                    VALOR ESTIMADO
                  </span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3B82F6", marginTop: 4 }}>
                    {formatCurrency(oportunidade.valor_estimado)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <span style={{ fontSize: 11, color: "#9099a8", fontWeight: 600 }}>
                    PROBABILIDADE
                  </span>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                    {oportunidade.probabilidade}%
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Detalhes adicionais */}
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Responsável">
              {oportunidade.responsavel_nome ? (
                <Space size={4}>
                  <Avatar size={24} icon={<UserOutlined />} />
                  {oportunidade.responsavel_nome}
                </Space>
              ) : (
                "-"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Origem">
              {oportunidade.origem || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Data Fechamento Prevista">
              {oportunidade.data_fechamento_prevista
                ? new Date(oportunidade.data_fechamento_prevista).toLocaleDateString("pt-BR")
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge status="processing" text="Ativa" />
            </Descriptions.Item>
          </Descriptions>

          {/* Descrição */}
          {oportunidade.descricao && (
            <Card size="small" title={<FileTextOutlined />}>
              <Typography.Paragraph>{oportunidade.descricao}</Typography.Paragraph>
            </Card>
          )}

          {/* Atividades */}
          <div>
            <Divider orientation="left" style={{ fontSize: 13, fontWeight: 600 }}>
              Atividades
            </Divider>
            <AtividadeForm oportunidadeId={oportunidade.id} onSubmit={handleAtividade} />
            {(oportunidade.atividades || []).length > 0 ? (
              <Timeline
                style={{ marginTop: 16 }}
                items={(oportunidade.atividades || []).map((atividade) => ({
                  dot: atividade.concluida ? (
                    <CheckCircleOutlined style={{ fontSize: 16, color: "#10b981" }} />
                  ) : (
                    <ClockCircleOutlined style={{ fontSize: 16, color: "#3b82f6" }} />
                  ),
                  color: atividade.concluida ? "green" : "blue",
                  children: (
                    <Card size="small" style={{ marginBottom: 8 }}>
                      <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <div>
                          <Tag color="blue">{atividade.tipo}</Tag>
                          <strong>{atividade.titulo}</strong>
                          {atividade.concluida && (
                            <Tag color="green" style={{ marginLeft: 8 }}>
                              Concluída
                            </Tag>
                          )}
                        </div>
                        {atividade.descricao && (
                          <Typography.Paragraph style={{ marginBottom: 0, fontSize: 12 }}>
                            {atividade.descricao}
                          </Typography.Paragraph>
                        )}
                        <Space direction="vertical" size={0} style={{ fontSize: 11, color: "#9099a8" }}>
                          {atividade.usuario_nome && <div>👤 {atividade.usuario_nome}</div>}
                          {atividade.data_atividade && (
                            <div>📅 {new Date(atividade.data_atividade).toLocaleString("pt-BR")}</div>
                          )}
                        </Space>
                      </Space>
                    </Card>
                  ),
                }))}
              />
            ) : (
              <Empty description="Nenhuma atividade registrada" style={{ marginTop: 16 }} />
            )}
          </div>

          {/* Emails */}
          <div>
            <Divider orientation="left" style={{ fontSize: 13, fontWeight: 600 }}>
              <MailOutlined /> Comunicação por Email
            </Divider>

            <Card size="small" style={{ marginBottom: 16, backgroundColor: "#f9fafb" }}>
              <Form form={emailForm} layout="vertical" onFinish={handleEmail}>
                <Form.Item
                  name="destinatario_email"
                  label="Email do Destinatário"
                  rules={[
                    { required: true, message: "Informe o email" },
                    { type: "email", message: "Email inválido" },
                  ]}
                >
                  <Input placeholder="contato@empresa.com.br" type="email" />
                </Form.Item>
                <Form.Item name="destinatario_nome" label="Nome do Destinatário">
                  <Input placeholder="Nome (opcional)" />
                </Form.Item>
                <Form.Item
                  name="assunto"
                  label="Assunto"
                  rules={[{ required: true, message: "Informe o assunto" }]}
                >
                  <Input placeholder="Assunto do email" />
                </Form.Item>
                <Form.Item
                  name="corpo"
                  label="Mensagem"
                  rules={[{ required: true, message: "Informe o corpo do email" }]}
                >
                  <Input.TextArea rows={4} placeholder="Corpo do email" maxLength={1000} showCount />
                </Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Enviar Email
                </Button>
              </Form>
            </Card>

            {(oportunidade.emails || []).length > 0 && (
              <List
                size="small"
                dataSource={oportunidade.emails}
                renderItem={(email) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<MailOutlined style={{ color: "#3B82F6" }} />}
                      title={email.assunto}
                      description={
                        <Space wrap size="small">
                          <span>{email.destinatario_email}</span>
                          <Tag color={email.status === "enviado" ? "green" : "orange"}>
                            {email.status}
                          </Tag>
                          {email.data_envio && (
                            <span style={{ fontSize: 12, color: "#9099a8" }}>
                              {new Date(email.data_envio).toLocaleString("pt-BR")}
                            </span>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </Space>
      )}
    </Drawer>
  );
}

import { Empty, Typography } from "antd";
