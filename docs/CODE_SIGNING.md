# Code signing policy

**English** · [Français](CODE_SIGNING.fr.md)

## Status

**The Windows executable is not code-signed yet.** cadenas applied for free
code signing from the [SignPath Foundation](https://signpath.org) in
October 2026; the application was declined because the project is not
widely known yet. It will apply again later. Windows may therefore show a
SmartScreen warning ("More info" → "Run anyway").

Until then, you can check that an executable was built by this repository,
from its source code, with its signed build provenance:

```bash
gh attestation verify cadenas-vX.Y.Z-windows-x64.exe --repo PierreEbele/cadenas
```

The signing step is already in the [release workflow](../.github/workflows/release.yml),
inactive until the project is accepted. The policy below is the one that
will then apply.

## What will be signed

The standalone Windows executable of each release
(`cadenas-vX.Y.Z-windows-x64.exe`), with free code signing provided by
SignPath.io and a certificate by SignPath Foundation. It is built from this repository's source
code by the [release workflow](../.github/workflows/release.yml), on GitHub
Actions, from a signed version tag; the signing request is sent to SignPath
by that workflow, and the signed file is checked before being published. No
binary is ever signed from a personal computer.

The other release files (site archive, Linux and macOS executables) are not
signed with this certificate. Every release file comes with a signed build
provenance attestation, see [SECURITY.md](../SECURITY.md#verify-what-you-download).

## Team roles

| Role | Members |
|---|---|
| Authors (commit without further review) | [Pierre Ebele](https://github.com/PierreEbele) |
| Reviewers (approve changes from other contributors) | [Pierre Ebele](https://github.com/PierreEbele) |
| Approvers (approve each signing request) | [Pierre Ebele](https://github.com/PierreEbele) |

Every team member uses multi-factor authentication for GitHub and SignPath.
Changes from other contributors are merged only through a pull request
reviewed by a reviewer, with all required checks passing.

## Privacy

This program will not transfer any information to other networked systems
unless specifically requested by the user or the person installing or
operating it.

cadenas encrypts and decrypts files locally: the command line makes no
network connection, and the website forbids itself any connection through
its Content Security Policy.
