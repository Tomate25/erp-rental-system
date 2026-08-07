FROM node:20-alpine

WORKDIR /app

# Instalar dependencias necesarias
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
