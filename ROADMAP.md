# Feuille de route

Ce que cadenas prévoit de faire, et de ne pas faire, d'ici fin 2027. Les
priorités peuvent changer : les discussions ont lieu dans les
[issues](https://github.com/PierreEbele/cadenas/issues).

## Prévu

### Confiance et sécurité

- Faire relire le format `.cadenas` et son implémentation par des
  spécialistes indépendants, et publier le rapport.
- Signer les tags de version (signature SSH ou GPG vérifiable sur GitHub).
- Vérifier dans la CI que le build du site est reproductible (deux builds
  successifs doivent donner des fichiers identiques au bit près).

### Qualité

- Tests de bout en bout du site dans de vrais navigateurs (Chromium,
  Firefox, WebKit) : chiffrer puis déchiffrer, fonctionnement hors ligne,
  politique de sécurité (CSP) effectivement appliquée.
- Audit d'accessibilité automatisé (axe) dans ces tests, et navigation
  complète au clavier et au lecteur d'écran.

### Fonctionnalités

- Option « masquer le nom du fichier » : le fichier est placé dans une
  archive avant chiffrement et le résultat reçoit un nom neutre, sans
  changer le format.
- Fichiers volumineux sur Firefox et Safari : téléchargement en flux via le
  service worker, sans limite de mémoire.
- Ouverture directe des fichiers `.cadenas` et `.age` depuis le système
  quand le site est installé (gestion des fichiers des applications web).
- Commande `cadenas verify` : vérifier qu'un fichier est intact et que le
  mot de passe est bon, sans rien écrire.
- Documentation en anglais (README et guide de contribution).
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
