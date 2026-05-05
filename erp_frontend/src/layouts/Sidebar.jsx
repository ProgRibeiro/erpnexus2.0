const ITENS_PRESTADOR = [
  {
    label: 'PRINCIPAL',
    type: 'group',
    children: [
      { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    label: 'OPERAÇÕES',
    type: 'group',
    children: [
      { key: 'orcamentos', icon: <FileTextOutlined />, label: 'Orçamentos', path: '/orcamentos' },
      { key: 'ordens', icon: <FileTextOutlined />, label: 'Ordens de Serviço', path: '/ordens' },
      { key: 'clientes', icon: <TeamOutlined />, label: 'Clientes', path: '/clientes' },
      { key: 'agenda', icon: <CalendarOutlined />, label: 'Agenda', path: '/agenda' },
      { key: 'servicos', icon: <ToolOutlined />, label: 'Serviços', path: '/servicos' },
      { key: 'terceiros', icon: <TeamOutlined />, label: 'Terceirizados', path: '/terceiros' },
    ],
  },
  {
    label: 'GESTÃO',
    type: 'group',
    children: [
      { key: 'estoque', icon: <ShoppingCartOutlined />, label: 'Estoque', path: '/estoque' },
      { key: 'financeiro', icon: <DollarOutlined />, label: 'Financeiro', path: '/financeiro' },
      { key: 'faturamento', icon: <FileTextOutlined />, label: 'Faturamento', path: '/faturamento' },
      { key: 'crm', icon: <TeamOutlined />, label: 'CRM', path: '/crm' },
    ],
  },
  {
    label: 'CLIENTES FACILITIES',
    type: 'group',
    children: [
      { key: 'chamados-externos', icon: <AlertOutlined />, label: 'Chamados Externos', path: '/chamados-externos' },
      { key: 'licitacoes', icon: <TrophyOutlined />, label: 'Licitações', path: '/licitacoes' },
    ],
  },
  {
    label: 'SISTEMA',
    type: 'group',
    children: [
      { key: 'fiscal', icon: <DollarOutlined />, label: 'Fiscal', path: '/fiscal' },
      { key: 'configuracoes', icon: <SettingOutlined />, label: 'Configurações', path: '/configuracoes' },
    ],
  },
];

const ITENS_FACILITIES = [
  {
    label: 'PRINCIPAL',
    type: 'group',
    children: [
      { key: 'fac-dashboard', icon: <DashboardOutlined />, label: 'Dashboard Facilities', path: '/facilities' },
    ],
  },
  {
    label: 'ATIVOS & MANUTENÇÃO',
    type: 'group',
    children: [
      { key: 'fac-ativos', icon: <DatabaseOutlined />, label: 'Ativos', path: '/facilities/ativos' },
      { key: 'fac-pmp', icon: <ScheduleOutlined />, label: 'Manut. Preventiva', path: '/facilities/pmp' },
      { key: 'fac-indicadores', icon: <BarChartOutlined />, label: 'Indicadores', path: '/facilities/indicadores' },
    ],
  },
  {
    label: 'OPERAÇÕES',
    type: 'group',
    children: [
      { key: 'fac-chamados', icon: <AlertOutlined />, label: 'Help Desk', path: '/facilities/chamados' },
      { key: 'fac-licitacao', icon: <TrophyOutlined />, label: 'Licitações', path: '/facilities/licitacao' },
      { key: 'fac-contratos', icon: <FileProtectOutlined />, label: 'Contratos', path: '/facilities/contratos' },
    ],
  },
  {
    label: 'PROJETOS',
    type: 'group',
    children: [
      { key: 'fac-obras', icon: <ProjectOutlined />, label: 'Obras / Projetos', path: '/facilities/obras' },
    ],
  },
  {
    label: 'SISTEMA',
    type: 'group',
    children: [
      { key: 'configuracoes', icon: <SettingOutlined />, label: 'Configurações', path: '/configuracoes' },
    ],
  },
];

function buildItems(grupos, navigate) {
  return grupos.map((g) => ({
    ...g,
    children: g.children.map(({ path, ...rest }) => ({
      ...rest,
      onClick: () => navigate(path),
    })),
  }));
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = localStorage.getItem("erp_mode") || "prestador";
  const grupos = mode === "facilities" ? ITENS_FACILITIES : ITENS_PRESTADOR;
  const items = buildItems(grupos, navigate);

  const getSelectedKey = () => {
    const p = location.pathname;
    if (p === '/' || p === '/dashboard') return 'dashboard';
    if (p.startsWith('/orcamentos')) return 'orcamentos';
    if (p.startsWith('/ordens')) return 'ordens';
    if (p.startsWith('/clientes')) return 'clientes';
    if (p.startsWith('/agenda')) return 'agenda';
    if (p.startsWith('/servicos')) return 'servicos';
    if (p.startsWith('/terceiros')) return 'terceiros';
    if (p.startsWith('/estoque')) return 'estoque';
    if (p.startsWith('/financeiro')) return 'financeiro';
    if (p.startsWith('/faturamento')) return 'faturamento';
    if (p.startsWith('/crm')) return 'crm';
    if (p.startsWith('/chamados-externos')) return 'chamados-externos';
    if (p.startsWith('/licitacoes')) return 'licitacoes';
    if (p.startsWith('/fiscal')) return 'fiscal';
    if (p.startsWith('/configuracoes')) return 'configuracoes';
    if (p.startsWith('/facilities')) {
      if (p === '/facilities') return 'fac-dashboard';
      if (p.startsWith('/facilities/ativos')) return 'fac-ativos';
      if (p.startsWith('/facilities/pmp')) return 'fac-pmp';
      if (p.startsWith('/facilities/chamados')) return 'fac-chamados';
      if (p.startsWith('/facilities/licitacao')) return 'fac-licitacao';
      if (p.startsWith('/facilities/contratos')) return 'fac-contratos';
      if (p.startsWith('/facilities/obras')) return 'fac-obras';
      if (p.startsWith('/facilities/indicadores')) return 'fac-indicadores';
      return 'fac-dashboard';
    }
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
