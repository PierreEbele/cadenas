# Démarrer

**cadenas** chiffre et déchiffre un fichier avec un mot de passe, directement
dans votre navigateur : aucun fichier ni mot de passe n'est envoyé sur
Internet. Le même outil existe en ligne de commande.

Le plus rapide : ouvrez **[getcadenas.com](https://getcadenas.com/)**, déposez
un fichier, choisissez un mot de passe, téléchargez le résultat.

![Démonstration : un fichier rapport-annuel-2026.pdf est choisi, une phrase de passe de cinq mots est générée et jugée excellente, le fichier est chiffré en quelques secondes et rapport-annuel-2026.pdf.cadenas est prêt à être téléchargé.](/images/demo-fr.gif)

## Pourquoi cadenas ?

Vous voulez envoyer un document sensible par e-mail, stocker une sauvegarde
dans le cloud ou garder un fichier sur une clé USB, et il vous faut juste un
mot de passe dessus. Les outils existants sont soit en ligne de commande, soit
à installer, soit conçus pour autre chose (archives, disques chiffrés).
cadenas fait une seule chose : **un fichier, un mot de passe, depuis n'importe
quel appareil muni d'un navigateur**.

## Choisir sa façon d'utiliser cadenas

| Vous voulez… | Utilisez |
|---|---|
| Chiffrer ou ouvrir un fichier, sans rien installer, même sur téléphone | [le site](./website) |
| Envoyer un fichier chiffré à quelqu'un | [le site](./sharing), page « déchiffrer » pour le destinataire |
| Automatiser, chiffrer des sauvegardes, travailler dans un terminal | [la ligne de commande](./cli) |
| Proposer cadenas sur votre propre serveur ou réseau | [l'image Docker](./docker) |
| Intégrer le chiffrement dans votre application | [la bibliothèque JavaScript](./library) |

Toutes ces versions produisent les mêmes fichiers : un fichier chiffré sur le
site s'ouvre en ligne de commande, et inversement.

## Comparé aux autres outils

| | **cadenas** | [age](https://age-encryption.org) | [7-Zip](https://www.7-zip.org) | [VeraCrypt](https://www.veracrypt.fr) |
|---|:---:|:---:|:---:|:---:|
| Fonctionne dans le navigateur, rien à installer | ✅ | ❌ | ❌ | ❌ |
| Fonctionne sur téléphone (iOS, Android) | ✅ | ❌ | ❌ | ❌ |
| Interface graphique | ✅ | ❌ | ✅ | ✅ |
| Ligne de commande | ✅ | ✅ | ✅ | ✅ |
| Chiffre un simple fichier (pas de volume à monter) | ✅ | ✅ | ✅ | ❌ |
| Chiffrement authentifié : toute modification est détectée | ✅ | ✅ | ❌ <sup>1</sup> | ❌ <sup>2</sup> |
| Dérivation du mot de passe gourmande en mémoire (freine les attaques sur GPU) | ✅ Argon2id | ✅ scrypt | ❌ <sup>3</sup> | — |
| Lit et écrit les fichiers age | ✅ | ✅ | ❌ | ❌ |
| Version web auto-hébergeable (Docker) | ✅ | ❌ | ❌ | ❌ |
| Libre et open source | ✅ | ✅ | ✅ | ✅ |
| Audit de sécurité indépendant | ❌ [pas encore](/reference/audit) | — | — | ✅ <sup>4</sup> |

<sup>1</sup> Les archives 7z vérifient un CRC des données déchiffrées, pas une étiquette cryptographique.<br>
<sup>2</sup> Les volumes VeraCrypt utilisent le mode XTS, qui ne détecte pas les modifications.<br>
<sup>3</sup> 7-Zip dérive la clé par SHA-256 itéré.<br>
<sup>4</sup> Audité par Quarkslab en 2016.<br>
— : dépend de la version, ou non vérifié par nous.

::: tip Prenez plutôt un autre outil si…
vous voulez du chiffrement par clé publique ([age](https://age-encryption.org)),
un disque entier chiffré ou des volumes cachés
([VeraCrypt](https://www.veracrypt.fr)), ou avant tout des archives
compressées ([7-Zip](https://www.7-zip.org)).
:::

## À savoir avant de commencer

::: warning Un mot de passe oublié ne peut pas être récupéré
Il n'y a ni porte dérobée ni récupération possible, pour personne. Notez votre
mot de passe en lieu sûr : voir [Choisir un mot de passe](./passwords).
:::

- Le nom du fichier et sa taille approximative restent visibles. Pour cacher
  le nom, utilisez `--hide-name` en [ligne de commande](./cli).
- Le format `.cadenas` n'a pas encore été audité par des spécialistes
  indépendants. Si vous avez besoin d'un format largement relu, choisissez le
  [format age](./formats).
