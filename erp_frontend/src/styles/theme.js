export const theme = {
  token: {
    colorPrimary: '#1B4F8A',
    colorSuccess: '#1A7A4A',
    colorWarning: '#B45309',
    colorError: '#B91C1C',
    colorInfo: '#0284C7',

    fontSize: 14,
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',

    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    borderRadiusXS: 2,

    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 32,

    colorBgContainer: '#ffffff',
    colorBgElevated: '#fafafa',
    colorBgLayout: '#f5f5f5',

    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',

    colorText: '#262626',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorTextQuaternary: '#bfbfbf',

    lineHeight: 1.5714285714,
    lineHeightHeading1: 1.2,
    lineHeightHeading2: 1.35,
  },

  components: {
    Button: {
      controlHeight: 38,
      primaryColor: '#1B4F8A',
      borderRadius: 8,
      fontWeight: 600,
      controlOutline: 'rgba(27, 79, 138, 0.1)',
    },

    Card: {
      borderRadiusLG: 8,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      boxShadowSecondary: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },

    Table: {
      headerBg: '#f5f5f5',
      headerColor: '#262626',
      headerFontWeight: 600,
      borderColor: '#f0f0f0',
      rowHoverBg: '#fafafa',
    },

    Menu: {
      itemBg: '#ffffff',
      itemHoverColor: '#1B4F8A',
      itemHoverBg: '#f0f7ff',
      itemSelectedColor: '#1B4F8A',
      itemSelectedBg: '#e6f4ff',
      itemSelectedFontWeight: 600,
      itemBorderRadius: 6,
    },

    Input: {
      controlHeight: 38,
      borderRadius: 8,
      controlOutline: 'rgba(27, 79, 138, 0.1)',
      colorTextPlaceholder: '#bfbfbf',
    },

    Select: {
      controlHeight: 38,
      borderRadius: 8,
      controlOutline: 'rgba(27, 79, 138, 0.1)',
    },

    Tag: {
      borderRadiusSM: 6,
      fontWeight: 600,
    },

    Tabs: {
      itemColor: '#8c8c8c',
      itemHoverColor: '#1B4F8A',
      itemSelectedColor: '#1B4F8A',
      itemSelectedBg: '#ffffff',
      itemActiveWithIcon: '#1B4F8A',
      inkBarColor: '#1B4F8A',
    },

    Layout: {
      headerBg: '#ffffff',
      headerHeight: 60,
      headerPadding: '0 24px',
      headerColor: '#262626',
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
      footerBg: '#ffffff',
      footerPadding: '16px 50px',
    },

    Modal: {
      borderRadiusLG: 8,
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
      borderRadiusLG: 8,
    },
  },
};
