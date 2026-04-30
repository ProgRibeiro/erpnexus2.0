import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onFinish = async (values) => {
    setLoading(true);
    setError("");

    try {
      const data = await authService.login(values);
      setAuth(data);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          requestError?.response?.data?.non_field_errors?.[0] ||
          "Nao foi possivel autenticar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <Typography.Title level={2}>Entrar no ERP</Typography.Title>
        <Typography.Paragraph type="secondary">
          Use email ou username com sua senha.
        </Typography.Paragraph>
        {error ? <Alert type="error" message={error} showIcon /> : null}
        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item
            label="Email ou username"
            name="identifier"
            rules={[{ required: true, message: "Informe seu acesso." }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="Senha"
            name="password"
            rules={[{ required: true, message: "Informe sua senha." }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Entrar
          </Button>
        </Form>
      </Card>
    </div>
  );
}
