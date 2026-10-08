// Écrit .vitepress/dist/_headers : les en-têtes HTTP que Cloudflare Pages
// envoie avec chaque page du site de documentation.
//
// VitePress insère quelques scripts dans chaque page (thème clair ou sombre,
// table des pages). Plutôt qu'autoriser tout script en ligne, la CSP liste
// l'empreinte SHA-256 de chacun, calculée sur le build.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../.vitepress/dist/', import.meta.url));

const hashes = new Set();
for (const entry of readdirSync(dist, { recursive: true })) {
  if (!entry.endsWith('.html')) continue;
  const html = readFileSync(join(dist, entry), 'utf8');
  for (const [, code] of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    hashes.add(`'sha256-${createHash('sha256').update(code).digest('base64')}'`);
  }
}

const csp = [
  "default-src 'none'",
  `script-src 'self' ${[...hashes].sort().join(' ')}`,
  // Le thème met des styles dans des attributs style="…".
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Index de la recherche, chargé depuis le site lui-même.
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

writeFileSync(join(dist, '_headers'), headers);
console.log(`_headers écrit (${hashes.size} scripts en ligne autorisés par empreinte)`);
