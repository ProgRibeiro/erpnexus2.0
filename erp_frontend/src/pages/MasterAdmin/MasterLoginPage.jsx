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
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ width: 420 }}>
        {/* Logo + badge */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            marginBottom: 20,
          }}>
            <CrownOutlined style={{ fontSize: 36, color: "#fff" }} />
          </div>
          <Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 800 }}>
            Master Admin
          </Title>
          <div style={{ marginTop: 8 }}>
            <span style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              color: "#fff",
              padding: "4px 16px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 2,
            }}>
              ERP NEXUS • CONTROLE GERAL
            </span>
          </div>
          <Text style={{ color: "#94A3B8", display: "block", marginTop: 16, fontSize: 14 }}>
            Painel exclusivo do proprietário. Gerencie planos,<br />
            clientes e pagamentos dos dois sistemas.
          </Text>
        </div>

        {/* Card de login */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
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
              style={{ marginBottom: 20 }}
            >
              <Input
                prefix={<MailOutlined style={{ color: "#6366F1" }} />}
                placeholder="E-mail master"
                size="large"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#fff",
                  height: 52,
                }}
              />
            </Form.Item>

            <Form.Item
              name="senha"
              rules={[{ required: true, message: "Informe a senha." }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#6366F1" }} />}
                placeholder="Senha master"
                size="large"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#fff",
                  height: 52,
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
                height: 52,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border: "none",
                fontWeight: 700,
                fontSize: 16,
                boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
              }}
            >
              {loading ? "Verificando..." : "Entrar no Painel Master"}
            </Button>
          </Form>

          <Text style={{ color: "#94A3B8", display: "block", marginTop: 16, fontSize: 12, textAlign: "center" }}>
            Ambiente de desenvolvimento: admin@admin.com / admin123
          </Text>

          <div style={{ textAlign: "center", marginTop: 24 }}>
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
