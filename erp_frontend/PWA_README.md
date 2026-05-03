# PWA Mobile - Implementação Completa

## Visão Geral

Implementação completa de Progressive Web App (PWA) Mobile para o ERP com suporte offline, sincronização automática e fila de requisições.

### Arquivos Implementados

```
erp_frontend/
├── public/
│   ├── manifest.json          # PWA Manifest com ícones e configurações
│   └── sw.js                  # Service Worker com cache strategies
├── src/
│   ├── main.jsx               # SW Registration
│   ├── hooks/
│   │   ├── useOffline.js      # Hook para detectar offline e gerenciar fotos/chats
│   │   └── useSyncQueue.js    # Hook para gerenciar fila de sincronização
│   ├── components/
│   │   ├── OfflineIndicator.jsx  # Componente visual de status offline
│   │   └── OfflineIndicator.css  # Estilos do indicador
│   ├── utils/
│   │   └── offlineSync.js     # Manager para sincronização automática
│   └── index.html             # Manifest link e SW registration
```

## Features Implementadas

### 1. Cache Strategies

#### Cache-First (Assets Estáticos)
- Imagens, CSS, JS, fonts
- Melhor performance offline

#### Network-First (API)
- Endpoints de API
- Fallback para cache se offline
- Sincronização automática quando volta online

### 2. Offline Queuing

- Requisições POST/PUT enfileiradas automaticamente
- IndexedDB para persistência
- Sincronização background com retry automático

### 3. Photo & Chat Sync

- Fotos capturadas offline salvas em IndexedDB
- Mensagens de chat na fila offline
- Sincronização automática quando online

### 4. Background Sync

- Background Sync API para requisições programadas
- Suporte a múltiplos tipos de sync

### 5. Indicador Visual

- Status online/offline em tempo real
- Fila de requisições visível
- Controle manual de sincronização

## Como Usar

### 1. Inicializar no App

```jsx
import { useEffect } from 'react';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { offlineSyncManager } from '@/utils/offlineSync';

function App() {
  useEffect(() => {
    offlineSyncManager.init();
    return () => offlineSyncManager.destroy();
  }, []);

  return (
    <>
      <YourApp />
      <OfflineIndicator />
    </>
  );
}
```

### 2. Detectar Status Offline

```jsx
import { useOffline } from '@/hooks/useOffline';

function MeuComponente() {
  const { isOffline, syncStatus } = useOffline();

  return (
    <div>
      {isOffline && <p>Modo offline ativado</p>}
      <p>Status: {syncStatus}</p>
    </div>
  );
}
```

### 3. Salvar Foto Offline

```jsx
import { useOffline } from '@/hooks/useOffline';

function CapturarFoto() {
  const { savePhotoOffline, unsyncedPhotos, triggerSync } = useOffline();

  const handleCapture = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoId = await savePhotoOffline(e.target.result, {
        orderId: '123'
      });
      console.log('Foto enfileirada:', photoId);
      
      // Sincronizar se online
      if (navigator.onLine) {
        triggerSync();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <input type="file" accept="image/*" onChange={(e) => handleCapture(e.target.files[0])} />
      <p>{unsyncedPhotos.length} fotos pendentes</p>
    </>
  );
}
```

### 4. Fila de Requisições

```jsx
import { useSyncQueue } from '@/hooks/useSyncQueue';

function SalvarDados() {
  const { addToQueue, syncQueue, queue } = useSyncQueue();

  const handleSave = async (dados) => {
    // Tentar online primeiro
    if (navigator.onLine) {
      try {
        const response = await fetch('/api/dados', {
          method: 'POST',
          body: JSON.stringify(dados)
        });
        if (response.ok) return;
      } catch (e) {}
    }

    // Enfileirar se falhar
    await addToQueue('POST', '/api/dados', dados);
    
    // Sincronizar
    if (navigator.onLine) {
      await syncQueue();
    }
  };

  return (
    <>
      <button onClick={() => handleSave({ nome: 'test' })}>Salvar</button>
      <p>{queue.length} itens na fila</p>
    </>
  );
}
```

### 5. Sincronizar Chat Offline

```jsx
import { useOffline } from '@/hooks/useOffline';

function ChatOffline() {
  const { queueChatMessage, unsyncedChats } = useOffline();

  const handleSendMessage = async (text) => {
    await queueChatMessage({
      text,
      userId: '456',
      orderId: '123'
    });
  };

  return (
    <>
      <textarea onBlur={(e) => handleSendMessage(e.target.value)} />
      <p>{unsyncedChats.length} mensagens pendentes</p>
    </>
  );
}
```

