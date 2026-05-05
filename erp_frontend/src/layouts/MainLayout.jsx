import { Layout, Avatar, Tooltip, Button } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { ToolOutlined, BuildOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../hooks/useAuth';

const BRAND = {
  prestador: {
    icon: <ToolOutlined />,
    titulo: "ERP Nexus",
    subtitulo: "Sistema do prestador de serviço",
    iconBg: "rgba(59,130,246,0.15)",
    iconBorder: "rgba(59,130,246,0.3)",
  },
  facilities: {
    icon: <BuildOutlined />,
    titulo: "ERP Facilities",
    subtitulo: "Gestão predial e manutenção",
    iconBg: "rgba(16,185,129,0.15)",
    iconBorder: "rgba(16,185,129,0.3)",
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
        {/* ── Brand panel ─────────────────────── */}
        <div className="erp-brand-panel">
          <div
            className="erp-brand-mark"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              background: brand.iconBg,
              border: `1px solid ${brand.iconBorder}`,
            }}
          >
            {brand.icon}
          </div>
          <h2 className="erp-brand-title">{brand.titulo}</h2>
          <p className="erp-brand-subtitle">{brand.subtitulo}</p>
        </div>

        {/* ── Menu ────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Sidebar />
        </div>

        {/* ── User footer ─────────────────────── */}
        <div className="erp-sidebar-footer">
          <Avatar
            size={36}
            style={{ background: '#3B82F6', fontWeight: 700, fontSize: 14, flexShrink: 0 }}
          >
            {getInitials(user?.nome || 'U')}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#F9FAFB',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.nome?.split(' ')[0] || 'Usuário'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: 'rgba(156,163,175,0.8)' }}>Sessão ativa</span>
            </div>
          </div>
          <Tooltip title="Sair" placement="top">
            <Button
              type="text"
              size="small"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: 'rgba(156,163,175,0.6)', flexShrink: 0 }}
            />
          </Tooltip>
        </div>
      </Layout.Sider>

      <Layout style={{ marginLeft: sidebarWidth, background: '#F7F8FA' }}>
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
