# Use the website

Address: **[getcadenas.com](https://getcadenas.com/)**

## Encrypt a file

1. Drop a file, several files or a whole folder. Several files or a folder
   are bundled into a `.zip` archive before being encrypted.
2. Enter a password, or click **Generate a passphrase** to get one made of 5
   random words.
3. Download the result: `report.pdf` becomes `report.pdf.cadenas`.

## Decrypt a file

Drop the `.cadenas` or `.age` file, type the password, download the original
file. cadenas recognizes on its own whether a file needs encrypting or
decrypting.

If the password is wrong, or if the file was modified or truncated, cadenas
says so and produces no file.

::: tip Received an encrypted file?
The page **[getcadenas.com/#decrypt](https://getcadenas.com/#decrypt)** does
only one thing: open an encrypted file. It is the address to give your
recipient (see [Send an encrypted file](./sharing)).
:::

## Offline and installation

After a first visit, **the website works offline**. It can also be installed
like an app: browser menu, then "Install cadenas" or "Add to Home Screen".

Once installed on Chrome or Edge, cadenas appears in "Open with" for `.cadenas`
and `.age` files.

## Large files

There is no fixed limit: files are processed in 64 KiB chunks. Results larger
than 256 MiB are never kept in memory: Chrome and Edge write them straight to
disk, Firefox and Safari download them as they go.

## Language

The website is in English or French, depending on the browser language.

## Check that nothing is sent

The page forbids itself any network connection, through its Content Security
Policy (`connect-src 'none'`). To see it for yourself:

- open the browser's developer tools, **Network** tab, then encrypt a file:
  no request goes anywhere but the website's address, which only loads its
  own scripts;
- or turn off the Internet after the first visit: the website keeps working.

Automated tests check this restriction in Chromium, Firefox and WebKit on
every code change. The protections are detailed in the
[assurance case](/en/reference/assurance).
