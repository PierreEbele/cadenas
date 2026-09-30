# Argumentaire de sécurité (assurance case)

[English](ASSURANCE.md) · **Français**

Ce document explique pourquoi cadenas respecte ses exigences de sécurité,
décrites dans [SECURITY.fr.md](../SECURITY.fr.md#ce-que-garantit-cadenas) :

1. **Confidentialité** : sans le mot de passe, le contenu d'un fichier
   chiffré est illisible.
2. **Intégrité** : toute modification, troncature ou réorganisation d'un
   fichier chiffré est détectée, et cadenas ne rend jamais un contenu
   altéré.
3. **Localité** : sur le site, ni les fichiers ni le mot de passe ne
   quittent l'appareil.

Il reprend les éléments demandés par l'OpenSSF : modèle de menace,
frontières de confiance, principes de conception sûre, faiblesses courantes
contrées.

## Modèle de menace

**Ce qu'on protège** : le contenu des fichiers et les mots de passe.

**Attaquants considérés** :

- une personne qui obtient le fichier chiffré (vol, fuite d'un stockage en
  ligne, interception) et tente de le lire, éventuellement avec beaucoup de
  puissance de calcul (force brute sur le mot de passe) ;
- une personne qui modifie le fichier chiffré pour altérer le contenu
  déchiffré ou exploiter le programme (fichier malformé, paramètres
  extrêmes) ;
- un script ou un service tiers qui tenterait d'exfiltrer des données
  depuis la page ;
- une attaque sur la chaîne de publication (paquet, image ou exécutable
  modifié).

**Hors du périmètre** : un appareil déjà compromis (logiciel espion, clavier
enregistreur), un navigateur malveillant, un mot de passe faible choisi
malgré les avertissements, le nom et la taille approximative du fichier
(visibles), et un hébergeur auto-géré qui servirait un site modifié (d'où
les empreintes publiées).

## Frontières de confiance

```
 [ utilisateur ] ──mot de passe──▶ ┌───────────── appareil ─────────────┐
                                   │ page (CSP connect-src 'none')       │
 [ fichier chiffré, non fiable ] ─▶│   └─ worker : src/ (vérifie tout)   │─▶ [ fichier produit ]
                                   └─────────────────────────────────────┘
 [ hébergeur / npm / ghcr.io ] ──code signé et attesté──▶ (installé une fois)
```

- **Fichier à déchiffrer** : non fiable. Chaque octet est validé avant usage
  (voir plus bas).
- **Hébergeur du site** : fiable seulement pour livrer le bon code. Une fois
  la page chargée, la CSP l'empêche d'envoyer quoi que ce soit.
  L'intégrité du code livré se vérifie avec les empreintes et attestations
  des releases, et le build du site est reproductible.
- **Dépendances** : fiables par choix (bibliothèques auditées, versions
  verrouillées dans `package-lock.json`, surveillées par Dependabot).
- **Mot de passe** : fourni par l'utilisateur, jamais stocké ni transmis.

## Principes de conception sûre appliqués

| Principe | Application dans cadenas |
|---|---|
| Économie de mécanisme | Une seule fonction (chiffrer avec un mot de passe), environ 2 300 lignes de code, 5 dépendances d'exécution. |
| Pas de crypto maison | Uniquement des primitives publiées (Argon2id, HKDF, HMAC-SHA256, XChaCha20-Poly1305), fournies par des bibliothèques auditées ([FORMAT.fr.md](FORMAT.fr.md)). Le format age, largement relu, est proposé en alternative. |
| Valeurs par défaut sûres | Argon2id à 64 Mio et 3 passes, sel et nonces aléatoires de 128 bits, phrases de passe de 5 mots (plus de 64 bits d'entropie). |
| Moindre privilège | CSP `default-src 'none'` et `connect-src 'none'` (iframes du site lui-même seulement, pour les téléchargements en flux) ; image Docker non root, en lecture seule, sans capacités ; workflows GitHub en `contents: read` par défaut. |
| Échec sûr | En cas d'erreur, la CLI ne laisse aucun fichier partiel (écriture dans un fichier temporaire renommé seulement en cas de succès) ; aucun bloc n'est déchiffré si l'en-tête n'est pas authentifié. |
| Médiation complète | Chaque bloc est authentifié avant d'être rendu, et le dernier bloc est marqué : troncature et réorganisation sont détectées. |
| Conception ouverte | Code, format et tests publics ; vecteur de test figé et implémentation de référence indépendante (`test/reference.test.js`). |
| Séparation des clés | Clés distinctes pour l'en-tête et le contenu, dérivées par HKDF avec des étiquettes différentes. |

## Faiblesses courantes contrées

| Faiblesse (CWE) | Contre-mesure |
|---|---|
| Crypto faible ou cassée (CWE-327, CWE-328) | Aucun SHA-1, MD5, CBC ou ECB ; clés de 256 bits. |
| Aléa prévisible (CWE-330, CWE-338) | Sels, nonces et phrases de passe issus du générateur cryptographique du système ; tirage sans biais pour les phrases de passe. |
| Réutilisation de nonce (CWE-323) | Préfixe aléatoire de 128 bits par fichier et compteur par bloc (XChaCha20, nonce de 192 bits). |
| Canal auxiliaire temporel (CWE-208) | Le MAC de l'en-tête est comparé en temps constant. |
| Consommation de ressources non contrôlée (CWE-400) | Les paramètres Argon2id lus dans un fichier sont bornés (256 Mio et 16 passes au maximum, soit une vingtaine de fois le coût par défaut) avant tout calcul ; traitement en flux, en mémoire constante. |
| Validation d'entrée insuffisante (CWE-20) | Format reconnu par liste blanche (magic et version), version inconnue refusée, paramètres vérifiés, erreurs typées (`CadenasError`). |
| Traversée de chemin (CWE-22, « zip slip ») | Les chemins placés dans les archives sont nettoyés : ni chemin absolu, ni `.`, ni `..`. |
| Exfiltration et injection de script (CWE-79) | CSP stricte sans script externe ni en ligne ; aucune ressource tierce ; aucun `innerHTML` alimenté par l'utilisateur. |
| Exposition d'informations sensibles (CWE-200, CWE-532) | Le mot de passe n'est jamais journalisé ; saisie sans écho dans le terminal, séquences d'échappement (flèches) ignorées, terminal rétabli même en cas d'interruption ; clés dérivées (sortie d'Argon2id, clés d'en-tête et de contenu) effacées de la mémoire après usage — le mot de passe lui-même, chaîne JavaScript, ne peut pas l'être ; fichiers produits lisibles par leur seul propriétaire, fichier temporaire supprimé en cas d'interruption. |
| Dépendances vulnérables (CWE-1395) | Dependabot (npm, actions, Docker), analyse CodeQL à chaque push et chaque semaine, OpenSSF Scorecard. |
| Compromission de la chaîne de publication | Publication uniquement par GitHub Actions (actions épinglées par empreinte), après vérification de la signature SSH du tag et du commit de sa version ; provenance npm, image signée avec cosign, attestations et `SHA256SUMS` pour les releases ; build du site reproductible. |

## Vérification continue

- Tests automatisés à chaque push (Linux, Windows et macOS), dont des tests
  de propriétés avec fast-check sur des entrées aléatoires ou altérées, et
  un test d'interopérabilité avec l'outil `age` officiel.
- Tests de bout en bout du site dans Chromium, Firefox et WebKit :
  chiffrement, hors ligne, CSP effectivement appliquée, aucune requête hors
  du site, audit d'accessibilité.
- Couverture des tests d'au moins 80 %, imposée par la CI.
- ESLint et CodeQL (requêtes `security-extended`) à chaque push.

## Limites connues

Le format `.cadenas` n'a pas encore été audité par des spécialistes
indépendants. Cet audit est prévu dans la [feuille de route](../ROADMAP.fr.md) ;
son périmètre et les questions posées aux auditeurs sont dans
[AUDIT.fr.md](AUDIT.fr.md).
