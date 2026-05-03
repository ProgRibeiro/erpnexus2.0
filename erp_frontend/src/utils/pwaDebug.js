/**
 * PWA Debug Utilities
 * Ferramentas para debug e testes de PWA offline
 */

export const PWADebug = {
  /**
   * Mostrar status atual do PWA
   */
  async getStatus() {
    const status = {
      online: navigator.onLine,
      serviceWorker: null,
      cache: {},
      indexedDB: {},
      localStorage: {}
    };

    // Service Worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistrations();
      status.serviceWorker = {
        registered: registration.length > 0,
        count: registration.length,
        active: registration.some(r => r.active)
      };
    }

    // Cache Storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      status.cache = {
        caches: cacheNames,
        count: cacheNames.length
      };
    }

    // IndexedDB
    status.indexedDB = await PWADebug.getIndexedDBStats();

    // LocalStorage
    status.localStorage = {
      items: localStorage.length,
      offline_photos: JSON.parse(localStorage.getItem('erp_offline_photos') || '[]').length,
      pending_syncs: JSON.parse(localStorage.getItem('erp_pending_syncs') || '[]').length
    };

    return status;
  },

  /**
   * Mostrar estatísticas de IndexedDB
   */
  async getIndexedDBStats() {
    const stats = {};

    for (const dbName of ['ERPOfflineQueue', 'ERPPhotosDB']) {
      try {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        stats[dbName] = {};

        for (const storeName of ['requests', 'photos', 'chats']) {
          try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            const count = await new Promise((resolve) => {
              const req = store.count();
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => resolve(0);
            });

            if (count > 0) {
              stats[dbName][storeName] = count;
            }
          } catch (e) {
            // Store não existe
          }
        }

        db.close();
      } catch (error) {
        console.log(`DB ${dbName} não existe:`, error);
      }
    }

    return stats;
  },

  /**
   * Mostrar todas as requisições na fila
   */
  async getAllQueuedRequests() {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('ERPOfflineQueue');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');

      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          db.close();
          resolve(req.result || []);
        };
        req.onerror = () => {
          db.close();
          resolve([]);
        };
      });
    } catch (error) {
      console.error('Erro ao buscar fila:', error);
      return [];
    }
  },

  /**
   * Mostrar todas as fotos offline
   */
  async getAllOfflinePhotos() {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('ERPPhotosDB');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const transaction = db.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');

      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          db.close();
          resolve(req.result || []);
        };
        req.onerror = () => {
          db.close();
          resolve([]);
        };
      });
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      return [];
    }
  },

  /**
   * Limpar tudo (cache, IndexedDB, localStorage)
   */
  async clearAll() {
    console.log('[PWADebug] Limpando tudo...');

    // Limpar localStorage
    localStorage.removeItem('erp_offline_photos');
    localStorage.removeItem('erp_pending_syncs');

    // Limpar caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }

    // Limpar IndexedDB
    for (const dbName of ['ERPOfflineQueue', 'ERPPhotosDB']) {
      try {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        for (const storeName of ['requests', 'photos', 'chats']) {
          try {
            const transaction = db.transaction([storeName], 'readwrite');
            transaction.objectStore(storeName).clear();
          } catch (e) {}
        }

        db.close();
      } catch (e) {}
    }

    // Unregister Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    console.log('[PWADebug] Tudo limpado!');
  },

  /**
   * Simular offline
   */
  simulateOffline() {
    console.log('[PWADebug] Simulando offline...');

    // Disparar evento offline
    const event = new Event('offline');
    window.dispatchEvent(event);

    // Desconectar rede (não funciona em navegador, apenas notifica)
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true
    });
  },

  /**
   * Simular online
   */
  simulateOnline() {
    console.log('[PWADebug] Simulando online...');

    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true
    });

    const event = new Event('online');
    window.dispatchEvent(event);
  },

  /**
   * Mostrar informações detalhadas no console
   */
  async printStatus() {
    const status = await PWADebug.getStatus();
    console.group('[PWA Status]');
    console.log('Online:', status.online);
    console.log('Service Worker:', status.serviceWorker);
    console.log('Cache Storage:', status.cache);
    console.log('IndexedDB:', status.indexedDB);
    console.log('LocalStorage:', status.localStorage);
    console.groupEnd();
  },

  /**
   * Listar todas as requisições na fila
   */
  async printQueuedRequests() {
    const requests = await PWADebug.getAllQueuedRequests();
    console.group('[Requisições na Fila]');
    console.table(requests);
    console.groupEnd();
  },

  /**
   * Listar todas as fotos offline
   */
  async printOfflinePhotos() {
    const photos = await PWADebug.getAllOfflinePhotos();
    console.group('[Fotos Offline]');
    console.table(photos.map(p => ({
      id: p.id,
      name: p.name,
      synced: p.synced,
      timestamp: new Date(p.timestamp).toLocaleString('pt-BR')
    })));
    console.groupEnd();
  },

  /**
   * Testar sincronização manual
   */
  async testSync() {
    console.log('[PWADebug] Iniciando sincronização de teste...');

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'SYNC_NOW' });
      registration.active?.postMessage({ type: 'SYNC_PHOTOS' });
      registration.active?.postMessage({ type: 'SYNC_CHATS' });

      console.log('[PWADebug] Sincronização iniciada');
    }
  },

  /**
   * Forçar atualização do Service Worker
   */
  async forceUpdateSW() {
    console.log('[PWADebug] Forçando atualização do SW...');

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.unregister();

      // Re-registrar
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js');
      }, 500);

      console.log('[PWADebug] SW re-registrado');
    }
  }
};

/**
 * COMO USAR NO CONSOLE DO NAVEGADOR:
 *
 * 1. Ver status:
 *    PWADebug.printStatus()
 *
 * 2. Ver requisições enfileiradas:
 *    PWADebug.printQueuedRequests()
 *
 * 3. Ver fotos offline:
 *    PWADebug.printOfflinePhotos()
 *
 * 4. Simular offline:
 *    PWADebug.simulateOffline()
 *
 * 5. Simular online:
 *    PWADebug.simulateOnline()
 *
 * 6. Sincronizar manualmente:
 *    PWADebug.testSync()
 *
 * 7. Limpar tudo:
 *    PWADebug.clearAll()
 *
 * 8. Ver estatísticas:
 *    await PWADebug.getStatus()
 *
 * 9. Forçar atualização do SW:
 *    PWADebug.forceUpdateSW()
 */

// Expor globalmente para debug
if (process.env.NODE_ENV === 'development') {
  window.PWADebug = PWADebug;
  console.log('[PWA] Debug tools disponíveis em window.PWADebug');
}

export default PWADebug;
