-- Equipos prestados o subalquilados a un proveedor, sobre el inventario existente.
CREATE TYPE "OrigenEquipo" AS ENUM ('PROPIO', 'PROVEEDOR');

ALTER TABLE "equipos"
  ADD COLUMN "origen_equipo" "OrigenEquipo" NOT NULL DEFAULT 'PROPIO',
  ADD COLUMN "proveedor_nombre" TEXT,
  ADD COLUMN "precio_proveedor" DECIMAL(14, 4),
  ADD COLUMN "disponible_para_renta" BOOLEAN NOT NULL DEFAULT true;
