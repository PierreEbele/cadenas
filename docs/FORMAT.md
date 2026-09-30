# `.cadenas` file format — version 1

**English** · [Français](FORMAT.fr.md)

This document specifies the format produced by cadenas. It should be enough to write a
compatible implementation without reading the source code (see [`test/reference.test.js`](../test/reference.test.js) for a minimal
example implementation).

The format invents no cryptographic primitives. It combines:

| Role | Primitive |
|---|---|
| Password derivation | Argon2id (RFC 9106) |
| Key separation | HKDF-SHA256 (RFC 5869) |
| Header authentication | HMAC-SHA256 (RFC 2104) |
| Authenticated content encryption | XChaCha20-Poly1305 (draft-irtf-cfrg-xchacha) |

The block layout follows the STREAM construction
([Hoang, Reyhanitabar, Rogaway, Vizár, 2015](https://eprint.iacr.org/2015/189)),
also used by [age](https://age-encryption.org/v1).

> ⚠️ This format has not undergone an independent security audit.
> See [SECURITY.md](../SECURITY.md).

## Conventions

- Integers are unsigned and **big-endian**.
- `‖` denotes concatenation.
- Sizes are in bytes; "KiB" = 1024 bytes.

## Overview

```
file = header (82 bytes) ‖ block₀ ‖ block₁ ‖ … ‖ blockₙ
```

## Header

| Offset | Size | Field | Value |
|---:|---:|---|---|
| 0 | 7 | `magic` | ASCII `CADENAS` (`43 41 44 45 4E 41 53`) |
| 7 | 1 | `version` | `0x01` |
| 8 | 1 | `kdf` | `0x01` = Argon2id |
| 9 | 4 | `m` | Argon2id memory, in KiB |
| 13 | 4 | `t` | Argon2id number of passes |
| 17 | 1 | `p` | Argon2id parallelism |
| 18 | 16 | `salt` | random |
| 34 | 16 | `nonce_prefix` | random |
| 50 | 32 | `header_mac` | HMAC-SHA256(`mac_key`, bytes 0 to 49) |

Default parameters when writing: `m = 65536` (64 MiB), `t = 3`, `p = 1`.

A reader **must** reject, before running Argon2id, a file whose parameters
fall outside these bounds:

| Parameter | Min | Max |
|---|---:|---:|
| `m` | `max(8, 8 × p)` | 1,048,576 (1 GiB) |
| `t` | 1 | 64 |
| `p` | 1 | 16 |

A reader that encounters an unknown `version` must stop with an explicit
error rather than attempt to read the file.

## Key derivation

```
password_bytes = UTF-8(NFC(password))
master   = Argon2id(password_bytes, salt, m, t, p, length = 32)   # version 0x13
mac_key  = HKDF-SHA256(IKM = master, salt = empty, info = "cadenas/v1/header",  L = 32)
enc_key  = HKDF-SHA256(IKM = master, salt = empty, info = "cadenas/v1/payload", L = 32)
```

The password is normalized to Unicode NFC so that the same accented password
entered on different systems yields the same key. An empty password is not
allowed.

The reader recomputes `header_mac` and compares it in constant time. On a
mismatch, the password is wrong (or the header has been modified): no block
may be decrypted.

## Blocks

The plaintext is split into blocks of **65,536 bytes** (64 KiB); only the
last may be shorter. Each encrypted block has the form:

```
blockᵢ = XChaCha20-Poly1305.Seal(key = enc_key, nonce = nonceᵢ, aad = header (82 bytes), plaintext = plaintextᵢ)
       = ciphertext ‖ tag (16 bytes)
```

A full encrypted block is therefore 65,552 bytes.

### Nonce (24 bytes)

```
nonceᵢ  = nonce_prefix (16 bytes) ‖ counter (8 bytes)
counter = i            for every block except the last
counter = i | 2⁶³      for the last block
```

- The **counter** (`i` starting at 0) prevents intermediate blocks from being
  reordered, duplicated, or removed.
- The **last-block bit** prevents truncation: a file cut at a block boundary
  ends with a block encrypted as "not final", which the reader rejects.
- The **header as AAD** binds each block to this specific file.

### Chunking rules

- An empty file produces a **single** final block with empty plaintext
  (16 bytes).
- If the plaintext size is a nonzero multiple of 65,536, the last full block
  is the final block: there is no additional empty block.
- A reader must therefore reject an empty final block that is not the first
  block, as well as a body shorter than 16 bytes.

### Sizes

```
encrypted_size = 82 + n + 16 × max(1, ⌈n / 65536⌉)
```

## Format detection

A file is a `.cadenas` file if it begins with the 7 bytes `CADENAS`.
A file beginning with `age-encryption.org/v1` is an
[age](https://age-encryption.org/v1) file, which cadenas can also read.

## Test vector

[`test/fixtures/vector-v1.json`](../test/fixtures/vector-v1.json) contains a
file produced with a fixed salt and nonce prefix. Any implementation must
produce exactly these bytes given the same inputs, and must be able to decrypt
them.

## Evolution

Any incompatible change results in a new `version` value. The Argon2id
parameters, however, may evolve freely since they are stored in each file.
