# Choose a password

The security of an encrypted file rests entirely on its password. cadenas
makes every guess expensive (Argon2id, 64 MiB of memory per guess), but a
short or common password will eventually be found.

## The passphrase: long and easy to remember

A phrase of 4 or 5 randomly drawn words is both easy to remember and very
strong, for example `canopy gravel unfold mascot thrift`.

- On the website, click **Generate a passphrase**.
- On the command line, type `cadenas passphrase`.

The 5 words are drawn at random by the computer from a list of more than
7,000 words: over 64 bits of entropy. Don't pick the words yourself: the
human mind is a poor source of randomness.

Word lists used:

- English: the [EFF Large Wordlist](https://www.eff.org/dice);
- French: Tango's list for [Tails](https://tails.net), public domain.

## Avoid

- A password already used elsewhere: if it leaked, it is in the lists
  attackers try.
- A dictionary word, a name, a date, even with digits added.
- Sending the file and its password through the same channel (see
  [Send an encrypted file](./sharing)).

## Keep the password

::: danger No recovery possible
A forgotten password cannot be recovered, not by you, not by the cadenas
authors, not by anyone. There is no backdoor.
:::

Store it in a password manager, or on paper kept somewhere safe, before you
delete the original file.

## In scripts

On the command line, `--password-file` reads the password from a file (first
line) and `--password-stdin` from standard input, so you never type it on the
command line, where it would stay in the shell history. See
[Command line](./cli).
