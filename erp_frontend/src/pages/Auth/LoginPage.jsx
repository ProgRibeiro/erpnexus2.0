import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Typography,
} from "antd";
import {
  LockOutlined,
  MailOutlined,
  ToolOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { useAuthStore } from "../../store/authStore";
import authService from "../../services/authService";

const { Title, Text } = Typography;

/* ─── Dados estáticos ─────────────────────────────────── */
const BULLETS = [
  "Ordens de Serviço completas",
  "CRM e pipeline de vendas",
  "Financeiro e relatórios",
];

/* ─── Estilos ────────────────────────────────────────────
   Todos inline para não depender de CSS externo.
   O breakpoint mobile (< 768px) é tratado via JS state.
──────────────────────────────────────────────────────── */
const S = {
  root: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Manrope', 'Inter', sans-serif",
  },

  /* Painel esquerdo */
  left: (isMobile) => ({
    width: isMobile ? "100%" : "40%",
    minWidth: isMobile ? "unset" : 320,
    height: isMobile ? 120 : "auto",
    background: "linear-gradient(160deg, #1B4F8A 0%, #0d2a4a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: isMobile ? "center" : "space-between",
    padding: isMobile ? "0 24px" : "64px 48px",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  }),

  leftDecor: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    pointerEvents: "none",
  },
  leftDecor2: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.04)",
    pointerEvents: "none",
  },

  logoWrap: (isMobile) => ({
    display: "flex",
    flexDirection: isMobile ? "row" : "column",
    alignItems: "center",
    gap: isMobile ? 12 : 16,
    zIndex: 1,
  }),

  logoIcon: (isMobile) => ({
    width: isMobile ? 40 : 72,
    height: isMobile ? 40 : 72,
    borderRadius: isMobile ? 10 : 20,
    background: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: isMobile ? 20 : 36,
    color: "#fff",
    flexShrink: 0,
  }),

  brandText: (isMobile) => ({
    textAlign: isMobile ? "left" : "center",
  }),

  brandTitle: (isMobile) => ({
    color: "#fff",
    margin: 0,
    fontSize: isMobile ? 18 : 24,
    fontWeight: 700,
    lineHeight: 1.2,
  }),

  brandSub: (isMobile) => ({
    color: "rgba(255,255,255,0.7)",
    fontSize: isMobile ? 12 : 14,
    marginTop: 4,
    display: "block",
  }),

  bulletList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    zIndex: 1,
    width: "100%",
  },

  bulletItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
  },

  bulletIcon: {
    color: "#5DB8FF",
    fontSize: 18,
    flexShrink: 0,
  },

  version: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    zIndex: 1,
  },

  /* Painel direito */
  right: (isMobile) => ({
    flex: 1,
    background: "#fff",
    display: "flex",
    alignItems: isMobile ? "flex-start" : "center",
    justifyContent: "center",
    padding: isMobile ? "32px 24px" : "48px 32px",
    overflowY: "auto",
  }),

  card: {
    width: "100%",
    maxWidth: 380,
  },

  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1A1D23",
    margin: 0,
    lineHeight: 1.2,
  },

  subheading: {
    fontSize: 14,
    color: "#9099A8",
    marginTop: 8,
    display: "block",
  },

  formWrap: {
    marginTop: 32,
  },

  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#3D4350",
  },

  submitBtn: {
    width: "100%",
    height: 44,
    background: "#1B4F8A",
    borderColor: "#1B4F8A",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    color: "#fff",
    marginTop: 8,
  },

  errorMsg: {
    color: "#D9363E",
    fontSize: 13,
    marginTop: 8,
    display: "block",
    textAlign: "center",
    minHeight: 20,
  },

  forgotLink: {
    display: "block",
    textAlign: "center",
    color: "#1B4F8A",
    fontSize: 13,
    marginTop: 16,
    cursor: "pointer",
    textDecoration: "none",
  },
};

