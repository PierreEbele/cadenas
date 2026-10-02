# cadenas

**English** · [Français](README.fr.md)

> Encrypt a file with a password. Simply.

[![CI](https://github.com/PierreEbele/cadenas/actions/workflows/ci.yml/badge.svg)](https://github.com/PierreEbele/cadenas/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cadenas.svg)](https://www.npmjs.com/package/cadenas)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/PierreEbele/cadenas/badge)](https://scorecard.dev/viewer/?uri=github.com/PierreEbele/cadenas)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14992/badge)](https://www.bestpractices.dev/projects/14992)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**cadenas** (French for *padlock*) encrypts and decrypts a file with a password,
**right in your browser**: no file and no password is ever sent over the
Internet. The same tool is available on the command line.

<p align="center">
  <a href="https://pierreebele.github.io/cadenas/"><strong>Try it now</strong></a> ·
  <a href="#command-line">Command line</a> ·
  <a href="#self-host-with-docker">Docker</a> ·
  <a href="docs/FORMAT.md">Format</a>
</p>

<p align="center">
  <a href="https://pierreebele.github.io/cadenas/">
    <img src="docs/images/demo-en.gif" alt="Demo of the cadenas website: a file named annual-report-2026.pdf is chosen, a five-word passphrase is generated and rated excellent, the file is encrypted in a few seconds and annual-report-2026.pdf.cadenas is ready to download." width="480">
  </a>
</p>

- **Simple**: drop a file, choose a password, download the result.
- **Local**: everything happens on your device. The page is technically not
  allowed to open any network connection (Content Security Policy `connect-src 'none'`).
- **Strong**: Argon2id and XChaCha20-Poly1305; any change to an encrypted file is detected.
- **Open**: free software, [documented format](docs/FORMAT.md), compatible with
  [age](https://age-encryption.org).
- **Everywhere**: website (works offline, installable), command line for
  Windows, macOS and Linux, Docker image, JavaScript library.

## Contents

- [Why cadenas?](#why-cadenas)
- [Use the website](#use-the-website)
- [Self-host with Docker](#self-host-with-docker)
- [Command line](#command-line)
- [`.cadenas` and `.age` formats](#cadenas-and-age-formats)
- [Security](#security)
- [Use cadenas as a library](#use-cadenas-as-a-library)
- [FAQ](#faq)
- [Development](#development)

## Why cadenas?

You want to send a sensitive document by email, store a backup in the cloud or
keep a file on a USB stick, and you just need a password on it. Existing tools
are either command-line only, need to be installed, or are built for something
else (archives, encrypted disks). cadenas does one thing: **one file, one
password, from any device with a browser**.

| | **cadenas** | [age](https://age-encryption.org) | [7-Zip](https://www.7-zip.org) | [VeraCrypt](https://www.veracrypt.fr) |
|---|:---:|:---:|:---:|:---:|
| Works in the browser, nothing to install | ✅ | ❌ | ❌ | ❌ |
| Works on a phone (iOS, Android) | ✅ | ❌ | ❌ | ❌ |
| Graphical interface | ✅ | ❌ | ✅ | ✅ |
| Command line | ✅ | ✅ | ✅ | ✅ |
| Encrypts a plain file (no volume to mount) | ✅ | ✅ | ✅ | ❌ |
| Authenticated encryption: any tampering is detected | ✅ | ✅ | ❌ <sup>1</sup> | ❌ <sup>2</sup> |
| Memory-hard password derivation (slows down GPU attacks) | ✅ Argon2id | ✅ scrypt | ❌ <sup>3</sup> | — |
| Reads and writes age files | ✅ | ✅ | ❌ | ❌ |
| Self-hostable web version (Docker) | ✅ | ❌ | ❌ | ❌ |
| Free and open source | ✅ | ✅ | ✅ | ✅ |
| Independent security audit | ❌ [not yet](docs/AUDIT.md) | — | — | ✅ <sup>4</sup> |

<sup>1</sup> 7z archives check a CRC of the decrypted data, not a cryptographic tag.<br>
<sup>2</sup> VeraCrypt volumes use XTS mode, which does not detect changes.<br>
<sup>3</sup> 7-Zip derives the key with iterated SHA-256.<br>
<sup>4</sup> Audited by Quarkslab in 2016.<br>
—: depends on the version, or not checked by us.

**Use something else when**: you want public-key encryption (use
[age](https://age-encryption.org)), a whole encrypted disk or hidden volumes
(use [VeraCrypt](https://www.veracrypt.fr)), or compressed archives first and
foremost (use [7-Zip](https://www.7-zip.org)).

## Use the website

Online version: **<https://pierreebele.github.io/cadenas/>**

1. Drop a file, several files or a whole folder (they are then bundled into
   an encrypted `.zip` archive).
2. Enter a password.
3. Download the result.

cadenas detects on its own whether a file needs to be encrypted or decrypted.
The website is available in English and French, following your browser's
language.

After a first visit, **the website works offline** and can be installed as an
app (browser menu → “Install cadenas” or “Add to Home Screen”). Results larger
than 256 MiB are never held in memory: Chrome and Edge write them straight to
disk, Firefox and Safari download them as they are produced. Once installed on
Chrome or Edge, cadenas also shows up in “Open with” for `.cadenas` and `.age`
files.

## Self-host with Docker

The image only contains a small nginx server that serves the page. Encryption
stays in each visitor's browser: your server never sees the files or the
passwords.

```bash
docker run -d -p 8080:8080 --name cadenas ghcr.io/pierreebele/cadenas
```

The website is then available at <http://localhost:8080>.

With Docker Compose, using the repository's [`compose.yaml`](compose.yaml),
which runs the container read-only and without privileges:

```bash
docker compose up -d
```

The image is published for `linux/amd64` and `linux/arm64` (Raspberry Pi, NAS…).
It runs as a non-root user and sends strict security headers
(see [`docker/security-headers.conf`](docker/security-headers.conf)).
To build it yourself: `docker build -t cadenas .`

> Serve the website over **HTTPS** if you expose it beyond your local network
> (for example behind Caddy, Traefik or nginx), otherwise the page could be
> tampered with in transit.

## Command line

**With Homebrew** (macOS, Linux):

```bash
brew install pierreebele/cadenas/cadenas
```

**With Node.js** (22 or newer):

```bash
npm install -g cadenas
```

Or without installing anything: `npx cadenas lock report.pdf`.

**Without Node.js**: download the executable for your system from the
[latest release](https://github.com/PierreEbele/cadenas/releases/latest)
(`cadenas-vX.Y.Z-windows-x64.exe`, `-macos-arm64`, `-linux-x64`, `-linux-arm64`),
rename it `cadenas` and put it in your `PATH`. These files are not signed by a
recognized publisher: Windows may show a SmartScreen warning (“More info” →
“Run anyway”), and on macOS you need to remove the quarantine flag with
`xattr -d com.apple.quarantine cadenas`. You can check that an executable was
built by this repository:
`gh attestation verify cadenas-vX.Y.Z-linux-x64 --repo PierreEbele/cadenas`.

```bash
cadenas lock report.pdf               # → report.pdf.cadenas
cadenas unlock report.pdf.cadenas     # → report.pdf
cadenas verify report.pdf.cadenas     # checks the file and password, writes nothing
cadenas lock photos/                  # → photos.zip.cadenas (the whole folder)
cadenas lock a.pdf b.pdf              # → cadenas-YYYY-MM-DD.zip.cadenas
cadenas lock --age report.pdf         # → report.pdf.age, readable by age / rage
cadenas lock --hide-name report.pdf   # → cadenas-YYYY-MM-DD.zip.cadenas (name kept inside)
cadenas passphrase --lang en          # → random 5-word passphrase
```

Several files or folders are bundled into a `.zip` archive before being
encrypted; once decrypted, it opens with any archive tool.

`-` stands for standard input or output, for scripts and backups:

```bash
tar c project | cadenas lock - --password-file ~/.key > project.tar.cadenas
cadenas unlock project.tar.cadenas -o - --password-file ~/.key | tar x
```

| Option | Purpose |
|---|---|
| `-o, --output <path>` | output file (`-`: standard output) |
| `-f, --force` | overwrite the output file if it exists |
| `--age` | encrypt in the age format (with `lock`) |
| `--password-file <file>` | read the password from a file (first line) |
| `--password-stdin` | read the password from standard input |
| `-h, --help` / `-v, --version` | help / version |
| `-w, --words <n>` | number of words for `passphrase` (default 5) |
| `--lang <fr\|en>` | language of the `passphrase` words (default fr) |

The password is asked without echo (twice when encrypting), directly in the
terminal even when data comes from standard input. When writing to a file, an
error (wrong password, tampered file) never leaves a partial file behind; when
writing to standard output, a non-zero exit code means the data is incomplete.
Messages go to standard error, never into the data. They are in English or
French, following the system language (`LANG=fr_FR.UTF-8` for French).

Exit codes: `0` success, `1` error, `2` usage error, `130` cancelled.

## `.cadenas` and `.age` formats

| | `.cadenas` (default) | `.age` |
|---|---|---|
| Password derivation | Argon2id (64 MiB, 3 passes) | scrypt (2¹⁸) |
| Encryption | XChaCha20-Poly1305, 64 KiB chunks | ChaCha20-Poly1305, 64 KiB chunks |
| Readable by | cadenas | cadenas, [age](https://github.com/FiloSottile/age), [rage](https://github.com/str4d/rage) |
| Independent audit | no | the age format is widely reviewed and used |

When decrypting, the format is detected automatically. cadenas also reads
“armored” age files (`age -a`). age files encrypted to a public key (rather
than a password) are not supported.

Full specification of the `.cadenas` format: [docs/FORMAT.md](docs/FORMAT.md).

## Security

- Choose a long password: a phrase of 4 or 5 random words is easy to remember
  and very strong. The website's “Generate a passphrase” button (or
  `cadenas passphrase`) picks one at random: 5 words, more than 64 bits of entropy.
- **A forgotten password cannot be recovered.**
- The file name and its approximate size remain visible.
- The `.cadenas` format has not yet been audited by independent experts.

Details and vulnerability reporting: [SECURITY.md](SECURITY.md). Threat model
and security arguments: [docs/ASSURANCE.md](docs/ASSURANCE.md).

## Use cadenas as a library

`npm install cadenas`. The core works the same in Node.js and in browsers,
with the Web Streams API:

```js
import { encrypt, decrypt, readAll, streamFromBytes } from 'cadenas';

const sealed = await readAll(await encrypt(streamFromBytes(data), 'password'));
const { format, stream } = await decrypt(streamFromBytes(sealed), 'password');
const plain = await readAll(stream);
```

`encrypt(stream, password, { format: 'age' })` produces an age file. Errors are
`CadenasError` instances with a stable `code` (`WRONG_PASSWORD`, `CORRUPTED`,
`TRUNCATED`, `UNKNOWN_FORMAT`…), documented in [`src/errors.js`](src/errors.js).

## FAQ

**Encrypting files on a website, really?**
The page is a static file: once loaded, it is forbidden by its own Content
Security Policy (`connect-src 'none'`) to open any network connection, so it
could not send your file even if it tried. Automated tests check it in
Chromium, Firefox and WebKit at every change. You can also use it offline, self-host it with Docker, or
use the command line instead.

**How do I check that nothing is sent?**
Open your browser's developer tools, Network tab, then encrypt a file: no
request goes anywhere but the site's own address (the page only loads its own
scripts). Or disconnect from the Internet after the first visit: the
site keeps working.

**What if cadenas disappears one day?**
Your files stay readable. The `.cadenas` format is [fully
specified](docs/FORMAT.md) and built only from standard primitives, and the
`.age` format can be decrypted by [age](https://github.com/FiloSottile/age) or
[rage](https://github.com/str4d/rage), with no cadenas involved.

**I forgot my password. Can you help?**
No, and nobody can: there is no back door and no recovery. Use the
“Generate a passphrase” button and write it down somewhere safe.

**Can the person I send the file to open it?**
Yes, if they know the password: they open the same website, drop the file and
type the password. No account, no installation.

**How large can a file be?**
There is no fixed limit: files are processed in 64 KiB chunks. In Chrome,
Edge, Firefox and Safari, results larger than 256 MiB are written to disk as
they are produced instead of being held in memory. The command line streams
everything.

## Development

```bash
npm install
npm run dev      # local website with hot reload
npm test         # tests (node:test)
npm run lint     # code checks (ESLint)
npm run build    # static website in dist/
```

Layout:

```
src/        shared core (formats, detection, file names)
web/        website (page, styles, encryption worker)
bin/        command line
docker/     nginx configuration for the image
docs/       format, architecture, security arguments
test/       tests, test vector, reference implementation
```

Contributions are welcome, in English or French: see [CONTRIBUTING.md](CONTRIBUTING.md).
Every document is available in English and in French (`.fr.md` files).

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- Governance: [GOVERNANCE.md](GOVERNANCE.md)
- Code signing policy: [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)

## License

[MIT](LICENSE) © Pierre Ebele

Word lists used by the passphrase generator:

- French: Tango's list for [Tails](https://tails.net), public domain (CC0 1.0);
- English: [EFF Large Wordlist](https://www.eff.org/dice) by the Electronic Frontier
  Foundation, licensed under [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).
