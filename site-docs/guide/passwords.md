# Choisir un mot de passe

La sécurité d'un fichier chiffré repose entièrement sur son mot de passe.
cadenas ralentit fortement chaque essai (Argon2id, 64 Mio de mémoire par
essai), mais un mot de passe court ou courant finira par être trouvé.

## La phrase de passe : longue et facile à retenir

Une phrase de 4 ou 5 mots tirés au hasard est à la fois facile à retenir et
très solide, par exemple `marmite odeur cible tango glacier`.

- Sur le site, cliquez sur **Générer une phrase de passe**.
- En ligne de commande, tapez `cadenas passphrase`.

Les 5 mots sont tirés au hasard par l'ordinateur dans une liste de plus de
7 000 mots : plus de 64 bits d'entropie. Ne choisissez pas les mots
vous-même, l'esprit humain est un mauvais générateur de hasard.

Les listes de mots utilisées :

- français : liste de Tango pour [Tails](https://tails.net), domaine public ;
- anglais : [EFF Large Wordlist](https://www.eff.org/dice).

## À éviter

- Un mot de passe déjà utilisé ailleurs : s'il a fuité, il est dans les
  listes que testent les attaquants.
- Un mot du dictionnaire, un nom, une date, même avec des chiffres ajoutés.
- Le même canal pour le fichier et son mot de passe (voir
  [Envoyer un fichier chiffré](./sharing)).

## Conserver le mot de passe

::: danger Aucune récupération possible
Un mot de passe oublié ne peut pas être retrouvé, ni par vous, ni par les
auteurs de cadenas, ni par personne. Il n'y a pas de porte dérobée.
:::

Notez-le dans un gestionnaire de mots de passe, ou sur papier rangé en lieu
sûr, avant de supprimer le fichier d'origine.

## Dans les scripts

En ligne de commande, `--password-file` lit le mot de passe dans un fichier
(première ligne) et `--password-stdin` sur l'entrée standard, pour ne jamais
le taper dans la ligne de commande, où il resterait dans l'historique. Voir
[Ligne de commande](./cli).
