import { defineConfig } from 'vite';

// Politique de sécurité injectée dans le HTML construit, pour les hébergeurs
// qui ne permettent pas d'envoyer des en-têtes (GitHub Pages). L'image Docker
// envoie en plus la même politique en en-tête HTTP (docker/security-headers.conf).
// Absente en développement : elle bloquerait le rechargement à chaud de Vite.
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
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

export default defineConfig({
  root: 'web',
  // Chemins relatifs : le même build fonctionne à la racine d'un domaine
  // (Docker) comme dans un sous-dossier (GitHub Pages).
  base: './',
  plugins: [cspMeta],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  worker: {
    format: 'es',
  },
});
