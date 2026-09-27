# cadenas

> Chiffrez un fichier avec un mot de passe, simplement.

[![CI](https://github.com/PierreEbele/cadenas/actions/workflows/ci.yml/badge.svg)](https://github.com/PierreEbele/cadenas/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cadenas.svg)](https://www.npmjs.com/package/cadenas)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-green.svg)](LICENSE)

**cadenas** chiffre et déchiffre un fichier avec un mot de passe, **directement dans votre
navigateur** : aucun fichier ni mot de passe n'est envoyé sur Internet. Le même outil
existe en ligne de commande.

- **Simple** : déposez un fichier, choisissez un mot de passe, téléchargez le résultat.
- **Local** : tout se passe sur votre appareil. La page n'a techniquement pas le droit
  d'ouvrir une connexion réseau (Content Security Policy `connect-src 'none'`).
- **Solide** : Argon2id et XChaCha20-Poly1305 ; toute modification du fichier chiffré est détectée.
- **Ouvert** : code libre, [format documenté](docs/FORMAT.md), compatible avec
  [age](https://age-encryption.org).

## Sommaire

- [Utiliser le site](#utiliser-le-site)
- [Héberger soi-même avec Docker](#héberger-soi-même-avec-docker)
- [Ligne de commande](#ligne-de-commande)
- [Formats `.cadenas` et `.age`](#formats-cadenas-et-age)
- [Sécurité](#sécurité)
- [Utiliser cadenas comme bibliothèque](#utiliser-cadenas-comme-bibliothèque)
- [Développement](#développement)

## Utiliser le site

Version en ligne : **<https://pierreebele.github.io/cadenas/>**

1. Déposez un fichier (ou cliquez pour le choisir).
2. Saisissez un mot de passe.
3. Téléchargez le résultat.

cadenas reconnaît tout seul si le fichier est à chiffrer ou à déchiffrer.

## Héberger soi-même avec Docker

L'image ne contient qu'un petit serveur nginx qui distribue la page. Le chiffrement
reste dans le navigateur de chaque visiteur : votre serveur ne voit jamais ni les
fichiers ni les mots de passe.

```bash
docker run -d -p 8080:8080 --name cadenas ghcr.io/pierreebele/cadenas
```

Le site est alors disponible sur <http://localhost:8080>.

Avec Docker Compose, en utilisant le [`compose.yaml`](compose.yaml) du dépôt, qui
lance le conteneur en lecture seule et sans privilèges :

```bash
docker compose up -d
```

L'image est publiée pour `linux/amd64` et `linux/arm64` (Raspberry Pi, NAS…).
Elle fonctionne sans droits root et envoie des en-têtes de sécurité stricts
(voir [`docker/security-headers.conf`](docker/security-headers.conf)).
Pour la construire vous-même : `docker build -t cadenas .`

> Servez le site en **HTTPS** si vous l'exposez au-delà de votre réseau local
> (par exemple derrière Caddy, Traefik ou nginx), sinon la page pourrait être
> modifiée en chemin.

## Ligne de commande

Node.js 22 ou plus récent est nécessaire.

```bash
npm install -g cadenas
```

Ou sans installation, avec `npx cadenas lock rapport.pdf`.

```bash
cadenas lock rapport.pdf              # → rapport.pdf.cadenas
cadenas unlock rapport.pdf.cadenas    # → rapport.pdf
cadenas lock --age rapport.pdf        # → rapport.pdf.age, lisible par age / rage
```

| Option | Rôle |
|---|---|
| `-o, --output <chemin>` | fichier de sortie |
| `-f, --force` | écrase le fichier de sortie s'il existe |
| `--age` | chiffre au format age (avec `lock`) |
| `--password-stdin` | lit le mot de passe sur l'entrée standard, pour les scripts |
| `-h, --help` / `-v, --version` | aide / version |

Le mot de passe est demandé sans écho (deux fois pour chiffrer). En cas d'erreur
(mauvais mot de passe, fichier altéré), aucun fichier partiel n'est écrit.

Codes de sortie : `0` succès, `1` erreur, `2` mauvaise utilisation, `130` annulation.

## Formats `.cadenas` et `.age`

| | `.cadenas` (par défaut) | `.age` |
|---|---|---|
| Dérivation du mot de passe | Argon2id (64 Mio, 3 passes) | scrypt (2¹⁸) |
| Chiffrement | XChaCha20-Poly1305, blocs de 64 Kio | ChaCha20-Poly1305, blocs de 64 Kio |
| Lisible par | cadenas | cadenas, [age](https://github.com/FiloSottile/age), [rage](https://github.com/str4d/rage) |
| Audit indépendant | non | le format age est largement relu et utilisé |

Au déchiffrement, le format est détecté automatiquement. cadenas lit aussi les
fichiers age « armurés » (`age -a`). Les fichiers age chiffrés pour une clé publique
(et non un mot de passe) ne sont pas pris en charge.

Spécification complète du format `.cadenas` : [docs/FORMAT.md](docs/FORMAT.md).

## Sécurité

- Choisissez un mot de passe long : une phrase de 4 ou 5 mots aléatoires est facile
  à retenir et très solide.
- **Un mot de passe oublié ne peut pas être récupéré.**
- Le nom du fichier et sa taille approximative restent visibles.
- Le format `.cadenas` n'a pas encore été audité par des spécialistes indépendants.

Détails et signalement de vulnérabilités : [SECURITY.md](SECURITY.md).

## Utiliser cadenas comme bibliothèque

`npm install cadenas`. Le cœur fonctionne à l'identique dans Node.js et dans les
navigateurs, avec l'API Web Streams :

```js
import { encrypt, decrypt, readAll, streamFromBytes } from 'cadenas';

const sealed = await readAll(await encrypt(streamFromBytes(data), 'mot de passe'));
const { format, stream } = await decrypt(streamFromBytes(sealed), 'mot de passe');
const plain = await readAll(stream);
```

`encrypt(flux, motDePasse, { format: 'age' })` produit un fichier age. Les erreurs
sont des `CadenasError` avec un `code` stable (`WRONG_PASSWORD`, `CORRUPTED`,
`TRUNCATED`, `UNKNOWN_FORMAT`…), documentés dans [`src/errors.js`](src/errors.js).

## Développement

```bash
npm install
npm run dev      # site en local avec rechargement automatique
npm test         # tests (node:test)
npm run build    # site statique dans dist/
```

Organisation :

```
src/        cœur partagé (formats, détection, noms de fichiers)
web/        site (page, styles, worker de chiffrement)
bin/        ligne de commande
docker/     configuration nginx de l'image
docs/       spécification du format
test/       tests, vecteur de test, implémentation de référence
```

Les contributions sont les bienvenues : voir [CONTRIBUTING.md](CONTRIBUTING.md).
Historique des versions : [CHANGELOG.md](CHANGELOG.md).

## Licence

[MIT](LICENSE) © Pierre Ebele
