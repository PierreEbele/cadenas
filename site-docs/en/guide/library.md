# JavaScript library

```bash
npm install cadenas
```

The cadenas core works the same in Node.js (22 or newer) and in browsers,
with the Web Streams API. It produces the same files as the website and the
command line.

## Encrypt and decrypt

```js
import { encrypt, decrypt, readAll, streamFromBytes } from 'cadenas';

const sealed = await readAll(await encrypt(streamFromBytes(data), 'password'));
const { format, stream } = await decrypt(streamFromBytes(sealed), 'password');
const plain = await readAll(stream);
```

- `encrypt(stream, password)` returns a stream in the `.cadenas` format.
- `encrypt(stream, password, { format: 'age' })` produces an age file.
- `decrypt(stream, password)` detects the format and returns `{ format, stream }`.

Data flows as a stream, in 64 KiB chunks: a large file does not need to fit
in memory if you plug a read stream and a write stream straight in.

## Errors

Errors are `CadenasError` instances with a stable `code`, meant to be tested
instead of the message:

| Code | Meaning |
|---|---|
| `EMPTY_PASSWORD` | the password is empty |
| `UNKNOWN_FORMAT` | the file is neither a `.cadenas` nor an `.age` file |
| `UNSUPPORTED_VERSION` | `.cadenas` file from a newer version |
| `UNSUPPORTED_AGE` | age file encrypted to a public key, not a password |
| `INVALID_PARAMS` | key derivation parameters out of bounds |
| `WRONG_PASSWORD` | wrong password (or tampered header) |
| `TRUNCATED` | incomplete file |
| `CORRUPTED` | tampered or damaged content |
| `TOO_LARGE` | file too large to be processed |

These codes are documented in
[`src/errors.js`](https://github.com/PierreEbele/cadenas/blob/main/src/errors.js).

```js
import { decrypt, readAll, CadenasError } from 'cadenas';

try {
  await readAll((await decrypt(input, password)).stream);
} catch (error) {
  if (error instanceof CadenasError && error.code === 'WRONG_PASSWORD') {
    // ask for the password again
  } else {
    throw error;
  }
}
```

## Write your own implementation

The `.cadenas` format is [fully specified](/en/reference/format) and only
uses standard primitives. The repository provides a byte-exact test vector
and a minimal reference implementation
([`test/reference.test.js`](https://github.com/PierreEbele/cadenas/blob/main/test/reference.test.js)).
