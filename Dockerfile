# syntax=docker/dockerfile:1.7
# Build context = repo root. Only the server workspace ends up in the image.

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
# server/package.json is standalone (no workspace refs) so we use it as root here.
COPY server/package.json ./package.json
RUN yarn install --production --ignore-scripts \
    && yarn cache clean

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Run as non-root
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app server/. ./

USER app

EXPOSE 3000

# pino logs to stdout — Railway captures them automatically
CMD ["node", "index.js"]
