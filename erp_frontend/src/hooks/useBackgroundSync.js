import { useEffect, useRef } from 'react';
import { useSyncManager } from './useSyncManager';

export function useBackgroundSync(osId, interval = 30000) {
  const { syncPendingActions, syncFotos } = useSyncManager();
  const syncIntervalRef = useRef(null);

  useEffect(() => {
    if (!navigator.onLine) return;

    const performSync = async () => {
      try {
        // Sincronizar fotos primeiro
        if (osId) {
          await syncFotos(osId);
        }

        // Depois sincronizar ações pendentes
        await syncPendingActions();
      } catch (error) {
        console.error('Erro na sincronização em background:', error);
      }
    };

    // Sincronizar imediatamente
    performSync();

    // Sincronizar periodicamente
    syncIntervalRef.current = setInterval(performSync, interval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [osId, interval, syncFotos, syncPendingActions]);
}
