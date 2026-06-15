export const theme = {
  token: {
    // Cor primária — azul moderno
    colorPrimary: "#3B82F6",
    colorPrimaryHover: "#2563EB",
    colorPrimaryActive: "#1D4ED8",

    // Cor de sucesso — esmeralda
    colorSuccess: "#10B981",
    colorSuccessHover: "#059669",

    // Cor de atenção — âmbar
    colorWarning: "#F59E0B",

    // Cor de erro — vermelho
    colorError: "#EF4444",

    // Tipografia
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontWeightStrong: 600,

    // Bordas — compactas e profissionais
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 5,
    borderRadiusXS: 4,

    // Espaçamentos — densidade operacional
    padding: 12,
    paddingLG: 18,
    paddingSM: 8,
    paddingXS: 5,

    // Sombras mínimas
    boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
    boxShadowSecondary: "0 4px 16px rgba(0,0,0,0.08)",

    // Cores de fundo — neutro limpo
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#F4F6F9",
    colorBgElevated: "#FFFFFF",

    // Texto
    colorText: "#0F172A",
    colorTextSecondary: "#475569",
    colorTextTertiary: "#94A3B8",
    colorTextQuaternary: "#CBD5E1",

    // Bordas — mais suaves
    colorBorder: "#E8EDF2",
    colorBorderSecondary: "#F1F4F8",

    // Linha
    lineWidth: 1,
    lineType: "solid",

    // Altura dos controles
    controlHeight: 32,
    controlHeightLG: 36,
    controlHeightSM: 26,

    // Motion
    motionDurationMid: "0.15s",
    motionDurationSlow: "0.2s",
    motionEaseInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  components: {
    // Botões
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      fontWeight: 500,
      borderRadius: 8,
      controlHeight: 32,
      controlHeightLG: 36,
    },
    // Cards
    Card: {
      headerBg: "#FFFFFF",
      borderRadius: 8,
    },
    // Tabela
    Table: {
      headerBg: "#FAFBFC",
      headerColor: "#94A3B8",
      headerSortActiveBg: "#F4F6F9",
      rowHoverBg: "#F8FAFC",
      borderColor: "#E8EDF2",
      fontSize: 12,
      cellPaddingBlock: 7,
      cellPaddingInline: 10,
    },
    // Menu lateral
    Menu: {
      itemBorderRadius: 9,
      itemMarginInline: 8,
      subMenuItemBg: "transparent",
      itemSelectedBg: "rgba(59,130,246,0.1)",
      itemSelectedColor: "#3B82F6",
      itemHoverBg: "rgba(255,255,255,0.07)",
      itemHoverColor: "#FFFFFF",
    },
    // Inputs
    Input: {
      borderRadius: 8,
      activeShadow: "0 0 0 3px rgba(59,130,246,0.15)",
      hoverBorderColor: "#3B82F6",
    },
    // Select
    Select: {
      borderRadius: 8,
    },
    // Tags / badges
    Tag: {
      borderRadius: 6,
      fontSizeSM: 11,
    },
    // Tabs
    Tabs: {
      inkBarColor: "#3B82F6",
      itemSelectedColor: "#3B82F6",
      itemHoverColor: "#3B82F6",
      titleFontSize: 13,
      fontWeightStrong: 600,
    },
    // Layout
    Layout: {
      siderBg: "#111827",
      headerBg: "#FFFFFF",
      bodyBg: "#F8FAFC",
    },
    // Modal
    Modal: {
      borderRadius: 16,
    },
    // Drawer
    Drawer: {
      borderRadius: 0,
    },
    // Steps
    Steps: {
      colorPrimary: "#3B82F6",
      fontSize: 12,
    },
    // Statistic
    Statistic: {
      titleFontSize: 10,
      contentFontSize: 22,
    },
  },
};
