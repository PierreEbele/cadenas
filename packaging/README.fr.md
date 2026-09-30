# Paquets Homebrew et winget

[English](README.md) · **Français**

Les manifestes de ce dossier sont générés par `scripts/packaging.js` à partir
d'une version **déjà publiée** : empreintes lues dans le `SHA256SUMS` de la
release GitHub et dans le paquet npm.

```bash
node scripts/packaging.js 1.4.1
```

## Homebrew (macOS, Linux)

`homebrew/cadenas.rb` installe le paquet npm avec le Node.js de Homebrew,
comme les formules Node.js de homebrew-core.

**Une fois** : créer le dépôt public `PierreEbele/homebrew-cadenas` (le
préfixe `homebrew-` est obligatoire) avec un dossier `Formula/`.

**À chaque version** : copier `homebrew/cadenas.rb` dans `Formula/cadenas.rb`
de ce dépôt, puis vérifier :

```bash
brew install --build-from-source ./Formula/cadenas.rb
brew test cadenas
brew audit --strict --online cadenas
```

Installation pour les utilisateurs :

```bash
brew install pierreebele/cadenas/cadenas
```

## winget (Windows)

`winget/manifests/…` décrit l'exécutable autonome Windows de la release,
installé comme application « portable » (commande `cadenas`).

**À chaque version** : proposer le dossier de la version à
[microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs), par une
pull request depuis un fork, ou avec
[wingetcreate](https://github.com/microsoft/winget-create) :

```powershell
winget validate --manifest packaging\winget\manifests\p\PierreEbele\cadenas\1.4.1
winget install --manifest packaging\winget\manifests\p\PierreEbele\cadenas\1.4.1
wingetcreate submit packaging\winget\manifests\p\PierreEbele\cadenas\1.4.1
```

Installation pour les utilisateurs, une fois la PR acceptée :

```powershell
winget install PierreEbele.cadenas
```
