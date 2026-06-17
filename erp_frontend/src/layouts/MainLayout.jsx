import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import FloatingWorkspaceTabs from './FloatingWorkspaceTabs';

export default function MainLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Layout style={{ background: '#F4F6F9' }}>
        <Header />
        <FloatingWorkspaceTabs />
        <Layout.Content className="erp-shell-content">
          <div className="erp-shell-panel">
            <Outlet />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
