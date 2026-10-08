# Gouvernance

[English](GOVERNANCE.md) · **Français**

cadenas est un petit projet libre (licence MIT) mené par un mainteneur
principal. Ce document décrit qui décide, comment, et ce qui se passe si ce
mainteneur n'est plus disponible.

## Rôles

| Rôle | Qui | Responsabilités |
|---|---|---|
| Mainteneur principal | Pierre Ebele ([@PierreEbele](https://github.com/PierreEbele)) | Relit et fusionne les pull requests ; trie les issues ; publie les versions ; traite les signalements de vulnérabilité ([SECURITY.fr.md](SECURITY.fr.md)) ; administre le dépôt GitHub, le paquet npm, l'image `ghcr.io` et le domaine getcadenas.com et ses sites (GitHub Pages, Cloudflare pour docs.getcadenas.com) et les adresses `@getcadenas.com` ; tient à jour la [feuille de route](ROADMAP.fr.md) ; fait respecter le [code de conduite](CODE_OF_CONDUCT.fr.md). |
| Contributeur ou contributrice | Toute personne qui ouvre une issue ou une pull request | Respecte le [guide de contribution](CONTRIBUTING.fr.md) et le code de conduite ; teste ses changements. |
| Utilisateur ou utilisatrice | Tout le monde | Signale les bugs par une issue et les vulnérabilités en privé. |

La liste des personnes ayant un rôle est tenue à jour dans ce fichier.

## Prise de décision

- Les décisions courantes (corrections, petites fonctionnalités, dépendances)
  se prennent dans la pull request concernée : le mainteneur principal
  fusionne une fois la CI verte et la relecture terminée.
- Les décisions importantes (nouvelle fonctionnalité visible, changement du
  format `.cadenas`, nouvelle dépendance d'exécution, changement de
  licence) commencent par une issue ouverte à la discussion publique. Le
  mainteneur principal tranche en expliquant sa décision dans l'issue.
- Les [principes du projet](CONTRIBUTING.fr.md#principes-du-projet) servent de
  critères : simplicité, rien ne quitte le navigateur, peu de dépendances,
  pas de crypto maison.
- Le format `.cadenas` v1 est figé : toute évolution suit les règles de
  [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md#modifier-le-format-cadenas).

## Continuité du projet

Le projet doit pouvoir continuer, en moins d'une semaine, si le mainteneur
principal disparaît ou ne peut plus s'en occuper :

- **Dépôt GitHub** : un successeur est désigné dans les paramètres du compte
  GitHub du mainteneur ([Successor](https://docs.github.com/fr/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/maintaining-ownership-continuity-of-your-personal-accounts-repositories)).
  Il peut alors administrer le dépôt : gérer les issues, fusionner des
  pull requests et publier des versions.
- **Publication** : les versions sont produites par GitHub Actions à partir
  d'un tag, sans clé ni jeton personnel (publication de confiance npm,
  signature sans clé Sigstore). Quiconque administre le dépôt peut donc
  publier.
- **Code** : la licence MIT permet à quiconque de reprendre le projet sous
  forme de fork si nécessaire.

## Modifier ce document

Toute modification de la gouvernance passe par une pull request visible
publiquement.
