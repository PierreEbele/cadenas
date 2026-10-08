# Utiliser le site

Adresse : **[getcadenas.com](https://getcadenas.com/)**

## Chiffrer un fichier

1. Déposez un fichier, plusieurs fichiers ou un dossier entier. Plusieurs
   fichiers ou un dossier sont réunis dans une archive `.zip` avant d'être
   chiffrés.
2. Saisissez un mot de passe, ou cliquez sur **Générer une phrase de passe**
   pour en obtenir une de 5 mots tirés au hasard.
3. Téléchargez le résultat : `rapport.pdf` devient `rapport.pdf.cadenas`.

## Déchiffrer un fichier

Déposez le fichier `.cadenas` ou `.age`, tapez le mot de passe, téléchargez le
fichier d'origine. cadenas reconnaît tout seul si un fichier est à chiffrer ou
à déchiffrer.

Si le mot de passe est faux, ou si le fichier a été modifié ou tronqué,
cadenas le dit et ne produit aucun fichier.

::: tip Vous avez reçu un fichier chiffré ?
La page **[getcadenas.com/#dechiffrer](https://getcadenas.com/#dechiffrer)**
ne fait qu'une chose : ouvrir un fichier chiffré. C'est l'adresse à donner à
votre destinataire (voir [Envoyer un fichier chiffré](./sharing)).
:::

## Hors ligne et installation

Après une première visite, **le site fonctionne hors ligne**. Il peut aussi
s'installer comme une application : menu du navigateur, puis « Installer
cadenas » ou « Ajouter à l'écran d'accueil ».

Une fois installé sur Chrome ou Edge, cadenas apparaît dans « Ouvrir avec »
pour les fichiers `.cadenas` et `.age`.

## Gros fichiers

Il n'y a pas de limite fixe : les fichiers sont traités par blocs de 64 Kio.
Les résultats de plus de 256 Mio ne sont jamais gardés en mémoire : Chrome et
Edge les écrivent directement sur le disque, Firefox et Safari les
téléchargent au fur et à mesure.

## Langue

Le site est en français ou en anglais, selon la langue du navigateur.

## Vérifier que rien n'est envoyé

La page s'interdit elle-même toute connexion réseau, grâce à sa politique de
sécurité du contenu (`connect-src 'none'`). Pour le constater :

- ouvrez les outils de développement du navigateur, onglet **Réseau**, puis
  chiffrez un fichier : aucune requête ne part ailleurs qu'à l'adresse du
  site, qui charge seulement ses propres scripts ;
- ou coupez Internet après la première visite : le site continue de
  fonctionner.

Des tests automatiques vérifient cette interdiction dans Chromium, Firefox et
WebKit à chaque modification du code. Le détail des protections est dans
l'[argumentaire de sécurité](/reference/assurance).
