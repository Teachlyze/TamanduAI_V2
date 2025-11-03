/**
 * Service Worker - TamanduAI PWA
 * Cache-First Strategy para assets estáticos
 * Network-First para dados dinâmicos
 */

const CACHE_NAME = 'tamanduai-v1.0.0';
const STATIC_CACHE = 'tamanduai-static-v1';
const DYNAMIC_CACHE = 'tamanduai-dynamic-v1';

// Assets para cache inicial
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Adicionar outros assets críticos aqui
];

// Install - Cachear assets essenciais
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate - Limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch - Estratégia de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests não HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Ignorar chamadas para API (sempre buscar na rede)
  if (url.origin.includes('supabase') || url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'Sem conexão com a internet' }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }
  
  // Cache-First para assets estáticos
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[ServiceWorker] Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Não está no cache, buscar na rede
        return fetch(request)
          .then((response) => {
            // Não cachear respostas inválidas
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Clonar resposta (pode ser lida apenas uma vez)
            const responseToCache = response.clone();
            
            // Cachear para uso futuro
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('[ServiceWorker] Fetch failed:', error);
            
            // Retornar página offline se disponível
            return caches.match('/offline.html');
          });
      })
  );
});

// Background Sync (opcional - para quando voltar online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[ServiceWorker] Background sync triggered');
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Implementar sincronização de dados offline
  console.log('[ServiceWorker] Syncing data...');
}

// Push Notifications (opcional)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Nova notificação do TamanduAI',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'TamanduAI', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Message (comunicação com o app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[ServiceWorker] Loaded');
