-- CreateEnum
CREATE TYPE "NivelPrecio" AS ENUM ('PRECIO_A', 'PRECIO_B', 'PRECIO_C');

-- AlterTable
ALTER TABLE "productos" ADD COLUMN "precio_dia_b" DECIMAL(14,4),
ADD COLUMN "precio_dia_c" DECIMAL(14,4),
ADD COLUMN "precio_hora_b" DECIMAL(14,4),
ADD COLUMN "precio_hora_c" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "equipos" ADD COLUMN "precio_dia_b" DECIMAL(14,4),
ADD COLUMN "precio_dia_c" DECIMAL(14,4),
ADD COLUMN "precio_hora_b" DECIMAL(14,4),
ADD COLUMN "precio_hora_c" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "detalle_cotizacion" ADD COLUMN "nivel_precio" "NivelPrecio" NOT NULL DEFAULT 'PRECIO_A';

-- AlterTable
ALTER TABLE "detalle_contratos" ADD COLUMN "nivel_precio" "NivelPrecio" NOT NULL DEFAULT 'PRECIO_A';
