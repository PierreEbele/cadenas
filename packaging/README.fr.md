# Paquets Homebrew et winget

[English](README.md) · **Français**

cadenas est publié sur Homebrew et winget **automatiquement à chaque
release** : une fois la release GitHub créée, les jobs `homebrew` et `winget`
de [`release.yml`](../.github/workflows/release.yml) génèrent les manifestes
avec `scripts/packaging.js` et les publient.

| Gestionnaire | Où | Installation |
|---|---|---|
| Homebrew (macOS, Linux) | [PierreEbele/homebrew-cadenas](https://github.com/PierreEbele/homebrew-cadenas) | `brew install pierreebele/cadenas/cadenas` |
| winget (Windows) | [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) | `winget install PierreEbele.cadenas` |

## Mise en place (mainteneurs, une fois)

Chaque job a besoin d'un jeton, enregistré comme secret de ce dépôt
(Settings → Secrets and variables → Actions → New repository secret). Sans
lui, le job ne publie rien et laisse un avertissement sur l'exécution de la
release.

**`HOMEBREW_TAP_TOKEN`** — un
[jeton à permissions fines](https://github.com/settings/personal-access-tokens/new)
limité au dépôt `PierreEbele/homebrew-cadenas`, avec la seule permission
**Contents : Read and write**.

**`WINGET_TOKEN`** — un
[jeton classique](https://github.com/settings/tokens/new) avec le seul scope
**`public_repo`**. Les jetons à permissions fines ne peuvent pas ouvrir de
pull request sur un dépôt dont on n'est pas propriétaire, comme
`microsoft/winget-pkgs`. Ce scope donne l'écriture sur tous vos dépôts
publics : donnez au jeton une date d'expiration et renouvelez-le quand
GitHub vous prévient.

L'accord de contribution (CLA) de Microsoft, nécessaire pour winget, est
déjà signé pour le compte `PierreEbele`.

## Ce que font les jobs

**Homebrew** : attendre le paquet npm (publié en parallèle par `npm.yml`),
générer la formule (qui installe le paquet npm avec le Node.js de
Homebrew), puis l'installer et lancer `brew test` et
`brew audit --strict --online` sous macOS : seule une formule qui passe est
envoyée dans le dépôt. La CI de ce dépôt la teste ensuite à nouveau sous macOS
et Linux.

**winget** : générer les manifestes de l'exécutable autonome Windows
(installé comme application « portable », commande `cadenas`), puis ouvrir
une pull request « Update: PierreEbele.cadenas to X.Y.Z » sur
`microsoft/winget-pkgs`, depuis le fork du propriétaire du jeton, avec le
texte de `winget/pull-request.md`. Les robots de Microsoft la valident, puis
un modérateur la fusionne, en général en quelques jours. Suivez-la, et
répondez si un robot demande des changements.

## À la main

```bash
node scripts/packaging.js 1.5.0              # les deux
node scripts/packaging.js 1.5.0 --homebrew   # homebrew/cadenas.rb seulement
node scripts/packaging.js 1.5.0 --winget     # winget/manifests/… seulement
```

La version doit déjà être publiée : les empreintes sont lues dans le
`SHA256SUMS` de la release et dans le paquet npm. Copiez ensuite
`homebrew/cadenas.rb` dans `Formula/cadenas.rb` du dépôt Homebrew, et
soumettez le dossier winget de la version avec
[wingetcreate](https://github.com/microsoft/winget-create) ou une pull
request.
