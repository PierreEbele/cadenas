# Bibliothèque JavaScript

```bash
npm install cadenas
```

Le cœur de cadenas fonctionne à l'identique dans Node.js (22 ou plus récent)
et dans les navigateurs, avec l'API Web Streams. Les fichiers produits sont
les mêmes que ceux du site et de la ligne de commande.

## Chiffrer et déchiffrer

```js
import { encrypt, decrypt, readAll, streamFromBytes } from 'cadenas';

const sealed = await readAll(await encrypt(streamFromBytes(data), 'mot de passe'));
const { format, stream } = await decrypt(streamFromBytes(sealed), 'mot de passe');
const plain = await readAll(stream);
```

- `encrypt(flux, motDePasse)` renvoie un flux au format `.cadenas`.
- `encrypt(flux, motDePasse, { format: 'age' })` produit un fichier age.
- `decrypt(flux, motDePasse)` détecte le format et renvoie `{ format, stream }`.

Les données circulent en flux, par blocs de 64 Kio : un gros fichier n'a pas
besoin de tenir en mémoire si vous branchez directement un flux de lecture et
un flux d'écriture.

## Erreurs

Les erreurs sont des `CadenasError` avec un `code` stable, à tester plutôt
que le message :

| Code | Signification |
|---|---|
| `EMPTY_PASSWORD` | le mot de passe est vide |
| `UNKNOWN_FORMAT` | le fichier n'est ni un `.cadenas` ni un `.age` |
| `UNSUPPORTED_VERSION` | fichier `.cadenas` d'une version plus récente |
| `UNSUPPORTED_AGE` | fichier age chiffré pour une clé publique, pas un mot de passe |
| `INVALID_PARAMS` | paramètres de dérivation de clé hors limites |
| `WRONG_PASSWORD` | mot de passe incorrect (ou en-tête altéré) |
| `TRUNCATED` | fichier incomplet |
| `CORRUPTED` | contenu altéré ou endommagé |
| `TOO_LARGE` | fichier trop volumineux pour être traité |

Ces codes sont documentés dans
[`src/errors.js`](https://github.com/PierreEbele/cadenas/blob/main/src/errors.js).

```js
import { decrypt, readAll, CadenasError } from 'cadenas';

try {
  await readAll((await decrypt(input, password)).stream);
} catch (error) {
  if (error instanceof CadenasError && error.code === 'WRONG_PASSWORD') {
    // demander à nouveau le mot de passe
  } else {
    throw error;
  }
}
```

## Écrire sa propre implémentation

Le format `.cadenas` est [entièrement spécifié](/reference/format) et
n'utilise que des primitives standard. Le dépôt fournit un vecteur de test
au bit près et une implémentation de référence minimale
([`test/reference.test.js`](https://github.com/PierreEbele/cadenas/blob/main/test/reference.test.js)).
