import { useEffect, useState } from 'react';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getOfflinePhotos = () => {
    try {
      return JSON.parse(localStorage.getItem('erp_offline_photos')) || [];
    } catch {
      return [];
    }
  };

  const savePhotoOffline = (photoData, metadata = {}) => {
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
    return photo.id;
  };

  const markPhotoAsSynced = (photoId) => {
    const photos = getOfflinePhotos();
    const updated = photos.map(p => p.id === photoId ? { ...p, synced: true } : p);
    localStorage.setItem('erp_offline_photos', JSON.stringify(updated));
  };

  const getUnsyncedPhotos = () => {
    return getOfflinePhotos().filter(p => !p.synced);
  };

  const getPendingSyncs = () => {
    try {
      return JSON.parse(localStorage.getItem('erp_pending_syncs')) || [];
    } catch {
      return [];
    }
  };

  const addPendingSync = (type, data) => {
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
  };

  const removePendingSync = (syncId) => {
    const syncs = getPendingSyncs();
    const updated = syncs.filter(s => s.id !== syncId);
    localStorage.setItem('erp_pending_syncs', JSON.stringify(updated));
  };

  return {
    isOffline,
    offlinePhotos: getOfflinePhotos(),
    pendingSyncs: getPendingSyncs(),
    savePhotoOffline,
    markPhotoAsSynced,
    getUnsyncedPhotos,
    addPendingSync,
    removePendingSync,
    getPendingSyncs
  };
}
