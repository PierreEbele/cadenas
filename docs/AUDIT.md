# Security audit scope

cadenas has not been audited by independent specialists yet. This document
is the brief for that audit: what cadenas is, what should be reviewed, and
the questions we most want answered. It is written for auditors and for the
programs that fund audits of open-source security software.

## The project in one paragraph

cadenas encrypts a file with a password. It runs as a static website
(everything happens in the browser, nothing is sent over the network), as a
command-line tool (Node.js, or standalone executables) and as a library. It
writes its own format, `.cadenas` (Argon2id, HKDF-SHA256, HMAC-SHA256 and
XChaCha20-Poly1305 in a STREAM construction), and reads and writes the
[age](https://age-encryption.org) passphrase format for interoperability.
License: MIT. About 1,500 lines of JavaScript in scope, 5 runtime
dependencies.

## Security goals

From [SECURITY.md](../SECURITY.md) and the
[assurance case](ASSURANCE.md) (both in French):

1. **Confidentiality**: without the password, the content of an encrypted
   file cannot be read.
2. **Integrity**: any modification, truncation or reordering of an encrypted
   file is detected, and cadenas never returns altered content.
3. **Locality**: on the website, neither files nor passwords leave the
   device.

The threat model, trust boundaries and known limits are in
[ASSURANCE.md](ASSURANCE.md).

## In scope

| Area | Files | Lines |
|---|---|---:|
| `.cadenas` format specification | [docs/FORMAT.md](FORMAT.md) | — |
| `.cadenas` implementation | `src/format-cadenas.js` | 319 |
| age passphrase format (wrapper around `age-encryption`) | `src/format-age.js` | 104 |
| Format detection, stream helpers, public API | `src/detect.js`, `src/bytes.js`, `src/core.js` | 179 |
| Zip archives of several files (path sanitisation) | `src/archive.js` | 90 |
| Passphrase generation (uniform sampling, entropy) | `src/passphrase.js` | 65 |
| Web: encryption worker, service worker (offline cache, streamed downloads) | `web/worker.js`, `web/sw-template.js` | ~250 |
| Web: Content Security Policy | `vite.config.js`, `docker/security-headers.conf`, `docker/nginx.conf` | — |
| CLI: password input, output files (no partial file left on error) | `bin/cadenas.js`, `src/prompt.js` | ~500 |

## Out of scope

- The cryptographic primitives and their implementations: `@noble/ciphers`,
  `@noble/hashes` (both independently audited), `hash-wasm` (Argon2id) and
  `age-encryption` (the reference TypeScript implementation of age). Their
  *use* by cadenas is in scope.
- The page's user interface (`web/main.js`, `web/index.html`) except where it
  handles secrets or the download of results.
- The release pipeline. It is documented in [SECURITY.md](../SECURITY.md)
  (signed tags, provenance, reproducible site build) and can be a separate,
  optional item.

## Questions for the auditors

1. **Format**: is the construction in [FORMAT.md](FORMAT.md) sound? In
   particular the header MAC and its role as AAD for every chunk, the key
   separation with HKDF, the 16-byte random nonce prefix with a 64-bit
   counter and last-chunk flag, and the handling of empty files and of
   files whose size is a multiple of the chunk size.
2. **Implementation versus specification**: does `src/format-cadenas.js`
   implement the specification exactly, including every rejection rule
   (Argon2id parameter bounds checked before key derivation, unknown
   versions, truncated or extended files, empty final chunks)?
3. **Streaming**: can decrypted data ever be released before it is
   authenticated? Can a truncated file ever be reported as complete, in the
   CLI (temporary file then rename), with standard output, and on the
   website (in memory, File System Access, or streamed through the service
   worker)?
4. **Password handling**: Unicode NFC normalisation, no empty passwords, key
   material zeroed after use where the language allows, no logging.
5. **Website isolation**: does the CSP (`connect-src 'none'`, no inline
   script) really prevent the page from sending data? Is the service worker
   (which may carry streamed results, never passwords) a new risk?
6. **Archives**: is zip-slip ruled out in the archives cadenas creates?
7. **Denial of service**: can a crafted file make cadenas use unbounded
   memory or time?

## What already exists to help

- A byte-exact test vector ([test/fixtures/vector-v1.json](../test/fixtures/vector-v1.json))
  and an independent minimal implementation used as a cross-check
  (`test/reference.test.js`).
- Property-based tests with fast-check on random and tampered inputs
  (`test/properties.test.js`).
- Interoperability tests against the official `age` binary (CI) and
  end-to-end tests of the website in Chromium, Firefox and WebKit (`e2e/`).
- CodeQL (`security-extended`), ESLint, 80 % minimum test coverage, all in
  CI.

## Expected deliverables

- A report that can be published in full, with each finding rated.
- A retest of the fixes.

The report will be published in this repository and linked from the README,
SECURITY.md and FORMAT.md. Any vulnerability is handled with the process in
[SECURITY.md](../SECURITY.md).

## Programs that fund audits of open-source software

To contact, with this document:

- [OSTIF](https://ostif.org) (Open Source Technology Improvement Fund)
- [Open Technology Fund](https://www.opentech.fund), Red Team Lab
- [NLnet](https://nlnet.nl), NGI Zero programs, whose grantees can receive a
  security audit
- [Alpha-Omega](https://alpha-omega.dev) (OpenSSF)

## Contact

Pierre Ebele, maintainer — [@PierreEbele](https://github.com/PierreEbele).
