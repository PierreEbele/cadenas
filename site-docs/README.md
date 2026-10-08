# Site de documentation

Source de <https://docs.getcadenas.com/>, construit avec
[VitePress](https://vitepress.dev). Le français est servi à la racine,
l'anglais sous `/en/`.

```bash
cd site-docs
npm ci
npm run dev      # site en local avec rechargement automatique
npm run build    # site statique dans .vitepress/dist/
```

## Ce qui se modifie ici, et ce qui se modifie ailleurs

- **Guides et questions fréquentes** (`guide/`, `faq.md` et leurs copies
  anglaises sous `en/`) : rédigés ici. Chaque page existe dans les deux
  langues, au même chemin.
- **Documents de référence** (format, architecture, sécurité, feuille de
  route, contribution, historique…) : ce sont les fichiers du dépôt
  (`docs/*.md`, `SECURITY.md`, `ROADMAP.md`…). `scripts/sync-reference.js`
  les copie dans `reference/` et `project/` à chaque build ; ces dossiers ne
  sont pas versionnés. Modifiez le fichier d'origine, jamais la copie.

Le build échoue si un lien interne est mort : la CI le vérifie à chaque pull
request (job « Site de documentation »).

## Pourquoi un sous-domaine

L'application est sur `getcadenas.com`, la documentation sur
`docs.getcadenas.com`. Un navigateur ne sépare pas les pages d'une même
origine : sur le même domaine, le code de la documentation pourrait lire la
page de chiffrement ou parler à son service worker. Le sous-domaine garde
l'application seule sur son origine (voir `docs/ASSURANCE.md`).

## Déploiement (Cloudflare)

GitHub Pages n'accepte qu'un domaine par dépôt, déjà pris par l'application.
La documentation est donc publiée par Cloudflare (Workers & Pages, fichiers
statiques seulement), relié au dépôt. `wrangler.jsonc` décrit le déploiement.

| Réglage | Valeur |
|---|---|
| Nom du projet | `cadenas-docs` (le même que dans `wrangler.jsonc`) |
| Branche de production | `main` |
| Chemin (dossier racine) | `site-docs` |
| Commande de build | `npm run build` |
| Commande de déploiement | `npx wrangler deploy` |
| Domaine personnalisé | `docs.getcadenas.com` |

La version de Node.js est fixée par `.node-version`. Cloudflare envoie les
en-têtes de `_headers`, écrit par `scripts/headers.js` après le build : CSP
stricte (scripts en ligne autorisés par empreinte SHA-256), `nosniff`, pas de
référent, interdiction d'être affiché dans un cadre.
