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

## Modifier le format `.cadenas`

Le format v1 est figé : des fichiers existent déjà.

- Toute modification incompatible exige une nouvelle `version` de format, la mise à
  jour de [docs/FORMAT.md](docs/FORMAT.md), un nouveau vecteur de test, et la
  conservation de la lecture des versions précédentes.
- Le test `vecteur de test v1` ne doit jamais être modifié pour « passer ».
- Ouvrez d'abord une issue pour en discuter.

## Avant d'ouvrir une pull request

- `npm test` et `npm run build` passent.
- Les nouveaux comportements sont testés.
- Le [CHANGELOG](CHANGELOG.md) est complété dans une section `[Non publié]`.
- Les messages de commit suivent [Conventional Commits](https://www.conventionalcommits.org/fr/)
  (`feat:`, `fix:`, `docs:`, `ci:`…), avec un corps qui explique le *pourquoi*.

## Publier une version (mainteneurs)

1. Déplacer les entrées `[Non publié]` du CHANGELOG sous le nouveau numéro de version.
2. `npm version <x.y.z> --no-git-tag-version`, puis commit `chore(release): x.y.z`.
3. `git tag -a vx.y.z -m "vx.y.z"` puis `git push --follow-tags`.
4. La CI publie l'image Docker ; créer la release GitHub avec l'extrait du CHANGELOG.

## Signaler une vulnérabilité

Pas d'issue publique : voir [SECURITY.md](SECURITY.md).
