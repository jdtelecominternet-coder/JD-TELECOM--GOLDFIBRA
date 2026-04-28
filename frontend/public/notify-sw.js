// Service Worker SysFlowCloudi - Offline + Notificações
const CACHE_NAME = 'jd-telecom-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/logo192.png', '/favicon.png'];

// Instala e faz cache dos arquivos estáticos
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// Estratégia: Network first, fallback para cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: tenta rede, se falhar usa cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request.clone()).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets estáticos: cache first, depois rede
  if (e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, res.clone()));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});

// Notificações em background
self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY') {
    self.registration.showNotification(e.data.title || 'SysFlowCloudi', {
      body: e.data.body,
      icon: '/logo192.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      tag: e.data.tag || 'jd-notify',
      renotify: true,
      data: { url: e.data.url || '/' }
    });
  }
});

// Ao clicar na notificação abre o app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});

// Sincronização em background quando voltar internet
self.addEventListener('sync', e => {
  if (e.tag === 'sync-pending') {
    e.waitUntil(syncPending());
  }
});

async function syncPending() {
  const db = await openDB();
  const pending = await getAll(db, 'pendingActions');
  for (const action of pending) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      await deleteRecord(db, 'pendingActions', action.id);
    } catch {}
  }
}

// IndexedDB helpers simples
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('jd-offline', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
function getAll(db, store) {
  return new Promise((res, rej) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
function deleteRecord(db, store, id) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(id);
    req.onsuccess = res; req.onerror = rej;
  });
}
