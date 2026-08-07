-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "cantidad_disponible" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "cantidad_total" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "codigo" TEXT,
ALTER COLUMN "numero_serie" DROP NOT NULL;
