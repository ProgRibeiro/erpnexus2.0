import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider
        width={260}
        style={{
          position: 'fixed',
          left: 0,
          top: 60,
          bottom: 0,
          overflowY: 'auto',
          zIndex: 100,
        }}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
      >
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, color: '#1B4F8A', fontSize: '18px', fontWeight: 700 }}>
            ERP Prod
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8c8c8c' }}>
            Gestão de Serviços
          </p>
        </div>
        <Sidebar />
      </Layout.Sider>

      <Layout style={{ marginLeft: 260 }}>
        <Header />
        <Layout.Content
          style={{
            padding: '24px',
            background: '#f5f5f5',
            minHeight: 'calc(100vh - 60px)',
          }}
        >
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

