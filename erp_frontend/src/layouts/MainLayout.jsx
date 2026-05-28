import { Layout, Avatar, Tooltip, Button } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogoutOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../hooks/useAuth';

const BRAND = {
  prestador: {
    letter: "N",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    titulo: "ERP Nexus",
    subtitulo: "Prestador de serviços",
    shadow: "0 4px 12px rgba(59,130,246,0.35)",
  },
  facilities: {
    letter: "F",
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    titulo: "ERP Facilities",
    subtitulo: "Gestão predial e manutenção",
    shadow: "0 4px 12px rgba(16,185,129,0.35)",
  },
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function MainLayout() {
  const sidebarWidth = 260;
  const mode = localStorage.getItem("erp_mode") || "prestador";
  const brand = BRAND[mode] || BRAND.prestador;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Layout.Sider
        width={sidebarWidth}
        className="erp-sidebar-shell"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 95,
          display: 'flex',
          flexDirection: 'column',
        }}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
      >
        <div className="erp-brand-panel">
          <div className="erp-brand-row">
            <div
              className="erp-brand-mark"
              style={{
                background: brand.gradient,
                boxShadow: brand.shadow,
              }}
            >
              {brand.letter}
            </div>
            <div className="erp-brand-copy">
              <h2 className="erp-brand-title">{brand.titulo}</h2>
              <p className="erp-brand-subtitle">{brand.subtitulo}</p>
            </div>
          </div>
          <div className="erp-brand-status">
            <span className="erp-brand-status-dot" />
            Ambiente local
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Sidebar />
        </div>

        <div className="erp-sidebar-footer">
          <Avatar
            size={36}
            className="erp-sidebar-avatar"
          >
            {getInitials(user?.nome || 'U')}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="erp-sidebar-user-name">
              {user?.nome?.split(' ')[0] || 'Usuário'}
            </div>
            <div className="erp-sidebar-user-status">
              <span className="erp-sidebar-user-dot" />
              <span>Sessão ativa</span>
            </div>
          </div>
          <Tooltip title="Sair" placement="top">
            <Button
              type="text"
              size="small"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="erp-sidebar-logout"
            />
          </Tooltip>
        </div>
      </Layout.Sider>

      <Layout style={{ marginLeft: sidebarWidth, background: '#F4F6F9' }}>
        <Header />
        <Layout.Content className="erp-shell-content">
          <div className="erp-shell-panel">
            <Outlet />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
