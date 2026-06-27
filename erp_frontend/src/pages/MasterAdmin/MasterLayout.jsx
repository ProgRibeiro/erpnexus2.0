import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Avatar, Badge, Button, Space, message } from "antd";
import {
  LineChartOutlined, TeamOutlined, AppstoreOutlined, DollarOutlined,
  FileSearchOutlined, CrownOutlined, LogoutOutlined,
  BellOutlined, RightOutlined,
} from "@ant-design/icons";

const colors = {
  azul: "#3B82F6",
  roxo: "#5B21B6",
  verde: "#1A7A4A",
  laranja: "#B45309",
  vermelho: "#B91C1C",
  texto: "#10233C",
  textoSecundario: "#5A6070",
  textoFraco: "#8A97AA",
  borda: "#E2E6EC",
  fundoSuave: "#F8FAFD",
};

const menuItems = [
  { key: "/master", label: "Dashboard", icon: <LineChartOutlined />, exact: true },
  { key: "/master/clientes", label: "Clientes", icon: <TeamOutlined /> },
  { key: "/master/planos", label: "Planos", icon: <AppstoreOutlined /> },
  { key: "/master/pagamentos", label: "Pagamentos", icon: <DollarOutlined /> },
  { key: "/master/logs", label: "Logs de Acesso", icon: <FileSearchOutlined /> },
];

const BREADCRUMB_MAP = {
  "/master": "Dashboard",
  "/master/clientes": "Clientes",
  "/master/planos": "Planos",
  "/master/pagamentos": "Pagamentos",
  "/master/logs": "Logs de Acesso",
};

export default function MasterLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("master_token")) {
      navigate("/master/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("master_token");
    localStorage.removeItem("master_refresh");
    message.success("Sessao encerrada.");
    navigate("/master/login");
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.key;
    return location.pathname.startsWith(item.key);
  };

  const breadcrumb = BREADCRUMB_MAP[location.pathname] || "Master Admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.fundoSuave }}>
      <div style={{
        width: 248, minHeight: "100vh",
        background: "linear-gradient(180deg, #0B1220 0%, #111827 55%, #0B1120 100%)",
        display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100,
        boxShadow: "18px 0 36px rgba(15,23,42,0.16)",
      }}>
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(148,163,184,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #3B82F6, #5B21B6)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: "0 8px 18px rgba(59,130,246,0.28)",
            }}>
              <CrownOutlined style={{ color: "#fff", fontSize: 17 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#F8FAFC", fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>Master Admin</div>
              <div style={{ color: "rgba(203,213,225,0.65)", fontSize: 11, lineHeight: 1.3, marginTop: 2 }}>ERP Nexus Platform</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "14px 12px", overflowY: "auto" }}>
          {menuItems.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.key} to={item.key} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 9, marginBottom: 3,
                  cursor: "pointer", transition: "background 0.14s ease, color 0.14s ease, transform 0.14s ease",
                  background: active ? "linear-gradient(135deg, rgba(59,130,246,0.24), rgba(91,33,182,0.14))" : "transparent",
                  border: active ? "1px solid rgba(147,197,253,0.22)" : "1px solid transparent",
                  color: active ? "#FFFFFF" : "rgba(226,232,240,0.74)",
                  boxShadow: active ? "0 10px 22px rgba(15,23,42,0.22)" : "none",
                }}>
                  <span style={{ fontSize: 16, color: active ? "#93C5FD" : "rgba(148,163,184,0.75)" }}>{item.icon}</span>
                  <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500 }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "16px 16px", borderTop: "1px solid rgba(148,163,184,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #3B82F6, #5B21B6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.10)",
            }}>L</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#F8FAFC", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Lucas</div>
              <div style={{ color: "rgba(203,213,225,0.6)", fontSize: 11, lineHeight: 1.2 }}>Super Admin</div>
            </div>
          </div>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            size="small"
            style={{
              background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)",
              color: "#FCA5A5", borderRadius: 8, fontWeight: 600,
            }}
          >
            Sair
          </Button>
        </div>
      </div>
      <div style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{
          height: 64, background: "rgba(255,255,255,0.96)", borderBottom: `1px solid ${colors.borda}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", position: "sticky", top: 0, zIndex: 99,
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textoSecundario, fontSize: 13 }}>
            <span>Master Admin</span>
            <RightOutlined style={{ fontSize: 10, color: colors.textoFraco }} />
            <span style={{ color: colors.texto, fontWeight: 700 }}>{breadcrumb}</span>
          </div>
          <Space size={12}>
            <Button
              size="small"
              style={{ borderColor: colors.azul, color: colors.azul, borderRadius: 8, fontSize: 12, fontWeight: 600 }}
              onClick={() => navigate("/")}
            >
              Ir para ERP
            </Button>
            <Badge count={0} showZero={false}>
              <Button icon={<BellOutlined />} shape="circle" size="small" style={{ border: `1px solid ${colors.borda}` }} />
            </Badge>
            <Avatar
              size={32}
              style={{ background: "linear-gradient(135deg, #3B82F6, #5B21B6)", cursor: "pointer", fontWeight: 700 }}
            >
              L
            </Avatar>
          </Space>
        </header>
        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}