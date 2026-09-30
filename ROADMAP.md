# Feuille de route

Ce que cadenas prévoit de faire, et de ne pas faire, d'ici fin 2027. Les
priorités peuvent changer : les discussions ont lieu dans les
[issues](https://github.com/PierreEbele/cadenas/issues).

## Prévu

### Confiance et sécurité

- Faire relire le format `.cadenas` et son implémentation par des
  spécialistes indépendants, et publier le rapport.

### Qualité

- Parcours complet au lecteur d'écran (NVDA, VoiceOver), vérifié à la main :
  l'audit axe et le parcours au clavier sont déjà testés automatiquement.

### Fonctionnalités

- Fichiers volumineux sur Firefox et Safari : téléchargement en flux via le
  service worker, sans limite de mémoire.
- Ouverture directe des fichiers `.cadenas` et `.age` depuis le système
  quand le site est installé (gestion des fichiers des applications web).
- Documentation en anglais au-delà du README (guide de contribution,
  sécurité) et messages de la ligne de commande en anglais.
- Installation par les gestionnaires de paquets courants (Homebrew, winget).

## Pas prévu

Ces choix découlent des [principes du projet](CONTRIBUTING.md#principes-du-projet) :

- **Aucun serveur ni compte** : pas de stockage, de partage ni de
  synchronisation de fichiers en ligne. Le site ne fera jamais de
  connexion réseau.
- **Aucune télémétrie**, aucun outil de mesure d'audience.
- **Pas de chiffrement par clé publique** : pour cela, utilisez
  [age](https://age-encryption.org) directement. cadenas reste centré sur
  le mot de passe.
- **Pas de récupération de mot de passe**, par principe.
- **Pas de nouvelle primitive cryptographique ni de format maison
  supplémentaire** : une éventuelle version 2 du format ne ferait
  qu'assembler des primitives éprouvées, et la lecture de la v1 serait
  conservée.
