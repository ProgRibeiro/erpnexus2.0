import { Layout, Space, Button, Dropdown, Avatar, Badge, Tooltip } from 'antd';
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
          <RightOutlined style={{ fontSize: 10, color: '#CBD5E1', margin: '0 6px' }} />
          <span className="erp-breadcrumb-page">{pageLabel}</span>
        </div>

        {/* Ações do lado direito */}
        <Space size={8}>
          <Button
            icon={<ShopOutlined />}
            onClick={() => window.open('/loja', '_blank', 'noopener,noreferrer')}
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              height: 36,
              paddingInline: '14px',
              boxShadow: '0 2px 6px rgba(59,130,246,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Modo Loja
          </Button>

          <Tooltip title="Notificações">
            <Badge count={0} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18, color: '#64748B' }} />}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Badge>
          </Tooltip>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <div
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <AvatarUsuario nome={user?.nome || 'Usuário'} size="small" />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>
                  {user?.nome?.split(' ')[0] || 'Usuário'}
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
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
