# Multi-stage Dockerfile para Backend Fastify Node.js (Segurança: non-root)
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Usuário não-privilegiado (OWASP / Secure by Design)
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node src/db/migrations ./src/db/migrations

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
