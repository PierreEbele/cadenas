# Envoyer un fichier chiffré

cadenas sert souvent à envoyer un document sensible : un contrat, une pièce
d'identité, une fiche de paie. Votre destinataire n'a besoin ni de compte ni
d'installation, seulement du mot de passe.

## Étapes

1. **Chiffrez le fichier** sur [getcadenas.com](https://getcadenas.com/).
   Utilisez une phrase de passe générée : elle est solide et facile à dicter.
2. **Envoyez le fichier `.cadenas`** par le moyen habituel : e-mail,
   messagerie, clé USB, cloud.
3. **Envoyez le mot de passe par un autre moyen** : SMS, appel, en personne.
   Si les deux passent par la même boîte mail, quiconque y accède a tout.
4. **Donnez au destinataire l'adresse
   [getcadenas.com/#dechiffrer](https://getcadenas.com/#dechiffrer)**. Il y
   dépose le fichier, tape le mot de passe et récupère le document. Cette
   adresse est aussi affichée après chaque chiffrement.

::: details Modèle de message
Bonjour,

Je t'envoie le document en pièce jointe, chiffré avec un mot de passe que je
te donne par SMS. Pour l'ouvrir, va sur https://getcadenas.com/#dechiffrer,
dépose le fichier et tape le mot de passe. Rien n'est envoyé sur Internet :
tout se passe dans ton navigateur.
:::

## Si le destinataire préfère un autre outil

Chiffrez au format age (option `--age` en [ligne de commande](./cli)) : le
fichier `.age` s'ouvre aussi avec [age](https://age-encryption.org) ou
[rage](https://github.com/str4d/rage), sans cadenas.

## Ce que voit quelqu'un qui intercepte le fichier

Sans le mot de passe, rien du contenu. Il voit seulement le nom du fichier et
sa taille approximative. Si le nom lui-même est sensible, renommez le fichier
avant de le chiffrer, ou utilisez `cadenas lock --hide-name` : le nom est
alors gardé à l'intérieur du fichier chiffré.
