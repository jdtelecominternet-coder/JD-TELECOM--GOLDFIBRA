// Serviço de fila offline - salva ações no IndexedDB e sincroniza ao voltar online

const DB_NAME = 'jd-offline-queue';
const STORE = 'actions';

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}

export async function saveOfflineAction(action) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add({
      ...action,
      savedAt: new Date().toISOString()
    });
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });
}

export async function getPendingActions() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}

export async function deleteAction(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = res;
    req.onerror = rej;
  });
}

export async function clearAllActions() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
    req.onsuccess = res;
    req.onerror = rej;
  });
}

// Sincroniza todas as ações pendentes com o servidor
export async function syncPendingActions(apiInstance, onProgress) {
  const actions = await getPendingActions();
  if (actions.length === 0) return 0;

  let synced = 0;
  for (const action of actions) {
    try {
      const config = {
        method: action.method,
        url: action.url,
        data: action.data,
        headers: action.headers || {}
      };
      await apiInstance(config);
      await deleteAction(action.id);
      synced++;
      if (onProgress) onProgress(synced, actions.length);
    } catch (e) {
      // Se erro 4xx (dados inválidos), remove da fila mesmo assim
      if (e.response?.status >= 400 && e.response?.status < 500) {
        await deleteAction(action.id);
      }
    }
  }
  return synced;
}
