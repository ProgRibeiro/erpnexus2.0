import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";

import { theme } from "./styles/theme";
import "./styles/global.css";
import "./styles.css";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

async function recoverLocalApp() {
  try {
    localStorage.clear();
    sessionStorage.clear();

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } finally {
    window.location.reload();
  }
}

function showRecoveryReloadNotice() {
  if (document.getElementById("erp-recovery-reload-notice")) return;

  const notice = document.createElement("div");
  notice.id = "erp-recovery-reload-notice";
  notice.style.cssText = [
    "position: fixed",
    "right: 18px",
    "bottom: 18px",
    "z-index: 99999",
    "display: flex",
    "align-items: center",
    "gap: 12px",
    "max-width: min(420px, calc(100vw - 36px))",
    "padding: 14px 16px",
    "background: #0F172A",
    "color: #FFFFFF",
    "border-radius: 14px",
    "box-shadow: 0 18px 44px rgba(15, 23, 42, 0.28)",
    "font-family: Inter, system-ui, sans-serif",
  ].join("; ");

  const text = document.createElement("div");
  text.style.cssText = "font-size: 13px; line-height: 1.35; color: #E2E8F0;";
  text.textContent = "Atualização aplicada e cache antigo removido. Recarregue para abrir a versão limpa.";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Recarregar";
  button.style.cssText = [
    "border: none",
    "background: #3B82F6",
    "color: #FFFFFF",
    "border-radius: 10px",
    "padding: 9px 12px",
    "font-weight: 800",
    "cursor: pointer",
    "white-space: nowrap",
  ].join("; ");
  button.onclick = () => window.location.reload();

  notice.appendChild(text);
  notice.appendChild(button);
  document.body.appendChild(notice);
}

function renderFatalError(error) {
  const detail = error?.message || "Erro inesperado ao carregar o sistema.";

  root.render(
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F1F5F9",
        padding: 24,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, color: "#0F172A", fontSize: 24 }}>Erro ao carregar o ERP Nexus</h1>
        <p style={{ marginTop: 10, marginBottom: 0, color: "#475569" }}>
          Encontramos um erro de inicialização. Tente recarregar a página.
        </p>
        <div
          style={{
            marginTop: 16,
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: 12,
            color: "#B91C1C",
            fontSize: 13,
            wordBreak: "break-word",
          }}
        >
          {detail}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: "none",
              background: "#3B82F6",
              color: "#FFFFFF",
              borderRadius: 8,
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
          <button
            type="button"
            onClick={recoverLocalApp}
            style={{
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              borderRadius: 8,
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Limpar dados locais e recarregar
          </button>
        </div>
      </div>
    </div>
  );
}

async function bootstrapApp() {
  try {
    const { default: App } = await import("./App");
    root.render(
      <React.StrictMode>
        <ConfigProvider theme={theme} locale={ptBR}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfigProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Falha ao inicializar frontend:", error);
    renderFatalError(error);
  }
}

bootstrapApp();

if (import.meta.env.DEV) {
  clearDevelopmentServiceWorkers();
} else {
  registerServiceWorker();
}

async function clearDevelopmentServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      console.log("[SW] Service workers e caches desativados em desenvolvimento.");
    } catch (error) {
      console.error("[SW] Erro ao limpar service workers em desenvolvimento:", error);
    }
  });
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none"
        });

        console.log("[SW] Registrado com sucesso:", registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          newWorker?.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[SW] Novo SW disponível, solicitando atualização...");
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch (error) {
        console.error("[SW] Erro ao registrar:", error);
      }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[SW] Novo service worker assumiu o controle");
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event?.data?.type === "SW_RECOVERY_RELOAD") {
        console.log("[SW] Recuperação concluída, caches limpos.");
        showRecoveryReloadNotice();
      }
    });
  }
}
