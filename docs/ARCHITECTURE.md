# Architecture

cadenas se compose d'un **cœur** commun (`src/`) et de deux interfaces qui
l'utilisent : le **site** (`web/`) et la **ligne de commande** (`bin/`). Le
même code chiffre et déchiffre dans le navigateur et dans Node.js.

```
                ┌──────────────────────────┐   ┌───────────────────────┐
  navigateur    │ web/main.js (page)       │   │ bin/cadenas.js (CLI)  │  Node.js
                │   ↕ postMessage          │   │  fichiers, stdin/out, │
                │ web/worker.js (Worker)   │   │  src/prompt.js        │
                └────────────┬─────────────┘   └───────────┬───────────┘
                             └──────────────┬──────────────┘
                                   src/core.js (API publique)
               ┌──────────────┬─────────────┼──────────────┬──────────────┐
      format-cadenas.js  format-age.js   detect.js     archive.js     names.js
      (Argon2id, HKDF,   (bibliothèque   (reconnaît    (zip en flux,  (noms des
       XChaCha20-        age-encryption)  le format)    client-zip)    fichiers)
       Poly1305)
```

## Cœur (`src/`)

Tout passe par des flux (`ReadableStream<Uint8Array>`, API Web Streams),
disponibles à l'identique dans les navigateurs et dans Node.js. Aucun
fichier n'est chargé entièrement en mémoire.

| Module | Rôle |
|---|---|
| `core.js` | API publique : `encrypt()` et `decrypt()` (détection automatique du format), réexporte le reste. |
| `format-cadenas.js` | Format `.cadenas` v1, spécifié dans [FORMAT.md](FORMAT.md) : Argon2id → HKDF-SHA256 → en-tête authentifié par HMAC-SHA256, contenu en blocs de 64 Kio chiffrés par XChaCha20-Poly1305 (construction STREAM). |
| `format-age.js` | Adaptateur vers la bibliothèque officielle `age-encryption` (mode mot de passe, scrypt). |
| `detect.js` | Reconnaît `.cadenas`, `.age` et age « armuré » d'après les premiers octets. |
| `archive.js` | Réunit plusieurs fichiers ou un dossier en une archive `.zip` produite en flux, avec des chemins nettoyés. |
| `names.js` | Noms des fichiers produits (`x.pdf` → `x.pdf.cadenas`, et inversement). |
| `passphrase.js` | Phrases de passe aléatoires (listes Tails et EFF, `crypto.getRandomValues`). |
| `bytes.js` | Utilitaires de flux (file d'octets, lecture anticipée pour la détection). |
| `errors.js` | `CadenasError` et ses codes stables (`WRONG_PASSWORD`, `CORRUPTED`…). |
| `prompt.js` | Saisie du mot de passe au terminal, sans écho (CLI uniquement). |

Dépendances d'exécution : `@noble/ciphers`, `@noble/hashes` (primitives
auditées), `hash-wasm` (Argon2id en WebAssembly), `age-encryption` et
`client-zip`.

## Site (`web/`)

- `index.html`, `style.css` et `main.js` gèrent l'interface : choix des
  fichiers, mot de passe, progression, téléchargement.
- `worker.js` exécute la dérivation de clé et le chiffrement dans un Web
  Worker, pour ne jamais figer la page. Il peut écrire directement sur le
  disque (File System Access) au-delà de 256 Mio.
- `files.js` collecte les fichiers d'un glisser-déposer ou d'un sélecteur,
  dossiers compris.
- `strength.js` estime la solidité du mot de passe, à titre indicatif.
- `i18n.js` contient les textes en français et en anglais.
- `sw-template.js` est le modèle du service worker, qui met le site en cache
  pour le fonctionnement hors ligne.

Le build (`vite.config.js`) produit un site statique dans `dist/`. Il
injecte la politique de sécurité (CSP, `connect-src 'none'`) dans le HTML,
et génère `sw.js` avec la liste exacte des fichiers à mettre en cache.

## Ligne de commande (`bin/cadenas.js`)

Commandes `lock`, `unlock` et `passphrase`. La CLI lit des fichiers, des
dossiers ou l'entrée standard, et écrit dans un fichier temporaire renommé
seulement en cas de succès : une erreur ne laisse jamais de fichier
partiel. `scripts/build-sea.js` en fait un exécutable autonome (Node.js
Single Executable Application).

## Distribution

| Canal | Construit par | Contenu |
|---|---|---|
| GitHub Pages | `pages.yml`, à chaque push sur `main` | le site statique |
| npm | `npm.yml`, à chaque tag | `bin/`, `src/`, `docs/FORMAT.md` |
| `ghcr.io/pierreebele/cadenas` | `docker.yml`, à chaque tag | nginx non root servant le site, avec les en-têtes de sécurité |
| Releases GitHub | `release.yml`, à chaque tag | archive du site, exécutables autonomes, `SHA256SUMS`, attestations |

La vérification de ces livrables est décrite dans [SECURITY.md](../SECURITY.md).
