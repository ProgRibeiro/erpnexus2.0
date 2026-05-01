const CACHE_NAME = 'erp-v1';
const API_CACHE = 'erp-api-v1';
const OFFLINE_PHOTOS_STORE = 'erp-offline-photos';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log('Alguns assets não puderam ser cacheados');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
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

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Cache first error:', error);
    return new Response('Offline - recursos não disponíveis', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (request.method === 'POST' && request.url.includes('/api/')) {
      const syncTag = generateSyncTag(request);
      await registerSync(syncTag, request);
      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'GET') {
      return offlineApiResponse(request);
    }

    return new Response(JSON.stringify({ detail: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function offlineApiResponse(request) {
  const { pathname } = new URL(request.url);
  const body = getOfflineApiBody(pathname);

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-ERP-Offline': 'true'
    }
  });
}

function getOfflineApiBody(pathname) {
  if (pathname.includes('/dashboard/')) {
    return {
      receita: 0,
      despesa: 0,
      lucro: 0,
      contas_receber: 0,
      contas_pagar: 0,
      saldo_total: 0,
      por_mes: [],
      contas_receber_lista: [],
      contas_pagar_lista: [],
      despesas_categoria: []
    };
  }

  if (pathname.includes('/configuracoes/empresa/')) {
    return {};
  }

  return [];
}

function generateSyncTag(request) {
  return `sync-${Date.now()}-${Math.random()}`;
}

async function registerSync(tag, request) {
  try {
    await self.registration.sync.register(tag);
    const db = await openIndexedDB();
    await saveRequestToQueue(db, tag, request);
  } catch (error) {
    console.log('Erro ao registrar sync:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ERPOfflineQueue', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'tag' });
      }
    };
  });
}

async function saveRequestToQueue(db, tag, request) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['requests'], 'readwrite');
    const store = transaction.objectStore('requests');
    const data = {
      tag,
      method: request.method,
      url: request.url,
      headers: [...request.headers.entries()],
      body: null,
      timestamp: Date.now()
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      request.clone().text().then((body) => {
        data.body = body;
        store.put(data);
      });
    } else {
      store.put(data);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(syncQueue());
  }
});

async function syncQueue() {
  const db = await openIndexedDB();
  const transaction = db.transaction(['requests'], 'readonly');
  const store = transaction.objectStore('requests');
  const requests = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  for (const data of requests) {
    try {
      const headers = new Headers(data.headers);
      const fetchOptions = {
        method: data.method,
        headers,
        body: data.body
      };

      const response = await fetch(data.url, fetchOptions);
      if (response.ok) {
        const deleteTransaction = db.transaction(['requests'], 'readwrite');
        deleteTransaction.objectStore('requests').delete(data.tag);
      }
    } catch (error) {
      console.log('Erro ao sincronizar:', error);
    }
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
