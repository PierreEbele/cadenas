# --- Étape 1 : construction du site statique ---------------------------------
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.js ./
COPY src ./src
COPY web ./web
RUN npm run build

# --- Étape 2 : serveur de fichiers statiques, sans droits root ----------------
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:ed04ec1ff34502c339ee5c3ae3f855442398edc1d05591e2b98981dcbbd20b1e

LABEL org.opencontainers.image.title="cadenas" \
      org.opencontainers.image.description="Chiffrez un fichier avec un mot de passe, directement dans le navigateur." \
      org.opencontainers.image.source="https://github.com/PierreEbele/cadenas" \
      org.opencontainers.image.url="https://getcadenas.com/" \
      org.opencontainers.image.documentation="https://docs.getcadenas.com/" \
      org.opencontainers.image.licenses="MIT"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
