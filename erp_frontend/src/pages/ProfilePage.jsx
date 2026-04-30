import { useState } from "react";
import { Button, Card, Col, Form, Input, Row, Typography, message } from "antd";

import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const updatedUser = await authService.atualizarPerfil(values);
      setAuth({ user: updatedUser, access: accessToken, refresh: refreshToken });
      message.success("Perfil atualizado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Typography.Title level={3}>Meu perfil</Typography.Title>
      <Form
        form={form}
        layout="vertical"
        initialValues={user}
        onFinish={handleFinish}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Nome" name="first_name">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Sobrenome" name="last_name">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Telefone" name="telefone">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="WhatsApp" name="whatsapp">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Cidade" name="cidade">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Estado" name="estado">
              <Input maxLength={2} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Observacoes" name="observacoes">
              <Input.TextArea rows={4} />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={loading}>
          Salvar perfil
        </Button>
      </Form>
    </Card>
  );
}
