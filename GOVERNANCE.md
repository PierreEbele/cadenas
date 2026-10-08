# Governance

**English** · [Français](GOVERNANCE.fr.md)

cadenas is a small free software project (MIT license) led by a main
maintainer. This document describes who decides, how, and what happens if
that maintainer is no longer available.

## Roles

| Role | Who | Responsibilities |
|---|---|---|
| Main maintainer | Pierre Ebele ([@PierreEbele](https://github.com/PierreEbele)) | Reviews and merges pull requests; triages issues; publishes releases; handles vulnerability reports ([SECURITY.md](SECURITY.md)); administers the GitHub repository, the npm package, the `ghcr.io` image, and the getcadenas.com domain and its sites (GitHub Pages, Cloudflare for docs.getcadenas.com) and the `@getcadenas.com` addresses; maintains the [roadmap](ROADMAP.md); enforces the [code of conduct](CODE_OF_CONDUCT.md). |
| Contributor | Anyone who opens an issue or pull request | Follows the [contribution guide](CONTRIBUTING.md) and the code of conduct; tests their changes. |
| User | Everyone | Reports bugs via an issue and vulnerabilities privately. |

The list of people with a role is kept up to date in this file.

## Decision making

- Routine decisions (fixes, small features, dependencies) are made in the
  relevant pull request: the main maintainer merges once CI is green and
  the review is complete.
- Important decisions (a new visible feature, a change to the `.cadenas`
  format, a new runtime dependency, a license change) start with an issue
  opened for public discussion. The main maintainer makes the final
  decision and explains it in the issue.
- The [project principles](CONTRIBUTING.md#project-principles) serve as
  criteria: simplicity, nothing leaves the browser, few dependencies,
  no homegrown crypto.
- The `.cadenas` v1 format is frozen: any evolution follows the rules in
  [CONTRIBUTING.md](CONTRIBUTING.md#modifying-the-cadenas-format).

## Project continuity

The project must be able to continue, in less than a week, if the main
maintainer disappears or can no longer take care of it:

- **GitHub repository**: a successor is designated in the maintainer's
  GitHub account settings ([Successor](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/maintaining-ownership-continuity-of-your-personal-accounts-repositories)).
  They can then administer the repository: manage issues, merge pull
  requests, and publish releases.
- **Publishing**: releases are produced by GitHub Actions from a tag,
  with no key or personal token (npm trusted publishing, keyless Sigstore
  signing). Anyone who administers the repository can therefore publish.
- **Code**: the MIT license allows anyone to take over the project as a
  fork if necessary.

## Modifying this document

Any change to the governance goes through a publicly visible pull request.
