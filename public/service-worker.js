/**
 * Service Worker - TamanduAI PWA
 * Cache-First Strategy para assets estáticos
 * Network-First para dados dinâmicos
 * 
 * VERSÃO 2.0.1 - Correções
 * - ✅ Fixed: Cache API só aceita GET (não POST/PUT/DELETE)
 * - ✅ Adicionada verificação request.method !== 'GET'
 * - NÃO cacheia chunks JS (evita conflito de versões)
 * - Cacheia apenas HTML, CSS, imagens, fontes
 * - Invalida caches antigos automaticamente
 */

const CACHE_VERSION = 'v2.0.1'; // INCREMENTAR EM CADA DEPLOY - Fixed POST cache error
const STATIC_CACHE = `tamanduai-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `tamanduai-dynamic-${CACHE_VERSION}`;

// Assets para cache inicial
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // Adicionar outros assets críticos aqui
];

// Install - Cachear assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate - Limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
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
  
  // NÃO CACHEAR chunks JS (evitar conflito de versões)
  // Deixar Vite gerenciar versionamento via hash no nome do arquivo
  if (
    url.pathname.match(/chunk-[A-Z0-9]+\.js/) || // chunks do Vite
    url.pathname.match(/assets\/.*-[a-f0-9]{8}\.js/) || // assets com hash
    url.pathname.endsWith('.js?v=') // JS com query param de versão
  ) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Cache-First para assets estáticos (HTML, CSS, imagens, fontes)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Não está no cache, buscar na rede
        return fetch(request)
          .then((response) => {
            // Não cachear respostas inválidas
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // ⚠️ IMPORTANTE: Cache API só suporta GET (não POST, PUT, DELETE)
            // Só cachear requisições GET
            if (request.method !== 'GET') {
              return response;
            }
            
            // Clonar resposta (pode ser lida apenas uma vez)
            const responseToCache = response.clone();
            
            // Cachear para uso futuro (somente GET)
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            
            // Retornar página offline se disponível
            return caches.match('/offline.html');
          });
      })
  );
});

// Background Sync (opcional - para quando voltar online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Implementar sincronização de dados offline
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
