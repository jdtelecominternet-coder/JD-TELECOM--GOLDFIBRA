import { useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';

/**
 * Hook de sincronizacao em tempo real.
 * Escuta eventos data:refresh do servidor e chama o callback quando
 * a entidade de interesse for atualizada.
 *
 * @param {string|string[]} entities - Ex: 'clients' ou ['clients','orders']
 * @param {function} onRefresh - funcao chamada quando dado atualiza (ex: load)
 */
export function useSync(entities, onRefresh) {
  const { socket } = useChat();
  const watched = Array.isArray(entities) ? entities : [entities];

  useEffect(() => {
    if (!socket) return;

    function handler({ entity }) {
      if (watched.includes(entity)) {
        onRefresh();
      }
    }

    socket.on('data:refresh', handler);
    return () => socket.off('data:refresh', handler);
  }, [socket, onRefresh]);
}