import { useEffect, useState, useCallback } from 'react';

const DB_NAME = 'erp_tecnico_mobile';
const DB_VERSION = 1;
const STORES = {
  FOTOS: 'offline_fotos',
  SYNC_QUEUE: 'sync_queue',
  OS_CACHE: 'os_cache'
};

export function useIndexedDB() {
  const [db, setDb] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Inicializar IndexedDB
  useEffect(() => {
    const initDB = async () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('IndexedDB error:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          const database = request.result;
          setDb(database);
          setIsReady(true);
          resolve(database);
        };

        request.onupgradeneeded = (event) => {
          const database = event.target.result;

          // Store para fotos offline
          if (!database.objectStoreNames.contains(STORES.FOTOS)) {
            const fotoStore = database.createObjectStore(STORES.FOTOS, { keyPath: 'id', autoIncrement: true });
            fotoStore.createIndex('osId', 'osId', { unique: false });
            fotoStore.createIndex('synced', 'synced', { unique: false });
            fotoStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Store para fila de sincronização
          if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
            const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
            syncStore.createIndex('osId', 'osId', { unique: false });
            syncStore.createIndex('synced', 'synced', { unique: false });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Store para cache de OS
          if (!database.objectStoreNames.contains(STORES.OS_CACHE)) {
            const cacheStore = database.createObjectStore(STORES.OS_CACHE, { keyPath: 'id' });
            cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    };

    initDB().catch(error => console.error('Falha ao inicializar IndexedDB:', error));
  }, []);

  // Salvar foto offline
  const saveFotoOffline = useCallback(async (osId, fotoData, tipo) => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FOTOS], 'readwrite');
      const store = transaction.objectStore(STORES.FOTOS);

      const foto = {
        osId,
        data: fotoData,
        tipo,
        timestamp: Date.now(),
        synced: false
      };

      const request = store.add(foto);

      request.onsuccess = () => {
        console.log('Foto salva offline:', request.result);
        resolve({
          id: request.result,
          ...foto
        });
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Obter fotos offline de uma OS
  const getOffllineFotos = useCallback(async (osId) => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FOTOS], 'readonly');
      const store = transaction.objectStore(STORES.FOTOS);
      const index = store.index('osId');

      const request = index.getAll(osId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Obter fotos não sincronizadas
  const getUnsyncedFotos = useCallback(async (osId) => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FOTOS], 'readonly');
      const store = transaction.objectStore(STORES.FOTOS);
      const index = store.index('osId');

      const request = index.getAll(osId);

      request.onsuccess = () => {
        const fotos = request.result || [];
        resolve(fotos.filter(f => !f.synced));
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Marcar foto como sincronizada
  const markFotoAsSynced = useCallback(async (fotoId) => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FOTOS], 'readwrite');
      const store = transaction.objectStore(STORES.FOTOS);

      const request = store.get(fotoId);

      request.onsuccess = () => {
        const foto = request.result;
        if (foto) {
          foto.synced = true;
          store.put(foto);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Adicionar à fila de sincronização
  const addToSyncQueue = useCallback(async (osId, action, data) => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);

      const syncItem = {
        osId,
        action,
        data,
        timestamp: Date.now(),
        synced: false,
        retries: 0
      };

      const request = store.add(syncItem);

      request.onsuccess = () => {
        resolve({
          id: request.result,
          ...syncItem
        });
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Obter itens não sincronizados
  const getUnsyncedItems = useCallback(async () => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('synced');

      const request = index.getAll(false);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Marcar item como sincronizado
  const markItemAsSynced = useCallback(async (itemId) => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);

      const request = store.get(itemId);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.synced = true;
          store.put(item);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Limpar fotos sincronizadas
  const clearSyncedFotos = useCallback(async () => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FOTOS], 'readwrite');
      const store = transaction.objectStore(STORES.FOTOS);
      const index = store.index('synced');

      const request = index.openCursor(true); // true = sincronizadas

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Salvar cache de OS
  const cacheOS = useCallback(async (osData) => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.OS_CACHE], 'readwrite');
      const store = transaction.objectStore(STORES.OS_CACHE);

      const cacheItem = {
        id: osData.id,
        ...osData,
        timestamp: Date.now()
      };

      const request = store.put(cacheItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Obter OS do cache
  const getCachedOS = useCallback(async (osId) => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.OS_CACHE], 'readonly');
      const store = transaction.objectStore(STORES.OS_CACHE);

      const request = store.get(osId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }, [db]);

  // Limpar dados antigos (>30 dias)
  const clearOldData = useCallback(async () => {
    if (!db) return;

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const transaction = db.transaction([STORES.FOTOS, STORES.SYNC_QUEUE, STORES.OS_CACHE], 'readwrite');

    // Limpar fotos antigas
    const fotoStore = transaction.objectStore(STORES.FOTOS);
    const fotoIndex = fotoStore.index('timestamp');
    const fotoRange = IDBKeyRange.upperBound(thirtyDaysAgo);
    fotoIndex.openCursor(fotoRange).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Limpar sync queue antiga
    const syncStore = transaction.objectStore(STORES.SYNC_QUEUE);
    const syncIndex = syncStore.index('timestamp');
    const syncRange = IDBKeyRange.upperBound(thirtyDaysAgo);
    syncIndex.openCursor(syncRange).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Limpar cache antigo
    const cacheStore = transaction.objectStore(STORES.OS_CACHE);
    const cacheIndex = cacheStore.index('timestamp');
    const cacheRange = IDBKeyRange.upperBound(thirtyDaysAgo);
    cacheIndex.openCursor(cacheRange).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }, [db]);

  return {
    isReady,
    db,
    saveFotoOffline,
    getOffllineFotos,
    getUnsyncedFotos,
    markFotoAsSynced,
    addToSyncQueue,
    getUnsyncedItems,
    markItemAsSynced,
    clearSyncedFotos,
    cacheOS,
    getCachedOS,
    clearOldData
  };
}
