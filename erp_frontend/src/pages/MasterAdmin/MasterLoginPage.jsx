import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Input, message, Typography } from "antd";
import { LockOutlined, MailOutlined, CrownOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

export default function MasterLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      localStorage.removeItem("master_token");
      localStorage.removeItem("master_refresh");

      const res = await axios.post("/api/master/auth/login/", {
        email: values.email,
        senha: values.senha,
      });
      localStorage.setItem("master_token", res.data.access);
      localStorage.setItem("master_refresh", res.data.refresh);
      message.success("Acesso autorizado.");
      navigate("/master/dashboard");
    } catch (error) {
      message.error(error?.response?.data?.detail || "Falha ao acessar o painel master.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0B1220 0%, #111827 50%, #0B1120 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.16), transparent 70%)",
        top: "-12%", left: "-8%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 480, height: 480, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(91,33,182,0.16), transparent 70%)",
        bottom: "-14%", right: "-8%", pointerEvents: "none",
      }} />

      <div style={{ width: 420, position: "relative", zIndex: 1 }}>
        {/* Logo + badge */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 76,
            height: 76,
            borderRadius: 20,
            background: "linear-gradient(135deg, #3B82F6, #5B21B6)",
            boxShadow: "0 14px 36px rgba(59, 130, 246, 0.32)",
            marginBottom: 20,
          }}>
            <CrownOutlined style={{ fontSize: 34, color: "#fff" }} />
          </div>
          <Title level={2} style={{ color: "#F8FAFC", margin: 0, fontWeight: 800 }}>
            Master Admin
          </Title>
          <div style={{ marginTop: 10 }}>
            <span style={{
              background: "linear-gradient(135deg, #3B82F6, #5B21B6)",
              color: "#fff",
              padding: "4px 16px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
            }}>
              ERP NEXUS • CONTROLE GERAL
            </span>
          </div>
          <Text style={{ color: "#94A3B8", display: "block", marginTop: 16, fontSize: 14, lineHeight: 1.6 }}>
            Painel exclusivo do proprietário. Gerencie planos,<br />
            clientes e pagamentos dos dois sistemas.
          </Text>
        </div>

        {/* Card de login */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(148,163,184,0.16)",
          borderRadius: 18,
          padding: "36px 32px",
          boxShadow: "0 28px 64px rgba(0,0,0,0.38)",
        }}>
          <Form
            layout="vertical"
            onFinish={handleLogin}
            autoComplete="off"
            initialValues={{
              email: "admin@admin.com",
              senha: "admin123",
            }}
          >
            <Form.Item
              name="email"
              rules={[{ required: true, message: "Informe o e-mail." }]}
              style={{ marginBottom: 18 }}
            >
              <Input
                prefix={<MailOutlined style={{ color: "#60A5FA" }} />}
                placeholder="E-mail master"
                size="large"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(148,163,184,0.22)",
                  borderRadius: 10,
                  color: "#fff",
                  height: 50,
                }}
              />
            </Form.Item>

            <Form.Item
              name="senha"
              rules={[{ required: true, message: "Informe a senha." }]}
              style={{ marginBottom: 26 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#60A5FA" }} />}
                placeholder="Senha master"
                size="large"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(148,163,184,0.22)",
                  borderRadius: 10,
                  color: "#fff",
                  height: 50,
                }}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                height: 50,
                borderRadius: 10,
                background: "linear-gradient(135deg, #3B82F6, #5B21B6)",
                border: "none",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: "0 10px 26px rgba(59, 130, 246, 0.35)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 14px 32px rgba(59, 130, 246, 0.42)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 26px rgba(59, 130, 246, 0.35)";
              }}
            >
              {loading ? "Verificando..." : "Entrar no Painel Master"}
            </Button>
          </Form>

          <Text style={{ color: "#94A3B8", display: "block", marginTop: 16, fontSize: 12, textAlign: "center" }}>
            Ambiente de desenvolvimento: admin@admin.com / admin123
          </Text>

          <div style={{ textAlign: "center", marginTop: 22 }}>
            <Button
              type="link"
              style={{ color: "#94A3B8", fontSize: 13 }}
              onClick={() => navigate("/")}
            >
              ← Voltar ao sistema
            </Button>
          </div>
        </div>

        <Text style={{ display: "block", textAlign: "center", color: "#475569", marginTop: 24, fontSize: 12 }}>
          Acesso monitorado e registrado. Apenas pessoal autorizado.
        </Text>
      </div>
    </div>
  );
}
