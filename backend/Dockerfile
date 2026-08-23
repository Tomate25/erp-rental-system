# --- Stage 1: Build & Compilation ---
FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias de compilación para módulos nativos (Argon2, pg)
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install
RUN npx prisma generate

COPY . .
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Instalar OpenSSL para Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
