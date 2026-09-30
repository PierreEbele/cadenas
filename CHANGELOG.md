# Changelog

**English** · [Français](CHANGELOG.fr.md)

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.6.0] - 2026-10-01

Security hardening after two external reviews (Argon2id cost limits, key
wiping, safer password input and temporary files, anti-framing), Homebrew
and winget published at each release, and passphrases separated by hyphens.
The Argon2id limits of the `.cadenas` format are lowered: files written by
cadenas are not affected.

### Added

- Windows executable: file properties of cadenas (product name, version, publisher) instead of those of Node.js, and code signing through SignPath ready in the release workflow, enabled once the project is accepted by the SignPath Foundation ([docs/CODE_SIGNING.md](docs/CODE_SIGNING.md)).
- Releases: the Homebrew formula is tested and published, and a winget pull request is opened, automatically after each GitHub release (`homebrew` and `winget` jobs of `release.yml`). `scripts/packaging.js` accepts `--homebrew` or `--winget` to generate only one of them.
- Installation with Homebrew (macOS, Linux): `brew install pierreebele/cadenas/cadenas`, from the [PierreEbele/homebrew-cadenas](https://github.com/PierreEbele/homebrew-cadenas) tap, tested on macOS and Linux.

### Changed

- Passphrases: words are now separated by hyphens (`navaux-tapageur-faucher-gazier-girafon`) instead of spaces: no invisible double or trailing space, no quotes needed in a terminal, accepted by sites that refuse spaces. The English list loses its 4 hyphenated words (7,772 words instead of 7,776, still more than 64 bits for 5 words). Existing passphrases are not affected.

### Fixed

- Armored age files: only the start of the file is read to recognize a passphrase file, instead of converting the whole file to text (twice the memory, and a crash above 512 MB).
- CLI: `-f` now also overwrites a read-only output file on Windows.
- Website: a `.cadenas` or `.age` file whose content is not recognized (damaged) is reported, instead of being encrypted a second time.
- Building the standalone executables works from a path with spaces or accents.

### Security

- Format: Argon2id parameters are limited to 256 MiB and 16 passes (instead of 1 GiB and 64), in FORMAT.md and in the code. A crafted file can no longer impose more than about twenty times the default cost before its header is authenticated. Files written by cadenas (64 MiB, 3 passes) are not affected; files written with larger parameters through the library are now rejected.
- Derived keys: the header key is now wiped from memory after use, like the Argon2id output and the content key.
- CLI: output files are created readable by their owner only (`0600`), and the temporary file, which may hold part of the decrypted content, is deleted on Ctrl+C or when the process is stopped.
- CLI: escape sequences sent by the arrow, Delete or Home keys are ignored while typing the password; their characters were silently added to it. The terminal is restored even if the program is stopped while the password is typed.
- Website: the page refuses to run inside a frame of another site. On GitHub Pages, the security policy only comes through `<meta>`, where `frame-ancestors` is ignored.
- Archives: drive letters (`C:`) are removed from entry paths and `:` is replaced with `_`, which a Windows extractor could interpret as an alternate data stream.

## [1.5.0] - 2026-09-30

Hide file names, verify a file without decrypting it to disk, open encrypted
files straight from the system, large files on Firefox and Safari without
memory limits, and everything in English or French. No change to the file
format or the encryption.

### Added

- "Hide file name" option (website) and `--hide-name` (CLI): the file is placed in a `.zip` archive before encryption, and the result is given a neutral name (`cadenas-YYYY-MM-DD.zip.cadenas`). The original name is only visible after decryption. No change to the format.
- CLI: `cadenas verify <file>` command, which checks that a `.cadenas` or `.age` file is intact and the password is correct, without writing anything (exit code 0 or 1, handy for verifying backups).
- Website, Firefox and Safari: above 256 MiB, the result is downloaded as encryption proceeds, served by the service worker, instead of being kept entirely in memory. No more memory-related size limit on these browsers (after a first visit to the site).
- Installed website (Chrome, Edge): cadenas appears in "Open with" for `.cadenas` and `.age` files, which open ready to decrypt.
- Documentation in English by default, with a French version of each document (`*.fr.md`) and a language switch at the top. The website footer links to the documents in the displayed language, and release notes are in English.
- `packaging/`: Homebrew formula (macOS, Linux) and winget manifests (Windows), generated for a released version by `scripts/packaging.js` from the release checksums and the npm package. Publishing procedure in `packaging/README.md`.
- End-to-end tests of the website in Chromium, Firefox and WebKit (Playwright), enforced by CI: encrypt then decrypt, interoperability with the library and the age format, multi-file archive, wrong password, offline operation, CSP actually applied, no requests outside the site, axe accessibility audit (WCAG 2.1 AA, light and dark themes) and full keyboard navigation. `npm run test:e2e`.
- CI: the website is built on Linux, Windows and macOS, with Node.js 22 and 24, and the six builds must be bit-for-bit identical (reproducible build). `scripts/site-hashes.js` produces the list of hashes (`site-files.sha256` in releases); `SECURITY.md` explains how to verify for yourself that the published site matches the source code.

### Changed

- CLI: messages in English or French, following the system language (`LC_ALL`, `LC_MESSAGES`, `LANG`, `LANGUAGE`, or the regional settings on Windows). `cadenas passphrase` uses the word list of that language unless `--lang` is given.
- CLI: messages are now in English unless the system language is French (they were always in French). Scripts that read them should rely on the exit code, which is unchanged.
- `cadenas passphrase`: without `--lang`, the word list follows the interface language (it was always French).

### Security

- Publishing: `scripts/verify-tag.js` also checks that the tag points to the commit carrying its version (`package.json`); the release, npm and Docker workflows therefore reject a tag placed on the wrong commit, before any publication.
- New `npm run release:tag` script: creates the signed tag only from a clean, up-to-date main, for a version listed in the CHANGELOG, then verifies it.
- Website: the Content Security Policy now allows frames from the site itself (`frame-src 'self'`), used only for streamed downloads; frames from other sites stay blocked.
## [1.4.1] - 2026-09-30

Hardening of the website's service worker. No change to the file format or
the encryption.

### Security

- Website: the service worker verifies the origin of the messages it receives before installing a new version (CodeQL alert "Missing origin verification in `postMessage` handler").

## [1.4.0] - 2026-09-28

English README, documented project (OpenSSF Best Practices badge, silver
level) and hardened publishing: signed version tags, provenance attached to
releases. No change to the file format or the encryption.

### Added

- English README (`README.md`, displayed by default on GitHub and npm); the French version becomes `README.fr.md`, with a link between the two.
- OpenSSF Best Practices badge (silver level) in the README.
- Project documentation: governance and roles (`GOVERNANCE.md`), code of conduct (Contributor Covenant 2.1), roadmap (`ROADMAP.md`), architecture (`docs/ARCHITECTURE.md`), security rationale with threat model (`docs/ASSURANCE.md`).
- ESLint (recommended configuration): `npm run lint`, enforced by CI, and code style described in `CONTRIBUTING.md`.
- CI: test coverage of `src/` and `bin/` measured on every push, with a minimum of 80% (`npm run test:coverage`).

### Changed

- npm package: English description, more complete keywords, homepage pointing to the website.
- npm publishing: the npm bundled with Node.js 24 is used (and its version checked) instead of installing another unpinned version.

### Security

- Signed (SSH) version tags: the publishing workflows (release, npm, Docker) verify the tag signature with `scripts/verify-tag.js` and refuse to publish an unsigned version. Procedure in `CONTRIBUTING.md`, verification in `SECURITY.md`.
- GitHub releases: signed provenance is attached to every release (`.sigstore.json` and `.intoto.jsonl` in SLSA format), for offline verification.
- `SECURITY.md`: process for handling vulnerability reports (timeframes, disclosure, credit).

## [1.3.0] - 2026-09-27

Installable, offline-capable website, standalone CLI executables.
No change to the file format.

### Added

- Website installable and usable offline (progressive web app): manifest, icons, and a service worker that caches all site files. A new version installs in the background and only takes effect after clicking "Update", never in the middle of an encryption.
- Docker image: the service worker gets its own content security policy (`connect-src 'self'`, to cache the site); the page keeps `connect-src 'none'`. The manifest is served with the correct MIME type.
- Standalone CLI executables, no Node.js to install: Windows x64, macOS arm64, Linux x64 and arm64. Built by CI (Node.js "Single Executable Application"), tested on each platform before release, attached to every release with checksums and a provenance attestation. `npm run build:exe` builds the one for the current platform.
- The release workflow can be triggered manually to build and test everything without publishing anything.

### Changed

- README: updated screenshots (passphrase generator, language selector), offline installation.

## [1.2.0] - 2026-09-27

Multiple files and folders, files of any size on the website, and a CLI
ready for backup scripts. No change to the file format.

### Added

- Archives: multiple files or a folder are bundled into a `.zip` archive produced as a stream (`src/archive.js`, client-zip library), then encrypted into a single file. Directory structure and Unicode names preserved, paths sanitized (no absolute paths or `..`), duplicates renamed, Zip64 beyond 4 GB, files opened one at a time.
- Website: multiple files or an entire folder, by drag-and-drop or selection ("Choose an entire folder" button). They are combined into `folder.zip` (or `cadenas-YYYY-MM-DD.zip`) and then encrypted; on decryption, the site reminds you that the archive simply needs to be opened.
- Website: beyond 256 MiB, the result is written directly to disk (Chrome, Edge: the site asks where to save it before starting), with constant memory usage regardless of size. On other browsers, a message recommends Chrome, Edge, or the command line for several GB.
- CLI: `cadenas lock` accepts multiple files and folders (traversed recursively, symbolic links ignored) → `folder.zip.cadenas` or `cadenas-YYYY-MM-DD.zip.cadenas`.
- CLI: `-` for standard input (`cadenas lock -`, `cadenas unlock -`) and `-o -` for standard output; refuses to write binary to a terminal.
- CLI: `--password-file <file>` option; when standard input carries the data, the password is prompted directly on the terminal.

### Changed

- CLI: success messages ("✔ File encrypted…") now go to standard error, so that standard output contains only data.

## [1.1.0] - 2026-09-27

Passphrase generator, English website, and a fully verifiable release pipeline.
No change to the file format.

### Added

- Passphrase generator: "Generate a passphrase" button on the website (with one-click copy) and `cadenas passphrase [--words n] [--lang fr|en]` command. 5 words drawn without bias from the system random generator, more than 64 bits of entropy. Word lists: Tails (French, CC0) and EFF (English, CC BY 3.0 US), loaded on demand only on the website.
- Website: "Cancel" button during encryption or decryption.
- Website: the browser asks for confirmation before leaving the page during processing, or if the result has not been downloaded yet.
- English website: language chosen based on the browser, "English / Français" button in the footer, choice remembered. The passphrase generator uses the word list of the displayed language.

### Security

- Dependabot: weekly updates of npm dependencies, GitHub Actions, and the Docker base image; automatic security fixes.
- CodeQL analysis of code and workflows on every push and every week.
- OpenSSF Scorecard: public score of best practices, badge in the README.
- Private vulnerability reporting enabled on GitHub.
- GitHub Actions updated to their latest major versions.
- Docker image signed with cosign (keyless, Sigstore), with SBOM and provenance attestation.
- GitHub releases created automatically by CI: notes drawn from the CHANGELOG, website archived (`cadenas-site-vX.Y.Z.zip`), `SHA256SUMS` and `site-files.sha256` fingerprints, verifiable provenance attestation with `gh attestation verify`.
- SECURITY.md: how to verify the npm package, the Docker image, release files, and a self-hosted website.
- CI dependencies pinned: GitHub Actions by commit hash, base Docker images by digest, npm version fixed (Dependabot keeps them up to date).
- `main` branch protected against deletion and history rewriting.
- Property-based tests (fuzzing with fast-check): round-trip for any content, password, and chunking; detection of any modification, truncation, or added bytes; clean rejection of arbitrary inputs.

### Changed

- README: screenshot of the website, in light and dark versions depending on the reader's theme.

## [1.0.2] - 2026-09-27

First release published automatically by GitHub Actions, with verifiable
provenance attestation on npm. No code changes.

### Added

- Automatic publication on npm on every version tag (`.github/workflows/npm.yml`), via trusted publishing (OIDC): no stored token, provenance attestation attached to each release, check that the tag matches `package.json`.

## [1.0.1] - 2026-09-27

First publication on npm: `npm install -g cadenas`. No code changes.

### Changed

- README: installation via npm (`npm install -g cadenas`, `npx cadenas`) and npm version badge.
- `package.json`: tests run automatically before each publication (`prepublishOnly`); public publication by default.

## [1.0.0] - 2026-09-27

First stable release. The `.cadenas` v1 format is now frozen: files encrypted with this version will remain readable by all future versions.

In summary:

- **Website** 100% in the browser for encrypting / decrypting a file with a password, online at <https://pierreebele.github.io/cadenas/>.
- **Self-hostable Docker image**: `docker run -p 8080:8080 ghcr.io/pierreebele/cadenas`.
- **Command line**: `cadenas lock` / `cadenas unlock`.
- **`.cadenas` v1 format** (Argon2id + XChaCha20-Poly1305), specified in `docs/FORMAT.md`.
- **age compatibility** for both reading and writing.

### Added

- Full README: website usage, Docker hosting, command line, format comparison, security, API, development.
- `CONTRIBUTING.md`: project principles, format evolution rules, release process.

## [0.7.0] - 2026-09-27

### Added

- GitHub Actions continuous integration (`.github/workflows/ci.yml`):
  - tests and builds on Linux, Windows and macOS with Node.js 22 and 24;
  - real interoperability with the official `age` tool, in both directions;
  - Docker image build and verification of security headers, served content, and non-root execution.
- Automatic deployment of the website to GitHub Pages on every push to `main` (`pages.yml`).
- Image published to GitHub Container Registry on every release, for `linux/amd64` and `linux/arm64` (`docker.yml`).

### Changed

- Node.js 22 minimum (Node.js 20 is no longer maintained as of April 2026).

## [0.6.0] - 2026-09-27

### Added

- `cadenas` command-line interface (`bin/cadenas.js`, no additional dependencies):
  - `cadenas lock <file>` → `<file>.cadenas`, or `<file>.age` with `--age`;
  - `cadenas unlock <file>`: format detected automatically;
  - `encrypt` / `decrypt` aliases;
  - options `-o/--output`, `-f/--force`, `--password-stdin`, `-h/--help`, `-v/--version`.
- Masked password input with confirmation (`src/prompt.js`).
- Atomic writes: if the password is wrong or the file is corrupted, no partial file is left behind.
- Refuses to overwrite an existing file without `-f`.
- Progress displayed in the terminal; exit codes 0 (success), 1 (error), 2 (misuse), 130 (cancellation).
- End-to-end CLI tests (real processes).
- `package.json`: `bin`, `exports`, and `files` fields for a future npm release.

## [0.5.0] - 2026-09-27

### Added

- Self-hostable Docker image (`Dockerfile`) :
  - two-stage build: Vite in `node:24-alpine`, then served by `nginx-unprivileged` (non-root user, port 8080) ;
  - the container serves only static files: the server never sees any file or password ;
  - built-in health check.
- nginx configuration (`docker/`) : strict security headers, including a CSP `connect-src 'none'` that technically forbids the page from making any network connection ; long-term caching for versioned files ; no access logs.
- `compose.yaml` : launch with a single command, read-only, unprivileged container.
- The same CSP is injected into the HTML at build time, for hosts without custom header support (GitHub Pages).

## [0.4.0] - 2026-09-27

### Added

- Website (`web/`), built with Vite as static pages :
  - drag-and-drop or file selection, automatic encrypt/decrypt detection ;
  - password with confirmation, on-demand visibility and strength indicator ;
  - choice of `.cadenas` (recommended) or `.age` format ;
  - encryption in a Web Worker (the page never freezes) with a progress bar ;
  - automatic light/dark theme, mobile-friendly layout, keyboard navigation ;
  - no external resources, no network requests: everything stays in the browser.
- `src/detect.js` (dependency-free format detection) and `src/names.js` (names of output files), shared with the upcoming CLI.
- `npm run dev`, `npm run build`, `npm run preview` scripts.

## [0.3.0] - 2026-09-27

### Added

- Compatibility with the [age](https://age-encryption.org) format via the official `age-encryption` library (`src/format-age.js`) :
  - password-based (scrypt) age encryption, readable by `age -d` and `rage` ;
  - decryption of binary and armored (`age -a`) age files ;
  - clear message for age files encrypted to a public key (not supported).
- Single public API `src/core.js`: `encrypt(stream, password, { format })` and `decrypt(stream, password)` with automatic format detection based on the first bytes.
- New error code `UNSUPPORTED_AGE`.

## [0.2.0] - 2026-09-27

### Added

- `.cadenas` v1 file format (`src/format-cadenas.js`) :
  - password derivation using Argon2id (64 MiB, 3 passes by default, parameters stored in the header) ;
  - separate header and content keys derived via HKDF-SHA256 ;
  - header authenticated with HMAC-SHA256: a wrong password is detected immediately ;
  - content encrypted with XChaCha20-Poly1305 in 64 KiB blocks, streamed (files of any size) ;
  - detection of truncated or modified files, or files whose blocks have been reordered.
- Format specification: `docs/FORMAT.md`, with test vector `test/fixtures/vector-v1.json`.
- Tests (`node:test`), including an independent reference implementation written from the specification.
- `SECURITY.md`: guarantees, limitations, and vulnerability reporting.

## [0.1.0] - 2026-09-27

### Added

- Project initialization: `package.json`, MIT license, README, `.editorconfig`, `.gitignore`.

[Unreleased]: https://github.com/PierreEbele/cadenas/compare/v1.6.0...HEAD
[1.6.0]: https://github.com/PierreEbele/cadenas/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/PierreEbele/cadenas/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/PierreEbele/cadenas/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/PierreEbele/cadenas/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/PierreEbele/cadenas/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/PierreEbele/cadenas/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/PierreEbele/cadenas/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/PierreEbele/cadenas/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/PierreEbele/cadenas/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/PierreEbele/cadenas/compare/v0.7.0...v1.0.0
[0.7.0]: https://github.com/PierreEbele/cadenas/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/PierreEbele/cadenas/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/PierreEbele/cadenas/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/PierreEbele/cadenas/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/PierreEbele/cadenas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/PierreEbele/cadenas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/PierreEbele/cadenas/releases/tag/v0.1.0
