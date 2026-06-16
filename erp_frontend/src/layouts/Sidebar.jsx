import { useMemo } from "react";
import { Menu } from "antd";
import {
  AlertOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BuildOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  MessageOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
  UploadOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

import { ERP_SIDEBAR_SECTIONS } from "../config/erpExperience";

const ICONS = {
  AlertOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  BuildOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  MessageOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
  UploadOutlined,
  WalletOutlined,
};

function getIcon(iconKey) {
  return ICONS[iconKey] || AppstoreOutlined;
}

function isActive(pathname, item) {
  const target = item.path === "/" ? "/" : item.path.replace(/\/$/, "");
  if (item.match === "exact") return pathname === target;
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

function getSelectedKey(pathname, sections) {
  for (const section of sections) {
    for (const item of section.items) {
      if (isActive(pathname, item)) {
        return item.key;
      }
    }
  }
  return null;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const sections = ERP_SIDEBAR_SECTIONS;

  const items = useMemo(
    () =>
      sections.map((section) => ({
        label: section.label,
        type: "group",
        children: section.items.map((item) => {
          const Icon = getIcon(item.iconKey);
          return {
            key: item.key,
            icon: <Icon />,
            label: item.label,
            onClick: () => navigate(item.path),
          };
        }),
      })),
    [navigate, sections]
  );

  return (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey(location.pathname, sections)].filter(
        Boolean
      )}
      items={items}
      className="erp-sidebar-menu"
      style={{ borderRight: "none" }}
    />
  );
}
