# Getting started

**cadenas** (French for *padlock*) encrypts and decrypts a file with a
password, right in your browser: no file and no password is ever sent over
the Internet. The same tool is available on the command line.

The fastest way: open **[getcadenas.com](https://getcadenas.com/)**, drop a
file, choose a password, download the result.

![Demo: a file named annual-report-2026.pdf is chosen, a five-word passphrase is generated and rated excellent, the file is encrypted in a few seconds and annual-report-2026.pdf.cadenas is ready to download.](/images/demo-en.gif)

## Why cadenas?

You want to send a sensitive document by email, store a backup in the cloud
or keep a file on a USB stick, and you just need a password on it. Existing
tools are either command-line only, need to be installed, or are built for
something else (archives, encrypted disks). cadenas does one thing: **one
file, one password, from any device with a browser**.

## Pick how to use cadenas

| You want to… | Use |
|---|---|
| Encrypt or open a file without installing anything, even on a phone | [the website](./website) |
| Send an encrypted file to someone | [the website](./sharing), with the "decrypt" page for the recipient |
| Automate, encrypt backups, work in a terminal | [the command line](./cli) |
| Offer cadenas on your own server or network | [the Docker image](./docker) |
| Add encryption to your application | [the JavaScript library](./library) |

All of them produce the same files: a file encrypted on the website opens on
the command line, and the other way round.

## Compared with other tools

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
| Independent security audit | ❌ [not yet](/en/reference/audit) | — | — | ✅ <sup>4</sup> |

<sup>1</sup> 7z archives check a CRC of the decrypted data, not a cryptographic tag.<br>
<sup>2</sup> VeraCrypt volumes use XTS mode, which does not detect changes.<br>
<sup>3</sup> 7-Zip derives the key with iterated SHA-256.<br>
<sup>4</sup> Audited by Quarkslab in 2016.<br>
—: depends on the version, or not checked by us.

::: tip Use something else when…
you want public-key encryption ([age](https://age-encryption.org)), a whole
encrypted disk or hidden volumes ([VeraCrypt](https://www.veracrypt.fr)), or
compressed archives first and foremost ([7-Zip](https://www.7-zip.org)).
:::

## Before you start

::: warning A forgotten password cannot be recovered
There is no backdoor and no recovery, for anyone. Keep your password
somewhere safe: see [Choose a password](./passwords).
:::

- The file name and its approximate size remain visible. To hide the name,
  use `--hide-name` on the [command line](./cli).
- The `.cadenas` format has not been audited by independent specialists yet.
  If you need a widely reviewed format, choose the [age format](./formats).
