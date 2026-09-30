/**
 * Service worker de cadenas : met en cache tous les fichiers du site pour
 * qu'il fonctionne hors ligne. Il ne sert que des fichiers statiques de ce
 * même site ; il ne voit jamais les fichiers ni les mots de passe, qui ne
 * quittent pas la page.
 *
 * Ce fichier est un modèle : au build, vite.config.js y injecte la liste des
 * fichiers à mettre en cache et une version, puis le publie sous sw.js.
 */
const CACHE = 'cadenas-__CACHE_VERSION__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

// Nouvelle version : les anciens caches sont supprimés une fois qu'elle a
// pris la main (après accord de l'utilisateur, voir main.js).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('cadenas-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Seules les pages de ce site peuvent déjà écrire au service worker ; la
// vérification de l'origine est une ceinture de plus.
self.addEventListener('message', (event) => {
  if (event.origin === self.location.origin && event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Cache d'abord, réseau ensuite ; une navigation hors ligne renvoie la page.
// ignoreVary : certains serveurs répondent « Vary: Origin », et les scripts
// modules sont demandés avec un en-tête Origin : sans cette option, ils ne
// seraient jamais trouvés en cache. Sans risque : le cache ne contient que les
// fichiers statiques de ce site.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then(
      (cached) =>
        cached ??
        fetch(request).catch(async (error) => {
          if (request.mode === 'navigate') return (await caches.match('./', { ignoreVary: true })) ?? Response.error();
          throw error;
        }),
    ),
  );
});
