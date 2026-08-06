/* ================================================================
   GYM PRO — Service Worker
   Estratégia: Cache First para o app shell, com fallback de rede
   e atualização em segundo plano (stale-while-revalidate leve).
   Funciona 100% offline após a primeira visita.
================================================================ */

// Sempre que publicar uma nova versão do app, incremente este número
// para forçar a atualização do cache nos aparelhos dos usuários.
const CACHE_VERSION = 'gympro-v1.0.0';
const CACHE_NAME = `gympro-cache-${CACHE_VERSION}`;

// Arquivos essenciais do "app shell" — tudo que o app precisa
// para abrir e funcionar mesmo sem internet.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/db.js',
  './js/exercises.js',
  './js/timer.js',
  './js/charts.js',
  './js/ui.js',
  './js/pwa.js',
  './js/app.js',
  './images/avatar-placeholder.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ----------------------------------------------------------------
   INSTALL — pré-carrega o app shell no cache
---------------------------------------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll falha inteiro se 1 arquivo faltar; por isso usamos
        // Promise.allSettled para não travar a instalação caso algum
        // ícone/imagem ainda não exista no projeto.
        return Promise.allSettled(
          APP_SHELL.map((url) => cache.add(url).catch(() => null))
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ----------------------------------------------------------------
   ACTIVATE — remove caches antigos de versões anteriores
---------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('gympro-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ----------------------------------------------------------------
   FETCH — estratégia:
   1) Tenta responder do cache imediatamente (rápido, offline-first)
   2) Em paralelo, busca na rede e atualiza o cache (se online)
   3) Se não houver cache nem rede, cai no fallback do index.html
      (útil para navegação direta em rotas do app)
---------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  // Apenas GET é cacheável; ignora POST/PUT etc.
  if (event.request.method !== 'GET') return;

  // Ignora requisições de outras origens (ex: CDNs externas)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          // Atualiza o cache silenciosamente com a versão mais nova
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      // Se já tem no cache, devolve na hora (offline-first);
      // senão, aguarda a rede; se a rede falhar, devolve o index.html
      return cachedResponse || networkFetch || caches.match('./index.html');
    })
  );
});

/* ----------------------------------------------------------------
   MESSAGE — permite que o app force a ativação de uma nova versão
   (usado por pwa.js quando detecta um Service Worker esperando)
---------------------------------------------------------------- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
