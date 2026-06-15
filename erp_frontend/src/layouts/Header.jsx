import { Layout, Space, Button, Dropdown, Badge, Tooltip, Input, Tag } from 'antd';
import {
  AppstoreOutlined,
  BellOutlined,
  LogoutOutlined,
  SearchOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  SettingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AvatarUsuario from '../components/ui/AvatarUsuario';

const ROUTE_META = {
  '/': { label: 'Dashboard', section: 'Visão geral' },
  '/dashboard': { label: 'Dashboard', section: 'Visão geral' },
  '/orcamentos': { label: 'Orçamentos', section: 'Comercial técnico' },
  '/orcamentos/novo': { label: 'Novo orçamento', section: 'Comercial técnico' },
  '/orcamentos/inteligente': { label: 'Orçamento Inteligente', section: 'Motor comercial' },
  '/ordens': { label: 'Ordens de Serviço', section: 'Operação de campo' },
  '/clientes': { label: 'Clientes', section: 'Relacionamento' },
  '/agenda': { label: 'Agenda', section: 'Planejamento' },
  '/servicos': { label: 'Serviços', section: 'Catálogo técnico' },
  '/terceiros': { label: 'Terceirizados', section: 'Rede operacional' },
  '/equipe': { label: 'Equipe', section: 'Operação interna' },
  '/estoque': { label: 'Estoque', section: 'Suprimentos' },
  '/catalogo-inteligente': { label: 'Motor de Catálogo', section: 'Inteligência' },
  '/financeiro': { label: 'Financeiro', section: 'Gestão financeira' },
  '/faturamento': { label: 'Faturamento', section: 'Recebíveis' },
  '/crm': { label: 'CRM', section: 'Funil comercial' },
  '/chamados-externos': { label: 'Chamados Externos', section: 'Facilities' },
  '/licitacoes': { label: 'Licitações', section: 'Comercial público' },
  '/fiscal': { label: 'Fiscal', section: 'Tributário' },
  '/configuracoes': { label: 'Configurações', section: 'Sistema' },
  '/facilities': { label: 'Dashboard Facilities', section: 'Facilities' },
  '/facilities/ativos': { label: 'Ativos', section: 'Facilities' },
  '/facilities/pmp': { label: 'Manutenção Preventiva', section: 'Facilities' },
  '/facilities/chamados': { label: 'Help Desk', section: 'Facilities' },
  '/facilities/licitacao': { label: 'Licitações', section: 'Facilities' },
  '/facilities/contratos': { label: 'Contratos', section: 'Facilities' },
  '/facilities/obras': { label: 'Obras / Projetos', section: 'Facilities' },
  '/facilities/indicadores': { label: 'Indicadores', section: 'Facilities' },
};

function getPageMeta(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  const base = '/' + pathname.split('/')[1];
  return ROUTE_META[base] || { label: 'Página', section: 'ERP Nexus' };
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const mode = location.pathname.startsWith("/facilities") ? "facilities" : "prestador";
  const sidebarName = mode === 'facilities' ? 'ERP Facilities' : 'ERP Nexus';
  const pageMeta = getPageMeta(location.pathname);

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
        <div className="erp-page-identity">
          <div className="erp-page-identity-icon">
            <AppstoreOutlined />
          </div>
          <div className="erp-page-identity-copy">
            <div className="erp-breadcrumb">
              <span className="erp-breadcrumb-root">{sidebarName}</span>
              <RightOutlined className="erp-breadcrumb-icon" />
              <span className="erp-breadcrumb-page">{pageMeta.label}</span>
            </div>
            <span className="erp-page-section">{pageMeta.section}</span>
          </div>
        </div>

        <div className="erp-command-center">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar clientes, OS, orçamento, produto..."
            className="erp-command-input"
          />
          <Tag className="erp-command-tag">Local</Tag>
        </div>

        <Space size={8} className="erp-topbar-actions">
          <Tag icon={<SafetyCertificateOutlined />} className="erp-health-tag">
            Operação ativa
          </Tag>

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
