export const ERP_SIDEBAR_SECTIONS = [
  {
    key: "central",
    label: "Central",
    items: [
      {
        key: "dashboard",
        label: "Início",
        path: "/",
        match: "exact",
        iconKey: "AppstoreOutlined",
      },
      {
        key: "indicadores",
        label: "Dashboard",
        path: "/dashboard",
        match: "exact",
        iconKey: "BarChartOutlined",
      },
      {
        key: "ambiente",
        label: "Ambiente",
        path: "/ambiente",
        match: "prefix",
        iconKey: "AppstoreOutlined",
      },
      {
        key: "cadastros",
        label: "Cadastros",
        path: "/cadastros",
        match: "prefix",
        iconKey: "AppstoreOutlined",
      },
    ],
  },
];

export const ERP_HUB_MODULES = [
  {
    key: "clientes",
    label: "Clientes",
    title: "Cadastro de clientes",
    description:
      "Centralize contatos, empresas, unidades e histórico comercial.",
    path: "/clientes",
    iconKey: "TeamOutlined",
    accent: "#3B82F6",
  },
  {
    key: "cadastros",
    label: "Cadastros",
    title: "Central de registros",
    description:
      "Organize clientes, serviços, equipe, terceiros, estoque e contas num só lugar.",
    path: "/cadastros",
    iconKey: "AppstoreOutlined",
    accent: "#0EA5E9",
  },
  {
    key: "orcamentos",
    label: "Orçamentos",
    title: "Propostas e negociações",
    description: "Monte propostas, acompanhe aprovações e converta em ordens.",
    path: "/orcamentos",
    iconKey: "FileTextOutlined",
    accent: "#8B5CF6",
  },
  {
    key: "ordens",
    label: "Ordens de serviço",
    title: "Execução operacional",
    description:
      "Controle atendimento, apontamento, fotos, chat e faturamento.",
    path: "/ordens",
    iconKey: "FileDoneOutlined",
    accent: "#10B981",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    title: "Contas e fluxo de caixa",
    description:
      "Receitas, despesas, contas bancárias, conciliação e relatórios.",
    path: "/financeiro",
    iconKey: "DollarOutlined",
    accent: "#F59E0B",
  },
  {
    key: "faturamento",
    label: "Faturamento",
    title: "Emissão e cobrança",
    description:
      "Fature as OS, acompanhe títulos e reduza o retrabalho manual.",
    path: "/faturamento",
    iconKey: "FileProtectOutlined",
    accent: "#EF4444",
  },
  {
    key: "estoque",
    label: "Estoque",
    title: "Produtos e movimentações",
    description: "Saídas, entradas, alertas de mínimo e catálogo inteligente.",
    path: "/estoque",
    iconKey: "ShoppingCartOutlined",
    accent: "#0EA5E9",
  },
  {
    key: "crm",
    label: "CRM",
    title: "Relacionamento comercial",
    description: "Pipeline, oportunidades, follow-up e histórico de avanço.",
    path: "/crm",
    iconKey: "MessageOutlined",
    accent: "#6366F1",
  },
  {
    key: "contratos",
    label: "Contratos",
    title: "Planos de manutenção",
    description: "Gerencie recorrência, escopos, cronogramas e revisões.",
    path: "/contratos",
    iconKey: "FileProtectOutlined",
    accent: "#14B8A6",
  },
];

export const ERP_WORKFLOW_STEPS = [
  {
    key: "cadastro",
    title: "Cadastrar",
    description: "Clientes, serviços, equipe, terceiros e produtos.",
    path: "/cadastros",
    iconKey: "AppstoreOutlined",
  },
  {
    key: "venda",
    title: "Orçar",
    description: "Propostas, negociação e aprovação.",
    path: "/orcamentos",
    iconKey: "FileTextOutlined",
  },
  {
    key: "execucao",
    title: "Executar",
    description: "Ordens, agenda, fotos e tarefas do campo.",
    path: "/ordens",
    iconKey: "ToolOutlined",
  },
  {
    key: "faturamento",
    title: "Faturar",
    description: "Gere títulos, notas e acompanhe cobranças.",
    path: "/financeiro/lancamentos",
    iconKey: "DollarOutlined",
  },
  {
    key: "controle",
    title: "Controlar",
    description: "Estoque, indicadores e relatórios gerenciais.",
    path: "/estoque",
    iconKey: "BarChartOutlined",
  },
];
