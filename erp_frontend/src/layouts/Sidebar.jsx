import { Menu } from 'antd';
import {
  DashboardOutlined, TeamOutlined, FileTextOutlined, ShoppingCartOutlined,
  DollarOutlined, CalendarOutlined, SettingOutlined, ToolOutlined,
  BuildOutlined, DatabaseOutlined, ScheduleOutlined, AlertOutlined,
  FileProtectOutlined, ProjectOutlined, BarChartOutlined,
} from '@ant-design/icons';
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
          key: 'orcamentos',
          icon: <FileTextOutlined />,
          label: 'Orçamentos',
          onClick: () => navigate('/orcamentos'),
        },
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
        {
          key: 'servicos',
          icon: <ToolOutlined />,
          label: 'Serviços',
          onClick: () => navigate('/servicos'),
        },
        {
          key: 'terceiros',
          icon: <TeamOutlined />,
          label: 'Terceirizados',
          onClick: () => navigate('/terceiros'),
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
          key: 'faturamento',
          icon: <FileTextOutlined />,
          label: 'Faturamento',
          onClick: () => navigate('/faturamento'),
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
      label: 'FACILITIES',
      type: 'group',
      children: [
        {
          key: 'fac-dashboard',
          icon: <BuildOutlined />,
          label: 'Dashboard Facilities',
          onClick: () => navigate('/facilities'),
        },
        {
          key: 'fac-ativos',
          icon: <DatabaseOutlined />,
          label: 'Ativos',
          onClick: () => navigate('/facilities/ativos'),
        },
        {
          key: 'fac-pmp',
          icon: <ScheduleOutlined />,
          label: 'Manutenção Preventiva',
          onClick: () => navigate('/facilities/pmp'),
        },
        {
          key: 'fac-chamados',
          icon: <AlertOutlined />,
          label: 'Help Desk',
          onClick: () => navigate('/facilities/chamados'),
        },
        {
          key: 'fac-contratos',
          icon: <FileProtectOutlined />,
          label: 'Contratos',
          onClick: () => navigate('/facilities/contratos'),
        },
        {
          key: 'fac-obras',
          icon: <ProjectOutlined />,
          label: 'Obras / Projetos',
          onClick: () => navigate('/facilities/obras'),
        },
        {
          key: 'fac-indicadores',
          icon: <BarChartOutlined />,
          label: 'Indicadores',
          onClick: () => navigate('/facilities/indicadores'),
        },
      ],
    },
    {
      label: 'SISTEMA',
      type: 'group',
      children: [
        {
          key: 'fiscal',
          icon: <DollarOutlined />,
          label: 'Fiscal',
          onClick: () => navigate('/fiscal'),
        },
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
    if (location.pathname.startsWith('/orcamentos')) return 'orcamentos';
    if (location.pathname.startsWith('/ordens')) return 'ordens';
    if (location.pathname.startsWith('/clientes')) return 'clientes';
    if (location.pathname.startsWith('/agenda')) return 'agenda';
    if (location.pathname.startsWith('/servicos')) return 'servicos';
    if (location.pathname.startsWith('/terceiros')) return 'terceiros';
    if (location.pathname.startsWith('/estoque')) return 'estoque';
    if (location.pathname.startsWith('/financeiro')) return 'financeiro';
    if (location.pathname.startsWith('/faturamento')) return 'faturamento';
    if (location.pathname.startsWith('/crm')) return 'crm';
    if (location.pathname.startsWith('/facilities')) {
      if (location.pathname === '/facilities') return 'fac-dashboard';
      if (location.pathname.startsWith('/facilities/ativos')) return 'fac-ativos';
      if (location.pathname.startsWith('/facilities/pmp')) return 'fac-pmp';
      if (location.pathname.startsWith('/facilities/chamados')) return 'fac-chamados';
      if (location.pathname.startsWith('/facilities/contratos')) return 'fac-contratos';
      if (location.pathname.startsWith('/facilities/obras')) return 'fac-obras';
      if (location.pathname.startsWith('/facilities/indicadores')) return 'fac-indicadores';
      return 'fac-dashboard';
    }
    if (location.pathname.startsWith('/fiscal')) return 'fiscal';
    if (location.pathname.startsWith('/configuracoes')) return 'configuracoes';
    return 'dashboard';
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={items}
      className="erp-sidebar-menu"
      style={{ borderRight: 'none' }}
    />
  );
}
