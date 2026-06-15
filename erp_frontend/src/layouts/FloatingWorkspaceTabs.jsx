import { Button, Tooltip } from "antd";
import { CloseOutlined, PushpinOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MAX_TABS = 10;

const ROUTE_LABELS = {
  "/": "Dashboard",
  "/ambiente": "Ambiente",
  "/dashboard": "Dashboard",
  "/orcamentos": "Orçamentos",
  "/orcamentos/novo": "Novo orçamento",
  "/orcamentos/inteligente": "Orçamento inteligente",
  "/contratos": "Contratos",
  "/contratos/novo": "Novo contrato",
  "/ordens": "Ordens de Serviço",
  "/ordens/novo": "Nova OS",
  "/clientes": "Clientes",
  "/agenda": "Agenda",
  "/servicos": "Serviços",
  "/terceiros": "Terceirizados",
  "/equipe": "Equipe",
  "/estoque": "Estoque",
  "/catalogo-inteligente": "Motor de Catálogo",
  "/financeiro": "Financeiro",
  "/financeiro/lancamentos": "Lançamentos",
  "/faturamento": "Faturamento",
  "/crm": "CRM",
  "/chamados-externos": "Chamados externos",
  "/licitacoes": "Licitações",
  "/fiscal": "Fiscal",
  "/configuracoes": "Configurações",
  "/perfil": "Perfil",
  "/facilities": "Facilities",
  "/facilities/ativos": "Ativos",
  "/facilities/pmp": "Preventiva",
  "/facilities/chamados": "Help Desk",
  "/facilities/licitacao": "Licitações",
  "/facilities/contratos": "Contratos Facilities",
  "/facilities/obras": "Obras",
  "/facilities/indicadores": "Indicadores",
  "/facilities/unidades": "Unidades",
  "/facilities/budget": "Budget",
  "/facilities/aprovacoes": "Aprovações",
  "/facilities/configuracoes": "Config. Facilities",
};

function getRouteLabel(pathname) {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith("/ordens/")) return `OS ${pathname.split("/").pop()}`;
  if (pathname.startsWith("/orcamentos/")) return `Orçamento ${pathname.split("/").pop()}`;
  if (pathname.startsWith("/contratos/editar/")) return `Editar contrato ${pathname.split("/").pop()}`;
  if (pathname.startsWith("/contratos/")) return `Contrato ${pathname.split("/").pop()}`;
  if (pathname.startsWith("/estoque/produtos/")) return `Produto ${pathname.split("/").pop()}`;
  if (pathname.startsWith("/facilities/ativos/")) return `Ativo ${pathname.split("/").pop()}`;
  if (pathname.startsWith("/facilities/obras/")) return `Obra ${pathname.split("/").pop()}`;
  const base = `/${pathname.split("/")[1] || "dashboard"}`;
  return ROUTE_LABELS[base] || "Página";
}

function loadTabs() {
  try {
    const stored = JSON.parse(localStorage.getItem("erp_workspace_tabs") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export default function FloatingWorkspaceTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState(loadTabs);

  const pathname = location.pathname;

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/master")) return;

    setTabs((current) => {
      const nextTab = { path: pathname, label: getRouteLabel(pathname) };
      const withoutCurrent = current.filter((tab) => tab.path !== pathname);
      const next = [nextTab, ...withoutCurrent].slice(0, MAX_TABS);
      localStorage.setItem("erp_workspace_tabs", JSON.stringify(next));
      return next;
    });
  }, [pathname]);

  const orderedTabs = useMemo(() => {
    const active = tabs.find((tab) => tab.path === pathname);
    const others = tabs.filter((tab) => tab.path !== pathname);
    return active ? [active, ...others] : tabs;
  }, [pathname, tabs]);

  const closeTab = (event, path) => {
    event.stopPropagation();
    const next = tabs.filter((tab) => tab.path !== path);
    setTabs(next);
    localStorage.setItem("erp_workspace_tabs", JSON.stringify(next));

    if (path === pathname) {
      navigate(next[0]?.path || "/dashboard");
    }
  };

  if (!orderedTabs.length) return null;

  return (
    <div className="erp-floating-tabs" aria-label="Abas abertas">
      <div className="erp-floating-tabs-pin">
        <PushpinOutlined />
      </div>
      <div className="erp-floating-tabs-scroll">
        {orderedTabs.map((tab) => {
          const active = tab.path === pathname;
          return (
            <Tooltip key={tab.path} title={tab.path}>
              <button
                type="button"
                className={active ? "erp-work-tab erp-work-tab-active" : "erp-work-tab"}
                onClick={() => navigate(tab.path)}
              >
                <span className="erp-work-tab-label">{tab.label}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  className="erp-work-tab-close"
                  onClick={(event) => closeTab(event, tab.path)}
                />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
