import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vite';

// Politique de sécurité injectée dans le HTML construit, pour les hébergeurs
// qui ne permettent pas d'envoyer des en-têtes (GitHub Pages). L'image Docker
// envoie en plus la même politique en en-tête HTTP (docker/security-headers.conf).
// Absente en développement : elle bloquerait le rechargement à chaud de Vite.
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  // Iframe cachée des téléchargements en flux (servis par le service worker).
  "frame-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "manifest-src 'self'",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

const cspMeta = {
  name: 'cadenas-csp-meta',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
};

// Service worker (fonctionnement hors ligne) : web/sw-template.js complété de
// la liste exacte des fichiers du build et d'une version dérivée de leur contenu.
const serviceWorker = {
  name: 'cadenas-service-worker',
  apply: 'build',
  generateBundle(_options, bundle) {
    const publicDir = new URL('./web/public/', import.meta.url);
    // Fichiers de premier niveau seulement : .well-known/security.txt n'a pas
    // besoin de fonctionner hors ligne.
    const publicFiles = readdirSync(publicDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
    const files = [...Object.keys(bundle), ...publicFiles]
      .filter((name) => name !== 'index.html' && !name.endsWith('.map'))
      .sort();
    const precache = ['./', ...files];

    const hash = createHash('sha256');
    for (const name of Object.keys(bundle).sort()) {
      const chunk = bundle[name];
      hash.update(name).update(chunk.type === 'chunk' ? chunk.code : chunk.source);
    }
    for (const name of publicFiles.sort()) hash.update(name).update(readFileSync(new URL(name, publicDir)));
    const version = hash.digest('hex').slice(0, 16);

    const source = readFileSync(new URL('./web/sw-template.js', import.meta.url), 'utf8')
      .replace('__CACHE_VERSION__', version)
      .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  },
};

export default defineConfig({
  root: 'web',
  // Chemins relatifs : le même build fonctionne à la racine d'un domaine
  // (Docker) comme dans un sous-dossier (GitHub Pages).
  base: './',
  plugins: [cspMeta, serviceWorker],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  worker: {
    format: 'es',
  },
});
