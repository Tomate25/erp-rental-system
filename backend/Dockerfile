FROM node:20-alpine

WORKDIR /app

# Instalar dependencias de compilación para módulos nativos (argon2)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Generar el cliente de Prisma
RUN npx prisma generate

# Copiar el código fuente y compilar
COPY . .
RUN npm run build

EXPOSE 3000

# Ejecutar migraciones/esquema y arrancar la app
CMD ["sh", "-c", "npx prisma db push && (npx ts-node prisma/seed.ts || true) && node dist/main"]
