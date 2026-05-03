/**
 * PWA Configuration Setup
 *
 * Copie e adicione este código ao seu App.jsx ou main.jsx
 * para ativar a funcionalidade PWA completa
 */

import { useEffect, useRef } from 'react';
import { message } from 'antd';
import { offlineSyncManager } from '@/utils/offlineSync';
import { useOffline } from '@/hooks/useOffline';

export function usePWASetup() {
  const initialized = useRef(false);
  const { isOffline } = useOffline();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 1. Inicializar OfflineSyncManager
    offlineSyncManager.init();

    // 2. Configurar listeners
    setupOfflineSyncListeners();

    // 3. Sincronizar quando volta online
    setupOnlineHandler();

    // 4. Limpar ao desmontar
    return () => {
      offlineSyncManager.destroy();
    };
  }, []);

  // Sincronizar quando volta online
  useEffect(() => {
    if (!isOffline && navigator.onLine) {
      const timer = setTimeout(() => {
        console.log('[PWA] Voltou online, sincronizando...');
        offlineSyncManager.syncAll();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  return { offlineSyncManager };
}

function setupOfflineSyncListeners() {
  offlineSyncManager.on('syncStart', () => {
    console.log('[PWA] Sincronização iniciada');
  });

  offlineSyncManager.on('syncComplete', () => {
    console.log('[PWA] Sincronização concluída com sucesso');
    message.success('Dados sincronizados com sucesso!');
  });

  offlineSyncManager.on('requestSynced', (data) => {
    console.log('[PWA] Requisição sincronizada:', data.tag);
  });

  offlineSyncManager.on('photoSynced', (data) => {
    console.log('[PWA] Foto sincronizada:', data.photoId);
  });

  offlineSyncManager.on('chatSynced', (data) => {
    console.log('[PWA] Mensagem sincronizada:', data.chatId);
  });

  offlineSyncManager.on('error', (data) => {
    console.error('[PWA] Erro na sincronização:', data);
    message.error('Erro ao sincronizar dados');
  });

  offlineSyncManager.on('requestError', (data) => {
    console.warn('[PWA] Erro em requisição:', data);
  });

  offlineSyncManager.on('photoError', (data) => {
    console.warn('[PWA] Erro ao sincronizar foto:', data);
  });

  offlineSyncManager.on('chatError', (data) => {
    console.warn('[PWA] Erro ao sincronizar chat:', data);
  });
}

function setupOnlineHandler() {
  const handleOnline = () => {
    console.log('[PWA] Evento online disparado');
    setTimeout(() => {
      offlineSyncManager.syncAll();
    }, 1000);
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}

/**
 * USAGE NO APP.JSX:
 *
 * import { usePWASetup } from '@/hooks/usePWASetup';
 *
 * function App() {
 *   usePWASetup();
 *
 *   return (
 *     <>
 *       <YourAppContent />
 *       <OfflineIndicator />
 *     </>
 *   );
 * }
 */

/**
 * ALTERNATIVA: Setup direto em main.jsx
 *
 * Coloque este código após ReactDOM.createRoot:
 */

export async function setupPWADirect() {
  // Inicializar OfflineSyncManager
  await offlineSyncManager.init();

  // Auto-sync a cada 30 segundos
  offlineSyncManager.startAutoSync(30000);

  // Sincronizar quando volta online
  window.addEventListener('online', () => {
    console.log('[PWA] Voltou online!');
    offlineSyncManager.syncAll();
  });

  console.log('[PWA] Sistema offline configurado e ativo');
}

// Chame em main.jsx:
// setupPWADirect();

/**
 * INTERCEPTOR AXIOS (opcional)
 *
 * Para integrar com axios, use isto:
 */

import axios from 'axios';
import { useSyncQueue } from '@/hooks/useSyncQueue';

export function setupAxiosOfflineInterceptor() {
  const { addToQueue, syncQueue } = useSyncQueue();

  const apiInstance = axios.create();

  apiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;

      // Se offline e é POST/PUT
      if (
        !navigator.onLine &&
        config &&
        (config.method === 'post' || config.method === 'put')
      ) {
        console.log('[Offline] Enfileirando requisição:', config.url);

        // Enfileirar
        await addToQueue(
          config.method.toUpperCase(),
          config.url,
          typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
          config.headers
        );

        // Retornar resposta simulada
        return Promise.resolve({
          status: 202,
          data: {
            queued: true,
            message: 'Requisição enfileirada para sincronização offline'
          }
        });
      }

      return Promise.reject(error);
    }
  );

  return apiInstance;
}

/**
 * SERVICE WORKER LIFECYCLE EVENTS
 *
 * Monitorar atualizações do SW:
 */

export function setupSWLifecycleEvents() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Novo Service Worker ativado');
      window.location.reload();
    });

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            console.log('[PWA] Atualização disponível!');
            message.info('Versão atualizada disponível. Recarregando...');
            setTimeout(() => window.location.reload(), 2000);
          }
        });
      });
    });
  }
}

/**
 * INSTALAÇÃO COMPLETA
 *
 * 1. No seu main.jsx, após ReactDOM.render:
 */

/*
import { setupPWADirect, setupSWLifecycleEvents } from '@/config/pwaSetup';

setupPWADirect();
setupSWLifecycleEvents();
*/

/**
 * 2. No seu App.jsx:
 */

/*
import { usePWASetup } from '@/hooks/usePWASetup';
import { OfflineIndicator } from '@/components/OfflineIndicator';

function App() {
  usePWASetup();

  return (
    <>
      <Router>
        {/* Seu conteúdo */}
      </Router>
      <OfflineIndicator />
    </>
  );
}
*/

/**
 * 3. Instalação de ícones
 *
 * Copie seus ícones para public/icons/:
 * - icon-72x72.svg
 * - icon-96x96.svg
 * - icon-128x128.svg
 * - icon-144x144.svg
 * - icon-152x152.svg
 * - icon-192x192.svg (obrigatório)
 * - icon-384x384.svg
 * - icon-512x512.svg (obrigatório)
 *
 * E versões PNG se necessário:
 * - icon-192x192.png
 * - icon-512x512.png
 */

/**
 * 4. Teste local:
 *
 * - npm run build
 * - Abra DevTools (F12)
 * - Application > Service Workers
 * - Marque "Offline" para testar offline
 * - IndexedDB para ver fila de sincronização
 * - Network tab para ver requisições em cache
 */
