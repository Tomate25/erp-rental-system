# --- Stage 1: Build & Compilation ---
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar herramientas para módulos nativos (ej. argon2, pg)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install

# Generar cliente Prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Instalar librerías de sistema requeridas para Prisma y Argon2 en Alpine
RUN apk add --no-cache openssl libc6-compat libstdc++

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "(npx prisma db push --accept-data-loss || true) && node dist/src/main.js"]
