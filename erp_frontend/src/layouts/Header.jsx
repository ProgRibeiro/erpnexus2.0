import { Layout, Space, Button, Dropdown, Badge, Tooltip } from 'antd';
import {
  BellOutlined,
  LogoutOutlined,
  ShopOutlined,
  UserOutlined,
  SettingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AvatarUsuario from '../components/ui/AvatarUsuario';

const ROUTE_LABELS = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/orcamentos': 'Orçamentos',
  '/ordens': 'Ordens de Serviço',
  '/clientes': 'Clientes',
  '/agenda': 'Agenda',
  '/servicos': 'Serviços',
  '/terceiros': 'Terceirizados',
  '/estoque': 'Estoque',
  '/financeiro': 'Financeiro',
  '/faturamento': 'Faturamento',
  '/crm': 'CRM',
  '/chamados-externos': 'Chamados Externos',
  '/licitacoes': 'Licitações',
  '/fiscal': 'Fiscal',
  '/configuracoes': 'Configurações',
  '/facilities': 'Dashboard Facilities',
  '/facilities/ativos': 'Ativos',
  '/facilities/pmp': 'Manutenção Preventiva',
  '/facilities/chamados': 'Help Desk',
  '/facilities/licitacao': 'Licitações',
  '/facilities/contratos': 'Contratos',
  '/facilities/obras': 'Obras / Projetos',
  '/facilities/indicadores': 'Indicadores',
};

function getPageLabel(pathname) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const base = '/' + pathname.split('/')[1];
  return ROUTE_LABELS[base] || 'Página';
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const mode = localStorage.getItem("erp_mode") || "prestador";
  const sidebarName = mode === 'facilities' ? 'ERP Facilities' : 'ERP Nexus';
  const pageLabel = getPageLabel(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 4px', minWidth: 180 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>
            {user?.nome || 'Usuário'}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            {user?.email || ''}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: '#3B82F6',
              fontWeight: 500,
              background: '#EFF6FF',
              borderRadius: 4,
              padding: '2px 6px',
              display: 'inline-block',
            }}
          >
            {user?.perfil || user?.role || 'Administrador'}
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Meu Perfil',
      onClick: () => navigate('/perfil'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Configurações',
      onClick: () => navigate('/configuracoes'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sair',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout.Header className="erp-header">
      <div className="erp-topbar">
        {/* Breadcrumb */}
        <div className="erp-breadcrumb">
          <span className="erp-breadcrumb-root">{sidebarName}</span>
          <RightOutlined className="erp-breadcrumb-icon" />
          <span className="erp-breadcrumb-page">{pageLabel}</span>
        </div>

        <Space size={8} className="erp-topbar-actions">
          <Button
            icon={<ShopOutlined />}
            onClick={() => window.open('/loja', '_blank', 'noopener,noreferrer')}
            className="erp-store-button"
          >
            Modo Loja
          </Button>

          <Tooltip title="Notificações">
            <Badge count={0} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="erp-icon-button"
              />
            </Badge>
          </Tooltip>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div
              className="erp-user-trigger"
            >
              <AvatarUsuario nome={user?.nome || 'Usuário'} size="small" />
              <div className="erp-user-trigger-copy">
                <span className="erp-user-trigger-name">
                  {user?.nome?.split(' ')[0] || 'Usuário'}
                </span>
                <span className="erp-user-trigger-role">
                  {user?.perfil || user?.role || 'Admin'}
                </span>
              </div>
            </div>
          </Dropdown>
        </Space>
      </div>
    </Layout.Header>
  );
}
