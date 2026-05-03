const CACHE_NAME = 'erp-cache-v2';
const API_CACHE = 'erp-api-v2';
const IMAGE_CACHE = 'erp-images-v2';
const OFFLINE_QUEUE_DB = 'ERPOfflineQueue';
const PHOTOS_DB = 'ERPPhotosDB';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

const API_ENDPOINTS_CACHEABLE = [
  '/api/dashboard',
  '/api/usuarios',
  '/api/empresas',
  '/api/categorias'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('[SW] Alguns assets não puderam ser cacheados:', error);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          const isCurrentCache = [CACHE_NAME, API_CACHE, IMAGE_CACHE].includes(cacheName);
          if (!isCurrentCache) {
            console.log(`[SW] Deletando cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstNavigationStrategy(request));
    } else if (isImageRequest(url)) {
      event.respondWith(cacheFirstImageStrategy(request));
    } else if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirstApiStrategy(request));
    } else {
      event.respondWith(cacheFirstStrategy(request));
    }
  } else if (request.method === 'POST' || request.method === 'PUT') {
    event.respondWith(offlineQueueStrategy(request));
  }
});

async function networkFirstNavigationStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('Falha ao carregar navegação');
  } catch (error) {
    console.log('[SW] Fallback de navegação por cache:', error);
    const cachedRequest = await caches.match(request);
    if (cachedRequest) {
      return cachedRequest;
    }

    const fallbackIndex =
      (await caches.match('/index.html')) ||
      (await caches.match('/static/index.html')) ||
      (await caches.match('/'));

    if (fallbackIndex) {
      return fallbackIndex;
    }

    return new Response('Offline - Página não disponível', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname);
}

function isApiEndpointCacheable(pathname) {
  return API_ENDPOINTS_CACHEABLE.some(endpoint => pathname.startsWith(endpoint));
}

async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Cache hit:', request.url);
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache first error:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Offline - Recurso não disponível', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function cacheFirstImageStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Erro ao buscar imagem:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response('', { status: 404 });
  }
}

async function networkFirstApiStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      if (isApiEndpointCacheable(new URL(request.url).pathname)) {
        const cache = await caches.open(API_CACHE);
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    console.log('[SW] Erro de rede na API:', error);

    if (isApiEndpointCacheable(new URL(request.url).pathname)) {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
    }

    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function offlineQueueStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      return response;
    }
  } catch (error) {
    console.log('[SW] Erro ao enviar requisição, enfileirando...', error);
  }

  if (request.method === 'POST' && request.url.includes('/api/')) {
    const syncTag = generateSyncTag(request);
    await queueRequest(syncTag, request);

    return new Response(JSON.stringify({
      queued: true,
      message: 'Requisição enfileirada para sincronização'
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

function generateSyncTag(request) {
  return `sync-${request.method}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function queueRequest(tag, request) {
  try {
    const db = await openIndexedDB(OFFLINE_QUEUE_DB);

    const clonedRequest = request.clone();
    const body = await clonedRequest.text();

    const requestData = {
      tag,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
      body: body || null,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    };

    await saveToIndexedDB(db, 'requests', requestData);

    if ('sync' in self.registration) {
      try {
        await self.registration.sync.register(tag);
        console.log('[SW] Background sync registered:', tag);
      } catch (err) {
        console.log('[SW] Background sync não suportado, tentaremos na próxima sincronização:', err);
      }
    }
  } catch (error) {
    console.log('[SW] Erro ao enfileirar requisição:', error);
  }
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
        store.createIndex('url', 'url', { unique: false });
      }

      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('synced', 'synced', { unique: false });
        photoStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('chats')) {
        const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatStore.createIndex('synced', 'synced', { unique: false });
        chatStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

function saveToIndexedDB(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getFromIndexedDB(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
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

function deleteFromIndexedDB(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-')) {
    console.log('[SW] Background sync event:', event.tag);
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
  console.log('[SW] Iniciando sincronização de requisições enfileiradas...');

  try {
    const db = await openIndexedDB(OFFLINE_QUEUE_DB);
    const requests = await getAllFromIndexedDB(db, 'requests');

    console.log(`[SW] Encontradas ${requests.length} requisições para sincronizar`);

    for (const requestData of requests) {
      try {
        const headers = new Headers(requestData.headers);
        const fetchOptions = {
          method: requestData.method,
          headers,
          body: requestData.body
        };

        console.log(`[SW] Sincronizando: ${requestData.method} ${requestData.url}`);
        const response = await fetch(requestData.url, fetchOptions);

        if (response.ok) {
          console.log('[SW] Sincronização sucesso:', requestData.tag);
          await deleteFromIndexedDB(db, 'requests', requestData.tag);

          await broadcastToClients({
            type: 'SYNC_SUCCESS',
            tag: requestData.tag,
            url: requestData.url
          });
        } else if (response.status >= 400 && response.status < 500) {
          console.log('[SW] Erro do cliente, removendo requisição:', requestData.tag);
          await deleteFromIndexedDB(db, 'requests', requestData.tag);

          await broadcastToClients({
            type: 'SYNC_ERROR',
            tag: requestData.tag,
            error: `Erro ${response.status}`
          });
        } else {
          requestData.retries = (requestData.retries || 0) + 1;
          if (requestData.retries < requestData.maxRetries) {
            await saveToIndexedDB(db, 'requests', requestData);
            console.log('[SW] Requisição será tentada novamente:', requestData.tag);
          } else {
            await deleteFromIndexedDB(db, 'requests', requestData.tag);
            console.log('[SW] Máximo de tentativas atingido:', requestData.tag);
          }
        }
      } catch (error) {
        console.log('[SW] Erro ao sincronizar requisição:', error);
        requestData.retries = (requestData.retries || 0) + 1;
        if (requestData.retries < requestData.maxRetries) {
          await saveToIndexedDB(db, 'requests', requestData);
        } else {
          await deleteFromIndexedDB(db, 'requests', requestData.tag);
        }
      }
    }
  } catch (error) {
    console.log('[SW] Erro ao sincronizar fila:', error);
  }
}

async function syncPhotos() {
  console.log('[SW] Sincronizando fotos...');

  try {
    const db = await openIndexedDB(PHOTOS_DB);
    const photos = await getAllFromIndexedDB(db, 'photos');
    const unsyncedPhotos = photos.filter(p => !p.synced);

    for (const photo of unsyncedPhotos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.blob, photo.name);
        formData.append('metadata', JSON.stringify(photo.metadata));

        const response = await fetch('/api/upload/foto', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          photo.synced = true;
          photo.syncedAt = Date.now();
          await saveToIndexedDB(db, 'photos', photo);

          await broadcastToClients({
            type: 'PHOTO_SYNCED',
            photoId: photo.id
          });
        }
      } catch (error) {
        console.log('[SW] Erro ao sincronizar foto:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Erro ao sincronizar fotos:', error);
  }
}

async function syncChats() {
  console.log('[SW] Sincronizando mensagens de chat...');

  try {
    const db = await openIndexedDB(OFFLINE_QUEUE_DB);
    const chats = await getAllFromIndexedDB(db, 'chats');
    const unsyncedChats = chats.filter(c => !c.synced);

    for (const chat of unsyncedChats) {
      try {
        const response = await fetch('/api/chats/mensagens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chat.data)
        });

        if (response.ok) {
          chat.synced = true;
          chat.syncedAt = Date.now();
          await saveToIndexedDB(db, 'chats', chat);

          await broadcastToClients({
            type: 'CHAT_SYNCED',
            chatId: chat.id
          });
        }
      } catch (error) {
        console.log('[SW] Erro ao sincronizar chat:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Erro ao sincronizar chats:', error);
  }
}

async function broadcastToClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'SYNC_NOW') {
    event.waitUntil(syncQueuedRequests());
  } else if (type === 'SYNC_PHOTOS') {
    event.waitUntil(syncPhotos());
  } else if (type === 'SYNC_CHATS') {
    event.waitUntil(syncChats());
  } else if (type === 'QUEUE_PHOTO') {
    event.waitUntil(queuePhoto(data));
  } else if (type === 'QUEUE_CHAT') {
    event.waitUntil(queueChat(data));
  }
});

async function queuePhoto(photoData) {
  try {
    const db = await openIndexedDB(PHOTOS_DB);
    const photo = {
      id: `photo-${Date.now()}`,
      name: photoData.name,
      blob: photoData.blob,
      metadata: photoData.metadata || {},
      synced: false,
      timestamp: Date.now()
    };

    await saveToIndexedDB(db, 'photos', photo);

    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-photos');
    }
  } catch (error) {
    console.log('[SW] Erro ao enfileirar foto:', error);
  }
}

async function queueChat(chatData) {
  try {
    const db = await openIndexedDB(OFFLINE_QUEUE_DB);
    const chat = {
      id: `chat-${Date.now()}`,
      data: chatData,
      synced: false,
      timestamp: Date.now()
    };

    await saveToIndexedDB(db, 'chats', chat);

    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-chats');
    }
  } catch (error) {
    console.log('[SW] Erro ao enfileirar chat:', error);
  }
}
