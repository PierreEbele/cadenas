# Ligne de commande

La commande `cadenas` produit et lit exactement les mêmes fichiers que le
site.

## Installer

::: code-group

```bash [Homebrew (macOS, Linux)]
brew install pierreebele/cadenas/cadenas
```

```bash [npm (Node.js 22+)]
npm install -g cadenas
```

```bash [npx (sans installer)]
npx cadenas lock rapport.pdf
```

:::

### Sans Node.js : exécutable autonome

Téléchargez l'exécutable de votre système dans la
[dernière release](https://github.com/PierreEbele/cadenas/releases/latest) :
`cadenas-vX.Y.Z-windows-x64.exe`, `-macos-arm64`, `-linux-x64` ou
`-linux-arm64`. Renommez-le `cadenas` et placez-le dans votre `PATH`.

Ces fichiers ne sont pas encore signés par un éditeur reconnu
(voir [Signature du code](/reference/code-signing)) :

- **Windows** peut afficher un avertissement SmartScreen : « Informations
  complémentaires », puis « Exécuter quand même ».
- **macOS** demande de retirer la quarantaine :
  `xattr -d com.apple.quarantine cadenas`.

Pour vérifier qu'un exécutable a bien été construit par le dépôt officiel :

```bash
gh attestation verify cadenas-vX.Y.Z-linux-x64 --repo PierreEbele/cadenas
```

D'autres vérifications (tags signés, provenance npm, image Docker) sont
décrites dans [Sécurité](/reference/security#vérifier-ce-que-vous-téléchargez).

## Commandes

```bash
cadenas lock rapport.pdf              # → rapport.pdf.cadenas
cadenas unlock rapport.pdf.cadenas    # → rapport.pdf
cadenas verify rapport.pdf.cadenas    # vérifie le fichier et le mot de passe, sans rien écrire
cadenas lock photos/                  # → photos.zip.cadenas (tout le dossier)
cadenas lock a.pdf b.pdf              # → cadenas-AAAA-MM-JJ.zip.cadenas
cadenas lock --age rapport.pdf        # → rapport.pdf.age, lisible par age / rage
cadenas lock --hide-name rapport.pdf  # → cadenas-AAAA-MM-JJ.zip.cadenas (nom gardé à l'intérieur)
cadenas passphrase                    # → phrase de passe aléatoire de 5 mots
```

| Commande | Rôle |
|---|---|
| `lock <fichier\|dossier>…` | chiffre ; plusieurs fichiers ou un dossier donnent une archive `.zip` chiffrée |
| `unlock <fichier>` | déchiffre un fichier `.cadenas` ou `.age` (format détecté automatiquement) |
| `verify <fichier>` | vérifie le fichier et le mot de passe sans rien écrire |
| `passphrase` | génère une phrase de passe aléatoire |

Une archive `.zip` déchiffrée s'ouvre avec n'importe quel outil.

## Options

| Option | Rôle |
|---|---|
| `-o, --output <chemin>` | fichier de sortie (`-` : sortie standard) |
| `-f, --force` | écrase le fichier de sortie s'il existe |
| `--age` | chiffre au format age (avec `lock`) |
| `--hide-name` | masque le nom : le ou les fichiers sont rangés dans une archive `.zip`, le résultat s'appelle `cadenas-AAAA-MM-JJ.zip.cadenas` (avec `lock`) |
| `--password-file <fichier>` | lit le mot de passe dans un fichier (première ligne) |
| `--password-stdin` | lit le mot de passe sur l'entrée standard |
| `-h, --help` / `-v, --version` | aide / version |

Options de `passphrase` :

| Option | Rôle |
|---|---|
| `-w, --words <n>` | nombre de mots, de 3 à 20 (5 par défaut) |
| `--lang <fr\|en>` | langue des mots (par défaut, celle de l'interface) |

## Mot de passe

Sans option, le mot de passe est demandé sans écho, deux fois pour chiffrer.
Il est lu directement dans le terminal, même quand les données arrivent par
l'entrée standard.

Ne passez jamais le mot de passe en argument : il resterait dans
l'historique du shell. Pour les scripts, utilisez `--password-file` ou
`--password-stdin`.

## Scripts et sauvegardes

`-` désigne l'entrée ou la sortie standard :

```bash
# Sauvegarder un dossier chiffré
tar c projet | cadenas lock - --password-file ~/.cle > projet.tar.cadenas

# Le restaurer
cadenas unlock projet.tar.cadenas -o - --password-file ~/.cle | tar x

# Vérifier une sauvegarde sans l'écrire sur le disque
cadenas verify projet.tar.cadenas --password-file ~/.cle && echo intact
```

Comportement garanti :

- vers un fichier, une erreur (mauvais mot de passe, fichier altéré) ne
  laisse jamais de fichier partiel ;
- vers la sortie standard, un code de sortie non nul signale que les données
  sont incomplètes ;
- les messages vont sur la sortie d'erreur, jamais dans les données ;
- un fichier existant n'est jamais écrasé sans `-f`.

| Code de sortie | Signification |
|---|---|
| `0` | succès |
| `1` | erreur (mauvais mot de passe, fichier altéré…) |
| `2` | mauvaise utilisation (option inconnue…) |
| `130` | annulation (Ctrl+C) |

## Langue des messages

Les messages sont en français ou en anglais, selon la langue du système.
Pour forcer l'anglais : `LANG=en_US.UTF-8 cadenas …`.
