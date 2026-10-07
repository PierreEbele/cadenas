# Security assurance case

**English** · [Français](ASSURANCE.fr.md)

This document explains why cadenas meets its security requirements,
described in [SECURITY.md](../SECURITY.md#what-cadenas-guarantees):

1. **Confidentiality**: without the password, the content of an encrypted
   file cannot be read.
2. **Integrity**: any modification, truncation or reordering of an encrypted
   file is detected, and cadenas never returns altered content.
3. **Locality**: on the website, neither the files nor the password leave
   the device.

It covers the elements the OpenSSF asks for: threat model, trust
boundaries, secure design principles, common weaknesses countered.

## Threat model

**What we protect**: the content of the files and the passwords.

**Attackers considered**:

- someone who obtains the encrypted file (theft, leak from an online
  storage, interception) and tries to read it, possibly with a lot of
  computing power (brute force on the password);
- someone who modifies the encrypted file to alter the decrypted content or
  to exploit the program (malformed file, extreme parameters);
- a third-party script or service trying to exfiltrate data from the page;
- an attack on the release pipeline (modified package, image or
  executable).

**Out of scope**: an already compromised device (spyware, keylogger), a
malicious browser, a weak password chosen despite the warnings, the name
and approximate size of the file (visible), and a self-managed host serving
a modified site (hence the published checksums).

## Trust boundaries

```
 [ user ] ──password──▶ ┌────────────── device ──────────────┐
                        │ page (CSP connect-src 'none')       │
 [ encrypted file,    ─▶│   └─ worker: src/ (checks all)      │─▶ [ output file ]
   untrusted ]          └─────────────────────────────────────┘
 [ host / npm / ghcr.io ] ──signed, attested code──▶ (installed once)
```

- **File to decrypt**: untrusted. Every byte is validated before use (see
  below).
- **Website host**: trusted only to deliver the right code. Once the page is
  loaded, the CSP prevents it from sending anything. The integrity of the
  delivered code can be checked with the checksums and attestations of the
  releases, and the site build is reproducible.
- **Dependencies**: trusted by choice (audited libraries, versions locked in
  `package-lock.json`, watched by Dependabot).
- **Password**: provided by the user, never stored or sent.

## Secure design principles applied

| Principle | How cadenas applies it |
|---|---|
| Economy of mechanism | A single function (encrypt with a password), about 2,300 lines of code, 5 runtime dependencies. |
| No home-made crypto | Only published primitives (Argon2id, HKDF, HMAC-SHA256, XChaCha20-Poly1305), provided by audited libraries ([FORMAT.md](FORMAT.md)). The widely reviewed age format is offered as an alternative. |
| Secure defaults | Argon2id with 64 MiB and 3 passes, random 128-bit salts and nonces, 5-word passphrases (more than 64 bits of entropy). |
| Least privilege | CSP `default-src 'none'` and `connect-src 'none'` (frames only from the site itself, for streamed downloads); non-root, read-only Docker image without capabilities; GitHub workflows with `contents: read` by default. |
| Fail-safe defaults | On error, the CLI leaves no partial file (it writes to a temporary file renamed only on success); no chunk is decrypted if the header is not authenticated. |
| Complete mediation | Every chunk is authenticated before it is returned, and the last chunk is marked: truncation and reordering are detected. |
| Open design | Public code, format and tests; a frozen test vector and an independent reference implementation (`test/reference.test.js`). |
| Key separation | Separate keys for the header and the content, derived with HKDF using different labels. |

## Common weaknesses countered

| Weakness (CWE) | Countermeasure |
|---|---|
| Weak or broken crypto (CWE-327, CWE-328) | No SHA-1, MD5, CBC or ECB; 256-bit keys. |
| Predictable randomness (CWE-330, CWE-338) | Salts, nonces and passphrases come from the system's cryptographic generator; unbiased sampling for passphrases. |
| Nonce reuse (CWE-323) | Random 128-bit prefix per file and a counter per chunk (XChaCha20, 192-bit nonce). |
| Timing side channel (CWE-208) | The header MAC is compared in constant time. |
| Uncontrolled resource consumption (CWE-400) | Argon2id parameters read from a file are bounded (at most 256 MiB and 16 passes, about twenty times the default cost) before any computation; streaming, in constant memory. |
| Improper input validation (CWE-20) | Format recognized by allowlist (magic and version), unknown versions rejected, parameters checked, typed errors (`CadenasError`). |
| Path traversal (CWE-22, "zip slip") | Paths stored in archives are sanitized: no absolute path, no `.`, no `..`. |
| Exfiltration and script injection (CWE-79) | Strict CSP with no external or inline script; no third-party resource; no `innerHTML` fed by the user. |
| Exposure of sensitive information (CWE-200, CWE-532) | The password is never logged; input without echo in the terminal, escape sequences (arrow keys) ignored, terminal restored even on interruption; derived keys (Argon2id output, header and content keys) wiped from memory after use — the password itself, a JavaScript string, cannot be wiped; output files created readable by their owner only, temporary file deleted on interruption. |
| Vulnerable dependencies (CWE-1395) | Dependabot (npm, actions, Docker), CodeQL analysis on every push and every week, OpenSSF Scorecard. |
| Release pipeline compromise | Publication only by GitHub Actions (actions pinned by hash), after checking the SSH signature of the tag and that it points to the commit of its version; npm provenance, image signed with cosign, attestations and `SHA256SUMS` for the releases; reproducible site build. |

## Continuous verification

- Automated tests on every push (Linux, Windows and macOS), including
  property-based tests with fast-check on random or tampered inputs, and an
  interoperability test with the official `age` tool.
- End-to-end tests of the website in Chromium, Firefox and WebKit:
  encryption, offline mode, CSP actually enforced, no request leaving the
  site, accessibility audit.
- Test coverage of at least 80 %, enforced by CI.
- ESLint and CodeQL (`security-extended` queries) on every push.

## Known limitations

The `.cadenas` format has not been audited by independent specialists yet.
This audit is planned in the [roadmap](../ROADMAP.md); its scope and the
questions for the auditors are in [AUDIT.md](AUDIT.md).

On GitHub Pages, which cannot send HTTP headers, the CSP arrives through a
`<meta>` tag. It protects the page itself, but browsers apply to a worker
(the encryption worker, the service worker) the policy of that worker's own
HTTP response, so on GitHub Pages the workers run without a CSP. The workers
only run the site's own code and make no network request; reaching them
would first require an injection into that code. The Docker image sends the
CSP as a header to every file, workers included: it is the most strictly
confined deployment.

On GitHub Pages, the site also shares its origin,
`https://pierreebele.github.io`, with every other page published by this
account (user site, other repositories with Pages). Browsers do not isolate
paths within an origin: such a page could open `/cadenas/` in an iframe and
read or change its content, password included, or message its service
worker. The security of the online site therefore depends on every page of
that origin: no other page may be published there. A dedicated domain, or
the Docker image on its own domain, removes this dependency.
