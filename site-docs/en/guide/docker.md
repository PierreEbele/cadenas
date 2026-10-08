# Self-host with Docker

The image only contains a small nginx server that serves the page.
Encryption stays in each visitor's browser: **your server never sees the files
or the passwords**.

## Run

```bash
docker run -d -p 8080:8080 --name cadenas ghcr.io/pierreebele/cadenas
```

The website is then available at <http://localhost:8080>.

## With Docker Compose

The repository's
[`compose.yaml`](https://github.com/PierreEbele/cadenas/blob/main/compose.yaml)
runs the container read-only and without privileges:

```bash
docker compose up -d
```

## About the image

- Published for `linux/amd64` and `linux/arm64` (Raspberry Pi, NAS…).
- Runs without root.
- Sends strict security headers, including the Content Security Policy for
  every file, workers included: it is the most strictly confined deployment
  (see
  [`docker/security-headers.conf`](https://github.com/PierreEbele/cadenas/blob/main/docker/security-headers.conf)).
- Comes with a verifiable provenance attestation and SBOM (see
  [Security](/en/reference/security#verify-what-you-download)).

To build the image yourself, from the repository:

```bash
docker build -t cadenas .
```

## In production

::: warning Serve the website over HTTPS
If you expose it beyond your local network, put it behind a reverse proxy
that handles HTTPS (Caddy, Traefik, nginx…). Otherwise the page could be
modified on the way.
:::

::: tip Give it its own domain
Serve cadenas on a dedicated domain or subdomain (for example
`cadenas.example.com`), not in a path next to other pages
(`example.com/cadenas/`). Browsers do not isolate pages of the same domain:
another page on it could read cadenas's content.
:::

Example with Caddy, which gets the HTTPS certificate on its own:

```txt
cadenas.example.com {
  reverse_proxy localhost:8080
}
```
