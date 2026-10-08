# Héberger avec Docker

L'image contient seulement un petit serveur nginx qui distribue la page. Le
chiffrement reste dans le navigateur de chaque visiteur : **votre serveur ne
voit jamais ni les fichiers ni les mots de passe**.

## Lancer

```bash
docker run -d -p 8080:8080 --name cadenas ghcr.io/pierreebele/cadenas
```

Le site est alors disponible sur <http://localhost:8080>.

## Avec Docker Compose

Le [`compose.yaml`](https://github.com/PierreEbele/cadenas/blob/main/compose.yaml)
du dépôt lance le conteneur en lecture seule et sans privilèges :

```bash
docker compose up -d
```

## Caractéristiques de l'image

- Publiée pour `linux/amd64` et `linux/arm64` (Raspberry Pi, NAS…).
- Fonctionne sans droits root.
- Envoie des en-têtes de sécurité stricts, dont la politique de sécurité du
  contenu pour chaque fichier, workers compris : c'est le déploiement le plus
  strictement confiné (voir
  [`docker/security-headers.conf`](https://github.com/PierreEbele/cadenas/blob/main/docker/security-headers.conf)).
- Accompagnée d'une provenance et d'un SBOM vérifiables (voir
  [Sécurité](/reference/security#vérifier-ce-que-vous-téléchargez)).

Pour construire l'image vous-même, depuis le dépôt :

```bash
docker build -t cadenas .
```

## En production

::: warning Servez le site en HTTPS
Si vous l'exposez au-delà de votre réseau local, placez-le derrière un
reverse proxy qui gère le HTTPS (Caddy, Traefik, nginx…). Sinon, la page
pourrait être modifiée en chemin.
:::

::: tip Donnez-lui son propre domaine
Servez cadenas sur un domaine ou sous-domaine dédié (par exemple
`cadenas.exemple.fr`), pas dans un chemin à côté d'autres pages
(`exemple.fr/cadenas/`). Le navigateur ne sépare pas les pages d'un même
domaine : une autre page du domaine pourrait lire le contenu de cadenas.
:::

Exemple avec Caddy, qui obtient le certificat HTTPS tout seul :

```txt
cadenas.exemple.fr {
  reverse_proxy localhost:8080
}
```
