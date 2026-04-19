import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { saveOfflineAction, syncPendingActions, getPendingActions } from '../services/offlineQueue';
import toast from 'react-hot-toast';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Atualiza contagem de pendentes
  const refreshCount = useCallback(async () => {
    const actions = await getPendingActions();
    setPendingCount(actions.length);
  }, []);

  useEffect(() => {
    refreshCount();
  }, []);

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      const actions = await getPendingActions();
      if (actions.length > 0) {
        setSyncing(true);
        toast.loading(`Sincronizando ${actions.length} ação(ões) salvas offline...`, { id: 'sync' });
        try {
          const synced = await syncPendingActions(api, (done, total) => {
            toast.loading(`Sincronizando ${done}/${total}...`, { id: 'sync' });
          });
          toast.success(`✅ ${synced} ação(ões) sincronizada(s) com sucesso!`, { id: 'sync', duration: 4000 });
        } catch {
          toast.error('Erro ao sincronizar. Tente novamente.', { id: 'sync' });
        } finally {
          setSyncing(false);
          refreshCount();
        }
      }
    };
    const onOffline = () => {
      setIsOnline(false);
      toast('⚠️ Sem internet — dados serão salvos localmente', { icon: '📴', duration: 4000 });
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Executa uma ação com fallback offline
  const executeOrQueue = useCallback(async (method, url, data = null, description = 'Ação') => {
    if (navigator.onLine) {
      return api({ method, url, data });
    } else {
      await saveOfflineAction({ method, url, data, description });
      await refreshCount();
      toast(`📴 "${description}" salvo offline. Será enviado ao conectar.`, { icon: '💾', duration: 5000 });
      return { offline: true };
    }
  }, []);

  return { isOnline, pendingCount, syncing, executeOrQueue, refreshCount };
}
