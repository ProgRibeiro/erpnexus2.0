import { useState } from "react";
import { Button, Card, Col, Form, Input, Row, Typography, message } from "antd";
import { UserOutlined } from "@ant-design/icons";

import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";

const colors = {
  azul: "#3B82F6",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
};

const sectionCardStyle = {
  border: "1px solid #E2E6EC",
  borderRadius: 16,
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
  overflow: "hidden",
};

function getInitials(user) {
  const nome = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.nome || "U";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 880 }}>
      <Card bordered={false} style={sectionCardStyle} bodyStyle={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              flexShrink: 0,
              background: "linear-gradient(135deg, #3B82F6, #5B21B6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              boxShadow: "0 14px 30px rgba(59,130,246,0.28)",
            }}
          >
            {getInitials(user)}
          </div>
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={3} style={{ margin: 0, color: colors.texto, fontWeight: 800 }}>
              Meu perfil
            </Typography.Title>
            <Typography.Text style={{ color: colors.textoSecundario, fontSize: 14 }}>
              Atualize seus dados pessoais e de contato.
            </Typography.Text>
          </div>
        </div>
      </Card>

      <Card
        bordered={false}
        style={sectionCardStyle}
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.texto }}>
            <UserOutlined style={{ color: colors.azul }} />
            Dados pessoais
          </span>
        }
        bodyStyle={{ padding: 24 }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={user}
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Nome" name="first_name">
                <Input size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Sobrenome" name="last_name">
                <Input size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Telefone" name="telefone">
                <Input size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="WhatsApp" name="whatsapp">
                <Input size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Cidade" name="cidade">
                <Input size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Estado" name="estado">
                <Input size="large" maxLength={2} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Observações" name="observacoes">
                <Input.TextArea rows={4} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            style={{ borderRadius: 8, fontWeight: 600, paddingInline: 28 }}
          >
            Salvar perfil
          </Button>
        </Form>
      </Card>
    </div>
  );
}
