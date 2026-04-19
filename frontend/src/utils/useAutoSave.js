/**
 * useAutoSave — salva e restaura estado do formulário no localStorage
 * Protege contra queda de energia, bateria descarregando ou reload inesperado.
 *
 * Uso:
 *   const [form, setForm] = useAutoSave('chave_unica', { campo1: '', campo2: [] });
 *   // Funciona igual ao useState, mas persiste automaticamente.
 *
 * @param {string} key   - chave única no localStorage
 * @param {*} initial    - valor inicial (se nada salvo ainda)
 * @returns [value, setValue, clear]  - igual useState + função de limpar
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useAutoSave(key, initial) {
  const [value, setValueInner] = useState(() => {
    try {
      const saved = localStorage.getItem('autosave_' + key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch {}
    return initial;
  });

  const timerRef = useRef(null);

  const setValue = useCallback((updater) => {
    setValueInner(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Salva com debounce de 500ms para não sobrecarregar
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem('autosave_' + key, JSON.stringify(next));
        } catch (e) {
          // localStorage cheio — tenta compactar removendo fotos antigas
          try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('autosave_'));
            if (keys.length > 0) {
              localStorage.removeItem(keys[0]);
              localStorage.setItem('autosave_' + key, JSON.stringify(next));
            }
          } catch {}
        }
      }, 500);
      return next;
    });
  }, [key]);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
    localStorage.removeItem('autosave_' + key);
    setValueInner(initial);
  }, [key, initial]);

  // Salvar imediatamente quando o app sai de foco (bateria/energia)
  useEffect(() => {
    function saveNow() {
      setValueInner(current => {
        try {
          localStorage.setItem('autosave_' + key, JSON.stringify(current));
        } catch {}
        return current;
      });
    }
    window.addEventListener('blur', saveNow);
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveNow();
    });
    return () => {
      window.removeEventListener('blur', saveNow);
      window.removeEventListener('pagehide', saveNow);
    };
  }, [key]);

  return [value, setValue, clear];
}

/**
 * autoSaveGet — lê um valor salvo diretamente (fora de componente React)
 */
export function autoSaveGet(key) {
  try {
    const saved = localStorage.getItem('autosave_' + key);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

/**
 * autoSaveClear — limpa um valor salvo diretamente
 */
export function autoSaveClear(key) {
  localStorage.removeItem('autosave_' + key);
}
