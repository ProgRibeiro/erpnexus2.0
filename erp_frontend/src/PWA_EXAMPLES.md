// PWA Mobile - Exemplos de Uso Completo

// ============================================
// 1. USAR O HOOK useOffline
// ============================================

import { useOffline } from '@/hooks/useOffline';

function MeuComponente() {
  const {
    isOffline,
    syncStatus,
    unsyncedPhotos,
    unsyncedChats,
    savePhotoOffline,
    queueChatMessage,
    triggerSync
  } = useOffline();

  // Mostrar status
  if (isOffline) {
    return <div>Você está offline</div>;
  }

  // Salvar foto offline
  const handlePhotoCapture = async (photoData) => {
    const photoId = await savePhotoOffline(photoData, {
      orderId: '123',
      timestamp: Date.now()
    });
    console.log('Foto enfileirada:', photoId);
  };

  // Enviar mensagem de chat
  const handleSendChat = async (message) => {
    await queueChatMessage({
      text: message,
      userId: '456',
      orderid: '123',
      timestamp: Date.now()
    });
  };

  // Sincronizar manualmente
  const handleSync = async () => {
    await triggerSync();
  };

  return (
    <div>
      <p>Status de sincronização: {syncStatus}</p>
      <p>Fotos pendentes: {unsyncedPhotos.length}</p>
      <p>Chats pendentes: {unsyncedChats.length}</p>
      <button onClick={handleSync}>Sincronizar Agora</button>
    </div>
  );
}

// ============================================
// 2. USAR O HOOK useSyncQueue
// ============================================

import { useSyncQueue } from '@/hooks/useSyncQueue';

function FilaSincronizacao() {
  const {
    queue,
    syncing,
    lastSync,
    syncErrors,
    addToQueue,
    syncQueue,
    clearQueue,
    getQueueStats
  } = useSyncQueue();

  const stats = getQueueStats();

  // Adicionar requisição manual à fila
  const handleAddToQueue = async () => {
    try {
      const tag = await addToQueue('POST', '/api/dados', { nome: 'teste' }, {
        'Content-Type': 'application/json'
      });
      console.log('Adicionado à fila:', tag);
    } catch (error) {
      console.error('Erro ao adicionar à fila:', error);
    }
  };

  // Sincronizar fila
  const handleSync = async () => {
    await syncQueue((progress) => {
      console.log(
        `Sincronizando: ${progress.current + 1}/${progress.total}`
      );
    });
  };

  return (
    <div>
      <p>Total na fila: {stats.total}</p>
      <p>Pendentes: {stats.pending}</p>
      <p>Falhadas: {stats.failed}</p>
      <p>Última sincronização: {lastSync?.toLocaleTimeString('pt-BR')}</p>

      <button onClick={handleAddToQueue}>Adicionar à Fila</button>
      <button onClick={handleSync} disabled={syncing}>
        {syncing ? 'Sincronizando...' : 'Sincronizar'}
      </button>
      <button onClick={clearQueue}>Limpar Fila</button>
    </div>
  );
}

// ============================================
// 3. USAR O OfflineSyncManager
// ============================================

import { offlineSyncManager } from '@/utils/offlineSync';

async function setupOfflineSync() {
  // Inicializar
  await offlineSyncManager.init();

  // Escutar eventos
  offlineSyncManager.on('syncStart', () => {
    console.log('Sincronização iniciada');
  });

  offlineSyncManager.on('syncComplete', () => {
    console.log('Sincronização completa');
  });

  offlineSyncManager.on('requestSynced', (data) => {
    console.log('Requisição sincronizada:', data.tag);
  });

  offlineSyncManager.on('photoSynced', (data) => {
    console.log('Foto sincronizada:', data.photoId);
  });

  offlineSyncManager.on('chatSynced', (data) => {
    console.log('Chat sincronizado:', data.chatId);
  });

  offlineSyncManager.on('error', (data) => {
    console.error('Erro na sincronização:', data);
  });

  // Sincronizar manualmente
  await offlineSyncManager.syncAll();
}

// ============================================
// 4. ADICIONAR O INDICADOR OFFLINE AO APP
// ============================================

import { OfflineIndicator } from '@/components/OfflineIndicator';

function App() {
  return (
    <>
      {/* Seu conteúdo aqui */}
      <YourAppContent />

      {/* Indicador de offline sempre disponível */}
      <OfflineIndicator />
    </>
  );
}

