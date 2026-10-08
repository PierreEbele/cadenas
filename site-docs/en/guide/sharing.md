# Send an encrypted file

cadenas is often used to send a sensitive document: a contract, an ID card,
a payslip. Your recipient needs no account and nothing to install, only the
password.

## Steps

1. **Encrypt the file** on [getcadenas.com](https://getcadenas.com/). Use a
   generated passphrase: it is strong and easy to read out.
2. **Send the `.cadenas` file** the usual way: email, messaging app, USB
   stick, cloud.
3. **Send the password another way**: text message, phone call, in person.
   If both go through the same mailbox, anyone who gets into it has
   everything.
4. **Give the recipient the address
   [getcadenas.com/#decrypt](https://getcadenas.com/#decrypt)**. They drop
   the file there, type the password and get the document back. This address
   is also shown after every encryption.

::: details Message template
Hi,

The document is attached, encrypted with a password I'm sending you by text.
To open it, go to https://getcadenas.com/#decrypt, drop the file and type
the password. Nothing is sent over the Internet: it all happens in your
browser.
:::

## If the recipient prefers another tool

Encrypt in the age format (`--age` option on the [command line](./cli)): the
`.age` file also opens with [age](https://age-encryption.org) or
[rage](https://github.com/str4d/rage), without cadenas.

## What someone intercepting the file sees

Without the password, nothing of the content. They only see the file name and
its approximate size. If the name itself is sensitive, rename the file before
encrypting it, or use `cadenas lock --hide-name`: the name is then kept inside
the encrypted file.
