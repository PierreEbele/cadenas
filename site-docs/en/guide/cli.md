# Command line

The `cadenas` command produces and reads exactly the same files as the
website.

## Install

::: code-group

```bash [Homebrew (macOS, Linux)]
brew install pierreebele/cadenas/cadenas
```

```bash [npm (Node.js 22+)]
npm install -g cadenas
```

```bash [npx (no install)]
npx cadenas lock report.pdf
```

:::

### Without Node.js: standalone executable

Download the executable for your system from the
[latest release](https://github.com/PierreEbele/cadenas/releases/latest):
`cadenas-vX.Y.Z-windows-x64.exe`, `-macos-arm64`, `-linux-x64` or
`-linux-arm64`. Rename it `cadenas` and put it in your `PATH`.

These files are not signed by a recognized publisher yet (see
[Code signing](/en/reference/code-signing)):

- **Windows** may show a SmartScreen warning: "More info", then "Run anyway".
- **macOS** requires removing the quarantine flag:
  `xattr -d com.apple.quarantine cadenas`.

To check that an executable was built by the official repository:

```bash
gh attestation verify cadenas-vX.Y.Z-linux-x64 --repo PierreEbele/cadenas
```

More checks (signed tags, npm provenance, Docker image) are described in
[Security](/en/reference/security#verify-what-you-download).

## Commands

```bash
cadenas lock report.pdf              # → report.pdf.cadenas
cadenas unlock report.pdf.cadenas    # → report.pdf
cadenas verify report.pdf.cadenas    # checks the file and the password, writes nothing
cadenas lock photos/                 # → photos.zip.cadenas (the whole folder)
cadenas lock a.pdf b.pdf             # → cadenas-YYYY-MM-DD.zip.cadenas
cadenas lock --age report.pdf        # → report.pdf.age, readable by age / rage
cadenas lock --hide-name report.pdf  # → cadenas-YYYY-MM-DD.zip.cadenas (name kept inside)
cadenas passphrase                   # → random 5-word passphrase
```

| Command | Purpose |
|---|---|
| `lock <file\|folder>…` | encrypt; several files or a folder give an encrypted `.zip` archive |
| `unlock <file>` | decrypt a `.cadenas` or `.age` file (format detected automatically) |
| `verify <file>` | check the file and the password without writing anything |
| `passphrase` | generate a random passphrase |

A decrypted `.zip` archive opens with any tool.

## Options

| Option | Purpose |
|---|---|
| `-o, --output <path>` | output file (`-`: standard output) |
| `-f, --force` | overwrite the output file if it exists |
| `--age` | encrypt in the age format (with `lock`) |
| `--hide-name` | hide the name: the file(s) are stored in a `.zip` archive, the result is named `cadenas-YYYY-MM-DD.zip.cadenas` (with `lock`) |
| `--password-file <file>` | read the password from a file (first line) |
| `--password-stdin` | read the password from standard input |
| `-h, --help` / `-v, --version` | help / version |

`passphrase` options:

| Option | Purpose |
|---|---|
| `-w, --words <n>` | number of words, 3 to 20 (5 by default) |
| `--lang <fr\|en>` | language of the words (default: the interface language) |

## Password

Without an option, the password is asked for without echo, twice when
encrypting. It is read straight from the terminal, even when the data comes
from standard input.

Never pass the password as an argument: it would stay in the shell history.
In scripts, use `--password-file` or `--password-stdin`.

## Scripts and backups

`-` means standard input or standard output:

```bash
# Back up a folder, encrypted
tar c project | cadenas lock - --password-file ~/.secret > project.tar.cadenas

# Restore it
cadenas unlock project.tar.cadenas -o - --password-file ~/.secret | tar x

# Check a backup without writing it to disk
cadenas verify project.tar.cadenas --password-file ~/.secret && echo intact
```

Guaranteed behavior:

- to a file, an error (wrong password, tampered file) never leaves a partial
  file behind;
- to standard output, a non-zero exit code means the data is incomplete;
- messages go to standard error, never into the data;
- an existing file is never overwritten without `-f`.

| Exit code | Meaning |
|---|---|
| `0` | success |
| `1` | error (wrong password, tampered file…) |
| `2` | usage error (unknown option…) |
| `130` | cancelled (Ctrl+C) |

## Message language

Messages are in English or French, depending on the system language. To force
English: `LANG=en_US.UTF-8 cadenas …`.
