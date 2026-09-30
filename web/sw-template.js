/**
 * Service worker de cadenas :
 * - met en cache tous les fichiers du site pour qu'il fonctionne hors ligne ;
 * - sur les navigateurs qui ne savent pas écrire directement sur le disque
 *   (Firefox, Safari), sert les gros résultats en flux, au fur et à mesure du
 *   chiffrement, pour qu'ils ne soient jamais gardés entiers en mémoire.
 *
 * Il ne voit jamais les mots de passe. Un résultat servi en flux le traverse,
 * sans quitter l'appareil : le service worker n'a aucun accès au réseau hors
 * de ce site (sa propre CSP), et ne garde rien.
 *
 * Ce fichier est un modèle : au build, vite.config.js y injecte la liste des
 * fichiers à mettre en cache et une version, puis le publie sous sw.js.
 */
const CACHE = 'cadenas-__CACHE_VERSION__';
const PRECACHE = __PRECACHE__;

// Adresse des téléchargements en flux : <portée>/__download__/<identifiant>.
const DOWNLOAD_PATH = new URL('./__download__/', self.registration.scope).pathname;
const downloads = new Map(); // identifiant → { name, stream }, jusqu'à sa lecture
const aborts = new Map(); // identifiant → interrompt le téléchargement, jusqu'à sa fin

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
  if (event.origin !== self.location.origin) return;
  const { data } = event;
  if (data === 'SKIP_WAITING') self.skipWaiting();
  else if (data?.type === 'download' && event.ports[0]) openDownload(data, event.ports[0]);
  else if (data?.type === 'abort') aborts.get(data.id)?.();
  // data.type === 'keepalive' : le message suffit à garder le service worker
  // actif pendant un long téléchargement.
});

/**
 * Prépare un téléchargement en flux. Les données arrivent par le port, bloc
 * par bloc et seulement à la demande (« pull ») : le chiffrement avance au
 * rythme de l'écriture sur le disque, sans rien accumuler en mémoire.
 */
function openDownload({ id, name }, port) {
  if (typeof id !== 'string' || !/^[0-9a-f]{32}$/.test(id) || typeof name !== 'string') return port.close();
  let controller;
  let pending = null; // promesse de pull() en attente d'un bloc
  const finish = (error) => {
    try {
      if (error) controller.error(new Error('Téléchargement interrompu'));
      else controller.close();
    } catch {
      // Flux déjà annulé par le navigateur.
    }
    port.close();
    downloads.delete(id);
    aborts.delete(id);
  };
  port.onmessage = ({ data }) => {
    if (!(data?.chunk instanceof Uint8Array)) finish(!data?.done);
    else {
      try {
        controller.enqueue(data.chunk);
      } catch {
        finish(true);
      }
    }
    pending?.();
    pending = null;
  };
  aborts.set(id, () => {
    finish(true);
    pending?.();
    pending = null;
  });
  const stream = new ReadableStream(
    {
      start(c) {
        controller = c;
      },
      pull() {
        port.postMessage('pull');
        return new Promise((resolve) => {
          pending = resolve;
        });
      },
      // Téléchargement annulé par l'utilisateur, dans le navigateur.
      cancel() {
        port.postMessage('cancel');
        port.close();
        aborts.delete(id);
      },
    },
    // Aucun bloc demandé avant que le navigateur ne commence à lire.
    new CountQueuingStrategy({ highWaterMark: 0 }),
  );
  downloads.set(id, { name, stream });
  port.postMessage('ready');
}

function serveDownload(url) {
  const id = url.pathname.slice(DOWNLOAD_PATH.length);
  const download = downloads.get(id);
  downloads.delete(id); // à usage unique
  // Introuvable ou déjà servi : 204, pour que la page reste affichée.
  if (!download) return new Response(null, { status: 204 });
  return new Response(download.stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      // filename : repli en ASCII pour les navigateurs qui ignorent filename*.
      'Content-Disposition': `attachment; filename="${download.name.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(download.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}

// Cache d'abord, réseau ensuite ; une navigation hors ligne renvoie la page.
// ignoreVary : certains serveurs répondent « Vary: Origin », et les scripts
// modules sont demandés avec un en-tête Origin : sans cette option, ils ne
// seraient jamais trouvés en cache. Sans risque : le cache ne contient que les
// fichiers statiques de ce site.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(DOWNLOAD_PATH)) return event.respondWith(serveDownload(url));
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
