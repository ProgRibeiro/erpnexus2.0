import { useIndexedDB } from '@/hooks/useIndexedDB';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useOffline } from '@/hooks/useOffline';
import { useIsMobile } from '@/hooks/useIsMobile';

/**
 * EXEMPLOS DE USO - Tela Mobile do Técnico
 *
 * Este arquivo demonstra como usar os hooks criados
 * para integração com outras telas ou customizações
 */

// ============================================
// EXEMPLO 1: Usar IndexedDB para Salvar Foto
// ============================================
export function ExemploSalvarFoto() {
  const { isReady, saveFotoOffline, getOffllineFotos } = useIndexedDB();

  const handleCapturarFoto = async (osId, fotoBase64, tipo) => {
    if (!isReady) return;

    try {
      const fotoSalva = await saveFotoOffline(osId, fotoBase64, tipo);
      console.log('Foto salva com ID:', fotoSalva.id);

      // Recuperar fotos da OS
      const fotos = await getOffllineFotos(osId);
      console.log('Total de fotos:', fotos.length);
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
    }
  };

  return <button onClick={() => handleCapturarFoto(123, 'data:image/...', 'antes')}>
    Capturar
  </button>;
}

// ============================================
// EXEMPLO 2: Enfileirar Ação para Sincronizar
// ============================================
export function ExemploFilaSync() {
  const { isReady, addToSyncQueue, getUnsyncedItems } = useIndexedDB();

  const handleRegistrarChegada = async (osId) => {
    if (!isReady) return;

    try {
      const syncItem = await addToSyncQueue(osId, 'registrar_chegada', {
        chegada_em: new Date().toISOString()
      });
      console.log('Ação enfileirada:', syncItem.id);

      // Ver itens não sincronizados
      const items = await getUnsyncedItems();
      console.log('Pendentes:', items.length);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return <button onClick={() => handleRegistrarChegada(123)}>
    Registrar Chegada (Offline)
  </button>;
}

// ============================================
// EXEMPLO 3: Sincronização Manual
// ============================================
export function ExemploSyncManual() {
  const { syncFotos, syncPendingActions } = useSyncManager();

  const handleSyncManual = async (osId) => {
    console.log('Iniciando sincronização...');

    // Sincronizar fotos primeiro
    const fotosSyncOk = await syncFotos(osId);
    console.log('Fotos sincronizadas:', fotosSyncOk);

    // Depois sincronizar ações
    const acoesSyncOk = await syncPendingActions();
    console.log('Ações sincronizadas:', acoesSyncOk);
  };

  return <button onClick={() => handleSyncManual(123)}>
    Sincronizar Agora
  </button>;
}

// ============================================
// EXEMPLO 4: Background Sync Automático
// ============================================
export function ExemploBackgroundSync() {
  const osId = 123;

  // Isso sincroniza automaticamente a cada 30 segundos
  useBackgroundSync(osId, 30000);

  return <div>
    Sincronização automática ativada (30s)
  </div>;
}

// ============================================
// EXEMPLO 5: Detectar Offline/Online
// ============================================
export function ExemploOffline() {
  const { isOffline } = useOffline();

  return isOffline ? (
    <div style={{ background: '#fff7e6', padding: '12px' }}>
      📶 Você está OFFLINE
    </div>
  ) : (
    <div style={{ background: '#f6ffed', padding: '12px' }}>
      ✓ Você está ONLINE
    </div>
  );
}

// ============================================
// EXEMPLO 6: Redirecionar se não Mobile
// ============================================
export function ExemploIsMobile() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMobile) {
      navigate('/dashboard');
    }
  }, [isMobile, navigate]);

  if (!isMobile) {
    return <div>Redirecionando...</div>;
  }

  return <div>Página Mobile</div>;
}

