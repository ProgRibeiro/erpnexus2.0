import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { ToolOutlined, BuildOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import Header from './Header';

const BRAND = {
  prestador: {
    icon: <ToolOutlined />,
    titulo: "ERP Nexus",
    subtitulo: "Sistema do prestador de serviço",
    gradient: "linear-gradient(180deg, #1E40AF 0%, #111827 100%)",
  },
  facilities: {
    icon: <BuildOutlined />,
    titulo: "ERP Facilities",
    subtitulo: "Gestão predial e manutenção",
    gradient: "linear-gradient(180deg, #065F46 0%, #111827 100%)",
  },
};

export default function MainLayout() {
  const sidebarWidth = 280;
  const mode = localStorage.getItem("erp_mode") || "prestador";
  const brand = BRAND[mode] || BRAND.prestador;

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
        }}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
      >
        <div
          className="erp-brand-panel"
          style={{
            background: brand.gradient,
          }}
        >
          <div
            className="erp-brand-mark"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            {brand.icon}
          </div>
          <h2 className="erp-brand-title">{brand.titulo}</h2>
          <p className="erp-brand-subtitle">{brand.subtitulo}</p>
        </div>
        <Sidebar />
      </Layout.Sider>

      <Layout style={{ marginLeft: sidebarWidth, background: 'transparent' }}>
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
