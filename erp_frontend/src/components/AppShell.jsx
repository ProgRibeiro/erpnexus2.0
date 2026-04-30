import { Button, Layout, Menu } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import authService from "../services/authService";
import { useAuth } from "../hooks/useAuth";

const { Header, Content, Sider } = Layout;

const menuItems = [
  { key: "/", label: <Link to="/">Dashboard</Link> },
  { key: "/clientes", label: <Link to="/clientes">Clientes</Link> },
  { key: "/ordens", label: <Link to="/ordens">Ordens de Servico</Link> },
  { key: "/crm", label: <Link to="/crm">CRM</Link> },
  { key: "/financeiro", label: <Link to="/financeiro">Financeiro</Link> },
  { key: "/financeiro/lancamentos", label: <Link to="/financeiro/lancamentos">Lancamentos</Link> },
  { key: "/financeiro/contas", label: <Link to="/financeiro/contas">Contas bancarias</Link> },
  { key: "/financeiro/relatorios", label: <Link to="/financeiro/relatorios">Relatorios</Link> },
  { key: "/perfil", label: <Link to="/perfil">Meu perfil</Link> },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuth();

  const handleLogout = async () => {
    await authService.logout();
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div className="brand">ERP Servicos</div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header className="topbar topbar-layout">
          <span>Gestao operacional</span>
          <div className="topbar-user">
            <span>{user?.nome_completo || user?.email}</span>
            <Button onClick={handleLogout}>Sair</Button>
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