## APIs Disponíveis

### useOffline Hook

```javascript
const {
  isOffline,                 // boolean - está offline?
  syncStatus,               // 'idle' | 'syncing' | 'error'
  pendingRequests,          // array - requisições na fila
  unsyncedPhotos,           // array - fotos não sincronizadas
  unsyncedChats,            // array - chats não sincronizados
  savePhotoOffline,         // (data, metadata) => photoId
  markPhotoAsSynced,        // (photoId) => void
  getUnsyncedPhotos,        // () => array
  addPendingSync,           // (type, data) => syncId
  removePendingSync,        // (syncId) => void
  queueChatMessage,         // (data) => void
  triggerSync,              // () => void - sincronizar manualmente
  clearSyncQueue,           // () => void - limpar fila
  updatePendingRequests,    // () => void - atualizar lista de requisições
  updateUnsyncedPhotos,     // () => void
  updateUnsyncedChats       // () => void
} = useOffline();
```

### useSyncQueue Hook

```javascript
const {
  queue,                    // array - fila de requisições
  syncing,                  // boolean - sincronizando?
  lastSync,                 // Date - última sincronização
  syncErrors,               // array - erros de sincronização
  addToQueue,               // (method, url, body, headers) => tag
  removeFromQueue,          // (tag) => void
  updateQueueItem,          // (tag, updates) => void
  syncQueue,                // (onProgress?) => void - sincronizar
  clearQueue,               // () => void
  loadQueue,                // () => void - recarregar fila
  getQueueStats             // () => {total, pending, failed, errors}
} = useSyncQueue();
```

### offlineSyncManager

```javascript
import { offlineSyncManager } from '@/utils/offlineSync';

offlineSyncManager.init();                    // Inicializar
offlineSyncManager.startAutoSync(30000);      // Auto-sync a cada 30s
offlineSyncManager.stopAutoSync();            // Parar auto-sync
await offlineSyncManager.syncAll();           // Sincronizar tudo agora
await offlineSyncManager.syncRequests();      // Sincronizar requisições
await offlineSyncManager.syncPhotos();        // Sincronizar fotos
await offlineSyncManager.syncChats();         // Sincronizar chats

// Listeners
offlineSyncManager.on('syncStart', () => {});
offlineSyncManager.on('syncComplete', () => {});
offlineSyncManager.on('requestSynced', (data) => {});
offlineSyncManager.on('photoSynced', (data) => {});
offlineSyncManager.on('chatSynced', (data) => {});
offlineSyncManager.on('error', (data) => {});
```

## Cache Strategy

### Assets (Cache-First)
- HTML, CSS, JS
- Imagens
- Fontes
- Ícones

### API (Network-First)
- `/api/dashboard`
- `/api/usuarios`
- `/api/empresas`
- `/api/categorias`
- Outras GET requests com fallback

### POST/PUT Requests
- Automaticamente enfileiradas se offline
- Sincronizadas com retry automático
- Até 3 tentativas por padrão

## Performance

### Tamanho do Cache
- ~2-5 MB para assets estáticos
- ~500 KB para API cache
- ~2 MB para imagens

### Sincronização
- Timeout de 5 segundos por requisição
- Retry automático com backoff
- Máximo 3 tentativas

## Suporte

### Browsers Suportados
- Chrome/Edge 40+
- Firefox 44+
- Safari 11.1+
- Android Browser 40+
- Samsung Internet 4+

### Offline Detection
- Online/Offline events
- Navigator.onLine
- Network Information API (futuro)

## Troubleshooting

### SW não registra
1. Verificar console para erros
2. Verificar `/sw.js` existe
3. Verificar HTTPS (exceto localhost)
4. Limpar cache e recarregar

### Fila não sincroniza
1. Verificar `indexedDB` no DevTools
2. Verificar se requisição está bem formada
3. Verificar se backend responde com 200-299
4. Usar `triggerSync()` manualmente

### Fotos não salvam offline
1. Verificar quota de storage (IndexedDB)
2. Verificar permissões de câmera
3. Usar `savePhotoOffline()` com data URL ou Blob

## Roadmap

- [ ] Compressão de fotos automática
- [ ] Sincronização seletiva
- [ ] Período de retenção configurável
- [ ] Análise de uso offline
- [ ] Push notifications
- [ ] Periodic Background Sync

## Referências

- [PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
