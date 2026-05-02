import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Layout.Sider
        width={260}
        style={{
          position: 'fixed',
          left: 0,
          top: 60,
          bottom: 0,
          overflowY: 'auto',
          zIndex: 100,
          boxShadow: '12px 0 40px rgba(15, 46, 76, 0.05)',
        }}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
      >
        <div className="erp-brand-panel">
          <div className="erp-brand-mark">EP</div>
          <h2 className="erp-brand-title">ERP Produção</h2>
          <p className="erp-brand-subtitle">
            Operações, financeiro, CRM, estoque e campo em um fluxo único.
          </p>
        </div>
        <Sidebar />
      </Layout.Sider>

      <Layout style={{ marginLeft: 260, background: 'transparent' }}>
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

