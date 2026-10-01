# Politique de signature de code

[English](CODE_SIGNING.md) · **Français**

## État

**L'exécutable Windows n'est pas encore signé.** cadenas a demandé une
signature de code gratuite à la [SignPath Foundation](https://signpath.org) en
octobre 2026 ; la demande a été refusée car le projet n'est pas encore assez
connu. Elle sera renouvelée plus tard. Windows peut donc afficher un
avertissement SmartScreen (« Informations complémentaires » → « Exécuter
quand même »).

En attendant, vous pouvez vérifier qu'un exécutable a bien été construit par
ce dépôt, à partir de son code source, grâce à sa provenance signée :

```bash
gh attestation verify cadenas-vX.Y.Z-windows-x64.exe --repo PierreEbele/cadenas
```

L'étape de signature est déjà dans le [workflow de release](../.github/workflows/release.yml),
inactive tant que le projet n'est pas accepté. La politique ci-dessous est
celle qui s'appliquera alors.

## Ce qui sera signé

L'exécutable autonome Windows de chaque release
(`cadenas-vX.Y.Z-windows-x64.exe`), avec une signature de code gratuite
fournie par SignPath.io et un certificat de la SignPath Foundation. Il est
construit à partir du code source
de ce dépôt par le [workflow de release](../.github/workflows/release.yml),
sur GitHub Actions, à partir d'un tag de version signé ; la demande de
signature est envoyée à SignPath par ce workflow, et le fichier signé est
vérifié avant d'être publié. Aucun binaire n'est jamais signé depuis un
ordinateur personnel.

Les autres fichiers des releases (archive du site, exécutables Linux et
macOS) ne sont pas signés avec ce certificat. Chaque fichier de release est
accompagné d'une attestation de provenance signée, voir
[SECURITY.fr.md](../SECURITY.fr.md#vérifier-ce-que-vous-téléchargez).

## Rôles

| Rôle | Membres |
|---|---|
| Auteurs (commits sans autre relecture) | [Pierre Ebele](https://github.com/PierreEbele) |
| Relecteurs (approuvent les changements des autres contributeurs) | [Pierre Ebele](https://github.com/PierreEbele) |
| Approbateurs (approuvent chaque demande de signature) | [Pierre Ebele](https://github.com/PierreEbele) |

Chaque membre de l'équipe utilise l'authentification à plusieurs facteurs
sur GitHub et sur SignPath. Les changements des autres contributeurs ne sont
fusionnés que par une pull request relue par un relecteur, avec toutes les
vérifications requises au vert.

## Vie privée

This program will not transfer any information to other networked systems
unless specifically requested by the user or the person installing or
operating it. (Ce programme ne transmet aucune information à d'autres
systèmes en réseau, sauf demande expresse de l'utilisateur ou de la personne
qui l'installe ou l'utilise.)

cadenas chiffre et déchiffre les fichiers localement : la ligne de commande
n'ouvre aucune connexion réseau, et le site s'interdit toute connexion par sa
politique de sécurité du contenu (CSP).
