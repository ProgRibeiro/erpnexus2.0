import { useEffect, useCallback, useRef } from 'react';
import { useIndexedDB } from './useIndexedDB';
import api from '../services/api';
import { message } from 'antd';

export function useSyncManager() {
  const { isReady, getUnsyncedFotos, getUnsyncedItems, markFotoAsSynced, markItemAsSynced, clearSyncedFotos } = useIndexedDB();
  const isSyncingRef = useRef(false);

  const syncFotos = useCallback(async (osId) => {
    if (!isReady) return false;

    try {
      const unsyncedFotos = await getUnsyncedFotos(osId);
      if (unsyncedFotos.length === 0) return true;

      for (const foto of unsyncedFotos) {
        try {
          const formData = new FormData();
          formData.append('foto', foto.data);
          formData.append('tipo', foto.tipo);

          await api.post(`/api/v1/ordens/${osId}/fotos/`, formData);
          await markFotoAsSynced(foto.id);
          message.success(`Foto ${foto.tipo} sincronizada`);
        } catch (error) {
          console.error('Erro ao sincronizar foto:', error);
          throw error;
        }
      }
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar fotos:', error);
      return false;
    }
  }, [isReady, getUnsyncedFotos, markFotoAsSynced]);

  const syncPendingActions = useCallback(async () => {
    if (!isReady || isSyncingRef.current) return false;

    isSyncingRef.current = true;

    try {
      const unsyncedItems = await getUnsyncedItems();
      if (unsyncedItems.length === 0) {
        isSyncingRef.current = false;
        return true;
      }

      for (const item of unsyncedItems) {
        try {
          const { action, osId, data } = item;

          switch (action) {
            case 'registrar_chegada':
              await api.patch(`/api/v1/ordens/${osId}/`, {
                status: 'em_progresso',
                hora_inicio: data.chegada_em
              });
              break;

            case 'atualizar_laudo':
              await api.patch(`/api/v1/ordens/${osId}/`, {
                laudo: data.laudo
              });
              break;

            case 'finalizar_os':
              await api.patch(`/api/v1/ordens/${osId}/`, {
                status: 'concluida',
                laudo: data.laudo,
                hora_conclusao: data.concluido_em,
                assinatura_cliente: data.assinatura
              });
              break;

            case 'enviar_mensagem':
              await api.post(`/api/v1/ordens/${osId}/mensagens/`, {
                conteudo: data.conteudo
              });
              break;

            default:
              console.warn('Ação desconhecida:', action);
          }

          await markItemAsSynced(item.id);
        } catch (error) {
          console.error('Erro ao sincronizar ação:', error);
          if (item.retries < 3) {
            item.retries++;
          } else {
            await markItemAsSynced(item.id); // Marca como sincronizado mesmo após falhas
            message.error(`Falha ao sincronizar ação: ${item.action}`);
          }
        }
      }

      // Limpar dados sincronizados
      await clearSyncedFotos();
      message.success('Sincronização completa!');
      isSyncingRef.current = false;
      return true;
    } catch (error) {
      console.error('Erro geral na sincronização:', error);
      isSyncingRef.current = false;
      return false;
    }
  }, [isReady, getUnsyncedItems, markItemAsSynced, clearSyncedFotos]);

  // Sincronizar quando voltar online
  useEffect(() => {
    const handleOnline = async () => {
      message.info('Conexão restaurada. Sincronizando dados...');
      await syncPendingActions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingActions]);

  return {
    syncFotos,
    syncPendingActions
  };
}
