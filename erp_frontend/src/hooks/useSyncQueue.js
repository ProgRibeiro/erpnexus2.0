import { useEffect, useState, useCallback } from 'react';

export function useSyncQueue() {
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncErrors, setSyncErrors] = useState([]);

  const openDB = useCallback(() => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ERPOfflineQueue', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('requests')) {
          const store = db.createObjectStore('requests', { keyPath: 'tag' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('url', 'url', { unique: false });
        }
      };
    });
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const items = request.result || [];
          setQueue(items);
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[useSyncQueue] Erro ao carregar fila:', error);
      setQueue([]);
      return [];
    }
  }, [openDB]);

  const addToQueue = useCallback(
    async (method, url, body = null, headers = {}) => {
      try {
        const db = await openDB();
        const tag = `sync-${method}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const requestData = {
          tag,
          method,
          url,
          body,
          headers,
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3
        };

        const transaction = db.transaction(['requests'], 'readwrite');
        const store = transaction.objectStore('requests');

        return new Promise((resolve, reject) => {
          const req = store.add(requestData);
          req.onsuccess = () => {
            setQueue((prev) => [...prev, requestData]);
            resolve(tag);
          };
          req.onerror = () => reject(req.error);
        });
      } catch (error) {
        console.error('[useSyncQueue] Erro ao adicionar à fila:', error);
        throw error;
      }
    },
    [openDB]
  );

  const removeFromQueue = useCallback(async (tag) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');

      return new Promise((resolve, reject) => {
        const req = store.delete(tag);
        req.onsuccess = () => {
          setQueue((prev) => prev.filter((item) => item.tag !== tag));
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch (error) {
      console.error('[useSyncQueue] Erro ao remover da fila:', error);
      throw error;
    }
  }, [openDB]);

  const updateQueueItem = useCallback(async (tag, updates) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');

      const item = await new Promise((resolve, reject) => {
        const req = store.get(tag);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (item) {
        const updated = { ...item, ...updates };
        await new Promise((resolve, reject) => {
          const req = store.put(updated);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });

        setQueue((prev) =>
          prev.map((item) => (item.tag === tag ? updated : item))
        );
      }
    } catch (error) {
      console.error('[useSyncQueue] Erro ao atualizar item da fila:', error);
    }
  }, [openDB]);

  const syncQueue = useCallback(async (onProgress) => {
    if (syncing || queue.length === 0) return;

    setSyncing(true);
    const errors = [];

    try {
      for (const item of queue) {
        try {
          onProgress?.({
            current: queue.indexOf(item),
            total: queue.length,
            item
          });

          const headers = new Headers(item.headers);
          const options = {
            method: item.method,
            headers
          };

          if (item.body) {
            options.body = typeof item.body === 'string' ? item.body : JSON.stringify(item.body);
          }

          const response = await fetch(item.url, options);

          if (response.ok) {
            await removeFromQueue(item.tag);
          } else if (response.status >= 400 && response.status < 500) {
            await removeFromQueue(item.tag);
            errors.push({
              tag: item.tag,
              url: item.url,
              status: response.status,
              message: `Erro do cliente: ${response.status}`
            });
          } else {
            item.retries = (item.retries || 0) + 1;
            if (item.retries < item.maxRetries) {
              await updateQueueItem(item.tag, { retries: item.retries });
            } else {
              await removeFromQueue(item.tag);
              errors.push({
                tag: item.tag,
                url: item.url,
                message: 'Máximo de tentativas excedido'
              });
            }
          }
        } catch (error) {
          console.error('[useSyncQueue] Erro ao sincronizar item:', error);

          item.retries = (item.retries || 0) + 1;
          if (item.retries < item.maxRetries) {
            await updateQueueItem(item.tag, { retries: item.retries });
          } else {
            await removeFromQueue(item.tag);
            errors.push({
              tag: item.tag,
              url: item.url,
              message: error.message
            });
          }
        }
      }
    } finally {
      setSyncing(false);
      setLastSync(new Date());
      setSyncErrors(errors);

      await loadQueue();
    }
  }, [queue, syncing, removeFromQueue, updateQueueItem, loadQueue]);

  const clearQueue = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readwrite');
      transaction.objectStore('requests').clear();

      setQueue([]);
      setSyncErrors([]);
    } catch (error) {
      console.error('[useSyncQueue] Erro ao limpar fila:', error);
    }
  }, [openDB]);

  const getQueueStats = useCallback(() => {
    return {
      total: queue.length,
      pending: queue.filter((item) => (item.retries || 0) < (item.maxRetries || 3)).length,
      failed: queue.filter((item) => (item.retries || 0) >= (item.maxRetries || 3)).length,
      errors: syncErrors.length
    };
  }, [queue, syncErrors]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return {
    queue,
    syncing,
    lastSync,
    syncErrors,
    addToQueue,
    removeFromQueue,
    updateQueueItem,
    syncQueue,
    clearQueue,
    loadQueue,
    getQueueStats
  };
}
