import { useMemo, useState } from 'react';
import { Layout, Space, Button, Dropdown, Badge, Tooltip, Input, Tag, AutoComplete } from 'antd';
import {
  AppstoreOutlined,
  BellOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DollarOutlined,
  DownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
  SettingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AvatarUsuario from '../components/ui/AvatarUsuario';
import { ERP_HUB_MODULES } from "../config/erpExperience";

const ROUTE_META = {
  '/': { label: 'Início', section: 'Ambiente' },
  '/ambiente': { label: 'Ambiente', section: 'Módulos da licença' },
  '/cadastros': { label: 'Cadastros', section: 'Registros base' },
  '/dashboard': { label: 'Dashboard', section: 'Indicadores e KPIs' },
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
  '/financeiro/analitico': { label: 'Painel analítico', section: 'Gestão financeira' },
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

function buildSearchIndex() {
  const baseItems = ERP_HUB_MODULES.map((item) => ({
    label: item.label,
    path: item.path,
    section: item.title,
    keywords: `${item.label} ${item.title} ${item.description}`,
  }));

  return [
    ...baseItems,
    { label: 'Início', path: '/', section: 'Ambiente', keywords: 'inicio ambiente central módulos licenças' },
    { label: 'Dashboard', path: '/dashboard', section: 'Indicadores e KPIs', keywords: 'dashboard indicadores kpis financeiro gráficos' },
    { label: 'Novo orçamento', path: '/orcamentos/novo', section: 'Comercial técnico', keywords: 'novo orçamento proposta' },
    { label: 'Nova OS', path: '/ordens/novo', section: 'Operação de campo', keywords: 'nova os ordem serviço' },
    { label: 'Lançamentos financeiros', path: '/financeiro/lancamentos', section: 'Gestão financeira', keywords: 'lançamentos financeiro contas' },
    { label: 'Cadastro de clientes', path: '/clientes', section: 'Relacionamento', keywords: 'clientes cadastro contato' },
    { label: 'Estoque', path: '/estoque', section: 'Suprimentos', keywords: 'estoque produtos movimentação' },
  ];
}

function buildQuickAccessItems(navigate) {
  return [
    {
      key: "nova-os",
      icon: <PlusOutlined />,
      label: "Nova OS",
      onClick: () => navigate("/ordens/novo"),
    },
    {
      key: "novo-orcamento",
      icon: <FileTextOutlined />,
      label: "Novo orçamento",
      onClick: () => navigate("/orcamentos/novo"),
    },
    {
      key: "novo-lancamento",
      icon: <DollarOutlined />,
      label: "Novo lançamento",
      onClick: () => navigate("/financeiro/lancamentos/novo"),
    },
    { type: "divider" },
    {
      key: "inicio",
      icon: <AppstoreOutlined />,
      label: "Início / Ambiente",
      onClick: () => navigate("/"),
    },
    {
      key: "dashboard",
      icon: <BarChartOutlined />,
      label: "Dashboard",
      onClick: () => navigate("/dashboard"),
    },
    { type: "divider" },
    ...ERP_HUB_MODULES.map((module) => ({
      key: module.key,
      label: module.label,
      onClick: () => navigate(module.path),
    })),
    { type: "divider" },
    {
      key: "comando",
      icon: <ThunderboltOutlined />,
      label: "Abrir comandos",
      onClick: () => document.dispatchEvent(new CustomEvent("open-command-palette")),
    },
    {
      key: "configuracoes",
      icon: <SettingOutlined />,
      label: "Configurações",
      onClick: () => navigate("/configuracoes"),
    },
  ];
}

function getContextActions(pathname, navigate) {
  const action = (key, label, path, icon, primary = false) => ({
    key,
    label,
    icon,
    primary,
    onClick: () => navigate(path),
  });

  if (pathname.startsWith("/ordens/") && pathname !== "/ordens/novo") {
    return [
      action("voltar-os", "Todas OS", "/ordens", <ToolOutlined />),
      action("agenda-hoje", "Agenda hoje", "/agenda/hoje", <CalendarOutlined />),
      action("faturamento", "Faturar", "/faturamento", <DollarOutlined />, true),
    ];
  }

  if (pathname.startsWith("/ordens")) {
    return [
      action("nova-os", "Nova OS", "/ordens/novo", <PlusOutlined />, true),
      action("agenda-hoje", "Agenda hoje", "/agenda/hoje", <CalendarOutlined />),
      action("faturamento", "Faturamento", "/faturamento", <DollarOutlined />),
    ];
  }

  if (pathname.startsWith("/orcamentos")) {
    return [
      action("novo-orcamento", "Novo orçamento", "/orcamentos/novo", <PlusOutlined />, true),
      action("orcamento-ia", "Orçamento inteligente", "/orcamentos/inteligente", <ThunderboltOutlined />),
      action("crm", "CRM", "/crm", <BarChartOutlined />),
    ];
  }

  if (pathname.startsWith("/financeiro") || pathname.startsWith("/faturamento")) {
    return [
      action("novo-lancamento", "Novo lançamento", "/financeiro/lancamentos/novo", <PlusOutlined />, true),
      action("lancamentos", "Lançamentos", "/financeiro/lancamentos", <FileTextOutlined />),
      action("relatorios", "Relatórios", "/financeiro/relatorios", <BarChartOutlined />),
    ];
  }

  if (pathname.startsWith("/estoque")) {
    return [
      action("entrada", "Entrada", "/estoque/entrada", <PlusOutlined />, true),
      action("saida", "Saída", "/estoque/saida", <ToolOutlined />),
      action("alertas", "Alertas", "/estoque/alertas", <SafetyCertificateOutlined />),
    ];
  }

  if (pathname.startsWith("/agenda")) {
    return [
      action("agenda-hoje", "Minhas OS", "/agenda/hoje", <CalendarOutlined />, true),
      action("nova-os", "Nova OS", "/ordens/novo", <PlusOutlined />),
      action("ordens", "Ver OS", "/ordens", <ToolOutlined />),
    ];
  }

  return [
    action("nova-os", "Nova OS", "/ordens/novo", <PlusOutlined />, true),
    action("novo-orcamento", "Orçamento", "/orcamentos/novo", <FileTextOutlined />),
    action("financeiro", "Financeiro", "/financeiro", <DollarOutlined />),
  ];
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const mode = location.pathname.startsWith("/facilities") ? "facilities" : "prestador";
  const sidebarName = mode === 'facilities' ? 'ERP Facilities' : 'ERP Nexus';
  const pageMeta = getPageMeta(location.pathname);
  const searchIndex = useMemo(() => buildSearchIndex(), []);
  const quickAccessItems = useMemo(
    () => buildQuickAccessItems(navigate),
    [navigate]
  );
  const contextActions = useMemo(
    () => getContextActions(location.pathname, navigate),
    [location.pathname, navigate]
  );
  const searchOptions = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    const filtered = term
      ? searchIndex.filter((item) => `${item.label} ${item.section} ${item.keywords}`.toLowerCase().includes(term))
      : searchIndex;

    return filtered.slice(0, 8).map((item) => ({
      value: item.path,
      label: (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontWeight: 600 }}>{item.label}</span>
          <span style={{ color: "#94A3B8", fontSize: 12 }}>{item.section}</span>
        </div>
      ),
    }));
  }, [searchIndex, searchValue]);

  const handleSearchSelect = (path) => {
    setSearchValue("");
    navigate(path);
  };

  const handleSearchEnter = () => {
    const exact = searchIndex.find((item) => item.label.toLowerCase() === searchValue.trim().toLowerCase());
    if (exact) {
      handleSearchSelect(exact.path);
      return;
    }

    const firstMatch = searchIndex.find((item) =>
      `${item.label} ${item.section} ${item.keywords}`.toLowerCase().includes(searchValue.trim().toLowerCase())
    );
    if (firstMatch) handleSearchSelect(firstMatch.path);
  };

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
          <AutoComplete
            value={searchValue}
            onSearch={setSearchValue}
            onSelect={handleSearchSelect}
            options={searchOptions}
            popupClassName="erp-command-dropdown"
            className="erp-command-auto"
          >
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Buscar ou digitar uma ação..."
              className="erp-command-input"
              suffix={<span className="erp-command-kbd">Ctrl K</span>}
              onPressEnter={handleSearchEnter}
            />
          </AutoComplete>
          <Tag className="erp-command-tag">{searchOptions.length} resultados</Tag>
        </div>

        <Space size={8} className="erp-topbar-actions">
          <div className="erp-context-actions">
            {contextActions.map((item) => (
              <Button
                key={item.key}
                type={item.primary ? "primary" : "default"}
                icon={item.icon}
                onClick={item.onClick}
                className={item.primary ? "erp-context-button erp-context-button-primary" : "erp-context-button"}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <Tag icon={<SafetyCertificateOutlined />} className="erp-health-tag">
            Operação ativa
          </Tag>

          <Dropdown
            menu={{ items: quickAccessItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="primary"
              icon={<AppstoreOutlined />}
              className="erp-shortcut-button"
            >
              Acesso rápido <DownOutlined />
            </Button>
          </Dropdown>

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
