import { useEffect, useState, useCallback, useRef } from 'react';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unsyncedPhotos, setUnsyncedPhotos] = useState([]);
  const [unsyncedChats, setUnsyncedChats] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');
  const swRef = useRef(null);

  useEffect(() => {
    const handleOnline = async () => {
      console.log('[useOffline] Voltou online');
      setIsOffline(false);
      await triggerSync();
    };

    const handleOffline = () => {
      console.log('[useOffline] Ficou offline');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        swRef.current = registration;
        console.log('[useOffline] Service Worker pronto');

        const messageHandler = (event) => {
          const { type, photoId, chatId, tag } = event.data;

          if (type === 'SYNC_SUCCESS') {
            console.log('[useOffline] Sincronização bem-sucedida:', tag);
            setSyncStatus('idle');
            updatePendingRequests();
          } else if (type === 'SYNC_ERROR') {
            console.log('[useOffline] Erro na sincronização:', tag);
            setSyncStatus('error');
          } else if (type === 'PHOTO_SYNCED') {
            console.log('[useOffline] Foto sincronizada:', photoId);
            updateUnsyncedPhotos();
          } else if (type === 'CHAT_SYNCED') {
            console.log('[useOffline] Chat sincronizado:', chatId);
            updateUnsyncedChats();
          }
        };

        navigator.serviceWorker.controller?.postMessage({ type: 'INIT' });
        navigator.serviceWorker.addEventListener('message', messageHandler);

        return () => {
          navigator.serviceWorker.removeEventListener('message', messageHandler);
        };
      });
    }
  }, []);

  const updatePendingRequests = useCallback(async () => {
    try {
      const db = await openIndexedDB('ERPOfflineQueue');
      const requests = await getAllFromIndexedDB(db, 'requests');
      setPendingRequests(requests || []);
    } catch (error) {
      console.log('[useOffline] Erro ao atualizar requisições pendentes:', error);
    }
  }, []);

  const updateUnsyncedPhotos = useCallback(async () => {
    try {
      const db = await openIndexedDB('ERPPhotosDB');
      const photos = await getAllFromIndexedDB(db, 'photos');
      const unsynced = photos?.filter(p => !p.synced) || [];
      setUnsyncedPhotos(unsynced);
    } catch (error) {
      console.log('[useOffline] Erro ao atualizar fotos não sincronizadas:', error);
    }
  }, []);

  const updateUnsyncedChats = useCallback(async () => {
    try {
      const db = await openIndexedDB('ERPOfflineQueue');
      const chats = await getAllFromIndexedDB(db, 'chats');
      const unsynced = chats?.filter(c => !c.synced) || [];
      setUnsyncedChats(unsynced);
    } catch (error) {
      console.log('[useOffline] Erro ao atualizar chats não sincronizados:', error);
    }
  }, []);

  const getOfflinePhotos = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('erp_offline_photos')) || [];
    } catch {
      return [];
    }
  }, []);

  const savePhotoOffline = useCallback(async (photoData, metadata = {}) => {
    const photo = {
      id: `photo-${Date.now()}`,
      data: photoData,
      timestamp: Date.now(),
      synced: false,
      ...metadata
    };

    const photos = getOfflinePhotos();
    photos.push(photo);
    localStorage.setItem('erp_offline_photos', JSON.stringify(photos));

    if (swRef.current) {
      swRef.current.active?.postMessage({
        type: 'QUEUE_PHOTO',
        data: photo
      });
    }

    await updateUnsyncedPhotos();
    return photo.id;
  }, [getOfflinePhotos, updateUnsyncedPhotos]);

  const markPhotoAsSynced = useCallback((photoId) => {
    const photos = getOfflinePhotos();
    const updated = photos.map(p => p.id === photoId ? { ...p, synced: true } : p);
    localStorage.setItem('erp_offline_photos', JSON.stringify(updated));
    updateUnsyncedPhotos();
  }, [getOfflinePhotos, updateUnsyncedPhotos]);

  const getUnsyncedPhotos = useCallback(() => {
    return getOfflinePhotos().filter(p => !p.synced);
  }, [getOfflinePhotos]);

  const getPendingSyncs = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('erp_pending_syncs')) || [];
    } catch {
      return [];
    }
  }, []);

  const addPendingSync = useCallback((type, data) => {
    const sync = {
      id: `sync-${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };
    const syncs = getPendingSyncs();
    syncs.push(sync);
    localStorage.setItem('erp_pending_syncs', JSON.stringify(syncs));
    return sync.id;
  }, [getPendingSyncs]);

  const removePendingSync = useCallback((syncId) => {
    const syncs = getPendingSyncs();
    const updated = syncs.filter(s => s.id !== syncId);
    localStorage.setItem('erp_pending_syncs', JSON.stringify(updated));
  }, [getPendingSyncs]);

  const queueChatMessage = useCallback(async (chatData) => {
    if (swRef.current) {
      swRef.current.active?.postMessage({
        type: 'QUEUE_CHAT',
        data: chatData
      });
    }
    await updateUnsyncedChats();
  }, [updateUnsyncedChats]);

  const triggerSync = useCallback(async () => {
    if (!swRef.current || isOffline) return;

    setSyncStatus('syncing');
    console.log('[useOffline] Iniciando sincronização manual...');

    try {
      swRef.current.active?.postMessage({ type: 'SYNC_NOW' });
      swRef.current.active?.postMessage({ type: 'SYNC_PHOTOS' });
      swRef.current.active?.postMessage({ type: 'SYNC_CHATS' });

      await updatePendingRequests();
      await updateUnsyncedPhotos();
      await updateUnsyncedChats();

      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.log('[useOffline] Erro ao disparar sincronização:', error);
      setSyncStatus('error');
    }
  }, [isOffline, updatePendingRequests, updateUnsyncedPhotos, updateUnsyncedChats]);

  const forceSync = useCallback(async () => {
    await triggerSync();
  }, [triggerSync]);

  const clearSyncQueue = useCallback(async () => {
    try {
      const db = await openIndexedDB('ERPOfflineQueue');
      const transaction = db.transaction(['requests'], 'readwrite');
      transaction.objectStore('requests').clear();

      setPendingRequests([]);
      console.log('[useOffline] Fila de sincronização limpa');
    } catch (error) {
      console.log('[useOffline] Erro ao limpar fila:', error);
    }
  }, []);

  return {
    isOffline,
    syncStatus,
    pendingRequests,
    unsyncedPhotos,
    unsyncedChats,
    offlinePhotos: getOfflinePhotos(),
    pendingSyncs: getPendingSyncs(),
    savePhotoOffline,
    markPhotoAsSynced,
    getUnsyncedPhotos,
    addPendingSync,
    removePendingSync,
    getPendingSyncs,
    queueChatMessage,
    triggerSync: forceSync,
    clearSyncQueue,
    updatePendingRequests,
    updateUnsyncedPhotos,
    updateUnsyncedChats
  };
}

function openIndexedDB(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'tag' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains('chats')) {
        const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

function getAllFromIndexedDB(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

