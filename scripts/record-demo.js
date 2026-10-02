// Enregistre la démo du README (docs/images/demo-en.gif, demo-fr.gif).
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/record-demo.js en /tmp/demo-en
//   ffmpeg -ss 0.4 -i /tmp/demo-en/*.webm -vf "fps=12,scale=480:-1:flags=lanczos,split[a][b];\
//     [a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:\
//     diff_mode=rectangle" docs/images/demo-en.gif
//
// CHROME=<chemin> permet d'utiliser un Chromium déjà installé.
import { chromium } from '@playwright/test';

const [lang = 'en', out = 'demo'] = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const size = { width: 720, height: 860 };

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const context = await browser.newContext({
  locale: lang === 'fr' ? 'fr-FR' : 'en-US',
  viewport: size,
  recordVideo: { dir: out, size },
});
const page = await context.newPage();
await page.goto('http://localhost:4173/');
await sleep(1200);

const name = lang === 'fr' ? 'rapport-annuel-2026.pdf' : 'annual-report-2026.pdf';
await page.locator('#file').setInputFiles({ name, mimeType: 'application/pdf', buffer: Buffer.alloc(2_400_000, 7) });
await sleep(1200);
await page.locator('#generate').hover();
await sleep(400);
await page.locator('#generate').click();
await sleep(1800);
await page.locator('#submit').hover();
await sleep(400);
await page.locator('#submit').click();
await page.locator('#result').waitFor({ state: 'visible', timeout: 60_000 });
await sleep(800);
await page.locator('#download').hover();
await sleep(2200);

await context.close();
await browser.close();
