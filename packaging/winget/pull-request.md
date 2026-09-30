## 📖 Description

Update: **PierreEbele.cadenas** to version **{version}**.

Submitted automatically by the release workflow of
[PierreEbele/cadenas](https://github.com/PierreEbele/cadenas), from the
manifests generated for this release by `scripts/packaging.js`.

- Release: https://github.com/PierreEbele/cadenas/releases/tag/v{version}
- The installer SHA-256 is taken from the release's `SHA256SUMS`; the release
  files come with a signed build provenance attestation
  (`gh attestation verify cadenas-v{version}-windows-x64.exe --repo PierreEbele/cadenas`).

## ✅ Checklist

- [x] Signed the [Contributor License Agreement](https://cla.opensource.microsoft.com)
- [ ] Linked to an issue (if applicable)

## 📦 Manifest Checklist

- [ ] Checked that there aren't other open [pull requests](https://github.com/microsoft/winget-pkgs/pulls) for the same manifest update/change
- [x] This PR only modifies one (1) manifest
- [ ] Validated manifest locally with `winget validate --manifest <path>` ([validation guide](https://github.com/microsoft/winget-pkgs/blob/master/doc/ValidationFailureGuide.md))
- [ ] Tested manifest locally with `winget install --manifest <path>`
- [ ] Manifest conforms to the [1.12 schema](https://github.com/microsoft/winget-pkgs/tree/master/doc/manifest/schema/1.12.0)