/* ─── Componente ──────────────────────────────────────── */
export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { setAuth, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  /* Responsividade via resize */
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  /* Redireciona se já estiver logado */
  useEffect(() => {
    if (!accessToken) return;
    const from = location.state?.from?.pathname;
    const dest = from && from !== "/login" ? from : "/dashboard";
    navigate(dest, { replace: true });
  }, [accessToken, location.state, navigate]);

  const onFinish = async ({ email, senha, lembrar }) => {
    if (loading) return;
    setLoading(true);
    setErro("");

    try {
      const data = await authService.login({ identifier: email, password: senha });

      if (lembrar) {
        localStorage.setItem("erp_remember_email", email);
      } else {
        localStorage.removeItem("erp_remember_email");
      }

      setAuth(data);

      const from = location.state?.from?.pathname;
      const dest = from && from !== "/" && from !== "/login" ? from : "/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        null;
      setErro(detail ?? "Email ou senha incorretos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  /* Preenche email lembrado */
  const rememberedEmail = localStorage.getItem("erp_remember_email") || "";

  return (
    <div style={S.root}>
      {/* ── PAINEL ESQUERDO ── */}
      <div style={S.left(isMobile)}>
        {/* Decorações de fundo */}
        <div style={S.leftDecor} />
        <div style={S.leftDecor2} />

        {/* Logo + nome */}
        <div style={S.logoWrap(isMobile)}>
          <div style={S.logoIcon(isMobile)}>
            <ToolOutlined />
          </div>
          <div style={S.brandText(isMobile)}>
            <p style={S.brandTitle(isMobile)}>ERP Produção</p>
            <span style={S.brandSub(isMobile)}>Gestão de Serviços</span>
          </div>
        </div>

        {/* Bullets — só desktop */}
        {!isMobile && (
          <ul style={S.bulletList}>
            {BULLETS.map((text) => (
              <li key={text} style={S.bulletItem}>
                <CheckCircleFilled style={S.bulletIcon} />
                {text}
              </li>
            ))}
          </ul>
        )}

        {/* Versão — só desktop */}
        {!isMobile && <span style={S.version}>v1.0.0</span>}
      </div>

      {/* ── PAINEL DIREITO ── */}
      <div style={S.right(isMobile)}>
        <div style={S.card}>
          {/* Cabeçalho */}
          <h1 style={S.heading}>Bem-vindo de volta</h1>
          <span style={S.subheading}>Faça login para acessar o sistema</span>

          {/* Formulário */}
          <div style={S.formWrap}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ email: rememberedEmail, lembrar: !!rememberedEmail }}
              requiredMark={false}
            >
              {/* Email */}
              <Form.Item
                name="email"
                label={<span style={S.label}>Email</span>}
                rules={[
                  { required: true, message: "Informe seu email" },
                  { type: "email", message: "Email inválido" },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#9099A8" }} />}
                  placeholder="seu@email.com"
                  size="large"
                  autoComplete="username"
                  style={{ borderRadius: 8 }}
                  onChange={() => setErro("")}
                />
              </Form.Item>

              {/* Senha */}
              <Form.Item
                name="senha"
                label={<span style={S.label}>Senha</span>}
                rules={[{ required: true, message: "Informe sua senha" }]}
                style={{ marginBottom: 12 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9099A8" }} />}
                  placeholder="••••••••"
                  size="large"
                  autoComplete="current-password"
                  style={{ borderRadius: 8 }}
                  onChange={() => setErro("")}
                />
              </Form.Item>

              {/* Lembrar */}
              <Form.Item name="lembrar" valuePropName="checked" style={{ marginBottom: 20 }}>
                <Checkbox style={{ fontSize: 13, color: "#5A6072" }}>
                  Lembrar por 30 dias
                </Checkbox>
              </Form.Item>

              {/* Botão */}
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={loading}
                  style={S.submitBtn}
                >
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </Form.Item>

              {/* Erro inline */}
              <span style={S.errorMsg}>{erro}</span>

              {/* Esqueci senha */}
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a
                style={S.forgotLink}
                onClick={(e) => {
                  e.preventDefault();
                  /* TODO: implementar modal de recuperação de senha */
                }}
              >
                Esqueci minha senha
              </a>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
