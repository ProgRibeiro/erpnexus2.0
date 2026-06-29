import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, Checkbox } from "antd";
import {
  ToolOutlined,
  BuildOutlined,
  CheckCircleFilled,
  ArrowLeftOutlined,
  MailOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { getStoredAuthState, useAuthStore } from "../../store/authStore";
import authService from "../../services/authService";

const MODOS = {
  prestador: {
    key: "prestador",
    icone: ToolOutlined,
    gradiente: "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
    titulo: "Prestador de Serviço",
    subtitulo: "Ordens de serviço, orçamentos, financeiro, técnicos em campo",
    bullets: [
      "Ordens de Serviço completas",
      "CRM e orçamentos",
      "Financeiro e relatórios",
      "Técnico em campo (PWA)",
    ],
    destino: "/dashboard",
    modoLabel: "ERP Prestador",
    brandSub: "Sistema do prestador de serviço",
  },
  facilities: {
    key: "facilities",
    icone: BuildOutlined,
    gradiente: "linear-gradient(135deg, #10B981 0%, #065F46 100%)",
    titulo: "Facilities / Manutenção",
    subtitulo: "Ativos, manutenção preventiva, chamados, obras e contratos",
    bullets: [
      "Gestão de ativos e equipamentos",
      "Manutenção preventiva (PMP)",
      "Help Desk interno",
      "Obras e projetos de engenharia",
    ],
    destino: "/facilities",
    modoLabel: "ERP Facilities",
    brandSub: "Gestão predial e manutenção",
  },
};

function moduloUsuario(user) {
  if (user?.is_superuser) return "ambos";
  return user?.modulo || "erp";
}

function podeAcessarModo(user, modo) {
  const modulo = moduloUsuario(user);
  if (modulo === "ambos") return true;
  if (modo === "facilities") return modulo === "facilities";
  return modulo === "erp";
}

function destinoDaLicenca(user) {
  return "/";
}

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [modo, setModo] = useState(null);

  const { setAuth, accessToken, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const storedUser = getStoredAuthState().user;
    const currentUser = user || storedUser;
    if (!currentUser) {
      clearAuth();
      return;
    }
    const from = location.state?.from?.pathname;
    const defaultDest = destinoDaLicenca(currentUser);
    const dest = from && from !== "/login" ? from : defaultDest;
    navigate(dest, { replace: true });
  }, [accessToken, clearAuth, location.state, navigate, user]);

  const onFinish = async ({ email, senha, lembrar }) => {
    // Modo é obrigatório — usuário deve ter escolhido o sistema primeiro
    if (loading || !modo) return;
    setLoading(true);
    setErro("");
    try {
      const data = await authService.login({ identifier: email, password: senha });
      if (!podeAcessarModo(data.user, modo)) {
        const destino = destinoDaLicenca(data.user);
        const nomeProduto = modo === "facilities" ? "ERP Facilities" : "ERP Serviços";
        const produtoPermitido = destino === "/facilities" ? "ERP Facilities" : "ERP Serviços";
        setErro(`Sua licença não permite acesso ao ${nomeProduto}. Use o acesso do ${produtoPermitido}.`);
        return;
      }
      if (lembrar) {
        localStorage.setItem("erp_remember_email", email);
      } else {
        localStorage.removeItem("erp_remember_email");
      }
      setAuth(data);
      const from = location.state?.from?.pathname;
      const defaultDest = destinoDaLicenca(data.user);
      const dest = from && from !== "/" && from !== "/login" ? from : defaultDest;
      navigate(dest, { replace: true });
    } catch (err) {
      // Erro de rede (servidor não está rodando)
      if (!err?.response) {
        setErro("Não foi possível conectar ao servidor. Verifique se o backend está rodando (iniciar-backend.bat).");
      } else {
        const detail =
          err?.response?.data?.detail ||
          err?.response?.data?.non_field_errors?.[0] ||
          null;
        setErro(detail ?? "Email ou senha incorretos. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const rememberedEmail = localStorage.getItem("erp_remember_email") || "";

  /* ── TELA DE SELEÇÃO DE MODO ── */
  if (modo === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F1F5F9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          fontFamily: "'Inter', 'Manrope', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: "#fff",
            }}
          >
            <ToolOutlined />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", lineHeight: 1.1 }}>
              ERP Nexus
            </div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Plataforma integrada</div>
          </div>
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1E293B",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Escolha como deseja acessar
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#64748B",
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          Selecione o módulo que corresponde ao seu perfil
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 24,
            alignItems: "stretch",
            justifyContent: "center",
            width: "100%",
            maxWidth: 760,
          }}
        >
          {Object.values(MODOS).map((m) => {
            const Icone = m.icone;
            return (
              <ModoCard
                key={m.key}
                modo={m}
                Icone={Icone}
                isMobile={isMobile}
                onClick={() => setModo(m.key)}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 40, fontSize: 12, color: "#94A3B8" }}>
          ERP Nexus v1.0.0 — Todos os direitos reservados
        </div>
      </div>
    );
  }

  /* ── TELA DE LOGIN (modo escolhido ou direto) ── */
  const modoData = MODOS[modo] || MODOS["prestador"];
  const Icone = modoData.icone;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Inter', 'Manrope', sans-serif",
        animation: "fadeSlideIn 0.3s ease",
      }}
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {!isMobile && (
        <div
          style={{
            width: "40%",
            minWidth: 320,
            background: modoData.gradiente,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "64px 48px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                color: "#fff",
              }}
            >
              <Icone />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#fff", margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
                {modoData.modoLabel}
              </p>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4, display: "block" }}>
                {modoData.brandSub}
              </span>
            </div>
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              zIndex: 1,
              width: "100%",
            }}
          >
            {modoData.bullets.map((text) => (
              <li
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                <CheckCircleFilled style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, flexShrink: 0 }} />
                {text}
              </li>
            ))}
          </ul>

          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, zIndex: 1 }}>v1.0.0</span>
        </div>
      )}

      <div
        style={{
          flex: 1,
          background: "#fff",
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "center",
          padding: isMobile ? "32px 24px" : "48px 32px",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          {isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: modoData.gradiente,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#fff",
                }}
              >
                <Icone />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1D23" }}>{modoData.modoLabel}</div>
                <div style={{ fontSize: 12, color: "#9099A8" }}>{modoData.brandSub}</div>
              </div>
            </div>
          )}

          <button
            onClick={() => { setModo(null); setErro(""); form.resetFields(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "#3B82F6",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              marginBottom: 20,
              fontFamily: "inherit",
            }}
          >
            <ArrowLeftOutlined /> Escolher outro modo
          </button>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#10233C", margin: 0, lineHeight: 1.2 }}>
            Bem-vindo de volta
          </h1>
          <span style={{ fontSize: 14, color: "#5A6070", marginTop: 8, display: "block" }}>
            Faça login para acessar o {modoData.modoLabel}
          </span>

          <div style={{ marginTop: 32 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ email: rememberedEmail || "admin@admin.com", senha: "admin123", lembrar: !!rememberedEmail }}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label={<span style={{ fontSize: 13, fontWeight: 600, color: "#3D4350" }}>Email</span>}
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

              <Form.Item
                name="senha"
                label={<span style={{ fontSize: 13, fontWeight: 600, color: "#3D4350" }}>Senha</span>}
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

              <Form.Item name="lembrar" valuePropName="checked" style={{ marginBottom: 20 }}>
                <Checkbox style={{ fontSize: 13, color: "#5A6072" }}>
                  Lembrar por 30 dias
                </Checkbox>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={loading}
                  style={{
                    width: "100%",
                    height: 46,
                    background: "#3B82F6",
                    borderColor: "#3B82F6",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#fff",
                    marginTop: 8,
                    boxShadow: "0 12px 28px rgba(59, 130, 246, 0.28)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (loading) return;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 16px 34px rgba(59, 130, 246, 0.36)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(59, 130, 246, 0.28)";
                  }}
                >
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </Form.Item>

              <span
                style={{
                  color: "#D9363E",
                  fontSize: 13,
                  marginTop: 8,
                  display: "block",
                  textAlign: "center",
                  minHeight: 20,
                }}
              >
                {erro}
              </span>

              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a
                style={{
                  display: "block",
                  textAlign: "center",
                  color: "#3B82F6",
                  fontSize: 13,
                  marginTop: 16,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
                onClick={(e) => e.preventDefault()}
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

/* ── Componente card de modo ── */
function ModoCard({ modo, Icone, isMobile, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: isMobile ? "100%" : 350,
        minHeight: isMobile ? "auto" : 420,
        background: modo.gradiente,
        borderRadius: 20,
        padding: "40px 32px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        cursor: "pointer",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 26px 64px rgba(15, 23, 42, 0.24)"
          : "0 14px 36px rgba(15, 23, 42, 0.14)",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          color: "#fff",
          zIndex: 1,
        }}
      >
        <Icone />
      </div>

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
          {modo.titulo}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.8)",
            marginTop: 8,
            lineHeight: 1.4,
          }}
        >
          {modo.subtitulo}
        </div>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "8px 0 0",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 1,
        }}
      >
        {modo.bullets.map((b) => (
          <li
            key={b}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "#fff",
            }}
          >
            <CheckCircleFilled style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, flexShrink: 0 }} />
            {b}
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 24,
          width: "100%",
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: "12px 0",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 15,
            color: modo.key === "prestador" ? "#1E40AF" : "#065F46",
          }}
        >
          Acessar →
        </div>
      </div>
    </div>
  );
}