// ============================================
// 5. EXEMPLO COMPLETO: UPLOAD DE FOTO OFFLINE
// ============================================

import { useRef } from 'react';
import { message, Button, Spin } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { useOffline } from '@/hooks/useOffline';

function UploadFotoOffline({ orderId }) {
  const inputRef = useRef(null);
  const { isOffline, savePhotoOffline, unsyncedPhotos, triggerSync } = useOffline();
  const [loading, setLoading] = useState(false);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);

      // Ler arquivo como Data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        const photoData = event.target?.result;

        // Salvar offline
        const photoId = await savePhotoOffline(photoData, {
          orderId,
          fileName: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString()
        });

        message.success(`Foto capturada offline: ${photoId}`);

        // Tentar sincronizar se online
        if (!isOffline) {
          setTimeout(() => triggerSync(), 1000);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      message.error('Erro ao capturar foto');
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        style={{ display: 'none' }}
      />

      <Button
        type="primary"
        icon={<CameraOutlined />}
        onClick={() => inputRef.current?.click()}
        loading={loading}
      >
        Capturar Foto
      </Button>

      {unsyncedPhotos.length > 0 && (
        <p style={{ marginTop: 8, color: '#ff7a45' }}>
          {unsyncedPhotos.length} foto(s) pendente(s) de sincronização
        </p>
      )}
    </div>
  );
}

// ============================================
// 6. EXEMPLO: REQUISIÇÃO COM FILA
// ============================================

import axios from 'axios';
import { useSyncQueue } from '@/hooks/useSyncQueue';

function SalvarDados() {
  const { addToQueue, syncQueue } = useSyncQueue();
  const [loading, setLoading] = useState(false);

  const handleSave = async (dados) => {
    try {
      setLoading(true);

      // Tentar requisição normal
      if (navigator.onLine) {
        try {
          const response = await axios.post('/api/dados', dados, {
            timeout: 5000
          });
          console.log('Dados salvos online:', response.data);
          return;
        } catch (error) {
          console.log('Falha online, enfileirando...');
        }
      }

      // Enfileirar para sincronização offline
      await addToQueue('POST', '/api/dados', dados, {
        'Content-Type': 'application/json'
      });

      message.info('Dados enfileirados para sincronização');

      // Sincronizar se online
      if (navigator.onLine) {
        setTimeout(() => syncQueue(), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button loading={loading} onClick={() => handleSave({ nome: 'teste' })}>
      Salvar Dados
    </Button>
  );
}

// ============================================
// 7. CONFIGURAÇÕES RECOMENDADAS
// ============================================

/*
No seu main.jsx ou App.jsx, configure:

1. Inicializar OfflineSyncManager ao carregar:

  import { offlineSyncManager } from '@/utils/offlineSync';

  useEffect(() => {
    offlineSyncManager.init();
    return () => offlineSyncManager.destroy();
  }, []);

2. Usar OfflineIndicator no componente raiz:

  import { OfflineIndicator } from '@/components/OfflineIndicator';

  export function App() {
    return (
      <>
        <Router>
          {/* seu conteúdo */}
        </Router>
        <OfflineIndicator />
      </>
    );
  }

3. Adicionar ao App.jsx para sincronizar quando voltar online:

  import { useOffline } from '@/hooks/useOffline';

  export function App() {
    const { isOffline } = useOffline();

    useEffect(() => {
      if (!isOffline) {
        const timer = setTimeout(() => {
          // Sincronizar quando volta online
          offlineSyncManager.syncAll();
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [isOffline]);

    return <YourApp />;
  }
*/

// ============================================
// 8. INTERCEPTADOR AXIOS PARA OFFLINE
// ============================================

import axios from 'axios';
import { useSyncQueue } from '@/hooks/useSyncQueue';

export function setupOfflineInterceptor(axiosInstance) {
  const { addToQueue, syncQueue } = useSyncQueue();

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;

      // Se é erro de rede e é POST/PUT
      if (
        !navigator.onLine &&
        (config.method === 'post' || config.method === 'put')
      ) {
        // Enfileirar
        await addToQueue(
          config.method.toUpperCase(),
          config.url,
          config.data,
          config.headers
        );

        // Retornar resposta "queued"
        return {
          status: 202,
          data: { queued: true }
        };
      }

      return Promise.reject(error);
    }
  );
}

// Uso:
// import apiClient from '@/services/api';
// setupOfflineInterceptor(apiClient);
