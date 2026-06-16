/**
 * Command Palette Service
 * Sistema global de comandos acessível via Cmd+K ou Ctrl+K
 */

export const COMMAND_CATEGORIES = {
  NAVEGACAO: "navegacao",
  ORDENS: "ordens",
  FINANCEIRO: "financeiro",
  CADASTROS: "cadastros",
  VENDAS: "vendas",
  RELATORIOS: "relatorios",
  SISTEMA: "sistema",
};

export const COMMANDS = [
  // Navegação
  {
    id: "nav-dashboard",
    category: COMMAND_CATEGORIES.NAVEGACAO,
    title: "Ir para Dashboard",
    description: "Abre o painel principal",
    icon: "home",
    shortcut: "Home",
    action: () => (window.location.hash = "#/"),
    priority: 1,
  },
  {
    id: "nav-ordens",
    category: COMMAND_CATEGORIES.NAVEGACAO,
    title: "Ir para Ordens",
    description: "Lista de ordens de serviço",
    icon: "file-text",
    shortcut: "Alt+O",
    action: () => (window.location.hash = "#/ordens"),
    priority: 2,
  },
  {
    id: "nav-financeiro",
    category: COMMAND_CATEGORIES.NAVEGACAO,
    title: "Ir para Financeiro",
    description: "Hub financeiro e análises",
    icon: "trending-up",
    shortcut: "Alt+F",
    action: () => (window.location.hash = "#/financeiro"),
    priority: 3,
  },
  {
    id: "nav-cadastros",
    category: COMMAND_CATEGORIES.NAVEGACAO,
    title: "Ir para Cadastros",
    description: "Central de cadastros (clientes, serviços, estoque)",
    icon: "layers",
    shortcut: "Alt+C",
    action: () => (window.location.hash = "#/cadastros"),
    priority: 4,
  },
  {
    id: "nav-clientes",
    category: COMMAND_CATEGORIES.CADASTROS,
    title: "Ir para Clientes",
    description: "Gestão de clientes",
    icon: "users",
    shortcut: "Alt+L",
    action: () => (window.location.hash = "#/clientes"),
    priority: 5,
  },
  {
    id: "nav-crm",
    category: COMMAND_CATEGORIES.VENDAS,
    title: "Ir para CRM",
    description: "Pipeline de vendas (Kanban)",
    icon: "kanban",
    shortcut: "Alt+K",
    action: () => (window.location.hash = "#/crm"),
    priority: 6,
  },

  // Ações Rápidas - Ordens
  {
    id: "novo-ordem",
    category: COMMAND_CATEGORIES.ORDENS,
    title: "Nova Ordem de Serviço",
    description: "Criar uma nova OS",
    icon: "plus",
    shortcut: "Ctrl+Alt+O",
    action: () => (window.location.hash = "#/ordens/novo"),
    priority: 10,
  },
  {
    id: "listar-ordens-hoje",
    category: COMMAND_CATEGORIES.ORDENS,
    title: "Ordens de Hoje",
    description: "Exibir ordens agendadas para hoje",
    icon: "calendar",
    action: () => (window.location.hash = "#/ordens?filtro=hoje"),
    priority: 11,
  },

  // Ações Rápidas - Financeiro
  {
    id: "novo-lancamento",
    category: COMMAND_CATEGORIES.FINANCEIRO,
    title: "Novo Lançamento",
    description: "Registrar novo lançamento financeiro",
    icon: "plus-circle",
    shortcut: "Ctrl+Alt+L",
    action: () => (window.location.hash = "#/financeiro/lancamentos/novo"),
    priority: 20,
  },
  {
    id: "fluxo-caixa",
    category: COMMAND_CATEGORIES.FINANCEIRO,
    title: "Fluxo de Caixa",
    description: "Visualizar fluxo de caixa",
    icon: "bar-chart-2",
    action: () => (window.location.hash = "#/financeiro/fluxo-caixa"),
    priority: 21,
  },
  {
    id: "recebimentos",
    category: COMMAND_CATEGORIES.FINANCEIRO,
    title: "Recebimentos Pendentes",
    description: "Contas a receber",
    icon: "arrow-down-circle",
    action: () => (window.location.hash = "#/financeiro/recebimentos"),
    priority: 22,
  },
  {
    id: "pagamentos",
    category: COMMAND_CATEGORIES.FINANCEIRO,
    title: "Pagamentos Pendentes",
    description: "Contas a pagar",
    icon: "arrow-up-circle",
    action: () => (window.location.hash = "#/financeiro/pagamentos"),
    priority: 23,
  },

  // Ações Rápidas - Vendas
  {
    id: "novo-orcamento",
    category: COMMAND_CATEGORIES.VENDAS,
    title: "Novo Orçamento",
    description: "Criar novo orçamento",
    icon: "file-earmark-text",
    shortcut: "Ctrl+Alt+Q",
    action: () => (window.location.hash = "#/orcamentos/novo"),
    priority: 30,
  },
  {
    id: "novo-cliente",
    category: COMMAND_CATEGORIES.CADASTROS,
    title: "Novo Cliente",
    description: "Cadastrar novo cliente",
    icon: "user-plus",
    shortcut: "Ctrl+Alt+C",
    action: () => (window.location.hash = "#/clientes/novo"),
    priority: 40,
  },

  // Sistema
  {
    id: "buscar",
    category: COMMAND_CATEGORIES.SISTEMA,
    title: "Buscar",
    description: "Abrir busca global",
    icon: "search",
    shortcut: "Cmd+K",
    action: () =>
      document.dispatchEvent(new CustomEvent("open-command-palette")),
    priority: 100,
  },
  {
    id: "atalhos",
    category: COMMAND_CATEGORIES.SISTEMA,
    title: "Ver Atalhos",
    description: "Exibir todos os atalhos de teclado",
    icon: "help-circle",
    shortcut: "Ctrl+/?",
    action: () => document.dispatchEvent(new CustomEvent("show-shortcuts")),
    priority: 101,
  },
  {
    id: "sair",
    category: COMMAND_CATEGORIES.SISTEMA,
    title: "Sair",
    description: "Fazer logout",
    icon: "log-out",
    shortcut: "Ctrl+Q",
    action: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.hash = "#/login";
    },
    priority: 102,
  },
];

export const searchCommands = (query) => {
  const q = query.toLowerCase();
  return COMMANDS.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q),
  ).sort((a, b) => b.priority - a.priority);
};

export const getCommandsByCategory = (category) => {
  return COMMANDS.filter((cmd) => cmd.category === category).sort(
    (a, b) => b.priority - a.priority,
  );
};

export const getAllCategories = () => {
  return Object.values(COMMAND_CATEGORIES);
};

export const getGroupedCommands = () => {
  const grouped = {};
  COMMANDS.forEach((cmd) => {
    if (!grouped[cmd.category]) {
      grouped[cmd.category] = [];
    }
    grouped[cmd.category].push(cmd);
  });
  return grouped;
};
