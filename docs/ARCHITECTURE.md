# Architecture

**English** · [Français](ARCHITECTURE.fr.md)

cadenas is made of a shared **core** (`src/`) and two interfaces that use
it: the **website** (`web/`) and the **command line** (`bin/`). The same code
encrypts and decrypts in the browser and in Node.js.

```
                ┌──────────────────────────┐   ┌───────────────────────┐
  browser       │ web/main.js (page)       │   │ bin/cadenas.js (CLI)  │  Node.js
                │   ↕ postMessage          │   │  files, stdin/out,    │
                │ web/worker.js (Worker)   │   │  src/prompt.js        │
                └────────────┬─────────────┘   └───────────┬───────────┘
                             └──────────────┬──────────────┘
                                   src/core.js (public API)
               ┌──────────────┬─────────────┼──────────────┬──────────────┐
      format-cadenas.js  format-age.js   detect.js     archive.js     names.js
      (Argon2id, HKDF,   (age-encryption (recognizes   (streamed zip, (output
       XChaCha20-         library)        the format)   client-zip)    file names)
       Poly1305)
```

## Core (`src/`)

Everything goes through streams (`ReadableStream<Uint8Array>`, the Web
Streams API), available identically in browsers and in Node.js. No file is
ever loaded entirely into memory.

| Module | Role |
|---|---|
| `core.js` | Public API: `encrypt()` and `decrypt()` (automatic format detection), re-exports the rest. |
| `format-cadenas.js` | The `.cadenas` v1 format, specified in [FORMAT.md](FORMAT.md): Argon2id → HKDF-SHA256 → header authenticated with HMAC-SHA256, content in 64 KiB chunks encrypted with XChaCha20-Poly1305 (STREAM construction). |
| `format-age.js` | Adapter for the official `age-encryption` library (passphrase mode, scrypt). |
| `detect.js` | Recognizes `.cadenas`, `.age` and armored age from the first bytes. |
| `archive.js` | Bundles several files or a folder into a `.zip` archive produced as a stream, with sanitized paths. |
| `names.js` | Names of the output files (`x.pdf` → `x.pdf.cadenas`, and back). |
| `passphrase.js` | Random passphrases (Tails and EFF word lists, `crypto.getRandomValues`). |
| `bytes.js` | Stream helpers (byte queue, read-ahead for format detection). |
| `errors.js` | `CadenasError` and its stable codes (`WRONG_PASSWORD`, `CORRUPTED`…). |
| `prompt.js` | Password input in the terminal, without echo (CLI only). |

Runtime dependencies: `@noble/ciphers`, `@noble/hashes` (audited
primitives), `hash-wasm` (Argon2id in WebAssembly), `age-encryption` and
`client-zip`.

## Website (`web/`)

- `index.html`, `style.css` and `main.js` handle the interface: choosing
  files, password, progress, download.
- `worker.js` runs key derivation and encryption in a Web Worker, so the
  page never freezes. Above 256 MiB, it writes straight to disk (File System
  Access: Chrome, Edge), or sends the result to the service worker chunk by
  chunk (Firefox, Safari).
- `files.js` collects the files from a drag and drop or a file picker,
  folders included.
- `strength.js` estimates password strength, as a guide only.
- `i18n.js` holds the texts in French and English.
- `sw-template.js` is the template of the service worker, which caches the
  site for offline use. On Firefox and Safari, it also serves large results
  as downloads while they are being encrypted: the worker sends it one chunk
  per request, over a dedicated `MessagePort`, so nothing piles up in
  memory. It never sees the password, keeps nothing, and its own CSP forbids
  any access outside the site.

The build (`vite.config.js`) produces a static site in `dist/`. It injects
the security policy (CSP, `connect-src 'none'`) into the HTML, and generates
`sw.js` with the exact list of files to cache.

## Command line (`bin/cadenas.js`)

Commands `lock`, `unlock`, `verify` and `passphrase`. The CLI reads files,
folders or standard input, and writes to a temporary file that is renamed
only on success: an error never leaves a partial file behind.
`scripts/build-sea.js` turns it into a standalone executable (Node.js
Single Executable Application).

## Distribution

| Channel | Built by | Contents |
|---|---|---|
| GitHub Pages | `pages.yml`, on every push to `main` | the static site |
| npm | `npm.yml`, on every tag | `bin/`, `src/`, `docs/FORMAT.md` |
| `ghcr.io/pierreebele/cadenas` | `docker.yml`, on every tag | non-root nginx serving the site, with the security headers |
| GitHub Releases | `release.yml`, on every tag | site archive, standalone executables, `SHA256SUMS`, attestations |

How to verify these deliverables is described in [SECURITY.md](../SECURITY.md).
