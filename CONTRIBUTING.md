# Contributing to cadenas

**English** · [Français](CONTRIBUTING.fr.md)

Thank you for your interest! Issues and pull requests are welcome.

## Setup

Node.js 22 or newer.

```bash
git clone https://github.com/PierreEbele/cadenas.git
cd cadenas
npm install
npm test
npm run dev
```

## Project principles

- **Simplicity first.** cadenas does one thing: encrypt a file with a password.
  Any new option must justify its place.
- **Nothing leaves the browser.** The site must not load any external resources
  or open any network connection. The CSP (`connect-src 'none'`) guarantees
  this: do not loosen it.
- **Few dependencies.** Only well-known, audited cryptographic libraries. No
  dependency for what Node.js or the browser already do.
- **No home-made crypto.** We assemble proven primitives; we don't invent any.

## Code style

- Modern JavaScript (ES modules), with no build step or TypeScript.
- Rules: ESLint's recommended configuration
  ([`eslint.config.js`](eslint.config.js)), checked by `npm run lint` and
  enforced by CI.
- Formatting: [`.editorconfig`](.editorconfig) (UTF-8, LF line endings,
  2-space indentation), single quotes, semicolons, and the style of the
  existing code.
- Code comments in French; public functions documented with JSDoc.
- User-facing texts in English and French: `web/i18n.js` for the website,
  `bin/messages.js` for the command line (tests check that both languages
  have the same keys).

## Modifying the `.cadenas` format

The v1 format is frozen: files already exist.

- Any incompatible change requires a new format `version`, an update to
  [docs/FORMAT.md](docs/FORMAT.md), a new test vector, and continued support
  for reading previous versions.
- The `vecteur de test v1` test (`test/format-cadenas.test.js`) must never be modified just to make it "pass".
- Open an issue first to discuss it.

## Before opening a pull request

- `npm run lint`, `npm test`, and `npm run build` pass.
- Test coverage stays above 80% (`npm run test:coverage`).
- For a change to the site: `npm run test:e2e` passes. These tests build the
  site and test it in Chromium, Firefox, and WebKit (encryption, offline mode,
  CSP, accessibility with axe, keyboard navigation); the first time, install
  the browsers with `npx playwright install chromium firefox webkit`.
- New behaviors are tested.
- The [CHANGELOG](CHANGELOG.md) is updated in its `[Unreleased]` section, in
  English; the maintainer updates the French version
  ([CHANGELOG.fr.md](CHANGELOG.fr.md)) for each release.
- Documentation exists in English (`*.md`) and French (`*.fr.md`): update
  both when you can, or say so in the pull request and the maintainer will
  translate.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/)
  (`feat:`, `fix:`, `docs:`, `ci:`…), with a body explaining the *why*.

## Publishing a version (maintainers)

Version tags must be **signed**: the release workflows verify the signature
(`scripts/verify-tag.js`) and refuse to publish a version whose tag is not
signed with a maintainer signing key.

**Once, on your computer**:

```bash
ssh-keygen -t ed25519 -C "cadenas release signing" -f ~/.ssh/cadenas_signing
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/cadenas_signing.pub
git config --global tag.gpgSign true
```

Then add the contents of `~/.ssh/cadenas_signing.pub` on GitHub: Settings →
SSH and GPG keys → New SSH key, type **Signing Key**. The private key never
leaves your computer; protect it with a passphrase.

**For each version**:

1. Move the `[Unreleased]` entries under the new version number, in
   `CHANGELOG.md` and `CHANGELOG.fr.md`. The release notes are taken from
   `CHANGELOG.md`. If the `Expires` date of
   `web/public/.well-known/security.txt` is less than six months away, push
   it to one year from now.
2. `npm version <x.y.z> --no-git-tag-version`, then commit `chore(release): x.y.z`
   via a pull request, merged into main.
3. On an up-to-date main: `npm run release:tag -- "summary" --push`. The script
   refuses to create the tag outside main, on an outdated or modified main, or
   if the version is missing from the CHANGELOG; it signs the `vx.y.z` tag,
   verifies it with `scripts/verify-tag.js`, then pushes it to GitHub (without
   `--push`, it prints the command to run).
4. CI does the rest: verification of the tag signature and of the version it
   points to, npm package (with provenance), signed Docker image, and GitHub
   release (title = tag message, notes = CHANGELOG section, site archived with
   fingerprints and attestation), then the Homebrew formula and a winget pull
   request ([packaging/README.md](packaging/README.md)).

Do not publish to npm from your machine: the `npm.yml` workflow checks that
the tag matches the version in `package.json` and reruns the tests before
publishing.

## Governance and code of conduct

Who decides and how: [GOVERNANCE.md](GOVERNANCE.md). All participation follows
the [code of conduct](CODE_OF_CONDUCT.md). Code architecture:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Reporting a vulnerability

No public issues: see [SECURITY.md](SECURITY.md).
