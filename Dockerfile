# --- Étape 1 : construction du site statique ---------------------------------
FROM node:26-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.js ./
COPY src ./src
COPY web ./web
RUN npm run build

# --- Étape 2 : serveur de fichiers statiques, sans droits root ----------------
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:4714e0b1b2577eaa1a6131d07c958b67f0eb68e6d0521e90c6e5287db8cf0bc5

LABEL org.opencontainers.image.title="cadenas" \
      org.opencontainers.image.description="Chiffrez un fichier avec un mot de passe, directement dans le navigateur." \
      org.opencontainers.image.source="https://github.com/PierreEbele/cadenas" \
      org.opencontainers.image.licenses="MIT"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
