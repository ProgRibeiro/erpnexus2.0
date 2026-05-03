export class OfflineSyncManager {
  constructor() {
    this.db = null;
    this.sw = null;
    this.syncInterval = null;
    this.listeners = new Map();
  }

  async init() {
    if ('serviceWorker' in navigator) {
      this.sw = await navigator.serviceWorker.ready;
      console.log('[OfflineSyncManager] Iniciado');
    }
    this.startAutoSync();
  }

  startAutoSync(interval = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = setInterval(async () => {
      if (!navigator.onLine) return;

      console.log('[OfflineSyncManager] Auto-sincronização...');
      await this.syncAll();
    }, interval);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncAll() {
    if (!navigator.onLine) {
      this.emit('error', { message: 'Dispositivo offline' });
      return;
    }

    try {
      this.emit('syncStart');

      await this.syncRequests();
      await this.syncPhotos();
      await this.syncChats();

      this.emit('syncComplete');
    } catch (error) {
      this.emit('error', { error });
    }
  }

  async syncRequests() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');

      const requests = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      console.log(`[OfflineSyncManager] Sincronizando ${requests.length} requisições`);

      for (const item of requests) {
        try {
          const headers = new Headers(item.headers || {});
          const options = {
            method: item.method,
            headers
          };

          if (item.body) {
            options.body = item.body;
          }

          const response = await fetch(item.url, options);

          if (response.ok) {
            await this.removeRequest(item.tag);
            this.emit('requestSynced', { tag: item.tag, status: 'success' });
          } else if (response.status >= 400 && response.status < 500) {
            await this.removeRequest(item.tag);
            this.emit('requestError', {
              tag: item.tag,
              status: response.status
            });
          }
        } catch (error) {
          console.error('[OfflineSyncManager] Erro ao sincronizar requisição:', error);
          this.emit('requestError', { tag: item.tag, error });
        }
      }
    } catch (error) {
      console.error('[OfflineSyncManager] Erro ao sincronizar requisições:', error);
      this.emit('error', { error });
    }
  }

  async syncPhotos() {
    try {
      const db = await this.openDB('ERPPhotosDB');
      const transaction = db.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');

      const photos = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const unsynced = photos.filter((p) => !p.synced);
      console.log(`[OfflineSyncManager] Sincronizando ${unsynced.length} fotos`);

      for (const photo of unsynced) {
        try {
          const formData = new FormData();
          if (photo.blob) {
            formData.append('file', photo.blob, photo.name);
          } else if (photo.data) {
            formData.append('file', photo.data, photo.name);
          }
          formData.append('metadata', JSON.stringify(photo.metadata || {}));

          const response = await fetch('/api/upload/foto', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            await this.markPhotoSynced(photo.id);
            this.emit('photoSynced', { photoId: photo.id });
          }
        } catch (error) {
          console.error('[OfflineSyncManager] Erro ao sincronizar foto:', error);
          this.emit('photoError', { photoId: photo.id, error });
        }
      }
    } catch (error) {
      console.error('[OfflineSyncManager] Erro ao sincronizar fotos:', error);
    }
  }

  async syncChats() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');

      const chats = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const unsynced = chats.filter((c) => !c.synced);
      console.log(`[OfflineSyncManager] Sincronizando ${unsynced.length} mensagens`);

      for (const chat of unsynced) {
        try {
          const response = await fetch('/api/chats/mensagens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chat.data)
          });

          if (response.ok) {
            await this.markChatSynced(chat.id);
            this.emit('chatSynced', { chatId: chat.id });
          }
        } catch (error) {
          console.error('[OfflineSyncManager] Erro ao sincronizar chat:', error);
          this.emit('chatError', { chatId: chat.id, error });
        }
      }
    } catch (error) {
      console.error('[OfflineSyncManager] Erro ao sincronizar chats:', error);
    }
  }

  async openDB(dbName = 'ERPOfflineQueue') {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('requests')) {
          db.createObjectStore('requests', { keyPath: 'tag' });
        }
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }
      };
    });
  }

  async removeRequest(tag) {
    const db = await this.openDB();
    const transaction = db.transaction(['requests'], 'readwrite');
    transaction.objectStore('requests').delete(tag);
  }

  async markPhotoSynced(photoId) {
    const db = await this.openDB('ERPPhotosDB');
    const transaction = db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');

    return new Promise((resolve, reject) => {
      const getReq = store.get(photoId);
      getReq.onsuccess = () => {
        const photo = getReq.result;
        if (photo) {
          photo.synced = true;
          photo.syncedAt = Date.now();
          const putReq = store.put(photo);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async markChatSynced(chatId) {
    const db = await this.openDB();
    const transaction = db.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');

    return new Promise((resolve, reject) => {
      const getReq = store.get(chatId);
      getReq.onsuccess = () => {
        const chat = getReq.result;
        if (chat) {
          chat.synced = true;
          chat.syncedAt = Date.now();
          const putReq = store.put(chat);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[OfflineSyncManager] Erro no listener de "${event}":`, error);
        }
      });
    }
  }

  destroy() {
    this.stopAutoSync();
    this.listeners.clear();
  }
}

export const offlineSyncManager = new OfflineSyncManager();