// ============================================
// EXEMPLO 7: Fluxo Completo de Atendimento
// ============================================
export function ExemploFluxoCompleto() {
  const osId = 123;
  const { isOffline } = useOffline();
  const { isReady, saveFotoOffline, addToSyncQueue } = useIndexedDB();
  const { syncFotos, syncPendingActions } = useSyncManager();
  useBackgroundSync(osId);

  const handleFluxoCompleto = async () => {
    // 1. Registrar chegada
    console.log('1. Registrando chegada...');
    await addToSyncQueue(osId, 'registrar_chegada', {
      chegada_em: new Date().toISOString()
    });

    // 2. Capturar fotos
    console.log('2. Capturando fotos...');
    const fotosBase64 = await capturarFotos();
    for (const foto of fotosBase64) {
      await saveFotoOffline(osId, foto, 'antes');
    }

    // 3. Atualizar laudo
    console.log('3. Finalizando com laudo...');
    await addToSyncQueue(osId, 'finalizar_os', {
      laudo: 'Serviço concluído com sucesso',
      concluido_em: new Date().toISOString(),
      assinatura: 'assinatura_base64'
    });

    // 4. Sincronizar se online
    if (!isOffline) {
      console.log('4. Sincronizando...');
      await syncFotos(osId);
      await syncPendingActions();
    } else {
      console.log('4. Offline - será sincronizado automaticamente');
    }
  };

  return <button onClick={handleFluxoCompleto}>
    Executar Fluxo Completo
  </button>;
}

// ============================================
// EXEMPLO 8: Tratar Erros e Retries
// ============================================
export function ExemploErrorHandling() {
  const { syncPendingActions } = useSyncManager();
  const [syncStatus, setSyncStatus] = useState('idle');

  const handleSyncComRetry = async () => {
    setSyncStatus('loading');
    try {
      const resultado = await syncPendingActions();
      if (resultado) {
        setSyncStatus('success');
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error('Erro de sincronização:', error);
      setSyncStatus('error');
    }
  };

  return (
    <div>
      <button onClick={handleSyncComRetry} disabled={syncStatus === 'loading'}>
        {syncStatus === 'loading' && 'Sincronizando...'}
        {syncStatus === 'idle' && 'Sincronizar'}
        {syncStatus === 'success' && '✓ Sincronizado!'}
        {syncStatus === 'error' && '✗ Erro - Tentar novamente'}
      </button>
    </div>
  );
}

// ============================================
// EXEMPLO 9: Cache de OS
// ============================================
export function ExemploCacheOS() {
  const { isReady, cacheOS, getCachedOS } = useIndexedDB();

  const handleCachearOS = async (osData) => {
    if (!isReady) return;

    // Cachear ordem
    await cacheOS(osData);
    console.log('OS cacheada:', osData.id);

    // Recuperar do cache
    const osRecuperada = await getCachedOS(osData.id);
    console.log('OS recuperada do cache:', osRecuperada);
  };

  return <button onClick={() => handleCachearOS({
    id: 123,
    numero: 'OS-2025-001',
    cliente: 'João da Silva'
  })}>
    Cachear OS
  </button>;
}

// ============================================
// EXEMPLO 10: Monitorar Status de Sincronização
// ============================================
export function ExemploMonitorSync() {
  const { isReady, getUnsyncedItems, getUnsyncedFotos } = useIndexedDB();
  const [stats, setStats] = useState({ fotos: 0, acoes: 0 });

  useEffect(() => {
    const checkStatus = async () => {
      if (!isReady) return;

      const acoes = await getUnsyncedItems();
      const fotos = await getUnsyncedFotos(123); // osId fixo para exemplo

      setStats({
        fotos: fotos.length,
        acoes: acoes.length
      });
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [isReady, getUnsyncedItems, getUnsyncedFotos]);

  return (
    <div>
      <p>Fotos pendentes: {stats.fotos}</p>
      <p>Ações pendentes: {stats.acoes}</p>
    </div>
  );
}

// ============================================
// TESTES RECOMENDADOS
// ============================================

/**
 * Teste 1: Capturar foto offline
 * 1. Desligar internet
 * 2. Abrir /tecnico-mobile/os-campo/123
 * 3. Tirar foto
 * 4. Verificar em DevTools > Application > IndexedDB > erp_tecnico_mobile > offline_fotos
 * 5. Ligar internet
 * 6. Foto deve sincronizar automaticamente
 */

/**
 * Teste 2: Ações offline
 * 1. Desligar internet
 * 2. Clicar "Registrar Chegada"
 * 3. Verificar sync_queue no IndexedDB
 * 4. Ligar internet
 * 5. Ação deve sincronizar em <5s
 */

/**
 * Teste 3: Assinatura offline
 * 1. Desligar internet
 * 2. Obter assinatura
 * 3. Finalizar OS
 * 4. Verificar queue no IndexedDB
 * 5. Ligar internet e confirmar sync
 */

/**
 * Teste 4: Múltiplas fotos
 * 1. Capturar 10+ fotos
 * 2. Tirar print do IndexedDB (deve mostrar todas)
 * 3. Finalizar e sincronizar
 * 4. Verificar no backend que todas foram enviadas
 */
