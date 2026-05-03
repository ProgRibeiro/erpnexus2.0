/**
 * Exemplo de Integração PWA no App.jsx
 *
 * Este arquivo mostra como integrar todos os componentes PWA
 * no seu App.jsx para uma funcionalidade completa de offline
 */

import React, { useEffect } from 'react';
import { Layout, Empty } from 'antd';
import { useOffline } from '@/hooks/useOffline';
import { usePWASetup } from '@/config/pwaSetup';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import pwaDebugTools from '@/utils/pwaDebug';

// Importar seu conteúdo principal
// import { Dashboard } from '@/pages/Dashboard';
// import { Navigation } from '@/components/Navigation';

export function App() {
  // =========================================
  // 1. INICIALIZAR PWA
  // =========================================
  usePWASetup();

  // =========================================
  // 2. DETECTAR STATUS OFFLINE
  // =========================================
  const { isOffline, syncStatus, unsyncedPhotos, unsyncedChats } = useOffline();

  // =========================================
  // 3. SETUP DEBUG TOOLS (apenas dev)
  // =========================================
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Fazer debug tools disponíveis globalmente
      window.PWADebug = pwaDebugTools;
      console.log(
        '[PWA] Debug tools disponíveis. Use window.PWADebug.printStatus() no console'
      );
    }
  }, []);

  // =========================================
  // 4. RENDER PRINCIPAL
  // =========================================
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header com indicador offline */}
      <Layout.Header
        style={{
          background: isOffline ? '#ffebee' : '#f0f2f5',
          borderBottom: isOffline ? '2px solid #ff4d4f' : 'none',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s'
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 'bold' }}>
          ERP Produção
        </div>

        {isOffline && (
          <div style={{ color: '#ff4d4f', fontSize: 12 }}>
            Modo Offline Ativado
            {syncStatus === 'syncing' && ' - Sincronizando...'}
          </div>
        )}

        {(unsyncedPhotos.length > 0 || unsyncedChats.length > 0) && (
          <div style={{ color: '#ff7a45', fontSize: 12 }}>
            {unsyncedPhotos.length + unsyncedChats.length} item(ns) não sincronizado(s)
          </div>
        )}
      </Layout.Header>

      {/* Conteúdo Principal */}
      <Layout.Content style={{ padding: '24px' }}>
        {/* Seu conteúdo aqui */}
        <Empty description="Conteúdo da aplicação aqui" />
      </Layout.Content>

      {/* Footer */}
      <Layout.Footer
        style={{
          textAlign: 'center',
          background: '#fafafa'
        }}
      >
        {navigator.onLine ? (
          <span style={{ color: '#52c41a' }}>● Online</span>
        ) : (
          <span style={{ color: '#ff4d4f' }}>● Offline</span>
        )}
      </Layout.Footer>

      {/* Indicador Offline Flutuante */}
      <OfflineIndicator />
    </Layout>
  );
}

/**
 * CONFIGURAÇÃO RECOMENDADA DO main.jsx:
 */

/*
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";

import App from "./App";
import { theme } from "./styles/theme";
import { setupPWADirect, setupSWLifecycleEvents } from "@/config/pwaSetup";

import "./styles/global.css";

// Setup PWA
setupPWADirect();
setupSWLifecycleEvents();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} locale={ptBR}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
*/

/**
 * EXEMPLO: USANDO OFFLINE EM UM COMPONENTE
 */

export function ExemploUsoOffline() {
  const {
    isOffline,
    syncStatus,
    unsyncedPhotos,
    savePhotoOffline,
    queueChatMessage,
    triggerSync
  } = useOffline();

  const handleUploadFoto = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoId = await savePhotoOffline(e.target.result, {
        fileName: file.name,
        timestamp: new Date().toISOString()
      });
      console.log('Foto enfileirada:', photoId);

      // Sincronizar se online
      if (!isOffline) {
        setTimeout(() => triggerSync(), 1000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (message) => {
    await queueChatMessage({
      text: message,
      timestamp: new Date().toISOString()
    });

    if (!isOffline) {
      triggerSync();
    }
  };

  return (
    <div>
      <p>Status: {isOffline ? 'Offline' : 'Online'}</p>
      <p>Sincronização: {syncStatus}</p>
      <p>Fotos pendentes: {unsyncedPhotos.length}</p>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleUploadFoto(e.target.files[0])}
      />

      <textarea
        placeholder="Digite sua mensagem"
        onBlur={(e) => handleSendMessage(e.target.value)}
      />

      <button onClick={triggerSync}>Sincronizar Agora</button>
    </div>
  );
}

/**
 * EXEMPLO: REQUISIÇÃO COM OFFLINE SUPPORT
 */

import { useSyncQueue } from '@/hooks/useSyncQueue';

export function ExemploRequisicaoOffline() {
  const { addToQueue, syncQueue, queue } = useSyncQueue();

  const handleSaveDados = async (dados) => {
    // Tentar requisição normal
    if (navigator.onLine) {
      try {
        const response = await fetch('/api/dados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          console.log('Dados salvos online');
          return;
        }
      } catch (error) {
        console.log('Falha online, enfileirando');
      }
    }

    // Enfileirar se offline ou falhar
    await addToQueue('POST', '/api/dados', dados, {
      'Content-Type': 'application/json'
    });

    console.log('Dados enfileirados');

    // Sincronizar se online
    if (navigator.onLine) {
      setTimeout(() => syncQueue(), 1000);
    }
  };

  return (
    <div>
      <button onClick={() => handleSaveDados({ nome: 'teste' })}>
        Salvar Dados
      </button>
      <p>{queue.length} itens na fila</p>
    </div>
  );
}

/**
 * DEBUGAR NO CONSOLE:
 *
 * // Ver status
 * PWADebug.printStatus()
 *
 * // Ver requisições na fila
 * PWADebug.printQueuedRequests()
 *
 * // Ver fotos offline
 * PWADebug.printOfflinePhotos()
 *
 * // Simular offline
 * PWADebug.simulateOffline()
 *
 * // Simular online
 * PWADebug.simulateOnline()
 *
 * // Sincronizar manualmente
 * PWADebug.testSync()
 *
 * // Limpar tudo
 * PWADebug.clearAll()
 *
 * // Forçar atualização do SW
 * PWADebug.forceUpdateSW()
 */

export default App;
