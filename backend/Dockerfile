# --- Stage 1: Build & Compilation ---
FROM node:22-slim AS builder

WORKDIR /app

# Instalar dependencias de compilación para módulos nativos (Argon2, pg)
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:22-slim AS runner

WORKDIR /app

# /app pertenece al usuario no-root "node" (uid 1000, ya existe en la imagen oficial de Node):
# prisma migrate deploy y el backend pueden escribir caches/temporales sin ser root.
RUN chown node:node /app
ENV NODE_ENV=production

# Instalar OpenSSL para Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.* ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# El proceso corre sin privilegios de root (puerto 3000 > 1024, no requiere root).
USER node

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main.js"]
