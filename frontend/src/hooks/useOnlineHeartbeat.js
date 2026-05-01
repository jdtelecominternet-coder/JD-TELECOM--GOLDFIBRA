import { useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * Hook para manter o usuário "online" mesmo com a tela desligada
 * Usa heartbeat periódico, Wake Lock API e Service Worker
 */
export function useOnlineHeartbeat(userId, isActive = true) {
  const heartbeatInterval = useRef(null);
  const wakeLockRef = useRef(null);
  const isVisibleRef = useRef(true);

  // Enviar heartbeat para o servidor
  const sendHeartbeat = useCallback(async () => {
    if (!userId || !isActive) return;
    
    try {
      await api.post('/users/heartbeat', { 
        userId, 
        timestamp: Date.now(),
        deviceInfo: {
          online: navigator.onLine,
          userAgent: navigator.userAgent.substring(0, 100)
        }
      });
    } catch (err) {
      // Silenciar erros - não queremos spam de console
      console.log('Heartbeat failed, will retry');
    }
  }, [userId, isActive]);

  // Solicitar Wake Lock (impede tela de desligar)
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock ativado');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock liberado');
          // Tentar readquirir após 1 segundo
          setTimeout(requestWakeLock, 1000);
        });
      }
    } catch (err) {
      console.log('Wake Lock não disponível:', err.message);
    }
  }, []);

  // Registrar Service Worker para background sync
  const registerBackgroundSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('heartbeat-sync');
        console.log('Background sync registrado');
      } catch (err) {
        console.log('Background sync não disponível');
      }
    }
  }, []);

  useEffect(() => {
    if (!userId || !isActive) {
      // Limpar intervalo se desativado
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      return;
    }

    // Enviar heartbeat imediatamente
    sendHeartbeat();

    // Configurar intervalo de heartbeat (a cada 15 segundos)
    heartbeatInterval.current = setInterval(sendHeartbeat, 15000);

    // Solicitar Wake Lock
    requestWakeLock();

    // Registrar background sync
    registerBackgroundSync();

    // Handler para quando a página fica visível/invisível
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      
      if (isVisibleRef.current) {
        // Página voltou a ficar visível - enviar heartbeat imediato
        sendHeartbeat();
        // Readquirir Wake Lock
        requestWakeLock();
      }
    };

    // Handler para quando o documento volta a ter foco
    const handleFocus = () => {
      sendHeartbeat();
    };

    // Handler para online/offline
    const handleOnline = () => {
      console.log('Conexão restaurada - enviando heartbeat');
      sendHeartbeat();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // Limpar ao desmontar
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [userId, isActive, sendHeartbeat, requestWakeLock, registerBackgroundSync]);

  return { isVisible: isVisibleRef.current };
}

export default useOnlineHeartbeat;