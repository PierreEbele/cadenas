# Roadmap

**English** · [Français](ROADMAP.fr.md)

What cadenas plans to do, and not to do, by the end of 2027. Priorities
may change: discussions take place in the
[issues](https://github.com/PierreEbele/cadenas/issues).

## Planned

### Trust and security

- Have the `.cadenas` format and its implementation reviewed by
  independent experts, and publish the report. Scope and questions:
  [docs/AUDIT.md](docs/AUDIT.md).

### Quality

- Full screen reader walkthrough (NVDA, VoiceOver), verified by hand:
  the axe audit and keyboard navigation are already tested
  automatically.

### Features

- Command-line messages in English.
- Installation through common package managers: publish the Homebrew
  formula (`homebrew-cadenas` repository) and the winget manifest,
  prepared in [`packaging/`](packaging/README.md).

## Not planned

These choices follow from the [project principles](CONTRIBUTING.md#project-principles):

- **No server or account**: no online file storage, sharing, or
  syncing. The site will never make a network connection.
- **No telemetry**, no audience measurement tools.
- **No public-key encryption**: for that, use
  [age](https://age-encryption.org) directly. cadenas remains focused
  on passwords.
- **No password recovery**, as a matter of principle.
- **No new cryptographic primitive or additional homegrown format**: a
  possible version 2 of the format would only assemble proven
  primitives, and reading of v1 files would be preserved.
