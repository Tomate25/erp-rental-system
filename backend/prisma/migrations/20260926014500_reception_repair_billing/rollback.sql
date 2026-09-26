ALTER TABLE "facturas" DROP CONSTRAINT IF EXISTS "facturas_devolucion_id_fkey";
DROP INDEX IF EXISTS "facturas_devolucion_id_key";
ALTER TABLE "facturas" DROP COLUMN IF EXISTS "devolucion_id", DROP COLUMN IF EXISTS "detalle_cargo";
DROP INDEX IF EXISTS "mantenimientos_detalle_devolucion_id_idx";
ALTER TABLE "mantenimientos" DROP CONSTRAINT IF EXISTS "mantenimientos_detalle_devolucion_id_fkey";
ALTER TABLE "mantenimientos"
  DROP COLUMN IF EXISTS "detalle_devolucion_id",
  DROP COLUMN IF EXISTS "cobrable_cliente",
  DROP COLUMN IF EXISTS "gastos",
  DROP COLUMN IF EXISTS "comprobantes_urls";
ALTER TABLE "detalle_devolucion" DROP COLUMN IF EXISTS "inspeccion_estado";
