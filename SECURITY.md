# Security

**English** · [Français](SECURITY.fr.md)

## What cadenas guarantees

- Without the password, the contents of an encrypted file are unreadable.
- Any modification, truncation, or reordering of the encrypted file is
  detected during decryption: cadenas never returns altered content.

## Limitations

- **The `.cadenas` format has not been audited** by independent specialists.
  It only assembles proven primitives (Argon2id, HKDF-SHA256, HMAC-SHA256,
  XChaCha20-Poly1305) from audited libraries, following a construction
  documented in [docs/FORMAT.md](docs/FORMAT.md). If you need an audited
  format, use the [age](https://age-encryption.org) format, which cadenas
  can produce and read.
- **Security depends on the password.** Argon2id strongly slows down
  brute-force attacks, but does not protect a short or common password.
  Prefer a passphrase of 4 to 5 random words, or at least 12 random
  characters.
- The file name and its approximate size are not hidden.
- A forgotten password is permanently lost: there is no way to recover the
  contents.

## Verify what you download

All versions are built and published by GitHub Actions from this repository,
never from a personal machine, and come with verifiable proof (Sigstore).

**npm package** — provenance attached to every release:

```bash
npm install cadenas
npm audit signatures
```

**Docker image** — keylessly signed by the publication workflow:

```bash
cosign verify ghcr.io/pierreebele/cadenas:latest \
  --certificate-identity-regexp '^https://github.com/PierreEbele/cadenas/\.github/workflows/docker\.yml@refs/tags/v' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

The image also embeds an SBOM (a list of its components) and a provenance
attestation: `docker buildx imagetools inspect ghcr.io/pierreebele/cadenas:latest --format '{{ json .SBOM }}'`.

**GitHub release files** (site archive, standalone executables) —
checksums in `SHA256SUMS` and provenance attestation:

```bash
sha256sum -c SHA256SUMS --ignore-missing
gh attestation verify cadenas-site-vX.Y.Z.zip --repo PierreEbele/cadenas
```

Starting with version 1.4.0, signed provenance is also attached to every
release (`cadenas-vX.Y.Z.sigstore.json`, and `cadenas-vX.Y.Z.intoto.jsonl`
in SLSA format): `gh attestation verify <file> --repo PierreEbele/cadenas
--bundle cadenas-vX.Y.Z.sigstore.json` verifies it without querying GitHub.

**Version tags** — starting with version 1.4.0, each tag is signed
with a maintainer SSH key ("Verified" badge on GitHub). To verify it
yourself in a clone of the repository:

```bash
node scripts/verify-tag.js vX.Y.Z
```

The script fetches the signing keys published on the GitHub account
[PierreEbele](https://github.com/PierreEbele) and runs `git verify-tag`.

**The site matches the source code** — the site build is reproducible:
built from the same tag, on any system, it produces bit-for-bit identical
files (CI verifies this on Linux, Windows, and macOS, with Node.js 22 and
24). To verify it yourself:

```bash
git checkout vX.Y.Z
npm ci
npm run build
node scripts/site-hashes.js | diff - site-files.sha256
```

(`site-files.sha256` is the one from the release; no output: identical.)

**A self-hosted site** — `site-files.sha256` lists the checksum of every
site file: compare them with the files served by your instance.

## Reporting a vulnerability

Please do **not** open a public issue. Use
[GitHub's private vulnerability reporting](https://github.com/PierreEbele/cadenas/security/advisories/new).

## Handling of reports

1. **Acknowledgment** within 7 days, in the private security advisory opened
   by your report.
2. **Analysis**: the maintainer reproduces the issue, assesses its severity
   (CVSS), and keeps you informed at least every two weeks.
3. **Fix** prepared privately in the GitHub security advisory, with a test
   that reproduces the issue. Target: less than 60 days after the report,
   and as soon as possible for a critical vulnerability.
4. **Publication**: new version, public security advisory with a CVE
   identifier requested via GitHub, and a mention in the
   [CHANGELOG](CHANGELOG.md) ("Security" section).
5. **Credit**: the person who reported the vulnerability is thanked by name
   in the advisory and the CHANGELOG, unless they prefer to remain anonymous.

Only the latest version receives security fixes.

Why cadenas meets its security requirements (threat model, trust boundaries,
countermeasures): [docs/ASSURANCE.md](docs/ASSURANCE.md).
