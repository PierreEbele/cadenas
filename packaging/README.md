# Homebrew and winget packages

**English** · [Français](README.fr.md)

cadenas is published on Homebrew and winget **automatically at each
release**: once the GitHub release is created, the `homebrew` and `winget`
jobs of [`release.yml`](../.github/workflows/release.yml) generate the
manifests with `scripts/packaging.js` and publish them.

| Package manager | Where | Users install with |
|---|---|---|
| Homebrew (macOS, Linux) | [PierreEbele/homebrew-cadenas](https://github.com/PierreEbele/homebrew-cadenas) | `brew install pierreebele/cadenas/cadenas` |
| winget (Windows) | [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) | `winget install PierreEbele.cadenas` |

## Setup (maintainers, once)

Each job needs a token, stored as a secret of this repository (Settings →
Secrets and variables → Actions → New repository secret). Without it, the job
publishes nothing and leaves a warning on the release run.

**`HOMEBREW_TAP_TOKEN`** — a
[fine-grained token](https://github.com/settings/personal-access-tokens/new)
limited to the `PierreEbele/homebrew-cadenas` repository, with the
**Contents: Read and write** permission only.

**`WINGET_TOKEN`** — a
[classic token](https://github.com/settings/tokens/new) with the
**`public_repo`** scope only. Fine-grained tokens cannot open pull requests
on a repository you do not own, such as `microsoft/winget-pkgs`. This scope
gives write access to all your public repositories: give the token an
expiration date and renew it when GitHub warns you.

The Microsoft Contributor License Agreement, needed for winget, is already
signed for the `PierreEbele` account.

## What the jobs do

**Homebrew**: wait for the npm package (published by `npm.yml` in parallel),
generate the formula (it installs the npm package with Homebrew's Node.js),
then install it, run `brew test` and `brew audit --strict --online` on macOS:
only a formula that passes is pushed to the tap. The tap's own CI then tests
it again on macOS and Linux.

**winget**: generate the manifests of the standalone Windows executable
(installed as a "portable" application, `cadenas` command), then open a pull
request "Update: PierreEbele.cadenas to X.Y.Z" on `microsoft/winget-pkgs`,
from the token owner's fork, with the body in `winget/pull-request.md`.
Microsoft's bots validate it, then a moderator merges it, usually within a
few days. Follow it and answer if a bot asks for changes.

## By hand

```bash
node scripts/packaging.js 1.5.0              # both
node scripts/packaging.js 1.5.0 --homebrew   # homebrew/cadenas.rb only
node scripts/packaging.js 1.5.0 --winget     # winget/manifests/… only
```

The version must already be published: checksums are read from the release's
`SHA256SUMS` and from the npm package. Then copy `homebrew/cadenas.rb` to
`Formula/cadenas.rb` in the tap, and submit the winget folder of the version
with [wingetcreate](https://github.com/microsoft/winget-create) or a pull
request.
