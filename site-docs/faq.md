# Questions fréquentes

## Chiffrer des fichiers sur un site web, vraiment ?

Oui. La page est un fichier statique : une fois chargée, sa propre politique
de sécurité du contenu (`connect-src 'none'`) lui interdit d'ouvrir la
moindre connexion réseau. Elle ne pourrait pas envoyer votre fichier même si
elle essayait. Des tests automatiques le vérifient dans Chromium, Firefox et
WebKit à chaque modification.

Vous pouvez aussi l'utiliser hors ligne, l'[héberger vous-même](/guide/docker)
ou passer par la [ligne de commande](/guide/cli).

## Comment vérifier que rien n'est envoyé ?

Ouvrez les outils de développement du navigateur, onglet **Réseau**, puis
chiffrez un fichier : aucune requête ne part ailleurs qu'à l'adresse du site.
Ou coupez Internet après la première visite : le site continue de
fonctionner.

## J'ai oublié mon mot de passe. Pouvez-vous m'aider ?

Non, et personne ne le peut : il n'y a ni porte dérobée ni récupération.
Utilisez le bouton « Générer une phrase de passe » et notez-la en lieu sûr
(voir [Choisir un mot de passe](/guide/passwords)).

## La personne à qui j'envoie le fichier pourra-t-elle l'ouvrir ?

Oui, si elle connaît le mot de passe : elle ouvre
[getcadenas.com/#dechiffrer](https://getcadenas.com/#dechiffrer), dépose le
fichier et tape le mot de passe. Sans compte ni installation. Voir
[Envoyer un fichier chiffré](/guide/sharing).

## Quelle taille de fichier au maximum ?

Pas de limite fixe : les fichiers sont traités par blocs de 64 Kio. Dans
Chrome, Edge, Firefox et Safari, les résultats de plus de 256 Mio sont écrits
sur le disque au fur et à mesure au lieu d'être gardés en mémoire. La ligne de
commande traite tout en flux.

## Ça marche sur téléphone ?

Oui, sur iOS comme sur Android, dans le navigateur. Le site peut aussi
s'ajouter à l'écran d'accueil.

## Et si cadenas disparaît un jour ?

Vos fichiers restent lisibles : le format `.cadenas` est
[entièrement spécifié](/reference/format), et le format `.age` se déchiffre
avec [age](https://github.com/FiloSottile/age) ou
[rage](https://github.com/str4d/rage).

## cadenas a-t-il été audité ?

Pas encore par des spécialistes indépendants. Cet audit est prévu : son
périmètre et les questions posées aux auditeurs sont décrits dans
[Audit](/reference/audit). En attendant, cadenas n'utilise que des primitives
publiées, fournies par des bibliothèques auditées, et propose le format age,
largement relu.

## J'ai trouvé une faille. Comment la signaler ?

En privé, par le
[signalement de vulnérabilité GitHub](https://github.com/PierreEbele/cadenas/security/advisories/new),
ou par e-mail à **security@getcadenas.com**, et non dans une issue publique.
Voir [Sécurité](/reference/security).

## Comment contribuer ?

Les contributions sont les bienvenues, en français ou en anglais : voir
[Contribuer](/project/contributing).
