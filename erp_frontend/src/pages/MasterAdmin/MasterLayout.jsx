import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { Avatar, Badge, Button, Space, message } from "antd";
import {
  LineChartOutlined, TeamOutlined, AppstoreOutlined, DollarOutlined,
  FileSearchOutlined, CrownOutlined, LogoutOutlined,
  BellOutlined, RightOutlined,
} from "@ant-design/icons";

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
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      <div style={{
        width: 240, minHeight: "100vh", background: "#0F172A",
        display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100,
      }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <CrownOutlined style={{ color: "#fff", fontSize: 16 }} />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Master Admin</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 1.2 }}>ERP Nexus Platform</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
          {menuItems.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.key} to={item.key} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                  cursor: "pointer", transition: "all 0.15s",
                  background: active ? "rgba(99,102,241,0.12)" : "transparent",
                  borderLeft: active ? "3px solid #6366F1" : "3px solid transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.65)",
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>L</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>Lucas</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, lineHeight: 1.2 }}>Super Admin</div>
            </div>
          </div>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            size="small"
            style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444", borderRadius: 6, fontWeight: 500,
            }}
          >
            Sair
          </Button>
        </div>
      </div>
      <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{
          height: 64, background: "#fff", borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", position: "sticky", top: 0, zIndex: 99,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontSize: 13 }}>
            <span>Master Admin</span>
            <RightOutlined style={{ fontSize: 10 }} />
            <span style={{ color: "#0F172A", fontWeight: 600 }}>{breadcrumb}</span>
          </div>
          <Space size={12}>
            <Button
              size="small"
              style={{ borderColor: "#3B82F6", color: "#3B82F6", borderRadius: 6, fontSize: 12 }}
              onClick={() => navigate("/")}
            >
              Ir para ERP
            </Button>
            <Badge count={0} showZero={false}>
              <Button icon={<BellOutlined />} shape="circle" size="small" style={{ border: "1px solid #E2E8F0" }} />
            </Badge>
            <Avatar
              size={32}
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", cursor: "pointer", fontWeight: 700 }}
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