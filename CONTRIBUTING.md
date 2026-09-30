# Contribuer à cadenas

Merci de votre intérêt ! Les issues et pull requests sont les bienvenues.

## Mise en place

Node.js 22 ou plus récent.

```bash
git clone https://github.com/PierreEbele/cadenas.git
cd cadenas
npm install
npm test
npm run dev
```

## Principes du projet

- **Simplicité d'abord.** cadenas fait une chose : chiffrer un fichier avec un mot de
  passe. Toute nouvelle option doit justifier sa place.
- **Rien ne quitte le navigateur.** Le site ne doit charger aucune ressource externe ni
  ouvrir de connexion réseau. La CSP (`connect-src 'none'`) le garantit : ne
  l'assouplissez pas.
- **Peu de dépendances.** Uniquement des bibliothèques cryptographiques reconnues et
  auditées. Pas de dépendance pour ce que Node.js ou le navigateur font déjà.
- **Pas de crypto maison.** On assemble des primitives éprouvées, on n'en invente pas.

## Style de code

- JavaScript moderne (modules ES), sans étape de compilation ni TypeScript.
- Règles : la configuration recommandée d'ESLint
  ([`eslint.config.js`](eslint.config.js)), vérifiée par `npm run lint` et
  imposée par la CI.
- Mise en forme : [`.editorconfig`](.editorconfig) (UTF-8, fins de ligne LF,
  indentation de 2 espaces), guillemets simples, points-virgules, et le
  style du code existant.
- Commentaires et messages d'erreur en français ; fonctions publiques
  documentées en JSDoc.

## Modifier le format `.cadenas`

Le format v1 est figé : des fichiers existent déjà.

- Toute modification incompatible exige une nouvelle `version` de format, la mise à
  jour de [docs/FORMAT.md](docs/FORMAT.md), un nouveau vecteur de test, et la
  conservation de la lecture des versions précédentes.
- Le test `vecteur de test v1` ne doit jamais être modifié pour « passer ».
- Ouvrez d'abord une issue pour en discuter.

## Avant d'ouvrir une pull request

- `npm run lint`, `npm test` et `npm run build` passent.
- La couverture des tests reste au-dessus de 80 % (`npm run test:coverage`).
- Pour une modification du site : `npm run test:e2e` passe. Ces tests
  construisent le site et le testent dans Chromium, Firefox et WebKit
  (chiffrement, hors ligne, CSP, accessibilité avec axe, parcours au
  clavier) ; la première fois, installez les navigateurs avec
  `npx playwright install chromium firefox webkit`.
- Les nouveaux comportements sont testés.
- Le [CHANGELOG](CHANGELOG.md) est complété dans une section `[Non publié]`.
- Les messages de commit suivent [Conventional Commits](https://www.conventionalcommits.org/fr/)
  (`feat:`, `fix:`, `docs:`, `ci:`…), avec un corps qui explique le *pourquoi*.

## Publier une version (mainteneurs)

Les tags de version doivent être **signés** : les workflows de publication
vérifient la signature (`scripts/verify-tag.js`) et refusent de publier une
version dont le tag n'est pas signé par une clé de signature du mainteneur.

**Une fois, sur votre ordinateur** :

```bash
ssh-keygen -t ed25519 -C "cadenas release signing" -f ~/.ssh/cadenas_signing
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/cadenas_signing.pub
git config --global tag.gpgSign true
```

Puis ajoutez le contenu de `~/.ssh/cadenas_signing.pub` sur GitHub : Settings →
SSH and GPG keys → New SSH key, type **Signing Key**. La clé privée ne quitte
jamais votre ordinateur ; protégez-la par une phrase de passe.

**À chaque version** :

1. Déplacer les entrées `[Non publié]` du CHANGELOG sous le nouveau numéro de version.
2. `npm version <x.y.z> --no-git-tag-version`, puis commit `chore(release): x.y.z`
   par une pull request, fusionnée dans main.
3. Sur main à jour : `npm run release:tag -- "résumé" --push`. Le script refuse
   de poser le tag hors de main, sur un main pas à jour ou modifié, ou si la
   version manque au CHANGELOG ; il signe le tag `vx.y.z`, le vérifie avec
   `scripts/verify-tag.js`, puis l'envoie sur GitHub (sans `--push`, il
   affiche la commande à lancer).
4. La CI fait le reste : vérification de la signature du tag et de la version
   qu'il désigne, paquet npm (avec
   provenance), image Docker signée, et release GitHub (titre = message du
   tag, notes = section du CHANGELOG, site archivé avec empreintes et
   attestation).

Ne publiez pas sur npm depuis votre poste : le workflow `npm.yml` vérifie que le tag
correspond à la version de `package.json` et relance les tests avant l'envoi.

## Gouvernance et code de conduite

Qui décide et comment : [GOVERNANCE.md](GOVERNANCE.md). Toute participation
suit le [code de conduite](CODE_OF_CONDUCT.md). Architecture du code :
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Signaler une vulnérabilité

Pas d'issue publique : voir [SECURITY.md](SECURITY.md).
