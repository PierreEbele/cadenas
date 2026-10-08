// Style et règles du code : configuration recommandée d'ESLint, sans règle de
// mise en forme (celle-ci est fixée par .editorconfig). `npm run lint` la
// vérifie, et la CI l'impose à chaque push et chaque pull request.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['build/', 'dist/', 'src/wordlists/', 'site-docs/.vitepress/cache/', 'site-docs/.vitepress/dist/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    files: ['web/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker, ...globals.serviceworker },
    },
  },
  {
    // Tests de bout en bout : les fonctions passées à page.evaluate() tournent
    // dans le navigateur.
    files: ['e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Constantes injectées au build (exécutables autonomes, service worker).
    files: ['bin/cadenas.js'],
    languageOptions: { globals: { __CADENAS_VERSION__: 'readonly' } },
  },
  {
    files: ['web/sw-template.js'],
    languageOptions: { globals: { __PRECACHE__: 'readonly' } },
  },
];
