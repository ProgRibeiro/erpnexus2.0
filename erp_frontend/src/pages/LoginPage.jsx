import { useEffect, useState } from "react";
import { Button, Form, Input, Typography, Space, Row, Col } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import authService from "../services/authService";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isAuthenticated, setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fromPath = location.state?.from?.pathname;
    const redirectTo = fromPath && fromPath !== "/login" ? fromPath : "/dashboard";
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, location.state, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    setError("");

    try {
      const data = await authService.login(values);
      setAuth(data);
      const fromPath = location.state?.from?.pathname;
      const redirectTo =
        fromPath && fromPath !== "/" && fromPath !== "/login"
          ? fromPath
          : "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      const errorMsg =
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.non_field_errors?.[0] ||
        "Não foi possível autenticar. Verifique suas credenciais.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      <Row style={{ width: "100%", minHeight: "100vh" }}>
        <Col
          xs={24}
          sm={24}
          md={12}
          style={{
            background: "linear-gradient(135deg, #1B4F8A 0%, #0d2a4a 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 20px",
            color: "white",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "700",
                marginBottom: "16px",
              }}
            >
              ERP
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 16px 0" }}>
              ERP Nexus
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.8)", margin: 0 }}>
              Sistema do prestador de serviço para HVAC, refrigeração, elétrica
              e civil.
            </p>
          </div>
        </Col>

        <Col
          xs={24}
          sm={24}
          md={12}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 20px",
            background: "#ffffff",
          }}
        >
          <div style={{ width: "100%", maxWidth: "360px" }}>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  Entrar
                </Typography.Title>
                <Typography.Text type="secondary">
                  Use seu email ou username com sua senha
                </Typography.Text>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
              >
                <Form.Item
                  label="Email ou Usuário"
                  name="identifier"
                  rules={[
                    { required: true, message: "Informe seu email ou usuário" },
                  ]}
                >
                  <Input
                    placeholder="seu@email.com"
                    size="large"
                    autoComplete="username"
                  />
                </Form.Item>

                <Form.Item
                  label="Senha"
                  name="password"
                  rules={[{ required: true, message: "Informe sua senha" }]}
                >
                  <Input.Password
                    placeholder="••••••••"
                    size="large"
                    autoComplete="current-password"
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  style={{ height: "44px", fontSize: "16px", fontWeight: "600" }}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </Form>

              {error && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#fee2e2",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    color: "#b91c1c",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </div>
              )}
            </Space>
          </div>
        </Col>
      </Row>
    </div>
  );
}
