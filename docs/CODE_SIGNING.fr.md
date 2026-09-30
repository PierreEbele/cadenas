# Politique de signature de code

[English](CODE_SIGNING.md) · **Français**

Free code signing provided by [SignPath.io](https://about.signpath.io),
certificate by [SignPath Foundation](https://signpath.org) (signature de code
gratuite fournie par SignPath.io, certificat de la SignPath Foundation).

## Ce qui est signé

L'exécutable autonome Windows de chaque release
(`cadenas-vX.Y.Z-windows-x64.exe`). Il est construit à partir du code source
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
