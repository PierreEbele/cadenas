# Formats .cadenas et .age

cadenas sait chiffrer dans deux formats. Au déchiffrement, le format est
détecté automatiquement.

| | `.cadenas` (par défaut) | `.age` |
|---|---|---|
| Dérivation du mot de passe | Argon2id (64 Mio, 3 passes) | scrypt (2¹⁸) |
| Chiffrement | XChaCha20-Poly1305, blocs de 64 Kio | ChaCha20-Poly1305, blocs de 64 Kio |
| Lisible par | cadenas | cadenas, [age](https://github.com/FiloSottile/age), [rage](https://github.com/str4d/rage) |
| Audit indépendant | [pas encore](/reference/audit) | le format age est largement relu et utilisé |

## Lequel choisir ?

- **`.cadenas`** pour un usage courant. Argon2id rend chaque essai de mot de
  passe coûteux, y compris sur carte graphique.
- **`.age`** si le fichier doit pouvoir s'ouvrir avec d'autres outils, ou si
  vous voulez un format déjà largement relu. En ligne de commande :
  `cadenas lock --age fichier`.

Dans les deux cas, toute modification du fichier chiffré est détectée : un
fichier altéré ou tronqué est refusé, jamais déchiffré à moitié.

## Ce qui reste visible

Le contenu est chiffré, mais pas :

- le **nom** du fichier, s'il garde son nom d'origine (`rapport.pdf.cadenas`).
  `cadenas lock --hide-name` range le fichier dans une archive au nom neutre ;
- la **taille** approximative du fichier.

## Compatibilité avec age

- cadenas lit les fichiers age chiffrés par mot de passe, y compris sous
  forme « armurée » (`age -a`).
- Les fichiers age chiffrés pour une **clé publique** ne sont pas pris en
  charge : cadenas ne gère que les mots de passe.
- Le coût scrypt est limité à 18, la valeur par défaut d'age. Un fichier créé
  par `age` avec un coût plus élevé (19 à 22) ne s'ouvre pas avec cadenas.

## Et si cadenas disparaît un jour ?

Vos fichiers restent lisibles. Le format `.cadenas` est
[entièrement spécifié](/reference/format) et n'utilise que des primitives
standard : n'importe quel développeur peut écrire un programme pour le lire.
Le format `.age` se déchiffre avec age ou rage, sans cadenas.
