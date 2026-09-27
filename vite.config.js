import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  // Chemins relatifs : le même build fonctionne à la racine d'un domaine
  // (Docker) comme dans un sous-dossier (GitHub Pages).
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  worker: {
    format: 'es',
  },
});
