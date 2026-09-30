# Feuille de route

[English](ROADMAP.md) · **Français**

Ce que cadenas prévoit de faire, et de ne pas faire, d'ici fin 2027. Les
priorités peuvent changer : les discussions ont lieu dans les
[issues](https://github.com/PierreEbele/cadenas/issues).

## Prévu

### Confiance et sécurité

- Faire relire le format `.cadenas` et son implémentation par des
  spécialistes indépendants, et publier le rapport. Périmètre et questions :
  [docs/AUDIT.fr.md](docs/AUDIT.fr.md).

### Qualité

- Parcours complet au lecteur d'écran (NVDA, VoiceOver), vérifié à la main :
  l'audit axe et le parcours au clavier sont déjà testés automatiquement.

### Fonctionnalités

- Installation par les gestionnaires de paquets courants : publier la formule
  Homebrew (dépôt `homebrew-cadenas`) et le manifeste winget, préparés dans
  [`packaging/`](packaging/README.fr.md).

## Pas prévu

Ces choix découlent des [principes du projet](CONTRIBUTING.fr.md#principes-du-projet) :

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
