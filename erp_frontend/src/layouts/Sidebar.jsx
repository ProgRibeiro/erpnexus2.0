import { Menu } from 'antd';
import { DashboardOutlined, TeamOutlined, FileTextOutlined, ShoppingCartOutlined, DollarOutlined, CalendarOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      label: 'PRINCIPAL',
      type: 'group',
      children: [
        {
          key: 'dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
          onClick: () => navigate('/dashboard'),
        },
      ],
    },
    {
      label: 'OPERAÇÕES',
      type: 'group',
      children: [
        {
          key: 'ordens',
          icon: <FileTextOutlined />,
          label: 'Ordens de Serviço',
          onClick: () => navigate('/ordens'),
        },
        {
          key: 'clientes',
          icon: <TeamOutlined />,
          label: 'Clientes',
          onClick: () => navigate('/clientes'),
        },
        {
          key: 'agenda',
          icon: <CalendarOutlined />,
          label: 'Agenda',
          onClick: () => navigate('/agenda'),
        },
      ],
    },
    {
      label: 'GESTÃO',
      type: 'group',
      children: [
        {
          key: 'estoque',
          icon: <ShoppingCartOutlined />,
          label: 'Estoque',
          onClick: () => navigate('/estoque'),
        },
        {
          key: 'financeiro',
          icon: <DollarOutlined />,
          label: 'Financeiro',
          onClick: () => navigate('/financeiro'),
        },
        {
          key: 'crm',
          icon: <TeamOutlined />,
          label: 'CRM',
          onClick: () => navigate('/crm'),
        },
      ],
    },
    {
      label: 'SISTEMA',
      type: 'group',
      children: [
        {
          key: 'configuracoes',
          icon: <SettingOutlined />,
          label: 'Configurações',
          onClick: () => navigate('/configuracoes'),
        },
      ],
    },
  ];

  const getSelectedKey = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname.startsWith('/ordens')) return 'ordens';
    if (location.pathname.startsWith('/clientes')) return 'clientes';
    if (location.pathname.startsWith('/agenda')) return 'agenda';
    if (location.pathname.startsWith('/estoque')) return 'estoque';
    if (location.pathname.startsWith('/financeiro')) return 'financeiro';
    if (location.pathname.startsWith('/crm')) return 'crm';
    if (location.pathname.startsWith('/configuracoes')) return 'configuracoes';
    return 'dashboard';
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={items}
      style={{ borderRight: 'none' }}
    />
  );
}
