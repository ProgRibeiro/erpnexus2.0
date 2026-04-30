import { Layout, Space, Button, Dropdown, Avatar, Badge, Tooltip } from 'antd';
import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
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
    <Layout.Header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div />
        <Space size="large">
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
              <span style={{ fontSize: '14px', color: '#262626', fontWeight: '600' }}>
                {user?.nome?.split(' ')[0] || 'Usuário'}
              </span>
            </div>
          </Dropdown>
        </Space>
      </div>
    </Layout.Header>
  );
}
