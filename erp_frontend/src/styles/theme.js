export const theme = {
  token: {
    colorPrimary: '#0F5A88',
    colorSuccess: '#1A7A4A',
    colorWarning: '#D08A2F',
    colorError: '#B91C1C',
    colorInfo: '#1D78B8',

    fontSize: 14,
    fontFamily: '"Manrope", "Segoe UI", system-ui, -apple-system, sans-serif',

    borderRadius: 10,
    borderRadiusLG: 18,
    borderRadiusSM: 4,
    borderRadiusXS: 2,

    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 32,

    colorBgContainer: '#ffffff',
    colorBgElevated: '#fbfdff',
    colorBgLayout: '#eef3f9',

    colorBorder: 'rgba(24, 55, 87, 0.14)',
    colorBorderSecondary: 'rgba(24, 55, 87, 0.08)',

    colorText: '#1a2a3a',
    colorTextSecondary: '#5d7186',
    colorTextTertiary: '#7b8ea3',
    colorTextQuaternary: '#bfbfbf',

    lineHeight: 1.5714285714,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.35,
  },

  components: {
    Button: {
      controlHeight: 38,
      primaryColor: '#0F5A88',
      borderRadius: 10,
      fontWeight: 600,
      controlOutline: 'rgba(15, 90, 136, 0.12)',
    },

    Card: {
      borderRadiusLG: 18,
      boxShadow: '0 20px 50px rgba(15, 46, 76, 0.08)',
      boxShadowSecondary: '0 20px 50px rgba(15, 46, 76, 0.08)',
    },

    Table: {
      headerBg: '#f5f5f5',
      headerColor: '#262626',
      headerFontWeight: 600,
      borderColor: '#f0f0f0',
      rowHoverBg: '#fafafa',
    },

    Menu: {
      itemBg: 'transparent',
      itemHoverColor: '#0F5A88',
      itemHoverBg: '#eef6fb',
      itemSelectedColor: '#0F5A88',
      itemSelectedBg: '#e4f0f8',
      itemSelectedFontWeight: 600,
      itemBorderRadius: 10,
    },

    Input: {
      controlHeight: 38,
      borderRadius: 10,
      controlOutline: 'rgba(15, 90, 136, 0.12)',
      colorTextPlaceholder: '#bfbfbf',
    },

    Select: {
      controlHeight: 38,
      borderRadius: 10,
      controlOutline: 'rgba(15, 90, 136, 0.12)',
    },

    Tag: {
      borderRadiusSM: 6,
      fontWeight: 600,
    },

    Tabs: {
      itemColor: '#7b8ea3',
      itemHoverColor: '#0F5A88',
      itemSelectedColor: '#0F5A88',
      itemSelectedBg: '#ffffff',
      itemActiveWithIcon: '#0F5A88',
      inkBarColor: '#0F5A88',
    },

    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.82)',
      headerHeight: 60,
      headerPadding: '0 24px',
      headerColor: '#1a2a3a',
      siderBg: 'rgba(255, 255, 255, 0.92)',
      bodyBg: '#eef3f9',
      footerBg: '#ffffff',
      footerPadding: '16px 50px',
    },

    Modal: {
      borderRadiusLG: 18,
      boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
      contentBg: '#ffffff',
    },

    Steps: {
      colorPrimary: '#1B4F8A',
      controlHeight: 32,
      borderRadiusSM: 6,
    },

    Empty: {
      colorTextDisabled: '#bfbfbf',
    },

    Drawer: {
      boxShadow: '-3px 0px 6px -4px rgba(0, 0, 0, 0.12)',
    },

    Notification: {
      borderRadiusLG: 18,
    },
  },
};
