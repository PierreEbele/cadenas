# FAQ

## Encrypting files on a website, really?

Yes. The page is a static file: once loaded, its own Content Security Policy
(`connect-src 'none'`) forbids it from opening any network connection. It
could not send your file even if it tried. Automated tests check this in
Chromium, Firefox and WebKit on every change.

You can also use it offline, [host it yourself](/en/guide/docker) or use the
[command line](/en/guide/cli).

## How can I check that nothing is sent?

Open the browser's developer tools, **Network** tab, then encrypt a file: no
request goes anywhere but the website's address. Or turn off the Internet
after the first visit: the website keeps working.

## I forgot my password. Can you help?

No, and nobody can: there is no backdoor and no recovery. Use the "Generate a
passphrase" button and write it down somewhere safe (see
[Choose a password](/en/guide/passwords)).

## Will the person I send the file to be able to open it?

Yes, if they know the password: they open
[getcadenas.com/#decrypt](https://getcadenas.com/#decrypt), drop the file and
type the password. No account, nothing to install. See
[Send an encrypted file](/en/guide/sharing).

## What is the maximum file size?

There is no fixed limit: files are processed in 64 KiB chunks. In Chrome,
Edge, Firefox and Safari, results larger than 256 MiB are written to disk as
they go instead of being kept in memory. The command line streams
everything.

## Does it work on a phone?

Yes, on iOS and Android, in the browser. The website can also be added to the
home screen.

## What if cadenas disappears one day?

Your files stay readable: the `.cadenas` format is
[fully specified](/en/reference/format), and the `.age` format decrypts with
[age](https://github.com/FiloSottile/age) or
[rage](https://github.com/str4d/rage).

## Has cadenas been audited?

Not by independent specialists yet. The audit is planned: its scope and the
questions for the auditors are in [Audit](/en/reference/audit). Meanwhile,
cadenas only uses published primitives, provided by audited libraries, and
offers the widely reviewed age format.

## I found a vulnerability. How do I report it?

Privately, through
[GitHub's private vulnerability reporting](https://github.com/PierreEbele/cadenas/security/advisories/new),
not in a public issue. See [Security](/en/reference/security).

## How can I contribute?

Contributions are welcome, in English or French: see
[Contributing](/en/project/contributing).
