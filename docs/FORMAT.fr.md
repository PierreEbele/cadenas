# Format de fichier `.cadenas` — version 1

[English](FORMAT.md) · **Français**

Ce document spécifie le format produit par cadenas. Il doit suffire à écrire
une implémentation compatible sans lire le code source
(voir [`test/reference.test.js`](../test/reference.test.js) pour un exemple
d'implémentation minimale).

Le format n'invente aucune primitive cryptographique. Il combine :

| Rôle | Primitive |
|---|---|
| Dérivation du mot de passe | Argon2id (RFC 9106) |
| Séparation des clés | HKDF-SHA256 (RFC 5869) |
| Authentification de l'en-tête | HMAC-SHA256 (RFC 2104) |
| Chiffrement authentifié du contenu | XChaCha20-Poly1305 (draft-irtf-cfrg-xchacha) |

La découpe en blocs reprend la construction STREAM
([Hoang, Reyhanitabar, Rogaway, Vizár, 2015](https://eprint.iacr.org/2015/189)),
utilisée aussi par [age](https://age-encryption.org/v1).

> ⚠️ Ce format n'a pas fait l'objet d'un audit de sécurité indépendant.
> Voir [SECURITY.fr.md](../SECURITY.fr.md).

## Conventions

- Les entiers sont non signés, en **big-endian**.
- `‖` désigne la concaténation.
- Les tailles sont en octets ; « Kio » = 1024 octets.

## Vue d'ensemble

```
fichier = en-tête (82 octets) ‖ bloc₀ ‖ bloc₁ ‖ … ‖ blocₙ
```

## En-tête

| Offset | Taille | Champ | Valeur |
|---:|---:|---|---|
| 0 | 7 | `magic` | ASCII `CADENAS` (`43 41 44 45 4E 41 53`) |
| 7 | 1 | `version` | `0x01` |
| 8 | 1 | `kdf` | `0x01` = Argon2id |
| 9 | 4 | `m` | mémoire Argon2id, en Kio |
| 13 | 4 | `t` | nombre de passes Argon2id |
| 17 | 1 | `p` | parallélisme Argon2id |
| 18 | 16 | `salt` | aléatoire |
| 34 | 16 | `nonce_prefix` | aléatoire |
| 50 | 32 | `header_mac` | HMAC-SHA256(`mac_key`, octets 0 à 49) |

Paramètres par défaut à l'écriture : `m = 65536` (64 Mio), `t = 3`, `p = 1`.

Un lecteur **doit** refuser, avant de lancer Argon2id, un fichier dont les
paramètres sortent de ces bornes :

| Paramètre | Min | Max |
|---|---:|---:|
| `m` | `max(8, 8 × p)` | 1 048 576 (1 Gio) |
| `t` | 1 | 64 |
| `p` | 1 | 16 |

Un lecteur qui rencontre une `version` inconnue doit s'arrêter avec une erreur
explicite plutôt que de tenter une lecture.

## Dérivation des clés

```
password_bytes = UTF-8(NFC(mot de passe))
master   = Argon2id(password_bytes, salt, m, t, p, longueur = 32)   # version 0x13
mac_key  = HKDF-SHA256(IKM = master, salt = vide, info = "cadenas/v1/header",  L = 32)
enc_key  = HKDF-SHA256(IKM = master, salt = vide, info = "cadenas/v1/payload", L = 32)
```

Le mot de passe est normalisé en Unicode NFC afin qu'un même mot de passe
accentué saisi sur des systèmes différents donne la même clé. Un mot de passe
vide est interdit.

Le lecteur recalcule `header_mac` et le compare en temps constant. En cas
d'écart, le mot de passe est faux (ou l'en-tête a été modifié) : aucun bloc ne
doit être déchiffré.

## Blocs

Le clair est découpé en blocs de **65 536 octets** (64 Kio) ; seul le dernier
peut être plus court. Chaque bloc chiffré a la forme :

```
blocᵢ = XChaCha20-Poly1305.Seal(clé = enc_key, nonce = nonceᵢ, aad = en-tête (82 octets), clair = clairᵢ)
      = chiffré ‖ tag (16 octets)
```

Un bloc chiffré complet fait donc 65 552 octets.

### Nonce (24 octets)

```
nonceᵢ = nonce_prefix (16 octets) ‖ compteur (8 octets)
compteur = i            pour tous les blocs sauf le dernier
compteur = i | 2⁶³      pour le dernier bloc
```

- Le **compteur** (`i` à partir de 0) empêche de réordonner, dupliquer ou
  supprimer des blocs intermédiaires.
- Le **bit de dernier bloc** empêche la troncature : un fichier coupé à une
  frontière de bloc se termine par un bloc chiffré comme « non final », que le
  lecteur rejette.
- L'**en-tête comme AAD** lie chaque bloc à ce fichier précis.

### Règles de découpe

- Un fichier vide produit **un seul** bloc final au clair vide (16 octets).
- Si la taille du clair est un multiple non nul de 65 536, le dernier bloc
  plein est le bloc final : il n'y a pas de bloc vide supplémentaire.
- Un lecteur doit donc rejeter un bloc final vide qui n'est pas le premier
  bloc, ainsi qu'un corps de moins de 16 octets.

### Tailles

```
taille_chiffrée = 82 + n + 16 × max(1, ⌈n / 65536⌉)
```

## Détection du format

Un fichier est un `.cadenas` s'il commence par les 7 octets `CADENAS`.
Un fichier commençant par `age-encryption.org/v1` est un fichier
[age](https://age-encryption.org/v1) que cadenas sait aussi lire.

## Vecteur de test

[`test/fixtures/vector-v1.json`](../test/fixtures/vector-v1.json) contient un
fichier produit avec un sel et un préfixe de nonce fixés. Toute implémentation
doit produire exactement ces octets avec les mêmes entrées, et savoir les
déchiffrer.

## Évolutions

Toute modification incompatible entraîne une nouvelle valeur de `version`.
Les paramètres Argon2id, eux, peuvent évoluer librement puisqu'ils sont
stockés dans chaque fichier.
