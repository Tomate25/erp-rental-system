-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "bloqueado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiere_cambio_password" BOOLEAN NOT NULL DEFAULT false;
