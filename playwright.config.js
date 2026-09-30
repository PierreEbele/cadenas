// Tests de bout en bout du site dans de vrais navigateurs (Chromium, Firefox,
// WebKit), sur le site construit : c'est lui qui applique la CSP et installe
// le service worker. `npm run test:e2e` ; la première fois :
// `npx playwright install chromium firefox webkit`.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // La dérivation de clé (Argon2id, 64 Mio) prend plusieurs secondes par
  // chiffrement, davantage sous WebKit.
  timeout: 90_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
