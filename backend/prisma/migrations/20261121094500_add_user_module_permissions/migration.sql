-- CreateEnum
CREATE TYPE "NivelAccesoModulo" AS ENUM ('LECTURA', 'ESCRITURA');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "permisos_modulos_personalizados" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "usuario_permisos_modulo" (
    "usuario_id" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "nivel" "NivelAccesoModulo" NOT NULL DEFAULT 'LECTURA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_permisos_modulo_pkey" PRIMARY KEY ("usuario_id","modulo")
);

-- CreateIndex
CREATE INDEX "usuario_permisos_modulo_usuario_id_idx" ON "usuario_permisos_modulo"("usuario_id");

-- AddForeignKey
ALTER TABLE "usuario_permisos_modulo" ADD CONSTRAINT "usuario_permisos_modulo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
