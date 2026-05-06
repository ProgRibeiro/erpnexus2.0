import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, Button } from "antd";
import {
  CrownOutlined,
  DashboardOutlined,
  TeamOutlined,
  AppstoreOutlined,
  DollarOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  {
    key: "/master/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "/master/clientes",
    icon: <TeamOutlined />,
    label: "Clientes",
  },
  {
    key: "/master/planos",
    icon: <AppstoreOutlined />,
    label: "Planos",
  },
  {
    key: "/master/pagamentos",
    icon: <DollarOutlined />,
    label: "Pagamentos",
  },
  {
    key: "/master/logs",
    icon: <FileTextOutlined />,
    label: "Logs de Acesso",
  },
];

export default function MasterLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Protege o layout — se não tem master_token, redireciona para login
  useEffect(() => {
    if (!localStorage.getItem("master_token")) {
      navigate("/master/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("master_token");
    localStorage.removeItem("master_refresh");
    navigate("/master/login");
  };

  const selectedKey = menuItems.find(m => location.pathname.startsWith(m.key))?.key || "/master/dashboard";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{
          background: "#0F172A",
          borderRight: "1px solid rgba(99,102,241,0.2)",
          position: "fixed",
          height: "100vh",
          left: 0,
          top: 0,
          zIndex: 100,
          overflow: "auto",
        }}
        trigger={null}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? "20px 16px" : "24px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <CrownOutlined style={{ color: "#fff", fontSize: 18 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>Master Admin</div>
              <div style={{ color: "#6366F1", fontSize: 11, fontWeight: 600 }}>ERP NEXUS</div>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems.map((item) => ({
            ...item,
            onClick: () => navigate(item.key),
          }))}
          style={{
            background: "transparent",
            border: "none",
            marginTop: 12,
            padding: "0 8px",
          }}
          theme="dark"
        />

        {/* Rodapé sidebar */}
        {!collapsed && (
          <div style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            padding: "0 16px",
          }}>
            <div style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 10,
              padding: "10px 14px",
              textAlign: "center",
            }}>
              <Text style={{ color: "#94A3B8", fontSize: 11, display: "block" }}>Acesso restrito</Text>
              <Text style={{ color: "#6366F1", fontSize: 12, fontWeight: 700 }}>Proprietário do sistema</Text>
            </div>
          </div>
        )}
      </Sider>

      {/* Conteúdo principal */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: "margin 0.2s" }}>
        {/* Header */}
        <Header style={{
          background: "#fff",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 99,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18 }}
            />
            <div style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              color: "#fff",
              padding: "3px 12px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}>
              MASTER ADMIN
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link to="/" style={{ color: "#64748B", fontSize: 13 }}>
              Ir para o sistema →
            </Link>
            <Button
              danger
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: "#EF4444" }}
            >
              Sair
            </Button>
          </div>
        </Header>

        {/* Página */}
        <Content style={{ background: "#F1F5F9", minHeight: "calc(100vh - 64px)" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
