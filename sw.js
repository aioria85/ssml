// ══════════════════════════════════════
// SSML Reader — Service Worker
// Su presencia convierte la "página instalada" en una PWA real con ciclo
// de vida propio. Es lo que permite que Android mantenga vivo el proceso
// y el servicio de medios cuando la pantalla se apaga o sales de la app.
// ══════════════════════════════════════

const CACHE = 'ssml-reader-v1';
const ASSETS = [
  '/ssml/',
  '/ssml/index.html',
  '/ssml/manifest.json',
  '/ssml/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ASSETS).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Nunca cachear ni interceptar la API de Google TTS ni peticiones externas
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }

  // Estrategia: network-first para el HTML (para recibir actualizaciones),
  // cache-first para el resto de recursos del shell.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/ssml/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
