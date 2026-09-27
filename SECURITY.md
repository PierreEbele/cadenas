# Sécurité

## Ce que garantit cadenas

- Sans le mot de passe, le contenu d'un fichier chiffré est illisible.
- Toute modification, troncature ou réorganisation du fichier chiffré est
  détectée au déchiffrement : cadenas ne rend jamais un contenu altéré.

## Limites

- **Le format `.cadenas` n'a pas été audité** par des spécialistes
  indépendants. Il n'assemble que des primitives éprouvées (Argon2id,
  HKDF-SHA256, HMAC-SHA256, XChaCha20-Poly1305) issues de bibliothèques
  auditées, selon une construction documentée dans
  [docs/FORMAT.md](docs/FORMAT.md). Si vous avez besoin d'un format audité,
  utilisez le format [age](https://age-encryption.org), que cadenas sait
  produire et lire.
- **La sécurité dépend du mot de passe.** Argon2id ralentit fortement les
  attaques par force brute, mais ne protège pas un mot de passe court ou
  courant. Préférez une phrase de passe de 4 à 5 mots aléatoires ou au moins
  12 caractères aléatoires.
- Le nom du fichier et sa taille approximative ne sont pas cachés.
- Un mot de passe oublié est définitivement perdu : il n'existe aucun moyen de
  récupérer le contenu.

## Vérifier ce que vous téléchargez

Toutes les versions sont construites et publiées par GitHub Actions depuis ce
dépôt, jamais depuis un poste personnel, et sont accompagnées de preuves
vérifiables (Sigstore).

**Paquet npm** — provenance attachée à chaque version :

```bash
npm install cadenas
npm audit signatures
```

**Image Docker** — signée sans clé par le workflow de publication :

```bash
cosign verify ghcr.io/pierreebele/cadenas:latest \
  --certificate-identity-regexp '^https://github.com/PierreEbele/cadenas/\.github/workflows/docker\.yml@refs/tags/v' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

L'image embarque aussi un SBOM (liste de ses composants) et une attestation de
provenance : `docker buildx imagetools inspect ghcr.io/pierreebele/cadenas:latest --format '{{ json .SBOM }}'`.

**Fichiers des releases GitHub** (archive du site, exécutables autonomes) —
empreintes dans `SHA256SUMS` et attestation de provenance :

```bash
sha256sum -c SHA256SUMS --ignore-missing
gh attestation verify cadenas-site-vX.Y.Z.zip --repo PierreEbele/cadenas
```

**Un site auto-hébergé** — `site-files.sha256` liste l'empreinte de chaque
fichier du site : comparez-les avec ceux que sert votre instance.

## Signaler une vulnérabilité

Merci de ne **pas** ouvrir d'issue publique. Utilisez le
[signalement privé de vulnérabilité GitHub](https://github.com/PierreEbele/cadenas/security/advisories/new).
