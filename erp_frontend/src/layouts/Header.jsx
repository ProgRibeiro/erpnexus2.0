import { Layout, Space, Button, Dropdown, Avatar, Badge, Tooltip } from 'antd';
import { BellOutlined, LogoutOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AvatarUsuario from '../components/ui/AvatarUsuario';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Meu Perfil',
      onClick: () => navigate('/perfil'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sair',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout.Header className="erp-header">
      <div className="erp-topbar">
        <div className="erp-topbar-title">
          <span className="erp-topbar-kicker">ERP Nexus</span>
          <span className="erp-topbar-heading">Sistema do prestador de serviço</span>
        </div>
        <Space size="large">
          <Button
            type="primary"
            icon={<ShopOutlined />}
            onClick={() => window.open('/loja', '_blank', 'noopener,noreferrer')}
            style={{ background: '#3B82F6', borderColor: '#3B82F6', fontWeight: 700 }}
          >
            Modo Loja
          </Button>

          <Tooltip title="Notificações">
            <Badge count={0}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: '18px' }} />}
                size="large"
              />
            </Badge>
          </Tooltip>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AvatarUsuario nome={user?.nome || 'Usuário'} size="small" />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: '14px', color: '#1a2a3a', fontWeight: '700' }}>
                  {user?.nome?.split(' ')[0] || 'Usuário'}
                </span>
                <span className="erp-topbar-meta">Sessão ativa</span>
              </div>
            </div>
          </Dropdown>
        </Space>
      </div>
    </Layout.Header>
  );
}
