# .cadenas and .age formats

cadenas can encrypt in two formats. When decrypting, the format is detected
automatically.

| | `.cadenas` (default) | `.age` |
|---|---|---|
| Password derivation | Argon2id (64 MiB, 3 passes) | scrypt (2¹⁸) |
| Encryption | XChaCha20-Poly1305, 64 KiB chunks | ChaCha20-Poly1305, 64 KiB chunks |
| Readable by | cadenas | cadenas, [age](https://github.com/FiloSottile/age), [rage](https://github.com/str4d/rage) |
| Independent audit | [not yet](/en/reference/audit) | the age format is widely reviewed and used |

## Which one?

- **`.cadenas`** for everyday use. Argon2id makes every password guess
  expensive, GPUs included.
- **`.age`** if the file must open with other tools, or if you want an
  already widely reviewed format. On the command line:
  `cadenas lock --age file`.

Either way, any change to the encrypted file is detected: a tampered or
truncated file is refused, never half decrypted.

## What stays visible

The content is encrypted, but not:

- the file **name**, if it keeps its original name (`report.pdf.cadenas`).
  `cadenas lock --hide-name` stores the file in an archive with a neutral
  name;
- the approximate file **size**.

## age compatibility

- cadenas reads password-encrypted age files, including the "armored" form
  (`age -a`).
- age files encrypted to a **public key** are not supported: cadenas only
  handles passwords.
- The scrypt work factor is capped at 18, age's default. A file created by
  `age` with a higher work factor (19 to 22) does not open with cadenas.

## What if cadenas disappears one day?

Your files stay readable. The `.cadenas` format is
[fully specified](/en/reference/format) and only uses standard primitives:
any developer can write a program to read it. The `.age` format decrypts with
age or rage, without cadenas.
